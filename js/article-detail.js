const articleLoadingSection = document.querySelector(
    "[data-article-loading]"
);

const articleErrorSection = document.querySelector(
    "[data-article-error]"
);

const articleErrorMessage = document.querySelector(
    "[data-article-error-message]"
);

const articleDetail = document.querySelector(
    "[data-article-detail]"
);

const articleBody = document.querySelector(
    "[data-article-body]"
);

const articleSourceSection = document.querySelector(
    "[data-article-source-section]"
);

const articleSourceLink = document.querySelector(
    "[data-article-source-link]"
);

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (!element) {
        return;
    }

    element.textContent = value || "";
}

function showArticleError(message) {
    if (articleLoadingSection) {
        articleLoadingSection.hidden = true;
    }

    if (articleDetail) {
        articleDetail.hidden = true;
    }

    if (articleErrorMessage) {
        articleErrorMessage.textContent =
            message ||
            "The requested article could not be found.";
    }

    if (articleErrorSection) {
        articleErrorSection.hidden = false;
    }
}

function createParagraph(block) {
    const paragraph = document.createElement("p");

    paragraph.textContent = block.text || "";

    return paragraph;
}

function createHeading(block) {
    const headingLevel =
        block.level === 3 ? "h3" : "h2";

    const heading = document.createElement(headingLevel);

    heading.textContent = block.text || "";

    return heading;
}

function createList(block) {
    const list = document.createElement(
        block.ordered ? "ol" : "ul"
    );

    const items = Array.isArray(block.items)
        ? block.items
        : [];

    items.forEach((item) => {
        const listItem = document.createElement("li");

        listItem.textContent = item;
        list.appendChild(listItem);
    });

    return list;
}

function createQuote(block) {
    const quote = document.createElement("blockquote");
    const quoteText = document.createElement("p");

    quoteText.textContent = block.text || "";
    quote.appendChild(quoteText);

    if (block.attribution) {
        const attribution = document.createElement("cite");

        attribution.textContent = block.attribution;
        quote.appendChild(attribution);
    }

    return quote;
}

function createNotice(block) {
    const notice = document.createElement("div");

    notice.className = "clinic-placeholder";

    const text = document.createElement("p");

    text.textContent = block.text || "";
    notice.appendChild(text);

    return notice;
}

/*
 * Markdown article support
 *
 * Articles are currently written as simple Markdown files so clinic
 * staff do not need to edit complex JSON or HTML.
 *
 * FUTURE CMS / ADMIN:
 * Replace direct Markdown editing with a secure clinic login,
 * visual text editor, image uploader, draft preview, and publish button.
 *
 * The future admin system should generate filenames, URLs, dates,
 * reading time, image paths, and the article manifest automatically.
 */

function getSlugFromMarkdownPath(markdownPath) {
    const filename = String(markdownPath || "")
        .split("/")
        .pop();

    return String(filename || "")
        .replace(/\.md$/i, "");
}

function parseFrontMatterValue(value) {
    const normalizedValue = String(value || "").trim();

    if (normalizedValue === "true") {
        return true;
    }

    if (normalizedValue === "false") {
        return false;
    }

    const firstCharacter = normalizedValue.charAt(0);
    const lastCharacter = normalizedValue.charAt(
        normalizedValue.length - 1
    );

    const hasMatchingQuotes =
        (
            firstCharacter === '"' ||
            firstCharacter === "'"
        ) &&
        firstCharacter === lastCharacter;

    if (hasMatchingQuotes) {
        return normalizedValue.slice(1, -1);
    }

    return normalizedValue;
}

function parseMarkdownArticle(markdownText) {
    const normalizedMarkdown = String(markdownText || "")
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n");

    if (!normalizedMarkdown.startsWith("---\n")) {
        throw new Error(
            "Article Markdown is missing front matter."
        );
    }

    const frontMatterEnd = normalizedMarkdown.indexOf(
        "\n---\n",
        4
    );

    if (frontMatterEnd === -1) {
        throw new Error(
            "Article Markdown front matter is incomplete."
        );
    }

    const frontMatterText = normalizedMarkdown.slice(
        4,
        frontMatterEnd
    );

    const body = normalizedMarkdown
        .slice(frontMatterEnd + 5)
        .trim();

    const metadata = {};

    frontMatterText
        .split("\n")
        .forEach((line) => {
            const separatorIndex = line.indexOf(":");

            if (separatorIndex === -1) {
                return;
            }

            const key = line
                .slice(0, separatorIndex)
                .trim();

            const value = line
                .slice(separatorIndex + 1)
                .trim();

            if (!key) {
                return;
            }

            metadata[key] =
                parseFrontMatterValue(value);
        });

    return {
        metadata,
        body
    };
}

function formatArticleDate(dateValue) {
    if (!dateValue) {
        return "";
    }

    const date = new Date(
        `${dateValue}T00:00:00`
    );

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return new Intl.DateTimeFormat(
        "en-US",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    ).format(date);
}

function calculateReadingTime(markdownBody) {
    const readableText = String(markdownBody || "")
        .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[#>*_`~-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!readableText) {
        return "1 min read";
    }

    const wordCount = readableText
        .split(" ")
        .filter(Boolean)
        .length;

    const minutes = Math.max(
        1,
        Math.ceil(wordCount / 220)
    );

    return `${minutes} min read`;
}

function resolveProjectFilePath(filePath) {
    const normalizedPath = String(filePath || "")
        .replace(/^\.?\//, "");

    return new URL(
        `../../${normalizedPath}`,
        window.location.href
    ).href;
}

function createMarkdownImage(altText, imageSource) {
    const figure = document.createElement("figure");
    const image = document.createElement("img");

    try {
        image.src = new URL(
            imageSource,
            window.location.href
        ).href;
    } catch (error) {
        image.src = imageSource;
    }

    image.alt = altText || "";
    image.loading = "lazy";

    figure.appendChild(image);

    if (altText) {
        const caption = document.createElement(
            "figcaption"
        );

        caption.textContent = altText;
        figure.appendChild(caption);
    }

    return figure;
}

function renderMarkdownArticleBody(markdownBody) {
    if (!articleBody) {
        return;
    }

    articleBody.replaceChildren();

    const lines = String(markdownBody || "")
        .replace(/\r\n/g, "\n")
        .split("\n");

    let paragraphLines = [];
    let activeList = null;
    let activeListType = "";

    function flushParagraph() {
        if (paragraphLines.length === 0) {
            return;
        }

        const paragraph = document.createElement("p");

        paragraph.textContent =
            paragraphLines.join(" ");

        articleBody.appendChild(paragraph);
        paragraphLines = [];
    }

    function flushList() {
        if (!activeList) {
            return;
        }

        articleBody.appendChild(activeList);
        activeList = null;
        activeListType = "";
    }

    lines.forEach((rawLine) => {
        const line = rawLine.trim();

        if (!line) {
            flushParagraph();
            flushList();
            return;
        }

        const headingMatch = line.match(
            /^(#{2,3})\s+(.+)$/
        );

        if (headingMatch) {
            flushParagraph();
            flushList();

            const heading = document.createElement(
                headingMatch[1].length === 3
                    ? "h3"
                    : "h2"
            );

            heading.textContent = headingMatch[2];
            articleBody.appendChild(heading);
            return;
        }

        const imageMatch = line.match(
            /^!\[([^\]]*)\]\(([^)]+)\)$/
        );

        if (imageMatch) {
            flushParagraph();
            flushList();

            articleBody.appendChild(
                createMarkdownImage(
                    imageMatch[1],
                    imageMatch[2]
                )
            );

            return;
        }

        const unorderedListMatch = line.match(
            /^[-*]\s+(.+)$/
        );

        if (unorderedListMatch) {
            flushParagraph();

            if (
                !activeList ||
                activeListType !== "ul"
            ) {
                flushList();

                activeList =
                    document.createElement("ul");

                activeListType = "ul";
            }

            const listItem =
                document.createElement("li");

            listItem.textContent =
                unorderedListMatch[1];

            activeList.appendChild(listItem);
            return;
        }

        const orderedListMatch = line.match(
            /^\d+\.\s+(.+)$/
        );

        if (orderedListMatch) {
            flushParagraph();

            if (
                !activeList ||
                activeListType !== "ol"
            ) {
                flushList();

                activeList =
                    document.createElement("ol");

                activeListType = "ol";
            }

            const listItem =
                document.createElement("li");

            listItem.textContent =
                orderedListMatch[1];

            activeList.appendChild(listItem);
            return;
        }

        const quoteMatch = line.match(
            /^>\s*(.+)$/
        );

        if (quoteMatch) {
            flushParagraph();
            flushList();

            articleBody.appendChild(
                createQuote({
                    text: quoteMatch[1]
                })
            );

            return;
        }

        flushList();
        paragraphLines.push(line);
    });

    flushParagraph();
    flushList();
}

async function loadMarkdownArticle(markdownPath) {
    const response = await fetch(
        resolveProjectFilePath(markdownPath)
    );

    if (!response.ok) {
        throw new Error(
            `Unable to load Markdown article: ${response.status}`
        );
    }

    const markdownText = await response.text();

    const {
        metadata,
        body
    } = parseMarkdownArticle(markdownText);

    const slug =
        metadata.slug ||
        getSlugFromMarkdownPath(markdownPath);

    return {
        id: slug,
        slug,
        title: metadata.title || "Untitled Article",
        categoryLabel:
            metadata.category ||
            "Health Information",
        author:
            metadata.author ||
            "ReLife Acupuncture",
        date: metadata.date || "",
        displayDate: formatArticleDate(metadata.date),
        excerpt: metadata.summary || "",
        readingTime: calculateReadingTime(body),
        featured: metadata.featured === true,
        published: true,
        markdownPath,
        markdownBody: body
    };
}

function createContentBlock(block) {
    if (!block || typeof block !== "object") {
        return null;
    }

    switch (block.type) {
        case "heading":
            return createHeading(block);

        case "list":
            return createList(block);

        case "quote":
            return createQuote(block);

        case "notice":
            return createNotice(block);

        case "paragraph":
        default:
            return createParagraph(block);
    }
}

function renderArticleBody(content) {
    if (!articleBody) {
        return;
    }

    articleBody.replaceChildren();

    const blocks = Array.isArray(content)
        ? content
        : [];

    blocks.forEach((block) => {
        const contentElement = createContentBlock(block);

        if (contentElement) {
            articleBody.appendChild(contentElement);
        }
    });
}

function renderArticleSource(article) {
    if (
        !articleSourceSection ||
        !articleSourceLink
    ) {
        return;
    }

    if (!article.sourceUrl) {
        articleSourceSection.hidden = true;
        return;
    }

    articleSourceLink.href = article.sourceUrl;
    articleSourceLink.textContent =
        article.sourceLabel ||
        "View the original article";

    articleSourceLink.target = "_blank";
    articleSourceLink.rel = "noopener noreferrer";

    articleSourceSection.hidden = false;
}

function updateArticleMetadata(article) {
    document.title =
        `${article.title} | ReLife Acupuncture`;

    const description = document.querySelector(
        'meta[name="description"]'
    );

    if (description && article.excerpt) {
        description.setAttribute(
            "content",
            article.excerpt
        );
    }
}

function renderArticle(article) {
    const articleDate =
        article.displayDate ||
        article.date ||
        "";

    const metaItems = [
        article.author,
        articleDate,
        article.readingTime
    ].filter(Boolean);

    setText(
        "[data-article-category]",
        article.categoryLabel
    );

    setText(
        "[data-article-title]",
        article.title
    );

    setText(
        "[data-article-excerpt]",
        article.excerpt
    );

    setText(
        "[data-article-meta]",
        metaItems.join(" · ")
    );

    renderMarkdownArticleBody(
        article.markdownBody
    );

    updateArticleMetadata(article);

    if (articleLoadingSection) {
        articleLoadingSection.hidden = true;
    }

    if (articleErrorSection) {
        articleErrorSection.hidden = true;
    }

    if (articleDetail) {
        articleDetail.hidden = false;
    }
}

async function loadArticle() {
    const parameters = new URLSearchParams(
        window.location.search
    );

    const requestedSlug = parameters.get("slug");

    if (!requestedSlug) {
        showArticleError(
            "No article was selected."
        );

        return;
    }

    try {
        const response = await fetch(
            "../../data/articles.json"
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load articles: ${response.status}`
            );
        }

        const markdownPaths = await response.json();

        const isValidManifest =
            Array.isArray(markdownPaths) &&
            markdownPaths.every(
                (item) => typeof item === "string"
            );

        if (!isValidManifest) {
            throw new Error(
                "Article manifest must be an array of Markdown paths."
            );
        }

        const selectedMarkdownPath =
            markdownPaths.find((markdownPath) => {
                return (
                    getSlugFromMarkdownPath(markdownPath) ===
                    requestedSlug
                );
            });

        let selectedArticle = null;

        if (selectedMarkdownPath) {
            selectedArticle = await loadMarkdownArticle(
                selectedMarkdownPath
            );
        }

        if (!selectedArticle) {
            showArticleError(
                "This article is not available yet."
            );

            return;
        }

        renderArticle(selectedArticle);
    } catch (error) {
        console.error(
            "Unable to load article:",
            error
        );

        showArticleError(
            "The article could not be loaded. Please try again later."
        );
    }
}

loadArticle();