import path from "node:path";

import {
    createRepositoryFile,
    deleteRepositoryFile,
    getRepositoryFile,
    updateRepositoryFile
} from "./_shared/github-client.mjs";

import {
    getSessionFromRequest,
    jsonResponse
} from "./_shared/admin-auth.mjs";


const ARTICLES_MANIFEST_PATH =
    "data/articles.json";

const DRAFTS_DIRECTORY =
    "content/articles/drafts";

const PUBLISHED_DIRECTORY =
    "content/articles/published";


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

        const requestBody = await readRequestBody(
            request
        );

        const draftPath = validateDraftPath(
            requestBody.path
        );

        const draftFile = await getRepositoryFile(
            draftPath
        );

        if (!draftFile) {
            return jsonResponse(
                404,
                {
                    ok: false,
                    error: "Draft article could not be found."
                }
            );
        }

        const draftArticle =
            parseMarkdownDocument(
                draftFile.content
            );

        const publishedSlug =
            createArticleSlug(
                draftArticle.title
            );

        const filename =
            `${draftArticle.date}-${publishedSlug}.md`;

        const publishedPath =
            `${PUBLISHED_DIRECTORY}/${filename}`;

        const publishedContent =
            updateMarkdownSlug(
                draftFile.content,
                publishedSlug
            );

        const existingPublishedFile =
            await getRepositoryFile(publishedPath);

        if (existingPublishedFile) {
            return jsonResponse(
                409,
                {
                    ok: false,
                    error:
                        "A published article with the same filename already exists."
                }
            );
        }

        const manifestFile =
            await getRepositoryFile(
                ARTICLES_MANIFEST_PATH
            );

        if (!manifestFile) {
            throw new Error(
                "Article manifest could not be found."
            );
        }

        const articlePaths = parseArticleManifest(
            manifestFile.content
        );

        /*
         * Step 1:
         * Create the published copy.
         */
        await createRepositoryFile({
            filePath: publishedPath,
            content: publishedContent,
            commitMessage:
                `content: publish article ${filename}`
        });

        /*
         * Step 2:
         * Register it in the public manifest.
         */
        if (!articlePaths.includes(publishedPath)) {
            articlePaths.push(publishedPath);
        }

        const updatedManifest =
            `${JSON.stringify(articlePaths, null, 4)}\n`;

        await updateRepositoryFile({
            filePath: ARTICLES_MANIFEST_PATH,
            content: updatedManifest,
            commitMessage:
                `content: register published article ${filename}`,
            expectedSha: manifestFile.sha
        });

        /*
         * Step 3:
         * Remove the original draft.
         */
        await deleteRepositoryFile({
            filePath: draftPath,
            commitMessage:
                `content: remove published draft ${filename}`,
            expectedSha: draftFile.sha
        });

        return jsonResponse(
            200,
            {
                ok: true,
                article: {
                    filename,
                    draftPath,
                    publishedPath,
                    status: "published"
                }
            }
        );
    } catch (error) {
        console.error(
            "[CMS Publish Article] Failed to publish article:",
            error
        );

        if (error.code === "INVALID_DRAFT_PATH") {
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
                        "A published article with the same filename already exists."
                }
            );
        }

        return jsonResponse(
            500,
            {
                ok: false,
                error: "Unable to publish article."
            }
        );
    }
}


async function readRequestBody(request) {
    try {
        const result = await request.json();

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result)
        ) {
            throw new Error();
        }

        return result;
    } catch {
        const error = new Error(
            "Request body must contain valid JSON."
        );

        error.code = "INVALID_DRAFT_PATH";
        throw error;
    }
}


function validateDraftPath(value) {
    const normalizedPath = String(value || "")
        .replaceAll("\\", "/")
        .replace(/^\/+/, "");

    const expectedPrefix =
        `${DRAFTS_DIRECTORY}/`;

    const filename = path.basename(normalizedPath);

    if (
        !normalizedPath.startsWith(expectedPrefix) ||
        normalizedPath.includes("../") ||
        normalizedPath.includes("/./") ||
        !filename.toLowerCase().endsWith(".md") ||
        normalizedPath !== `${expectedPrefix}${filename}`
    ) {
        const error = new Error(
            "A valid draft article path is required."
        );

        error.code = "INVALID_DRAFT_PATH";
        throw error;
    }

    return normalizedPath;
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

function parseMarkdownDocument(source) {
    const normalizedSource =
        String(source || "")
            .replace(/^\uFEFF/, "")
            .replace(/\r\n?/g, "\n");

    const match =
        normalizedSource.match(
            /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
        );

    if (!match) {
        throw new Error(
            "Draft article contains invalid Markdown front matter."
        );
    }

    const metadata =
        parseFrontMatter(match[1]);

    const title =
        String(metadata.title || "").trim();

    const date =
        String(metadata.date || "").trim();

    if (!title) {
        throw new Error(
            "Draft article title is required."
        );
    }

    if (!isValidArticleDate(date)) {
        throw new Error(
            "Draft article date must use YYYY-MM-DD format."
        );
    }

    return {
        ...metadata,
        title,
        date,
        body: match[2].trim()
    };
}


function parseFrontMatter(source) {
    const result = {};

    for (const line of source.split("\n")) {
        const separatorIndex =
            line.indexOf(":");

        if (separatorIndex === -1) {
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


function createArticleSlug(title) {
    const slug =
        String(title || "")
            .normalize("NFKD")
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80);

    if (!slug) {
        throw new Error(
            "Unable to generate an article slug from the title."
        );
    }

    return slug;
}


function updateMarkdownSlug(
    source,
    publishedSlug
) {
    const normalizedSource =
        String(source || "")
            .replace(/^\uFEFF/, "")
            .replace(/\r\n?/g, "\n");

    const frontMatterEnd =
        normalizedSource.indexOf(
            "\n---\n",
            4
        );

    if (
        !normalizedSource.startsWith("---\n") ||
        frontMatterEnd === -1
    ) {
        throw new Error(
            "Draft article contains invalid Markdown front matter."
        );
    }

    const frontMatter =
        normalizedSource.slice(
            4,
            frontMatterEnd
        );

    const updatedSlugLine =
        `slug: ${JSON.stringify(publishedSlug)}`;

    const hasSlug =
        /^slug\s*:/m.test(frontMatter);

    const updatedFrontMatter =
        hasSlug
            ? frontMatter.replace(
                /^slug\s*:.*$/m,
                updatedSlugLine
            )
            : `${frontMatter}\n${updatedSlugLine}`;

    return [
        "---",
        updatedFrontMatter,
        "---",
        normalizedSource
            .slice(frontMatterEnd + 5)
            .replace(/^\n*/, ""),
        ""
    ].join("\n");
}


function isValidArticleDate(value) {
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