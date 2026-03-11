import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { url } = await req.json();
        
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Chama a API gratuita do TinyURL para encurtar o link
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        
        if (res.ok) {
            const shortUrl = await res.text();
            return NextResponse.json({ shortUrl });
        }
        
        // Se falhar o encurtador, retorna a URL original como fallback
        return NextResponse.json({ shortUrl: url });
    } catch (error) {
        console.error("Erro ao encurtar URL:", error);
        // Em caso de erro, devolvemos a URL original
        return NextResponse.json({ shortUrl: req.body?.url });
    }
}
