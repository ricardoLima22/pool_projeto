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

        // Verifica no MongoDB se a sessão (arquivos zip) já existe para este clientId.
        // Importante: A biblioteca 'whatsapp-web.js' adiciona o prefixo 'RemoteAuth-' automaticamente na hora de salvar, 
        // então precisamos testar a string inteira na hora de perguntar ao MongoStore se existe.
        const exists = await store.sessionExists({ session: `RemoteAuth-${company.whatsapp_session}` });
        
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
        puppeteer: {
            headless: true, // Importante para GitHub Actions
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-features=site-per-process'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('--- QR CODE RECEBIDO ---');
        console.log('Escaneie o código abaixo com o seu WhatsApp:');
        qrcode.generate(qr, { small: true });

        // Link alternativo para caso o terminal não renderize bem
        console.log('\nOU use este link para ver o QR Code como imagem:');
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        console.log('WhatsApp Conectado e Pronto!');
        console.log('Aguardando a confirmação de salvamento da sessão no MongoDB...');
    });

    client.on('remote_session_saved', () => {
        console.log('SUCESSO: Sessão salva remotamente no MongoDB!');
        console.log('Você já pode fechar este terminal e rodar no GitHub.');

        // Aguarda 5 segundos extras por precaução e fecha
        setTimeout(() => {
            console.log('Encerrando...');
            client.destroy();
            mongoose.disconnect();
            process.exit(0);
        }, 5000);
    });

    client.on('auth_failure', msg => {
        console.error('FALHA NA AUTENTICAÇÃO:', msg);
        process.exit(1);
    });

    client.on('authenticated', () => {
        console.log('Autenticado com sucesso!');
    });

    client.initialize();
}).catch(err => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
});