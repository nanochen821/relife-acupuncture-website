import path from "node:path";

import {
    getRepositoryFile
} from "./_shared/github-client.mjs";

import {
    getSessionFromRequest,
    jsonResponse
} from "./_shared/admin-auth.mjs";


const ARTICLES_MANIFEST_PATH =
    "data/articles.json";


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
                    authenticated: false,
                    error: "Authentication required."
                }
            );
        }

        const manifestFile = await getRepositoryFile(
            ARTICLES_MANIFEST_PATH
        );

        if (!manifestFile) {
            throw new Error(
                "Article manifest could not be found."
            );
        }

        const articlePaths = JSON.parse(
            manifestFile.content
        );

        if (!Array.isArray(articlePaths)) {
            throw new Error(
                "Article manifest must contain an array."
            );
        }

        const articles = [];

        for (const articlePath of articlePaths) {
            if (typeof articlePath !== "string") {
                continue;
            }

            const normalizedPath = normalizeProjectPath(
                articlePath
            );

            const articleFile = await getRepositoryFile(
                normalizedPath
            );

            if (!articleFile) {
                console.warn(
                    `[CMS Articles] Article file not found: ${normalizedPath}`
                );

                continue;
            }

            const source = articleFile.content;

            const document = parseMarkdownDocument(source);

            articles.push({
                path: normalizedPath.replaceAll("\\", "/"),
                filename: path.basename(normalizedPath),
                title:
                    document.frontMatter.title ||
                    path.basename(
                        normalizedPath,
                        path.extname(normalizedPath)
                    ),
                date:
                    document.frontMatter.date ||
                    null,
                description:
                    document.frontMatter.summary ||
                    document.frontMatter.description ||
                    document.frontMatter.excerpt ||
                    "",
                slug:
                    document.frontMatter.slug ||
                    path.basename(
                        normalizedPath,
                        path.extname(normalizedPath)
                    )
            });
        }

        return jsonResponse(
            200,
            {
                ok: true,
                articles
            },
            {
                "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",
                Pragma: "no-cache",
                Expires: "0"
            }
        );
    } catch (error) {
        console.error(
            "[CMS Articles] Failed to load article list:",
            error
        );

        return jsonResponse(
            500,
            {
                ok: false,
                error: "Unable to load articles."
            }
        );
    }
}


function normalizeProjectPath(value) {
    const normalizedPath = String(value)
        .replaceAll("\\", "/")
        .replace(/^\/+/, "");

    const pathParts = normalizedPath.split("/");

    if (
        !normalizedPath ||
        pathParts.includes("..") ||
        pathParts.includes(".")
    ) {
        throw new Error(
            `Unsafe article path: ${value}`
        );
    }

    return normalizedPath;
}


function parseMarkdownDocument(source) {
    const normalizedSource = source.replace(
        /^\uFEFF/,
        ""
    );

    const match = normalizedSource.match(
        /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)([\s\S]*)$/
    );

    if (!match) {
        throw new Error(
            "Missing or invalid YAML front matter."
        );
    }

    return {
        frontMatter: parseSimpleFrontMatter(match[1]),
        body: match[2].trim()
    };
}


function parseSimpleFrontMatter(source) {
    const result = {};
    const lines = source.split(/\r?\n/);

    for (const line of lines) {
        if (
            !line.trim() ||
            line.trimStart().startsWith("#")
        ) {
            continue;
        }

        const match = line.match(
            /^([A-Za-z0-9_-]+):\s*(.*)$/
        );

        if (!match) {
            continue;
        }

        const [, key, rawValue] = match;

        result[key] = parseFrontMatterValue(
            rawValue.trim()
        );
    }

    return result;
}


function parseFrontMatterValue(value) {
    if (
        value.startsWith('"') &&
        value.endsWith('"')
    ) {
        return value.slice(1, -1);
    }

    if (
        value.startsWith("'") &&
        value.endsWith("'")
    ) {
        return value.slice(1, -1);
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    if (value === "null" || value === "") {
        return null;
    }

    return value;
}