require('dotenv').config(); // Load environment variables for local testing
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const { useMongoDBAuthState } = require('./MongoAuthState');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

// Database Configurations
const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
// Tenta usar a SERVICE_ROLE (com bypass de RLS) para que os scripts backend consigam ler as tabelas!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: Variáveis de ambiente MONGODB_URI, SUPABASE_URL ou SUPABASE_KEY não configuradas.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Iniciando Verificação Automatizada de Sessões do WhatsApp (Baileys)...");

async function getPendingCompanyToAuthenticate() {
    console.log("-> Buscando empresas cadastradas no Supabase...");
    const { data: companies, error } = await supabase
        .from('companies')
        .select('name, whatsapp_session, created_at')
        .order('created_at', { ascending: true }); 

    if (error) {
        console.error("Erro ao consultar o Supabase:", error);
        process.exit(1);
    }

    if (!companies || companies.length === 0) {
        console.log("Nenhuma empresa encontrada no banco de dados.");
        process.exit(0);
    }

    console.log(`Foram encontradas ${companies.length} empresas. Verificando sessões do Baileys no MongoDB...`);

    for (const company of companies) {
        if (!company.whatsapp_session) continue;
        
        // Verifica se a empresa já tem credenciais REALMENTE autenticadas no MongoDB
        // (o campo 'me' só é preenchido após escanear o QR Code com sucesso)
        const collection = mongoose.connection.db.collection(company.whatsapp_session);
        const credsDoc = await collection.findOne({ _id: 'creds' });
        
        const isAuthenticated = credsDoc && credsDoc.data && credsDoc.data.me;

        if (!isAuthenticated) {
            // Se existem creds órfãs (criadas mas nunca autenticadas), limpa a coleção inteira
            if (credsDoc) {
                console.log(`- [LIMPANDO] Sessão "${company.whatsapp_session}" possui credenciais não autenticadas. Limpando coleção...`);
                await collection.drop().catch(() => {}); // drop silencioso se já não existir
            }
            console.log(`- [PENDENTE] Empresa "${company.name}" (Sessão: ${company.whatsapp_session}) PRECISA SER AUTENTICADA!`);
            return company; 
        } else {
            console.log(`- [OK] Empresa "${company.name}" (Sessão: ${company.whatsapp_session}) já está autenticada no MongoDB. (JID: ${credsDoc.data.me.id})`);
        }
    }

    return null;
}

mongoose.connect(MONGODB_URI).then(async () => {
    console.log("-> Conectado ao MongoDB com sucesso.");
    
    // Descobre automaticamente quem precisa do QR Code agora
    const targetCompany = await getPendingCompanyToAuthenticate();

    if (!targetCompany) {
        console.log("\nTodas as empresas já possuem sessões salvas. Nenhuma autenticação pendente!");
        process.exit(0);
    }

    const session_id = targetCompany.whatsapp_session;
    console.log(`\n======================================================`);
    console.log(`INICIANDO AUTENTICAÇÃO (MIGRAÇÃO PARA BAILEYS): ${targetCompany.name}`);
    console.log(`SESSION ID: ${session_id}`);
    console.log(`======================================================\n`);

    let tentativas = 0;
    const MAX_TENTATIVAS = 5;

    async function connectWhatsApp() {
        tentativas++;
        console.log(`\n--- Tentativa de conexão ${tentativas}/${MAX_TENTATIVAS} ---`);

        if (tentativas > MAX_TENTATIVAS) {
            console.error(`\nERRO: Não foi possível conectar após ${MAX_TENTATIVAS} tentativas.`);
            console.error("Possíveis causas:");
            console.error("  1. Rate limit do WhatsApp (aguarde alguns minutos e tente novamente)");
            console.error("  2. Problema de rede/firewall");
            console.error("  3. Versão do Baileys incompatível");
            mongoose.disconnect();
            process.exit(1);
        }

        // Inicia AuthAdapter customizado para MongoDB usando a Collection do session_id
        const collection = mongoose.connection.db.collection(session_id);
        const { state, saveCreds } = await useMongoDBAuthState(collection);
        const { version } = await fetchLatestBaileysVersion();
        console.log(`Baileys version: ${version.join('.')}`);

        // Inicia o Socket do WhatsApp
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: Browsers.macOS('Desktop')
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                tentativas = 0; // Reset do contador quando QR é gerado (conexão está funcionando)
                console.log('--- QR CODE RECEBIDO ---');
                console.log('Escaneie o código abaixo com o seu WhatsApp:');
                qrcode.generate(qr, { small: true });

                console.log('\nOU use este link para ver o QR Code como imagem:');
                console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect.error)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`Conexão fechada. Motivo: ${lastDisconnect.error?.message} | StatusCode: ${statusCode} | Reconectando: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    const delayMs = tentativas * 3000; // Delay progressivo: 3s, 6s, 9s...
                    console.log(`Aguardando ${delayMs/1000}s antes de reconectar...`);
                    setTimeout(connectWhatsApp, delayMs);
                } else {
                    console.log("Você foi deslogado. Delete as credenciais no MongoDB manualmente se precisar re-autenticar.");
                    process.exit(1);
                }
            } else if (connection === 'open') {
                console.log('--- SUCESSO! ---');
                console.log('WhatsApp Autenticado e Conectado com Sucesso via Baileys API!');
                console.log('Sessão registrada definitivamente no MongoDB.');
                console.log('Você já pode fechar este terminal e rodar os envios no GitHub.');
                
                setTimeout(() => {
                    sock.ws.close();
                    mongoose.disconnect();
                    process.exit(0);
                }, 5000);
            }
        });
    }

    connectWhatsApp();

}).catch(err => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
});