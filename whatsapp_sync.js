require('dotenv').config();
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const { useMongoDBAuthState } = require('./MongoAuthState');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

// Database Configurations
const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
// Tenta usar a SERVICE_ROLE (com bypass de RLS) para conseguir acessar TODAS as empresas
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: Variáveis de ambiente MONGODB_URI, SUPABASE_URL ou SUPABASE_KEY não configuradas.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAllActiveCompanies() {
    console.log("-> Buscando todas as sessões registradas no Supabase...");
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

    const activeCompanies = [];

    console.log(`Verificando credenciais válidas no MongoDB para ${companies.length} empresa(s)...`);

    for (const company of companies) {
        if (!company.whatsapp_session) continue;
        
        // Verifica se a empresa tem uma sessão ativa no MongoDB
        const collection = mongoose.connection.db.collection(company.whatsapp_session);
        const exists = await collection.findOne({ _id: 'creds' });
        
        if (exists) {
            activeCompanies.push(company);
        }
    }

    return activeCompanies;
}

// Faz a fila de sincronização (um por vez pra nao sobrecarregar a memória do GitHub Action)
async function syncSession(company) {
    return new Promise(async (resolve, reject) => {
        let sessionConnected = false;
        let intentionalClose = false;
        console.log(`\n======================================================`);
        console.log(`[PULSO DE SAÚDE] Sincronizando: ${company.name}`);
        console.log(`SESSION ID: ${company.whatsapp_session}`);
        console.log(`======================================================\n`);

        async function connectWhatsApp() {
            const collection = mongoose.connection.db.collection(company.whatsapp_session);
            const { state, saveCreds } = await useMongoDBAuthState(collection);
            const { version } = await fetchLatestBaileysVersion();

            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS('Desktop')
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'close') {
                    if (intentionalClose) {
                        console.log(`Conexão encerrada intencionalmente (Sincronização OK). Avançando...`);
                        resolve();
                        return;
                    }

                    const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log(`Conexão fechada (${company.name}). Motivo: `, lastDisconnect.error?.message, ', Reconectando:', shouldReconnect);
                    
                    if (shouldReconnect) {
                        console.log("API solicitou recomeço. Reconectando silenciosamente...");
                        setTimeout(connectWhatsApp, 2000);
                    } else if (sessionConnected) {
                        // Se foi fechada manualmente por nós após o sync, sucesso!
                        resolve();
                    } else {
                        console.log(`Sessão do ${company.name} estava desconectada ou obsoleta. Ignorando.`);
                        resolve(); // Pula para a próxima empresa
                    }
                } else if (connection === 'open') {
                    console.log(`Sessão de ${company.name} aberta com sucesso!`);
                    console.log(`Aguardando ~15 segundos para atualizar as chaves Pendentes (Pre-Keys e Sync).`);
                    sessionConnected = true;
                    
                    setTimeout(() => {
                        console.log(`[OK] Pulso Concluído para ${company.name}. Fechando WebSocket graciosamente...`);
                        intentionalClose = true;
                        sock.ws.close();
                    }, 15000);
                }
            });
        }

        connectWhatsApp();
    });
}

mongoose.connect(MONGODB_URI).then(async () => {
    console.log("-> Conectado ao MongoDB com sucesso.");
    
    // Lista as empresas prontas
    const companies = await getAllActiveCompanies();

    if (companies.length === 0) {
        console.log("\nNenhuma empresa possui autenticação de WhatsApp salva atualmente. Pulando Sincronização.");
        mongoose.disconnect();
        process.exit(0);
    }

    console.log(`\n### Iniciando Roteiro de Sincronização em Lote (${companies.length} aparelhos ativos) ###\n`);

    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        console.log(`[Executando ${i + 1}/${companies.length}]...`);
        // Roda uma sessão por vez e aguarda terminar a promessa (espera desconectar pra abrir o outro)
        await syncSession(company);
        console.log(`Esperando 5s antes de pular para o próximo aparelho...`);
        await new Promise(res => setTimeout(res, 5000));
    }

    console.log("\n### ROTINA DE SAÚDE COMPLETA! TODAS AS CHAVES FORAM ATUALIZADAS. ###\n");
    mongoose.disconnect();
    process.exit(0);

}).catch(err => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
});
