require('dotenv').config(); // Load environment variables for local testing
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

// Função que buscava as pendências
async function getPendingCompanyToAuthenticate() {
    console.log("-> Buscando empresas cadastradas no Supabase...");
    const { data: companies, error } = await supabase
        .from('companies')
        .select('name, whatsapp_session, created_at')
        .order('created_at', { ascending: true }); 

    if (error) {
        console.error("Erro ao consultar o Supabase:", error);
        process.exit(1);
    }

    if (!companies || companies.length === 0) {
        console.log("Nenhuma empresa encontrada no banco de dados.");
        process.exit(0);
    }

    // TODO (FASE 2): Reimplementar a verificação de sessão pendente baseada na estrutura do Baileys
    
    // Retornando a primeira pra fins de teste de estrutura
    return companies[0];
}

mongoose.connect(MONGODB_URI).then(async () => {
    console.log("-> Conectado ao MongoDB com sucesso.");
    
    // Descobre automaticamente quem precisa do QR Code agora
    const targetCompany = await getPendingCompanyToAuthenticate();

    if (!targetCompany) {
        console.log("\nTodas as empresas já possuem sessões salvas. Nenhuma autenticação pendente!");
        process.exit(0);
    }

    const session_id = targetCompany.whatsapp_session;
    console.log(`\n======================================================`);
    console.log(`INICIANDO AUTENTICAÇÃO (MIGRAÇÃO PARA BAILEYS): ${targetCompany.name}`);
    console.log(`SESSION ID: ${session_id}`);
    console.log(`======================================================\n`);

    // TODO (FASE 2): Instanciar a conexão usando @whiskeysockets/baileys
    // 1. Configurar AuthState no MongoDB ou Filesystem
    // 2. Criar a conexão socket (makeWASocket)
    // 3. Capturar o evento connection.update e exibir o QRCode
    console.log("--- A API Antiga (WWebJS) foi removida com sucesso. ---");
    console.log("--- Aguardando integração do Baileys na FASE 2... ---");
    
    // Desconectando por enquanto para o script não travar
    mongoose.disconnect();
    process.exit(0);

}).catch(err => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
});