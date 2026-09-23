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
    const pino = require('pino');

    async function connectWhatsApp() {
        // Dynamic import to support ESM format required by newer Baileys versions
        const baileys = await import('@whiskeysockets/baileys');
        const makeWASocket = baileys.default;
        const { DisconnectReason, delay } = baileys;

        const collection = mongoose.connection.db.collection(session_id);
        const { state, saveCreds } = await useMongoDBAuthState(collection);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: ["Ubuntu", "Chrome", "22.04"]
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
                        console.log("-> 2 FOTOS DETECTADAS. Gerando Mosaico (Antes vs Depois) via sharp...");
                        try {
                            const sharp = require('sharp');
                            const https = require('https');
                            const http = require('http');

                            // Baixa uma imagem de URL como Buffer
                            function downloadImage(url) {
                                return new Promise((resolve, reject) => {
                                    const client = url.startsWith('https') ? https : http;
                                    client.get(url, (res) => {
                                        if (res.statusCode !== 200) {
                                            reject(new Error(`Download falhou: HTTP ${res.statusCode} para ${url}`));
                                            res.resume();
                                            return;
                                        }
                                        const chunks = [];
                                        res.on('data', chunk => chunks.push(chunk));
                                        res.on('end', () => resolve(Buffer.concat(chunks)));
                                        res.on('error', reject);
                                    }).on('error', reject);
                                });
                            }

                            const targetHeight = 800;
                            const divisorWidth = 20;

                            // Baixa as duas fotos em paralelo
                            const [bufA, bufD] = await Promise.all([
                                downloadImage(foto_antes_url),
                                downloadImage(foto_depois_url)
                            ]);

                            // Redimensiona ambas para a mesma altura preservando proporção
                            // .png() garante buffer decodificado (lossless) para o composite — evita erro de 'raw bytes' com JPEG
                            const [resizedA, resizedD] = await Promise.all([
                                sharp(bufA).resize({ height: targetHeight }).png().toBuffer({ resolveWithObject: true }),
                                sharp(bufD).resize({ height: targetHeight }).png().toBuffer({ resolveWithObject: true })
                            ]);

                            const totalWidth = resizedA.info.width + resizedD.info.width + divisorWidth;

                            // Cria SVG de texto com efeito de sombra (texto preto deslocado + branco por cima)
                            function createTextSVG(text, width, height) {
                                const cx = Math.round(width / 2);
                                return Buffer.from(
                                    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
                                    `<text x="${cx + 3}" y="73" font-family="Arial Black, Arial, sans-serif" font-size="64" font-weight="bold" text-anchor="middle" fill="black">${text}</text>` +
                                    `<text x="${cx}" y="70" font-family="Arial Black, Arial, sans-serif" font-size="64" font-weight="bold" text-anchor="middle" fill="white">${text}</text>` +
                                    `</svg>`
                                );
                            }

                            const svgAntes  = createTextSVG('ANTES',  resizedA.info.width, targetHeight);
                            const svgDepois = createTextSVG('DEPOIS', resizedD.info.width, targetHeight);

                            // Cria canvas preto e compõe as duas imagens + labels lado a lado com divisória de 20px
                            const imageBuffer = await sharp({
                                create: {
                                    width: totalWidth,
                                    height: targetHeight,
                                    channels: 3,
                                    background: { r: 0, g: 0, b: 0 }
                                }
                            })
                            .composite([
                                { input: resizedA.data, left: 0, top: 0 },
                                { input: resizedD.data, left: resizedA.info.width + divisorWidth, top: 0 },
                                { input: svgAntes,  top: 0, left: 0 },
                                { input: svgDepois, top: 0, left: resizedA.info.width + divisorWidth }
                            ])
                            .jpeg({ quality: 85 })
                            .toBuffer();

                            console.log("-> Mosaico gerado com sucesso via sharp! Enviando 1 único pacote de Mídia...");
                            await sock.sendMessage(result.jid, {
                                image: imageBuffer
                                //caption: " *FOTOS DO SERVIÇO (Antes e Depois)*"
                            });
                            await delay(2000);

                        } catch (e) {
                            console.error("Erro interno do sharp ao gerar Mosaico. Revertendo para envio isolado:", e.message);
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
                    
                    console.log(">> 3. Aguardando 10 segundos para troca de chaves criptográficas (PreKeys)... Fechando conexão em breve.");
                    setTimeout(() => {
                        sock.ws.close();
                        mongoose.disconnect();
                        process.exit(0);
                    }, 10000);

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
