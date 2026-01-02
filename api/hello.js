export default async function handler(request, response) {
    // 1. Get ID from query
    const rawId = request.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
        return response.redirect('/');
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase Environment Variables');
            return response.redirect(`/song/${id}`);
        }

        // 2. Fetch Song Data (Native Fetch)
        const apiUrl = `${supabaseUrl}/rest/v1/songs?id=eq.${id}&select=*`;
        const fetchRes = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!fetchRes.ok) {
            throw new Error(`Supabase API error: ${fetchRes.status} ${fetchRes.statusText}`);
        }

        const data = await fetchRes.json();
        const song = data && data.length > 0 ? data[0] : null;

        if (!song) {
            console.error('Song not found in DB');
            return response.redirect(`/song/${id}`); // Fallback
        }

        // 3. Construct Rich Metadata HTML
        const title = `${song.title} - ${song.artist}`;
        const description = `Listen to this AI-generated masterpiece on SunoHub.`;
        const imageUrl = song.image_url;
        const audioUrl = song.audio_url;
        const appUrl = `https://sunohub-v4.vercel.app/song/${id}`;

        // 4. Build Redirect URL with Query Params
        const queryParams = new URLSearchParams(request.query);
        queryParams.delete('id');
        const queryString = queryParams.toString();
        const finalRedirectUrl = queryString ? `${appUrl}?${queryString}` : appUrl;

        const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        
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

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="${appUrl}" />
        <meta property="twitter:title" content="${title}" />
        <meta property="twitter:description" content="${description}" />
        <meta property="twitter:image" content="${imageUrl}" />
        <meta property="twitter:player" content="${appUrl}?embed=true" />
        <meta property="twitter:player:width" content="500" />
        <meta property="twitter:player:height" content="500" />

        <meta http-equiv="refresh" content="0;url=${finalRedirectUrl}" />
      </head>
      <body>
        <p>Redirecting to <a href="${finalRedirectUrl}">SunoHub Player</a>...</p>
        <script>window.location.href = "${finalRedirectUrl}";</script>
      </body>
      </html>
    `;

        response.setHeader('Content-Type', 'text/html');
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        return response.status(200).send(html);

    } catch (e) {
        console.error('API Error:', e);
        return response.status(500).json({ error: e.message, type: 'Manual Fetch Error' });
    }
}
