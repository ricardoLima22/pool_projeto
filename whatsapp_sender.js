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

mongoose.connect(MONGODB_URI).then(async () => {
    console.log(">> 1. Conectado ao MongoDB. Mongoose pronto.");
    
    const { useMongoDBAuthState } = require('./MongoAuthState');
    const makeWASocket = require('@whiskeysockets/baileys').default;
    const { DisconnectReason, delay, Browsers } = require('@whiskeysockets/baileys');
    const pino = require('pino');

    const { state, saveCreds } = await useMongoDBAuthState(session_id);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS('Desktop')
    });

    sock.ev.on('creds.update', saveCreds);

    let enviou = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão com WhatsApp foi fechada. Reconectar:', shouldReconnect);
            if (!enviou) {
                console.error("Conexão caiu antes do envio concluir.");
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log('>> 2. Conexão Socket aberta!');

            try {
                // Formatação correta para o padrão Baileys (JID)
                let numeroLimpo = String(numero_whatsapp).replace(/\D/g, '');
                if (numeroLimpo.length <= 11) {
                    if (!numeroLimpo.startsWith('55')) {
                        numeroLimpo = '55' + numeroLimpo;
                    }
                }
                const jid = `${numeroLimpo}@s.whatsapp.net`;

                // Verifica se o número existe no Whatsapp
                console.log(`Verificando se o número ${jid} está registrado no WhatsApp...`);
                const [result] = await sock.onWhatsApp(jid);
                
                if (!result || !result.exists) {
                    console.error(`Erro: O número ${numeroLimpo} não possui um WhatsApp válido ou não foi encontrado.`);
                    process.exit(1);
                }

                console.log(`Enviando mensagem de texto para o cliente: ${numero_whatsapp}...`);
                await sock.sendMessage(result.jid, { text: mensagem_texto });
                await delay(2000);

                if (foto_antes_url) {
                    console.log("Baixando e enviando FOTO ANTES...");
                    try {
                        await sock.sendMessage(result.jid, { 
                            image: { url: foto_antes_url }, 
                            caption: "📸 *Foto Antes do Serviço*" 
                        });
                        await delay(2000);
                    } catch (e) {
                        console.error("Erro ao enviar foto Antes:", e.message);
                    }
                }

                if (foto_depois_url) {
                    console.log("Baixando e enviando FOTO DEPOIS...");
                    try {
                        await sock.sendMessage(result.jid, { 
                            image: { url: foto_depois_url }, 
                            caption: "✨ *Foto Depois do Serviço*" 
                        });
                        await delay(2000);
                    } catch (e) {
                        console.error("Erro ao enviar foto Depois:", e.message);
                    }
                }

                console.log("✅ Todas as mensagens do Serviço enviadas com sucesso!");
                enviou = true;
                
                console.log(">> 3. Fechando conexão em 3 segundos...");
                setTimeout(() => {
                    sock.ws.close();
                    mongoose.disconnect();
                    process.exit(0);
                }, 3000);

            } catch (err) {
                console.error("Erro geral durante o envio das mensagens:", err);
                process.exit(1);
            }
        }
    });

}).catch(err => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
});
