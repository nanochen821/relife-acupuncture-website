// js/patient-story-detail.js

const loadingSection = document.querySelector(
    "[data-story-loading]"
);

const errorSection = document.querySelector(
    "[data-story-error]"
);

const detailElement = document.querySelector(
    "[data-story-detail]"
);

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value || "";
    }
}

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

function cleanInlineMarkdown(value) {
    return String(value || "")
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        .replace(/(\*|_)(.*?)\1/g, "$2")
        .replace(/`([^`]+)`/g, "$1")
        .trim();
}

function renderMarkdownBody(selector, markdownBody) {
    const container = document.querySelector(selector);

    if (!container) {
        return;
    }

    container.replaceChildren();

    const normalizedBody = String(markdownBody || "")
        .replace(/\r\n/g, "\n")
        .trim();

    if (!normalizedBody) {
        return;
    }

    const blocks = normalizedBody.split(/\n\s*\n/);

    blocks.forEach((block) => {
        const trimmedBlock = block.trim();

        if (!trimmedBlock) {
            return;
        }

        if (/^###\s+/.test(trimmedBlock)) {
            const heading = document.createElement("h3");

            heading.textContent = cleanInlineMarkdown(
                trimmedBlock.replace(/^###\s+/, "")
            );

            container.appendChild(heading);
            return;
        }

        if (/^##\s+/.test(trimmedBlock)) {
            const heading = document.createElement("h2");

            heading.textContent = cleanInlineMarkdown(
                trimmedBlock.replace(/^##\s+/, "")
            );

            container.appendChild(heading);
            return;
        }

        const lines = trimmedBlock.split("\n");

        const isList = lines.every((line) => {
            return /^\s*[-*]\s+/.test(line);
        });

        if (isList) {
            const list = document.createElement("ul");

            lines.forEach((line) => {
                const item = document.createElement("li");

                item.textContent = cleanInlineMarkdown(
                    line.replace(/^\s*[-*]\s+/, "")
                );

                list.appendChild(item);
            });

            container.appendChild(list);
            return;
        }

        const paragraph = document.createElement("p");

        paragraph.textContent = cleanInlineMarkdown(
            lines.join(" ")
        );

        container.appendChild(paragraph);
    });
}

function hideLegacyEmptySections() {
    const treatmentContainer = document.querySelector(
        "[data-story-treatment]"
    );

    const quote = document.querySelector(
        ".story-patient-quote"
    );

    const progressContainer = document.querySelector(
        "[data-story-progress]"
    );

    const treatmentSection = treatmentContainer?.closest(
        ".story-content-section"
    );

    const progressSection = progressContainer?.closest(
        ".story-content-section"
    );

    if (treatmentSection) {
        treatmentSection.hidden = true;
    }

    if (quote) {
        quote.hidden = true;
    }

    if (progressSection) {
        progressSection.hidden = true;
    }
}

function showError() {
    if (loadingSection) {
        loadingSection.hidden = true;
    }

    if (detailElement) {
        detailElement.hidden = true;
    }

    if (errorSection) {
        errorSection.hidden = false;
    }
}

function renderStory(story) {
    setText(
        "[data-story-category]",
        story.treatmentTopic
    );

    setText(
        "[data-story-title]",
        story.title
    );

    setText(
        "[data-story-summary]",
        story.summary
    );

    setText(
        "[data-story-concern]",
        story.treatmentTopic
    );

    setText(
        "[data-story-location]",
        "ReLife Acupuncture"
    );

    setText(
        "[data-story-format]",
        "Written patient story"
    );

    setText(
        "[data-story-media-label]",
        story.treatmentTopic
    );

    renderMarkdownBody(
        "[data-story-before]",
        story.body
    );

    hideLegacyEmptySections();

    document.title =
        `${story.title} | ReLife Acupuncture`;

    if (loadingSection) {
        loadingSection.hidden = true;
    }

    if (errorSection) {
        errorSection.hidden = true;
    }

    if (detailElement) {
        detailElement.hidden = false;
    }
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
        slug,
        title:
            metadata.title ||
            "Untitled Patient Story",
        treatmentTopic:
            metadata.treatment_topic ||
            "Patient Story",
        summary: metadata.summary || "",
        identityDisplay:
            metadata.identity_display ||
            "anonymous",
        patientName:
            metadata.patient_name ||
            "",
        date: metadata.date || "",
        featured: metadata.featured === true,
        body,
        markdownPath
    };
}

async function loadPatientStory() {
    const parameters = new URLSearchParams(
        window.location.search
    );

    const requestedSlug =
        parameters.get("id") ||
        parameters.get("slug");

    if (!requestedSlug) {
        showError();
        return;
    }

    try {
        const response = await fetch(
            "../../data/patient-stories.json"
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load patient story manifest: ${response.status}`
            );
        }

        const manifest = await response.json();

        if (!Array.isArray(manifest)) {
            throw new Error(
                "Patient story manifest must be an array."
            );
        }

        const matchingPath = manifest.find(
            (markdownPath) => {
                return (
                    getSlugFromMarkdownPath(markdownPath) ===
                    requestedSlug
                );
            }
        );

        if (!matchingPath) {
            showError();
            return;
        }

        const story = await loadMarkdownStory(
            matchingPath
        );

        renderStory(story);
    } catch (error) {
        console.error(
            "Unable to load patient story:",
            error
        );

        showError();
    }
}

loadPatientStory();