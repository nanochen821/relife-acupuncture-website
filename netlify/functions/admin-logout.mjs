import {
    createExpiredSessionCookie,
    jsonResponse
} from "./_shared/admin-auth.mjs";


export default async function handler(request) {
    if (request.method !== "POST") {
        return jsonResponse(
            405,
            {
                ok: false,
                error: "Method not allowed."
            },
            {
                Allow: "POST"
            }
        );
    }

    return jsonResponse(
        200,
        {
            ok: true
        },
        {
            "Set-Cookie": createExpiredSessionCookie(
                request.url
            )
        }
    );
}