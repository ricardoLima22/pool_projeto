require('dotenv').config(); // Load environment variables for local testing
const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const CustomMongoStore = require('./CustomMongoStore');
const { createClient } = require('@supabase/supabase-js');

// Database Configurations
const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!MONGODB_URI) {
    console.error("Erro: Variável de ambiente MONGODB_URI não configurada.");
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
     console.error("Erro: Variáveis SUPABASE_URL ou SUPABASE_KEY não configuradas.");
     process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Iniciando Verificação Automatizada de Sessões do WhatsApp...");

async function getPendingCompanyToAuthenticate(store) {
    console.log("-> Buscando empresas cadastradas no Supabase...");
    const { data: companies, error } = await supabase
        .from('companies')
        .select('name, whatsapp_session, created_at')
        .order('created_at', { ascending: true }); // Prioriza as mais antigas primeiro

    if (error) {
        console.error("Erro ao consultar o Supabase:", error);
        process.exit(1);
    }

    if (!companies || companies.length === 0) {
        console.log("Nenhuma empresa encontrada no banco de dados.");
        process.exit(0);
    }

    console.log(`Foram encontradas ${companies.length} empresas. Verificando sessões no MongoDB...`);

    for (const company of companies) {
        if (!company.whatsapp_session) {
            console.log(`- [PULADO] Empresa "${company.name}" não possui valor em whatsapp_session.`);
            continue;
        }

        // Verifica no MongoDB se a sessão (arquivos zip) já existe para este clientId
        const exists = await store.sessionExists({ session: company.whatsapp_session });
        
        if (!exists) {
            console.log(`- [PENDENTE] Empresa "${company.name}" (Sessão: ${company.whatsapp_session}) PRECISA SER AUTENTICADA!`);
            return company; // Retorna a primeira empresa que não tem sessão no Mongo
        } else {
            console.log(`- [OK] Empresa "${company.name}" (Sessão: ${company.whatsapp_session}) já está autenticada.`);
        }
    }

    return null; // Todo mundo tem a sessão salva no Mongo
}

mongoose.connect(MONGODB_URI).then(async () => {
    console.log("-> Conectado ao MongoDB com sucesso.");
    
    const store = new CustomMongoStore({ mongoose: mongoose });

    // Descobre automaticamente quem precisa do QR Code agora
    const targetCompany = await getPendingCompanyToAuthenticate(store);

    if (!targetCompany) {
        console.log("\nTodas as empresas já possuem sessões salvas. Nenhuma autenticação pendente!");
        process.exit(0);
    }

    const session_id = targetCompany.whatsapp_session;
    console.log(`\n======================================================`);
    console.log(`INICIANDO AUTENTICAÇÃO PARA: ${targetCompany.name}`);
    console.log(`SESSION ID: ${session_id}`);
    console.log(`======================================================\n`);

    const client = new Client({
        authStrategy: new RemoteAuth({
            clientId: session_id,
            store: store,
            backupSyncIntervalMs: 300000 
        }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            headless: true, // Importante para GitHub Actions
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log(`[ATENÇÃO] QR CODE gerado para a empresa: ${targetCompany.name}`);
        console.log("Escaneie o código abaixo com o WhatsApp do cliente:");
        qrcode.generate(qr, { small: true });
        
        console.log('\nOU use este link para ver o QR Code como imagem:');
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        console.log(`\nWhatsApp da empresa '${targetCompany.name}' está pronto e conectado!`);
        console.log('WhatsApp Conectado e Pronto!');
        // Aqui o bot não envia mensagens, apenas fecha porque o objetivo era só salvar a sessão.
        setTimeout(() => {
            console.log("Encerrando bot...");
            client.destroy();
            process.exit(0);
        }, 3000);
    });

    client.on('remote_session_saved', () => {
        console.log(`\nSESSÃO SALVA NO MONGODB  [${session_id}]`);
        console.log("A autenticação desta empresa foi finalizada. Na próxima vez que o script rodar, ela será pulada automaticamente!");
        setTimeout(() => {
            client.destroy();
            process.exit(0);
        }, 5000);
    });

    client.on('auth_failure', msg => {
        console.error('Falha de autenticação', msg);
    });

    client.initialize().catch(err => {
        console.error("Erro ao inicializar:", err);
        process.exit(1);
    });

}).catch(err => {
    console.error("Erro ao conectar no MongoDB:", err);
});