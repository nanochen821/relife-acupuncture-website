const articleSearchInput = document.querySelector(
    "[data-article-search]"
);

const articleFilterButtons = document.querySelectorAll(
    "[data-article-filter]"
);

const articlesList = document.querySelector(
    "[data-articles-list]"
);

const featuredArticleContainer = document.querySelector(
    "[data-featured-article]"
);

const featuredArticleSection = document.querySelector(
    "[data-featured-article-section]"
);

const articlesLoading = document.querySelector(
    "[data-articles-loading]"
);

const articlesContent = document.querySelector(
    "[data-articles-content]"
);

const articlesEmpty = document.querySelector(
    "[data-articles-empty]"
);

const articleResultCount = document.querySelector(
    "[data-article-result-count]"
);

const loadMoreArticlesButton = document.querySelector(
    "[data-load-more-articles]"
);

const initialVisibleCount = 6;

let articles = [];
let activeArticleCategory = "all";
let articleSearchTerm = "";
let visibleArticleCount = initialVisibleCount;

function normalizeText(value) {
    return String(value || "")
        .toLocaleLowerCase()
        .trim();
}

/*
 * Markdown article support
 *
 * Current direction:
 * - Clinic articles are stored as simple Markdown files.
 * - data/articles.json only acts as a generated article manifest.
 * - Authors should not manually edit complex JSON content blocks.
 *
 * FUTURE CMS / ADMIN:
 * Replace direct Markdown file management with a secure clinic login,
 * visual editor, image uploader, draft preview, and publish button.
 * The CMS should generate the article slug, manifest, reading time,
 * publication state, and image paths automatically.
 */

function createSlug(value) {
    return String(value || "")
        .toLocaleLowerCase()
        .trim()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getSlugFromMarkdownPath(markdownPath) {
    const filename = String(markdownPath || "")
        .split("/")
        .pop();

    return String(filename || "")
        .replace(/\.md$/i, "");
}

function parseFrontMatterValue(value) {
    const trimmedValue = String(value || "").trim();

    if (trimmedValue === "true") {
        return true;
    }

    if (trimmedValue === "false") {
        return false;
    }

    const firstCharacter = trimmedValue.charAt(0);
    const lastCharacter = trimmedValue.charAt(
        trimmedValue.length - 1
    );

    const hasMatchingQuotes =
        (
            firstCharacter === '"' ||
            firstCharacter === "'"
        ) &&
        firstCharacter === lastCharacter;

    if (hasMatchingQuotes) {
        return trimmedValue.slice(1, -1);
    }

    return trimmedValue;
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
        getSlugFromMarkdownPath(markdownPath) ||
        createSlug(metadata.title);

    const categoryLabel =
        metadata.category ||
        "Health Information";

    return {
        id: slug,
        slug,
        title: metadata.title || "Untitled Article",
        date: metadata.date || "",
        displayDate: formatArticleDate(metadata.date),
        category: createSlug(categoryLabel),
        categoryLabel,
        author:
            metadata.author ||
            "ReLife Acupuncture",
        excerpt: metadata.summary || "",
        readingTime: calculateReadingTime(body),
        featured: metadata.featured === true,
        published: true,
        markdownPath,
        markdownBody: body
    };
}

function normalizeLegacyArticle(article) {
    const categoryLabel =
        article.categoryLabel ||
        article.category ||
        "Health Information";

    return {
        ...article,
        slug: article.slug || article.id,
        category:
            article.category ||
            createSlug(categoryLabel),
        categoryLabel,
        displayDate:
            article.displayDate ||
            formatArticleDate(article.date),
        published: article.published === true
    };
}

function createArticleMeta(article) {
    const meta = document.createElement("p");
    meta.className = "health-article-meta";

    const articleDate =
        article.displayDate || article.date || "";

    const metaItems = [
        article.author,
        articleDate,
        article.readingTime
    ].filter(Boolean);

    meta.textContent = metaItems.join(" · ");

    return meta;
}

function createArticleAction(article) {
    const link = document.createElement("a");
    const articleSlug = article.slug || article.id;

    link.className = "health-article-link";
    link.href =
        `./article.html?slug=${encodeURIComponent(articleSlug)}`;
    link.textContent = "Read Article";

    return link;
}

function createArticleCard(article) {
    const articleElement = document.createElement("article");
    articleElement.className = "health-article-card";

    const media = document.createElement("div");
    media.className = "health-article-media";
    media.setAttribute("aria-hidden", "true");

    const mediaLabel = document.createElement("span");
    mediaLabel.textContent = article.categoryLabel;

    media.appendChild(mediaLabel);

    const content = document.createElement("div");
    content.className = "health-article-content";

    const category = document.createElement("p");
    category.className = "health-article-category";
    category.textContent = article.categoryLabel;

    const title = document.createElement("h3");
    title.textContent = article.title;

    const excerpt = document.createElement("p");
    excerpt.className = "health-article-excerpt";
    excerpt.textContent = article.excerpt;

    content.append(
        category,
        title,
        excerpt,
        createArticleMeta(article),
        createArticleAction(article)
    );

    articleElement.append(media, content);

    return articleElement;
}

function createFeaturedArticle(article) {
    const articleElement = document.createElement("article");
    articleElement.className = "featured-health-article";

    const media = document.createElement("div");
    media.className = "featured-health-article-media";
    media.setAttribute("aria-hidden", "true");

    const mediaText = document.createElement("span");
    mediaText.textContent = article.categoryLabel;

    media.appendChild(mediaText);

    const content = document.createElement("div");
    content.className = "featured-health-article-content";

    const category = document.createElement("p");
    category.className = "health-article-category";
    category.textContent = article.categoryLabel;

    const title = document.createElement("h3");
    title.textContent = article.title;

    const excerpt = document.createElement("p");
    excerpt.className = "health-article-excerpt";
    excerpt.textContent = article.excerpt;

    content.append(
        category,
        title,
        excerpt,
        createArticleMeta(article),
        createArticleAction(article)
    );

    articleElement.append(media, content);

    return articleElement;
}

function getFilteredArticles() {
    return articles.filter((article) => {
        const matchesCategory =
            activeArticleCategory === "all" ||
            article.category === activeArticleCategory;

        const searchableText = normalizeText(
            [
                article.title,
                article.excerpt,
                article.categoryLabel,
                article.author
            ].join(" ")
        );

        const matchesSearch =
            !articleSearchTerm ||
            searchableText.includes(articleSearchTerm);

        return matchesCategory && matchesSearch;
    });
}

function renderFeaturedArticle() {
    if (
        !featuredArticleContainer ||
        !featuredArticleSection
    ) {
        return;
    }

    featuredArticleContainer.replaceChildren();

    const featuredArticle = articles.find(
        (article) => article.featured
    );

    if (!featuredArticle) {
        featuredArticleSection.hidden = true;
        return;
    }

    featuredArticleSection.hidden = false;
    featuredArticleContainer.appendChild(
        createFeaturedArticle(featuredArticle)
    );
}

function renderArticles() {
    if (!articlesList) {
        return;
    }

    const filteredArticles = getFilteredArticles();
    const visibleArticles = filteredArticles.slice(
        0,
        visibleArticleCount
    );

    articlesList.replaceChildren();

    visibleArticles.forEach((article) => {
        articlesList.appendChild(
            createArticleCard(article)
        );
    });

    if (articleResultCount) {
        const articleWord =
            filteredArticles.length === 1
                ? "article"
                : "articles";

        articleResultCount.textContent =
            `${filteredArticles.length} ${articleWord}`;
    }

    if (articlesEmpty) {
        articlesEmpty.hidden =
            filteredArticles.length !== 0;
    }

    if (loadMoreArticlesButton) {
        loadMoreArticlesButton.hidden =
            visibleArticleCount >= filteredArticles.length;
    }
}

function resetArticlePagination() {
    visibleArticleCount = initialVisibleCount;
}

articleFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeArticleCategory =
            button.dataset.articleFilter;

        articleFilterButtons.forEach(
            (currentButton) => {
                currentButton.classList.remove("is-active");
            }
        );

        button.classList.add("is-active");

        resetArticlePagination();
        renderArticles();
    });
});

if (articleSearchInput) {
    articleSearchInput.addEventListener("input", () => {
        articleSearchTerm = normalizeText(
            articleSearchInput.value
        );

        resetArticlePagination();
        renderArticles();
    });
}

if (loadMoreArticlesButton) {
    loadMoreArticlesButton.addEventListener("click", () => {
        visibleArticleCount += initialVisibleCount;
        renderArticles();
    });
}

async function loadArticles() {
    try {
        const response = await fetch(
            "../../data/articles.json"
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load articles: ${response.status}`
            );
        }

        const articleData = await response.json();

        let loadedArticles = [];

        /*
         * New Markdown manifest format:
         *
         * [
         *     "content/articles/published/example.md"
         * ]
         */
        const isMarkdownPathList =
            Array.isArray(articleData) &&
            articleData.every(
                (item) => typeof item === "string"
            );

        /*
         * Also allow a future generated manifest:
         *
         * {
         *     "articles": [
         *         "content/articles/published/example.md"
         *     ]
         * }
         */
        const hasMarkdownManifest =
            articleData &&
            !Array.isArray(articleData) &&
            Array.isArray(articleData.articles);

        if (isMarkdownPathList) {
            loadedArticles = await Promise.all(
                articleData.map(loadMarkdownArticle)
            );
        } else if (hasMarkdownManifest) {
            loadedArticles = await Promise.all(
                articleData.articles.map(
                    loadMarkdownArticle
                )
            );
        } else if (Array.isArray(articleData)) {
            /*
             * Temporary compatibility with the old JSON format.
             * Remove this branch after all articles use Markdown.
             */
            loadedArticles = articleData.map(
                normalizeLegacyArticle
            );
        } else {
            throw new Error(
                "Unsupported article data format."
            );
        }

        articles = loadedArticles
            .filter(
                (article) =>
                    article.published === true
            )
            .sort(
                (firstArticle, secondArticle) => {
                    return (
                        new Date(secondArticle.date) -
                        new Date(firstArticle.date)
                    );
                }
            );

        renderFeaturedArticle();
        renderArticles();

        if (articlesLoading) {
            articlesLoading.hidden = true;
        }

        if (articlesContent) {
            articlesContent.hidden = false;
        }
    } catch (error) {
        console.error(
            "Unable to load articles:",
            error
        );

        if (articlesLoading) {
            articlesLoading.textContent =
                "Health articles could not be loaded.";
        }
    }
}

loadArticles();