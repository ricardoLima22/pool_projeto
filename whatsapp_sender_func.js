const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');
const CustomMongoStore = require('./CustomMongoStore');
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
        
        if (SUPABASE_URL && SUPABASE_KEY) {
            console.log(">> Buscando número do funcionário e endereço do cliente no Supabase...");
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
            executablePath: process.platform === 'win32' ? null : (process.env.CHROME_PATH || '/usr/bin/google-chrome'),
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

            console.log(`Validando número de destino: ${numeroDestino}...`);
            const numberDetails = await client.getNumberId(numeroDestino);
            
            if (!numberDetails) {
                 console.error(`Erro: O número ${numeroDestino} não possui um WhatsApp válido ou não foi encontrado.`);
                 process.exit(1);
            }

            const chatId = numberDetails._serialized;

            console.log(`Enviando detalhes do chamado para o funcionário: ${numeroDestino}...`);
            await client.sendMessage(chatId, mensagem_texto);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Pequena pausa

            console.log("✅ Chamado enviado com sucesso para o funcionário!");

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
