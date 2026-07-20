import {
    createSessionCookie,
    createSessionToken,
    jsonResponse,
    verifyAdminCredentials
} from "./_shared/admin-auth.mjs";


const MAX_USERNAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 256;


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

    let body;

    try {
        body = await request.json();
    } catch {
        return jsonResponse(
            400,
            {
                ok: false,
                error: "Request body must be valid JSON."
            }
        );
    }

    const username =
        typeof body?.username === "string"
            ? body.username.trim()
            : "";

    const password =
        typeof body?.password === "string"
            ? body.password
            : "";

    if (!username || !password) {
        return jsonResponse(
            400,
            {
                ok: false,
                error: "Username and password are required."
            }
        );
    }

    if (
        username.length > MAX_USERNAME_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
    ) {
        return jsonResponse(
            400,
            {
                ok: false,
                error: "Invalid login credentials."
            }
        );
    }

    try {
        const isValid = verifyAdminCredentials(
            username,
            password
        );

        if (!isValid) {
            return jsonResponse(
                401,
                {
                    ok: false,
                    error: "Invalid username or password."
                }
            );
        }

        const sessionToken = createSessionToken(username);

        return jsonResponse(
            200,
            {
                ok: true,
                user: {
                    username
                }
            },
            {
                "Set-Cookie": createSessionCookie(
                    sessionToken,
                    request.url
                )
            }
        );
    } catch (error) {
        console.error(
            "[CMS Auth] Login configuration error:",
            error
        );

        return jsonResponse(
            500,
            {
                ok: false,
                error:
                    "The admin login service is not configured correctly."
            }
        );
    }
}