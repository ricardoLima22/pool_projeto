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
                    
                    let isBrazilian = false;
                    if (numeroLimpo.length === 11) {
                        const regexCelularBR = /^[1-9][1-9]9\d{8}$/;
                        if (regexCelularBR.test(numeroLimpo)) isBrazilian = true;
                    } else if (numeroLimpo.length === 10) {
                        const regexFixoBR = /^[1-9][1-9][2-8]\d{7}$/;
                        if (regexFixoBR.test(numeroLimpo)) isBrazilian = true;
                    } else if (numeroLimpo.length < 10) {
                        isBrazilian = true;
                    }

                    if (isBrazilian && !numeroLimpo.startsWith('55')) {
                        numeroLimpo = '55' + numeroLimpo;
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
                        console.log("-> 2 FOTOS DETECTADAS. Gerando Mosaico (Antes vs Depois) via Jimp para poupar rede...");
                        try {
                            const Jimp = require('jimp');
                            const imgA = await Jimp.read(foto_antes_url);
                            const imgD = await Jimp.read(foto_depois_url);

                            const targetHeight = 800; // Padronizar a altura
                            imgA.resize(Jimp.AUTO, targetHeight);
                            imgD.resize(Jimp.AUTO, targetHeight);

                            // Adicionando um espaço de 20px (divisória) entre as imagens
                            const divisorWidth = 20; 
                            const collageWidth = imgA.bitmap.width + imgD.bitmap.width + divisorWidth;
                            
                            // Fundo da lona escuro (Preto) para a divisória ficar visível
                            const collage = new Jimp(collageWidth, targetHeight, 0x000000FF);
                            
                            collage.composite(imgA, 0, 0);
                            // Cola a segunda imagem com 20px de margem, criando a divisória no meio
                            collage.composite(imgD, imgA.bitmap.width + divisorWidth, 0);

                            // --- DESCOMENTE OU COMENTE ESTE BLOCO ABAIXO CASO QUEIRA TESTAR COM/SEM O TEXTO NAS FOTOS ---
                            const comTextoEscritoNaFoto = true; // Flag pro seu Teste!

                            if (comTextoEscritoNaFoto) {
                                const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
                                const fontShadow = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
                                
                                // Função simples para "sombra" pra melhorar a leitura (Borda preta nas letras brancas)
                                function printWithShadow(x, y, text, w) {
                                    collage.print(fontShadow, x+3, y+3, { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, w, targetHeight);
                                    collage.print(font, x, y, { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, w, targetHeight);
                                }
                                
                                printWithShadow(0, 30, "ANTES", imgA.bitmap.width);
                                printWithShadow(imgA.bitmap.width + divisorWidth, 30, "DEPOIS", imgD.bitmap.width);
                            }
                            // --------------------------------------------------------------------------------------------

                            const imageBuffer = await collage.getBufferAsync(Jimp.MIME_JPEG);

                            console.log("-> Mosaico gerado com sucesso! Enviando 1 único pacote de Mídia...");
                            await sock.sendMessage(result.jid, { 
                                image: imageBuffer
                                //caption: " *FOTOS DO SERVIÇO (Antes e Depois)*" 
                            });
                            await delay(2000);

                        } catch (e) {
                            console.error("Erro interno do Jimp ao gerar Mosaico. Revertendo para envio isolado:", e.message);
                            // Fallback clássico
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
