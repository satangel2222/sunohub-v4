export default function handler(request, response) {
    const keys = Object.keys(process.env);
    const hasService = keys.some(k => k.includes('SERVICE') || k.includes('ADMIN') || k.includes('SECRET'));
    const serviceKeys = keys.filter(k => k.includes('SERVICE') || k.includes('ADMIN') || k.includes('SECRET'));
    return response.status(200).json({
        hasServiceRole: hasService,
        candidates: serviceKeys.map(k => k.split('_')[0] + '...') // Mask
    });
}
