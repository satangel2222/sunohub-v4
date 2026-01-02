export default async function handler(request, response) {
    return response.status(200).json({ status: "API S is working simple", id: request.query.id });
}
