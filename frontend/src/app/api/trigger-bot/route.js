import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const payload = await req.json();

        // Variável de ambiente com o Personal Access Token do GitHub
        // Crie essa variável no seu painel da Vercel ou no .env.local
        const githubToken = process.env.GITHUB_ACTIONS_TOKEN;

        if (!githubToken) {
            console.error("GITHUB_ACTIONS_TOKEN não configurado no .env");
            return NextResponse.json({ 
                error: 'GitHub token missing', 
                details: 'A variável GITHUB_ACTIONS_TOKEN não está configurada no ambiente (Vercel/.env.local).' 
            }, { status: 500 });
        }

        // Repositório do seu Robô
        const githubRepo = "ricardoLima22/pool_projeto"; 

        const githubResponse = await fetch(`https://api.github.com/repos/${githubRepo}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${githubToken.trim()}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'pool_projeto-app'
            },
            body: JSON.stringify({
                event_type: 'send_whatsapp_notification',
                client_payload: payload 
            })
        });

        if (!githubResponse.ok) {
            const errText = await githubResponse.text();
            console.error("Erro ao chamar GitHub Actions:", githubResponse.status, errText);
            return NextResponse.json({ 
                error: 'Failed to trigger RPA', 
                github_status: githubResponse.status,
                details: errText 
            }, { status: githubResponse.status });
        }

        return NextResponse.json({ success: true, message: 'RPA Triggered' });

    } catch (error) {
        console.error("Erro na API trigger-bot:", error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

