export default function handler(request, response) {
    return response.status(200).json({
        message: "Env Probe",
        hasUrl: !!process.env.VITE_SUPABASE_URL,
        hasKey: !!process.env.VITE_SUPABASE_ANON_KEY,
        envKeys: Object.keys(process.env).filter(k => k.startsWith('VITE_'))
    });
}
