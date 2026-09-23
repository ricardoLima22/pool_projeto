import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const payload = await req.json();

        const githubToken = process.env.GITHUB_ACTIONS_TOKEN;

        if (!githubToken) {
            console.error("GITHUB_ACTIONS_TOKEN não configurado no .env");
            return NextResponse.json({ 
                success: false,
                error: 'GitHub token missing', 
                details: 'A variável GITHUB_ACTIONS_TOKEN não está configurada no ambiente.' 
            });
        }

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

        // GitHub retorna 204 No Content em caso de sucesso (sem body)
        if (githubResponse.ok) {
            return NextResponse.json({ success: true, message: 'RPA Triggered' });
        }

        // Erro: lê o body como texto para não quebrar em body vazio
        const errText = await githubResponse.text();
        console.error(`[trigger-bot] GitHub Actions falhou — Status: ${githubResponse.status} | Body: ${errText}`);

        return NextResponse.json({ 
            success: false,
            error: 'Failed to trigger RPA', 
            github_status: githubResponse.status,
            details: errText || '(sem detalhes)'
        });

    } catch (error) {
        console.error("Erro na API trigger-bot:", error);
        return NextResponse.json({ success: false, error: 'Internal server error', details: error.message });
    }
}


