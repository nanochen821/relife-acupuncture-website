import {
    getSessionFromRequest,
    jsonResponse
} from "./_shared/admin-auth.mjs";


export default async function handler(request) {
    if (request.method !== "GET") {
        return jsonResponse(
            405,
            {
                ok: false,
                error: "Method not allowed."
            },
            {
                Allow: "GET"
            }
        );
    }

    try {
        const session = getSessionFromRequest(request);

        if (!session) {
            return jsonResponse(
                401,
                {
                    ok: false,
                    authenticated: false
                }
            );
        }

        return jsonResponse(
            200,
            {
                ok: true,
                authenticated: true,
                user: {
                    username: session.username
                },
                expiresAt: session.expiresAt
            }
        );
    } catch (error) {
        console.error(
            "[CMS Auth] Session verification error:",
            error
        );

        return jsonResponse(
            500,
            {
                ok: false,
                authenticated: false,
                error:
                    "The admin session service is not configured correctly."
            }
        );
    }
}