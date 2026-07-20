import path from "node:path";

import {
    deleteRepositoryFile,
    getRepositoryFile
} from "./_shared/github-client.mjs";

import {
    getSessionFromRequest,
    jsonResponse
} from "./_shared/admin-auth.mjs";


const DRAFTS_DIRECTORY =
    "content/articles/drafts";


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

    try {
        const session =
            getSessionFromRequest(request);

        if (!session) {
            return jsonResponse(
                401,
                {
                    ok: false,
                    authenticated: false,
                    error: "Authentication required."
                }
            );
        }

        const requestBody =
            await readRequestBody(request);

        const draftPath =
            validateDraftPath(
                requestBody.path
            );

        const draftFile =
            await getRepositoryFile(
                draftPath
            );

        if (!draftFile) {
            return jsonResponse(
                404,
                {
                    ok: false,
                    error:
                        "Draft article could not be found."
                }
            );
        }

        const filename =
            path.basename(draftPath);

        await deleteRepositoryFile({
            filePath: draftPath,
            commitMessage:
                `content: delete article draft ${filename}`,
            expectedSha: draftFile.sha
        });

        return jsonResponse(
            200,
            {
                ok: true,
                article: {
                    filename,
                    path: draftPath,
                    status: "deleted"
                }
            }
        );
    } catch (error) {
        console.error(
            "[CMS Delete Article] Failed to delete draft:",
            error
        );

        if (
            error.code === "INVALID_DRAFT_PATH" ||
            error.code === "INVALID_REQUEST_BODY"
        ) {
            return jsonResponse(
                400,
                {
                    ok: false,
                    error: error.message
                }
            );
        }

        if (error.code === "FILE_NOT_FOUND") {
            return jsonResponse(
                404,
                {
                    ok: false,
                    error:
                        "Draft article could not be found."
                }
            );
        }

        return jsonResponse(
            500,
            {
                ok: false,
                error:
                    "Unable to delete article draft."
            }
        );
    }
}


async function readRequestBody(request) {
    let result;

    try {
        result =
            await request.json();
    } catch {
        throw createRequestError(
            "Request body must contain valid JSON."
        );
    }

    if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
    ) {
        throw createRequestError(
            "Article data is required."
        );
    }

    return result;
}


function validateDraftPath(value) {
    const normalizedPath =
        String(value || "")
            .replaceAll("\\", "/")
            .replace(/^\/+/, "");

    const expectedPrefix =
        `${DRAFTS_DIRECTORY}/`;

    const filename =
        path.basename(normalizedPath);

    if (
        !normalizedPath.startsWith(expectedPrefix) ||
        normalizedPath.includes("../") ||
        normalizedPath.includes("/./") ||
        normalizedPath !==
            `${expectedPrefix}${filename}` ||
        !filename.toLowerCase().endsWith(".md")
    ) {
        const error =
            new Error(
                "A valid draft article path is required."
            );

        error.code =
            "INVALID_DRAFT_PATH";

        throw error;
    }

    return normalizedPath;
}


function createRequestError(message) {
    const error =
        new Error(message);

    error.code =
        "INVALID_REQUEST_BODY";

    return error;
}