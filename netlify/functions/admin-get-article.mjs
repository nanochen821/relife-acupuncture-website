import path from "node:path";

import {
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

        const body =
            await readRequestBody(request);

        const articlePath =
            validateDraftPath(body.path);

        const articleFile =
            await getRepositoryFile(articlePath);

        if (!articleFile) {
            return jsonResponse(
                404,
                {
                    ok: false,
                    error: "Draft article not found."
                }
            );
        }

        const article =
            parseMarkdownDocument(
                articleFile.content
            );

        article.path = articlePath;
        article.filename =
            path.basename(articlePath);

        return jsonResponse(
            200,
            {
                ok: true,
                article
            }
        );
    } catch (error) {
        console.error(
            "[CMS Get Article]",
            error
        );

        return jsonResponse(
            400,
            {
                ok: false,
                error:
                    error.message ||
                    "Unable to load article."
            }
        );
    }
}


async function readRequestBody(request) {
    let result;

    try {
        result = await request.json();
    } catch {
        throw new Error(
            "Request body must contain valid JSON."
        );
    }

    if (
        !result ||
        typeof result !== "object"
    ) {
        throw new Error(
            "Invalid request."
        );
    }

    return result;
}


function validateDraftPath(value) {

    const normalized =
        String(value || "")
            .replaceAll("\\", "/")
            .replace(/^\/+/, "");

    const expected =
        `${DRAFTS_DIRECTORY}/`;

    const filename =
        path.basename(normalized);

    if (
        !normalized.startsWith(expected) ||
        normalized !==
            `${expected}${filename}` ||
        normalized.includes("../") ||
        !filename.endsWith(".md")
    ) {
        throw new Error(
            "Invalid article path."
        );
    }

    return normalized;
}


function parseMarkdownDocument(source) {

    const normalized =
        source.replace(/\r\n?/g, "\n");

    const match =
        normalized.match(
            /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
        );

    if (!match) {
        throw new Error(
            "Invalid markdown document."
        );
    }

    const frontMatter =
        parseFrontMatter(match[1]);

    return {
        ...frontMatter,
        body: match[2].trim()
    };
}


function parseFrontMatter(source) {

    const result = {};

    const lines =
        source.split("\n");

    for (const line of lines) {

        const index =
            line.indexOf(":");

        if (index < 0) {
            continue;
        }

        const key =
            line.slice(0, index).trim();

        let value =
            line.slice(index + 1).trim();

        if (
            value.startsWith('"') &&
            value.endsWith('"')
        ) {
            try {
                value =
                    JSON.parse(value);
            } catch {}
        }

        if (value === "true") {
            value = true;
        }

        if (value === "false") {
            value = false;
        }

        result[key] = value;
    }

    return result;
}