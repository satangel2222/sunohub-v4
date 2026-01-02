export default async function handler(request, response) {
    try {
        const start = Date.now();
        const google = await fetch('https://www.google.com');
        const duration = Date.now() - start;

        return response.status(200).json({
            message: "Fetch Probe",
            node: process.version,
            fetchStatus: google.status,
            duration: duration,
            env: {
                hasUrl: !!process.env.VITE_SUPABASE_URL
            }
        });
    } catch (e) {
        return response.status(500).json({ error: e.message, stack: e.stack });
    }
}
