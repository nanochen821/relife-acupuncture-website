import {
    createHmac,
    pbkdf2Sync,
    timingSafeEqual
} from "node:crypto";


const SESSION_COOKIE_NAME = "relife_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

const PASSWORD_HASH_ALGORITHM = "sha256";
const PASSWORD_HASH_LENGTH = 32;


function getRequiredEnvironmentVariable(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}`
        );
    }

    return value;
}


function encodeBase64Url(value) {
    return Buffer
        .from(value)
        .toString("base64url");
}


function decodeBase64Url(value) {
    return Buffer.from(value, "base64url");
}


function safeCompareStrings(left, right) {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}


function createSignature(payload) {
    const secret = getRequiredEnvironmentVariable(
        "CMS_SESSION_SECRET"
    );

    return createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");
}


export function createSessionToken(username) {
    const now = Math.floor(Date.now() / 1000);

    const session = {
        username,
        issuedAt: now,
        expiresAt: now + SESSION_DURATION_SECONDS
    };

    const encodedPayload = encodeBase64Url(
        JSON.stringify(session)
    );

    const signature = createSignature(encodedPayload);

    return `${encodedPayload}.${signature}`;
}


export function verifySessionToken(token) {
    if (!token || typeof token !== "string") {
        return null;
    }

    const tokenParts = token.split(".");

    if (tokenParts.length !== 2) {
        return null;
    }

    const [encodedPayload, providedSignature] = tokenParts;
    const expectedSignature = createSignature(encodedPayload);

    if (
        !safeCompareStrings(
            providedSignature,
            expectedSignature
        )
    ) {
        return null;
    }

    try {
        const session = JSON.parse(
            decodeBase64Url(encodedPayload).toString("utf8")
        );

        const now = Math.floor(Date.now() / 1000);

        if (
            !session.username ||
            !Number.isInteger(session.expiresAt) ||
            session.expiresAt <= now
        ) {
            return null;
        }

        return session;
    } catch {
        return null;
    }
}


export function parseCookies(cookieHeader = "") {
    const cookies = {};

    for (const cookiePart of cookieHeader.split(";")) {
        const separatorIndex = cookiePart.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const name = cookiePart
            .slice(0, separatorIndex)
            .trim();

        const value = cookiePart
            .slice(separatorIndex + 1)
            .trim();

        if (!name) {
            continue;
        }

        cookies[name] = decodeURIComponent(value);
    }

    return cookies;
}


export function getSessionFromRequest(request) {
    const cookieHeader =
        request.headers.get("cookie") || "";

    const cookies = parseCookies(cookieHeader);
    const token = cookies[SESSION_COOKIE_NAME];

    return verifySessionToken(token);
}


export function createSessionCookie(token, requestUrl) {
    const isSecure = String(requestUrl).startsWith("https://");

    const attributes = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Strict",
        `Max-Age=${SESSION_DURATION_SECONDS}`
    ];

    if (isSecure) {
        attributes.push("Secure");
    }

    return attributes.join("; ");
}


export function createExpiredSessionCookie(requestUrl) {
    const isSecure = String(requestUrl).startsWith("https://");

    const attributes = [
        `${SESSION_COOKIE_NAME}=`,
        "Path=/",
        "HttpOnly",
        "SameSite=Strict",
        "Max-Age=0"
    ];

    if (isSecure) {
        attributes.push("Secure");
    }

    return attributes.join("; ");
}


export function verifyAdminCredentials(
    submittedUsername,
    submittedPassword
) {
    const expectedUsername = getRequiredEnvironmentVariable(
        "CMS_ADMIN_USERNAME"
    );

    const storedPasswordHash = getRequiredEnvironmentVariable(
        "CMS_ADMIN_PASSWORD_HASH"
    );

    if (
        !safeCompareStrings(
            submittedUsername,
            expectedUsername
        )
    ) {
        return false;
    }

    return verifyPasswordHash(
        submittedPassword,
        storedPasswordHash
    );
}


export function verifyPasswordHash(
    submittedPassword,
    storedPasswordHash
) {
    const parts = storedPasswordHash.split("$");

    if (parts.length !== 4) {
        throw new Error(
            "CMS_ADMIN_PASSWORD_HASH has an invalid format."
        );
    }

    const [
        scheme,
        iterationText,
        encodedSalt,
        encodedExpectedHash
    ] = parts;

    if (scheme !== "pbkdf2_sha256") {
        throw new Error(
            "Unsupported CMS password hash scheme."
        );
    }

    const iterations = Number.parseInt(
        iterationText,
        10
    );

    if (
        !Number.isInteger(iterations) ||
        iterations < 100000
    ) {
        throw new Error(
            "CMS password hash iteration count is invalid."
        );
    }

    const salt = Buffer.from(encodedSalt, "base64url");
    const expectedHash = Buffer.from(
        encodedExpectedHash,
        "base64url"
    );

    if (expectedHash.length !== PASSWORD_HASH_LENGTH) {
        throw new Error(
            "CMS password hash has an invalid length."
        );
    }

    const submittedHash = pbkdf2Sync(
        String(submittedPassword),
        salt,
        iterations,
        PASSWORD_HASH_LENGTH,
        PASSWORD_HASH_ALGORITHM
    );

    return timingSafeEqual(
        submittedHash,
        expectedHash
    );
}


export function jsonResponse(
    status,
    data,
    additionalHeaders = {}
) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",
                "Cache-Control":
                    "no-store, private",
                ...additionalHeaders
            }
        }
    );
}