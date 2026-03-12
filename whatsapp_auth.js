const { Client, RemoteAuth } = require('whatsapp-web.js');
const CustomMongoStore = require('./CustomMongoStore');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');

// MongoDB URI from Environment Variable
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI environment variable not set.");
    process.exit(1);
}

console.log("Iniciando Autenticação WhatsApp (RemoteAuth)...");

mongoose.connect(MONGODB_URI).then(() => {
    console.log("Conectado ao MongoDB. Aguardando QR Code...");
    const store = new CustomMongoStore({ mongoose: mongoose });

    const client = new Client({
        authStrategy: new RemoteAuth({
            clientId: 'STC',
            store: store,
            backupSyncIntervalMs: 300000
        }),
        puppeteer: {
            headless: true, // Pode ser true mesmo para o QR code aparecer no terminal
            executablePath: process.platform === 'win32' ? null : (process.env.CHROME_PATH || '/usr/bin/google-chrome'),
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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