export default async function handler(request, response) {
    const rawId = request.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) return response.status(400).json({ error: "Missing ID" });

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) { // Should not happen
            return response.status(500).json({ error: "Missing Env" });
        }

        const apiUrl = `${supabaseUrl}/rest/v1/songs?id=eq.${id}&select=*`;

        // Debug Information
        const debugInfo = { apiUrl, id };

        const fetchRes = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!fetchRes.ok) {
            return response.status(fetchRes.status).json({
                error: "Supabase Error",
                status: fetchRes.status,
                text: await fetchRes.text(),
                debug: debugInfo
            });
        }

        const data = await fetchRes.json();
        const song = data && data.length > 0 ? data[0] : null;

        if (!song) {
            return response.status(404).json({
                error: "Song Not Found in DB",
                data: data,
                debug: debugInfo
            });
        }

        const title = `${song.title} - ${song.artist}`;
        const appUrl = `https://sunohub-v4.vercel.app/song/${id}`;

        // Return JSON Success for verification (before HTML)
        return response.status(200).json({
            status: "Found",
            song: { title: song.title, artist: song.artist },
            og: { title, appUrl }
        });

    } catch (e) {
        return response.status(500).json({ error: e.message, stack: e.stack });
    }
}
