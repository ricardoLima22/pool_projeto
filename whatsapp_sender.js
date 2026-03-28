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
    const { DisconnectReason, delay, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
    const pino = require('pino');

    async function connectWhatsApp() {
        const collection = mongoose.connection.db.collection(session_id);
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

        let enviou = false;

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Conexão com WhatsApp foi fechada. Reconectar:', shouldReconnect);
                if (shouldReconnect) {
                    console.log("A API do WhatsApp solicitou um recomeço. Reconectando...");
                    setTimeout(connectWhatsApp, 2000);
                } else if (!enviou) {
                    console.error("Conexão caiu antes do envio concluir e não deve reconectar.");
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

                    if (foto_antes_url && foto_depois_url) {
                        console.log("-> 2 FOTOS DETECTADAS. Evitando fusão. Enviando como Álbum Nativo...");
                        try {
                            // Envia as duas URLs ao mesmo tempo, sem delay entre elas. 
                            // Isso força o Front-End do WhatsApp a agrupar visualmente as imagens num "Álbum/Grid".
                            const promiseAntes = sock.sendMessage(result.jid, { 
                                image: { url: foto_antes_url }, 
                                caption: "📸 *Antes*" 
                            });
                            
                            const promiseDepois = sock.sendMessage(result.jid, { 
                                image: { url: foto_depois_url }, 
                                caption: "✨ *Depois*" 
                            });

                            // Espera o envio síncrono dos dois pacotes
                            await Promise.all([promiseAntes, promiseDepois]);
                            await delay(3000);

                        } catch (e) {
                            console.error("Erro interno ao enviar as fotos. Revertendo para envio isolado:", e.message);
                            // Fallback de segurança
                            await sock.sendMessage(result.jid, { image: { url: foto_antes_url }, caption: "📸 *Antes*" });
                            await delay(2000);
                            await sock.sendMessage(result.jid, { image: { url: foto_depois_url }, caption: "✨ *Depois*" });
                            await delay(2000);
                        }
                    } else if (foto_antes_url || foto_depois_url) {
                        // Se mandou SOMENTE UMA FOTO
                        const u = foto_antes_url || foto_depois_url;
                        const leg = foto_antes_url ? "📸 *Foto do Serviço (Antes)*" : "✨ *Foto do Serviço (Depois)*";
                        console.log("-> Apenas 1 foto enviada. Ignorando mosaico.");
                        try {
                            await sock.sendMessage(result.jid, { image: { url: u }, caption: leg });
                            await delay(2000);
                        } catch (e) {
                            console.error("Erro ao enviar foto avulsa:", e.message);
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
    }

    connectWhatsApp();

}).catch(err => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
});
