import path from "node:path";

import {
    getRepositoryFile,
    listRepositoryDirectory
} from "./_shared/github-client.mjs";

import {
    getSessionFromRequest,
    jsonResponse
} from "./_shared/admin-auth.mjs";


const ARTICLES_MANIFEST_PATH =
    "data/articles.json";
const ARTICLE_DRAFTS_DIRECTORY =
    "content/articles/drafts";

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

        const publishedPaths = JSON.parse(
            manifestFile.content
        );

        if (!Array.isArray(publishedPaths)) {
            throw new Error(
                "Article manifest must contain an array."
            );
        }

        const published = await loadArticlesFromPaths(
            publishedPaths,
            "published"
        );

        const draftEntries = await listRepositoryDirectory(
            ARTICLE_DRAFTS_DIRECTORY
        );

        const draftPaths = draftEntries
            .filter((entry) => (
                entry.type === "file" &&
                entry.name.toLowerCase().endsWith(".md")
            ))
            .map((entry) => entry.path);

        const drafts = await loadArticlesFromPaths(
            draftPaths,
            "draft"
        );

        return jsonResponse(
            200,
            {
                ok: true,
        
                // 暫時保留，避免現有前端立刻壞掉。
                articles: published,
        
                drafts,
                published
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

async function loadArticlesFromPaths(
    articlePaths,
    status
) {
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

        try {
            const document = parseMarkdownDocument(
                articleFile.content
            );

            articles.push({
                path: normalizedPath,
                filename: path.basename(normalizedPath),
                status,
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
        } catch (error) {
            console.warn(
                `[CMS Articles] Invalid article file: ${normalizedPath}`,
                error
            );
        }
    }

    return articles;
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