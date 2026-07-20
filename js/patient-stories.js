// js/patient-stories.js

const patientStoryList = document.querySelector(
    "[data-patient-story-list]"
);

const patientStoriesEmpty = document.querySelector(
    "[data-patient-stories-empty]"
);

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

function parseMarkdownStory(markdownText) {
    const normalizedMarkdown = String(markdownText || "")
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n");

    if (!normalizedMarkdown.startsWith("---\n")) {
        throw new Error(
            "Patient story Markdown is missing front matter."
        );
    }

    const frontMatterEnd = normalizedMarkdown.indexOf(
        "\n---\n",
        4
    );

    if (frontMatterEnd === -1) {
        throw new Error(
            "Patient story Markdown front matter is incomplete."
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

function resolveProjectFilePath(filePath) {
    const normalizedPath = String(filePath || "")
        .replace(/^\.?\//, "");

    return new URL(
        `../../${normalizedPath}`,
        window.location.href
    ).href;
}

async function loadMarkdownStory(markdownPath) {
    const response = await fetch(
        resolveProjectFilePath(markdownPath)
    );

    if (!response.ok) {
        throw new Error(
            `Unable to load patient story Markdown: ${response.status}`
        );
    }

    const markdownText = await response.text();

    const {
        metadata,
        body
    } = parseMarkdownStory(markdownText);

    const slug =
        metadata.slug ||
        getSlugFromMarkdownPath(markdownPath) ||
        createSlug(metadata.title);

    return {
        id: slug,
        slug,
        title:
            metadata.title ||
            "Untitled Patient Story",
        topic:
            metadata.treatment_topic ||
            "Patient Story",
        summary: metadata.summary || "",
        featured: metadata.featured === true,
        markdownPath,
        markdownBody: body
    };
}

function createPatientStoryCard(story) {
    const article = document.createElement("article");
    article.className = "patient-story-list-card";

    const media = document.createElement("div");
    media.className = "patient-story-list-media";
    media.setAttribute("aria-hidden", "true");

    const mediaLabel = document.createElement("span");
    mediaLabel.textContent = story.topic;

    media.appendChild(mediaLabel);

    const content = document.createElement("div");
    content.className = "patient-story-list-content";

    const category = document.createElement("p");
    category.className = "story-category";
    category.textContent = story.topic;

    const title = document.createElement("h2");
    title.textContent = story.title;

    const summary = document.createElement("p");
    summary.textContent = story.summary;

    const link = document.createElement("a");
    link.href =
        `./story.html?id=${encodeURIComponent(story.slug)}`;
    link.textContent = "Read the patient story";

    content.append(
        category,
        title,
        summary,
        link
    );

    article.append(
        media,
        content
    );

    return article;
}

function renderPatientStories(stories) {
    if (!patientStoryList) {
        return;
    }

    patientStoryList.replaceChildren();

    if (stories.length === 0) {
        if (patientStoriesEmpty) {
            patientStoriesEmpty.hidden = false;
        }

        return;
    }

    if (patientStoriesEmpty) {
        patientStoriesEmpty.hidden = true;
    }

    const fragment = document.createDocumentFragment();

    stories.forEach((story) => {
        fragment.appendChild(
            createPatientStoryCard(story)
        );
    });

    patientStoryList.appendChild(fragment);
}

async function loadPatientStories() {
    if (!patientStoryList) {
        return;
    }

    try {
        const response = await fetch(
            "../../data/patient-stories.json"
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load patient stories: ${response.status}`
            );
        }

        const manifest = await response.json();

        if (!Array.isArray(manifest)) {
            throw new Error(
                "Patient story manifest must be an array."
            );
        }

        const stories = await Promise.all(
            manifest.map((markdownPath) => {
                return loadMarkdownStory(markdownPath);
            })
        );

        renderPatientStories(stories);
    } catch (error) {
        console.error(
            "Unable to load patient stories:",
            error
        );

        renderPatientStories([]);
    }
}

loadPatientStories();