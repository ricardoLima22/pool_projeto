const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');

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
    session_id,
    piscineiro_id,
    customer_id,
    cliente_nome,
    status,
    data_agendada,
    tipo_servico,
    descricao
} = payload;

if (!piscineiro_id || !session_id) {
    console.error("ERRO: Faltam campos obrigatórios no PAYLOAD (piscineiro_id, session_id).");
    process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("ERRO: MONGODB_URI não configurado.");
    process.exit(1);
}
mongoose.connect(MONGODB_URI).then(async () => {
    console.log(">> 1. Conectado ao MongoDB. Lendo sessão salva...");

    let numeroDestino = null;
    let mensagem_texto = '';

    if (piscineiro_id) {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        // Priorizar a Chave de Serviço OBRIGATORIAMENTE para furar o bloqueio de RLS (Segurança)
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
        const isUsingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (SUPABASE_URL && SUPABASE_KEY) {
            console.log(`>> Buscando funcionário ID: ${piscineiro_id}`);
            console.log(`>> Usando Service Role Key? ${isUsingServiceRole ? 'SIM' : 'NÃO (Cuidado, o RLS vai bloquear)'}`);
            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
            
            // Buscar perfil
            const { data, error } = await supabase.from('profiles').select('phone').eq('id', piscineiro_id).single();

            
            if (error || !data || !data.phone) {
                console.error("Erro ao buscar funcionário no banco de dados ou telefone não cadastrado.", error || '');
                process.exit(1);
            }
            // Verificar se o número inclui o DDI explicitamente pelo caractere '+'
            let isInternational = data.phone.trim().startsWith('+');
            let wpLimpo = data.phone.replace(/\D/g, '');
            
            // Se for número nacional ou não tiver o '+', adicionamos o 55 como padrão
            if (!isInternational && wpLimpo.length <= 11) {
                wpLimpo = `55${wpLimpo}`;
            }
            numeroDestino = wpLimpo;
            console.log(`Número do funcionário encontrado com sucesso: ${numeroDestino}`);

            // Buscar Endereço do Cliente se tiver customer_id
            let nomeClienteMsg = cliente_nome || 'Não informado';
            let enderecoClienteMsg = 'Endereço não informado';

            if (customer_id) {
                const { data: customerData, error: customerError } = await supabase.from('customers').select('name, address').eq('id', customer_id).single();
                if (!customerError && customerData) {
                    nomeClienteMsg = customerData.name || nomeClienteMsg;
                    enderecoClienteMsg = customerData.address || enderecoClienteMsg;
                }
            }

            // Montar a mensagem do chamado
            mensagem_texto = `🚨 *Novo Chamado Atribuído*\n\n` +
                `*Cliente:* ${nomeClienteMsg}\n` +
                `*Endereço:* ${enderecoClienteMsg}\n` +
                `*Status:* ${status || 'PENDENTE'}\n` +
                `*Data Agendada:* ${data_agendada || 'A confirmar'}\n` +
                `*Tipo de Serviço:* ${tipo_servico || 'Geral'}\n` +
                `*Descrição / Observações:*\n${descricao || 'Sem observações'}`;

        } else {
            console.error("ERRO: A variável de ambiente SUPABASE_URL ou SUPABASE_KEY não está configurada no ambiente do GitHub Actions.");
            process.exit(1);
        }
    }

    if (!numeroDestino) {
        console.error("ERRO: Não foi possível determinar o número de destino (nem via numero_whatsapp nem no banco de dados).");
        process.exit(1);
    }

    const { useMongoDBAuthState } = require('./MongoAuthState');
    const makeWASocket = require('@whiskeysockets/baileys').default;
    const { DisconnectReason, delay } = require('@whiskeysockets/baileys');
    const pino = require('pino');

    const { state, saveCreds } = await useMongoDBAuthState(session_id);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Pool App Worker", "Chrome", "1.0.0"]
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
                let numeroLimpo = String(numeroDestino).replace(/\D/g, '');
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

                console.log(`Enviando mensagem de texto para o funcionário: ${numeroDestino}...`);
                await sock.sendMessage(result.jid, { text: mensagem_texto });
                await delay(2000);

                console.log("✅ Chamado notificado ao funcionário com sucesso!");
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
