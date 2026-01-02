import { createClient } from '@supabase/supabase-js';

export default async function handler(request: any, response: any) {
    // 1. Get ID from query
    const rawId = request.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    if (!id) {
        return response.redirect('/');
    }

    try {
        // 2. Init Supabase (Using env vars injected by Vercel)
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. Fetch Song Data
        const { data: song, error } = await supabase
            .from('songs')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !song) {
            console.error('Song not found:', error);
            return response.redirect(`/song/${id}`); // Fallback
        }

        // 4. Construct Rich Metadata HTML
        const title = `${song.title} - ${song.artist}`;
        const description = `Listen to this AI-generated masterpiece on SunoHub.`;
        const imageUrl = song.image_url;
        const audioUrl = song.audio_url;
        const appUrl = `https://sunohub-v4.vercel.app/song/${id}`;

        const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="music.song" />
        <meta property="og:url" content="${appUrl}" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:audio" content="${audioUrl}" />
        <meta property="og:audio:secure_url" content="${audioUrl}" />
        <meta property="og:audio:type" content="audio/mpeg" />
        <meta property="music:musician" content="${song.artist}" />
        <meta property="music:duration" content="${song.duration || 200}" />

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="${appUrl}" />
        <meta property="twitter:title" content="${title}" />
        <meta property="twitter:description" content="${description}" />
        <meta property="twitter:image" content="${imageUrl}" />
        <meta property="twitter:player" content="${appUrl}?embed=true" />
        <meta property="twitter:player:width" content="500" />
        <meta property="twitter:player:height" content="500" />

        <!-- Redirect for Humans -->
        <meta http-equiv="refresh" content="0;url=${appUrl}" />
      </head>
      <body>
        <p>Redirecting to <a href="${appUrl}">SunoHub Player</a>...</p>
        <script>window.location.href = "${appUrl}";</script>
      </body>
      </html>
    `;

        // 5. Send Response
        response.setHeader('Content-Type', 'text/html');
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // Cache for speed
        return response.status(200).send(html);

    } catch (e) {
        console.error('API Error:', e);
        return response.redirect(`/song/${id}`);
    }
}
