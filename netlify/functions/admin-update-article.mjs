import path from "node:path";

import {
    getRepositoryFile,
    updateRepositoryFile
} from "./_shared/github-client.mjs";

import {
    getSessionFromRequest,
    jsonResponse
} from "./_shared/admin-auth.mjs";


const ARTICLE_DRAFTS_DIRECTORY =
    "content/articles/drafts";

const DEFAULT_AUTHOR =
    "ReLife Acupuncture";

const DEFAULT_CATEGORY =
    "Wellness";


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

        const articlePath =
            validateDraftPath(requestBody.path);

        const existingFile =
            await getRepositoryFile(articlePath);

        if (!existingFile) {
            return jsonResponse(
                404,
                {
                    ok: false,
                    error: "Draft article not found."
                }
            );
        }

        const existingArticle =
            parseMarkdownDocument(
                existingFile.content
            );

        const article =
            validateArticleInput(
                requestBody
            );

        const markdown =
            createMarkdownDocument({
                ...article,
                slug:
                    existingArticle.slug ||
                    createArticleSlug(article.title)
            });

        await updateRepositoryFile({
            filePath: articlePath,
            content: markdown,
            commitMessage:
                `content: update article draft ${article.title}`,
            expectedSha: existingFile.sha
        });

        return jsonResponse(
            200,
            {
                ok: true,
                article: {
                    title: article.title,
                    date: article.date,
                    path: articlePath,
                    filename: path.basename(articlePath),
                    status: "draft",
                    summary: article.summary
                }
            }
        );
    } catch (error) {
        console.error(
            "[CMS Update Article] Failed to update article:",
            error
        );

        if (
            error.code === "INVALID_ARTICLE" ||
            error.code === "INVALID_DRAFT_PATH"
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
                    error: "Draft article not found."
                }
            );
        }

        return jsonResponse(
            500,
            {
                ok: false,
                error: "Unable to update article."
            }
        );
    }
}


async function readRequestBody(request) {
    let result;

    try {
        result = await request.json();
    } catch {
        throw createValidationError(
            "Request body must contain valid JSON."
        );
    }

    if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
    ) {
        throw createValidationError(
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
        `${ARTICLE_DRAFTS_DIRECTORY}/`;

    const filename =
        path.basename(normalizedPath);

    if (
        !normalizedPath.startsWith(expectedPrefix) ||
        normalizedPath !==
            `${expectedPrefix}${filename}` ||
        normalizedPath.includes("../") ||
        normalizedPath.includes("/./") ||
        !filename.toLowerCase().endsWith(".md")
    ) {
        const error = new Error(
            "A valid draft article path is required."
        );

        error.code = "INVALID_DRAFT_PATH";

        throw error;
    }

    return normalizedPath;
}


function validateArticleInput(value) {
    const title =
        normalizeText(value.title);

    const date =
        normalizeText(value.date);

    const category =
        normalizeText(value.category) ||
        DEFAULT_CATEGORY;

    const author =
        normalizeText(value.author) ||
        DEFAULT_AUTHOR;

    const summary =
        normalizeText(
            value.summary ?? value.description
        );

    const body =
        normalizeMultilineText(value.body);

    const image =
        normalizeText(value.image);

    const imageAlt =
        normalizeText(value.imageAlt);

    if (!title) {
        throw createValidationError(
            "Article title is required."
        );
    }

    if (title.length > 180) {
        throw createValidationError(
            "Article title is too long."
        );
    }

    if (!isValidDate(date)) {
        throw createValidationError(
            "Article date must use YYYY-MM-DD format."
        );
    }

    if (!body) {
        throw createValidationError(
            "Article content is required."
        );
    }

    if (summary.length > 500) {
        throw createValidationError(
            "Article summary is too long."
        );
    }

    if (category.length > 100) {
        throw createValidationError(
            "Article category is too long."
        );
    }

    if (author.length > 100) {
        throw createValidationError(
            "Article author is too long."
        );
    }

    if (image.length > 500) {
        throw createValidationError(
            "Article image path is too long."
        );
    }

    if (imageAlt.length > 300) {
        throw createValidationError(
            "Article image description is too long."
        );
    }

    if (image && !imageAlt) {
        throw createValidationError(
            "An image description is required when an image is provided."
        );
    }

    return {
        title,
        date,
        category,
        author,
        summary,
        featured: value.featured === true,
        image,
        imageAlt,
        body
    };
}


function parseMarkdownDocument(source) {
    const normalized =
        String(source || "")
            .replace(/\r\n?/g, "\n");

    const match =
        normalized.match(
            /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
        );

    if (!match) {
        throw new Error(
            "Invalid markdown document."
        );
    }

    return {
        ...parseFrontMatter(match[1]),
        body: match[2].trim()
    };
}


function parseFrontMatter(source) {
    const result = {};

    for (const line of source.split("\n")) {
        const separatorIndex =
            line.indexOf(":");

        if (separatorIndex < 0) {
            continue;
        }

        const key =
            line
                .slice(0, separatorIndex)
                .trim();

        let value =
            line
                .slice(separatorIndex + 1)
                .trim();

        if (
            value.startsWith('"') &&
            value.endsWith('"')
        ) {
            try {
                value = JSON.parse(value);
            } catch {
                // Keep the original value.
            }
        }

        if (value === "true") {
            value = true;
        } else if (value === "false") {
            value = false;
        }

        result[key] = value;
    }

    return result;
}


function createMarkdownDocument(article) {
    const frontMatterLines = [
        "---",
        `title: ${quoteYamlValue(article.title)}`,
        `date: ${article.date}`,
        `category: ${quoteYamlValue(article.category)}`,
        `author: ${quoteYamlValue(article.author)}`,
        `summary: ${quoteYamlValue(article.summary)}`,
        `featured: ${article.featured}`
    ];

    if (article.image) {
        frontMatterLines.push(
            `image: ${quoteYamlValue(article.image)}`,
            `imageAlt: ${quoteYamlValue(article.imageAlt)}`
        );
    }

    frontMatterLines.push(
        `slug: ${quoteYamlValue(article.slug)}`,
        "---",
        "",
        article.body,
        ""
    );

    return frontMatterLines.join("\n");
}


function createArticleSlug(title) {
    const normalizedTitle =
        title
            .normalize("NFKD")
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80);

    if (normalizedTitle) {
        return normalizedTitle;
    }

    return `article-${Date.now()}`;
}


function quoteYamlValue(value) {
    return JSON.stringify(
        String(value)
    );
}


function normalizeText(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}


function normalizeMultilineText(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value
        .replace(/\r\n?/g, "\n")
        .trim();
}


function isValidDate(value) {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const parsedDate =
        new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate
            .toISOString()
            .slice(0, 10) === value
    );
}


function createValidationError(message) {
    const error =
        new Error(message);

    error.code =
        "INVALID_ARTICLE";

    return error;
}