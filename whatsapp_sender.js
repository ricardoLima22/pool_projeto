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
    console.log(">> 1. Conectado ao MongoDB. Mongoose pronto.");
    
    // TODO (FASE 2): Reimplementar o envio via Baileys
    // 1. Instanciar o estado de autenticação (usando o session_id)
    // 2. Conectar via makeWASocket()
    // 3. Formatar o número do destinatário corretamente (ex: 551199999999@s.whatsapp.net)
    // 4. Mapear o envio de texto e envio das imagens (foto_antes_url e foto_depois_url)
    
    console.log("--- A API Antiga (WWebJS) foi removida com sucesso. ---");
    console.log("--- Aguardando integração do Baileys na FASE 2... ---");
    
    // Simulando sucesso e desativando no GitHub Flow temporariamente
    console.log("Saindo do processo sem realizar envios legados...");
    mongoose.disconnect();
    process.exit(0);

}).catch(err => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
});
