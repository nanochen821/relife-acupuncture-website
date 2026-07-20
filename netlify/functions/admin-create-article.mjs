import {
    getSessionFromRequest,
    jsonResponse
} from "./_shared/admin-auth.mjs";

import {
    createRepositoryFile
} from "./_shared/github-client.mjs";


const ARTICLE_DRAFTS_DIRECTORY =
    "content/articles/drafts";

const DEFAULT_AUTHOR = "ReLife Acupuncture";
const DEFAULT_CATEGORY = "Wellness";


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

        const submittedArticle = await readRequestBody(
            request
        );

        const article = validateArticleInput(
            submittedArticle
        );

        const slug = createArticleSlug(
            article.title
        );

        const filename =
            `${article.date}-${slug}.md`;

        const articlePath =
            `${ARTICLE_DRAFTS_DIRECTORY}/${filename}`;

        const markdown = createMarkdownDocument({
            ...article,
            slug
        });

        await createRepositoryFile({
            filePath: articlePath,
            content: markdown,
            commitMessage:
                `content: save article draft ${article.title}`
        });

        return jsonResponse(
            201,
            {
                ok: true,
                article: {
                    title: article.title,
                    date: article.date,
                    slug,
                    filename,
                    path: articlePath,
                    status: "draft",
                    summary: article.summary,
                    image: article.image,
                    imageAlt: article.imageAlt
                }
            }
        );
    } catch (error) {
        console.error(
            "[CMS Create Article] Failed to create article:",
            error
        );

        if (error.code === "INVALID_ARTICLE") {
            return jsonResponse(
                400,
                {
                    ok: false,
                    error: error.message
                }
            );
        }

        if (error.code === "FILE_ALREADY_EXISTS") {
            return jsonResponse(
                409,
                {
                    ok: false,
                    error:
                        "An article with the same date and title already exists."
                }
            );
        }

        return jsonResponse(
            500,
            {
                ok: false,
                error: "Unable to create article."
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


function validateArticleInput(value) {
    const title = normalizeText(value.title);
    const date = normalizeText(value.date);
    const category =
        normalizeText(value.category) ||
        DEFAULT_CATEGORY;

    const author =
        normalizeText(value.author) ||
        DEFAULT_AUTHOR;

    const summary = normalizeText(
        value.summary ?? value.description
    );

    const body = normalizeMultilineText(
        value.body
    );

    const image = normalizeText(value.image);
    const imageAlt = normalizeText(value.imageAlt);

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


function createArticleSlug(title) {
    const normalizedTitle = title
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


function quoteYamlValue(value) {
    return JSON.stringify(String(value));
}


function parseArticleManifest(source) {
    let result;

    try {
        result = JSON.parse(source);
    } catch {
        throw new Error(
            "Article manifest contains invalid JSON."
        );
    }

    if (
        !Array.isArray(result) ||
        !result.every(
            (item) => typeof item === "string"
        )
    ) {
        throw new Error(
            "Article manifest must contain an array of paths."
        );
    }

    return result;
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

    const parsedDate = new Date(
        `${value}T00:00:00Z`
    );

    return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate
            .toISOString()
            .slice(0, 10) === value
    );
}


function createValidationError(message) {
    const error = new Error(message);

    error.code = "INVALID_ARTICLE";

    return error;
}