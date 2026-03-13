const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');
const CustomMongoStore = require('./CustomMongoStore');
const mongoose = require('mongoose');

// 1. Receber os dados da API pelo GitHub Actions
const payloadStr = process.env.PAYLOAD;
if (!payloadStr) {
    console.error("ERRO: Nenhuma variável PAYLOAD foi fornecida pelo GitHub Actions.");
    process.exit(1);
}

let payload;
try {
    payload = JSON.parse(payloadStr);
} catch (e) {
    console.error("ERRO: O JSON de PAYLOAD recebido é inválido.", e);
    process.exit(1);
}

const {
    numero_whatsapp,
    mensagem_texto,
    foto_antes_url,
    foto_depois_url,
    session_id
} = payload;

if (!numero_whatsapp || !mensagem_texto || !session_id) {
    console.error("ERRO: Faltam campos obrigatórios no PAYLOAD (numero_whatsapp, mensagem_texto, session_id).");
    process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("ERRO: MONGODB_URI não configurado.");
    process.exit(1);
}
mongoose.connect(MONGODB_URI).then(() => {
    console.log(">> 1. Conectado ao MongoDB. Lendo sessão salva...");
    const store = new CustomMongoStore({ mongoose: mongoose });

    const client = new Client({
        authStrategy: new RemoteAuth({
            clientId: session_id, 
            store: store,
            backupSyncIntervalMs: 300000,
            dataPath: './.wwebjs_auth'
        }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            headless: true,
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

    client.on('qr', () => {
        console.error(`ERRO GRAVE: O WhatsApp não reconheceu a sessão '${session_id}' e pediu novo QR Code! A sessão atual expirou ou não existe.`);
        process.exit(1);
    });

    client.on('auth_failure', msg => {
        console.error('FALHA NA AUTENTICAÇÃO:', msg);
        process.exit(1);
    });

    client.once('ready', async () => {
        console.log('>> 2. WhatsApp Conectado com SUCESSO!\n');
        
        try {
            await new Promise(resolve => setTimeout(resolve, 5000));

            console.log(">> Aguardando estabilização completa da página do WhatsApp Web...");
            let isWWebJSReady = false;
            let checkAttempts = 0;
            
            while (!isWWebJSReady && checkAttempts < 15) {
                isWWebJSReady = await client.pupPage.evaluate(() => {
                    return typeof window.WWebJS !== 'undefined' && typeof window.WWebJS.getChat !== 'undefined';
                }).catch(() => false);

                if (!isWWebJSReady) {
                    console.log(`Aguardando injeção interna do WWebJS (Tentativa ${checkAttempts + 1}/15)...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    checkAttempts++;
                }
            }

            if (!isWWebJSReady) {
                console.error("Erro Fatal: O WhatsApp Web não estabilizou no servidor após diversas tentativas.");
                process.exit(1);
            }

            console.log(">> Página 100% estabilizada! Iniciando os disparos...\n");

            console.log(`Validando número do cliente: ${numero_whatsapp}...`);
            const numberDetails = await client.getNumberId(numero_whatsapp);
            
            if (!numberDetails) {
                 console.error(`Erro: O número ${numero_whatsapp} não possui um WhatsApp válido ou não foi encontrado.`);
                 process.exit(1);
            }

            const chatId = numberDetails._serialized;

            console.log(`Enviando mensagem de texto para o cliente: ${numero_whatsapp}...`);
            await client.sendMessage(chatId, mensagem_texto);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Pequena pausa

            if (foto_antes_url) {
                console.log("Baixando e enviando FOTO ANTES burlada...");
                try {
                    const mediaAntes = await MessageMedia.fromUrl(foto_antes_url, { unsafeMime: true });
                    await client.sendMessage(chatId, mediaAntes, { caption: "📸 *Foto Antes do Serviço*" });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (e) {
                    console.error("Erro ao enviar foto Antes:", e.message);
                }
            }

            if (foto_depois_url) {
                console.log("Baixando e enviando FOTO DEPOIS burlada...");
                try {
                    const mediaDepois = await MessageMedia.fromUrl(foto_depois_url, { unsafeMime: true });
                    await client.sendMessage(chatId, mediaDepois, { caption: "✨ *Foto Depois do Serviço*" });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (e) {
                    console.error("Erro ao enviar foto Depois:", e.message);
                }
            }

            console.log("✅ Todas as mensagens do Serviço enviadas com sucesso!");

            console.log(">> 5. Fechando cliente em 3 segundos...");
            setTimeout(() => {
                client.destroy();
                mongoose.disconnect();
                process.exit(0);
            }, 3000);

        } catch (error) {
            console.error("Erro geral durante o envio:", error);
            process.exit(1);
        }
    });

    client.initialize();
}).catch(err => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
});
