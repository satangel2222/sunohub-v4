export default function handler(request, response) {
    return response.status(200).json({
        version: process.version,
        hasFetch: typeof fetch !== 'undefined',
        env: {
            hasUrl: !!process.env.VITE_SUPABASE_URL
        }
    });
}
