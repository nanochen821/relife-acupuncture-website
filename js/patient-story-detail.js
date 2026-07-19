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

function renderParagraphs(selector, paragraphs) {
    const container = document.querySelector(selector);

    if (!container) {
        return;
    }

    container.replaceChildren();

    paragraphs.forEach((text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        container.appendChild(paragraph);
    });
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
    setText("[data-story-category]", story.category);
    setText("[data-story-title]", story.title);
    setText("[data-story-summary]", story.summary);
    setText("[data-story-concern]", story.concern);
    setText("[data-story-location]", story.location);
    setText("[data-story-format]", story.format);
    setText("[data-story-media-label]", story.mediaLabel);
    setText("[data-story-quote]", story.quote);

    renderParagraphs(
        "[data-story-before]",
        story.before || []
    );

    renderParagraphs(
        "[data-story-treatment]",
        story.treatment || []
    );

    renderParagraphs(
        "[data-story-progress]",
        story.progress || []
    );

    const relatedTreatment = story.relatedTreatment || {};

    setText(
        "[data-related-treatment-title]",
        relatedTreatment.title
    );

    setText(
        "[data-related-treatment-description]",
        relatedTreatment.description
    );

    const relatedLink = document.querySelector(
        "[data-related-treatment-link]"
    );

    if (relatedLink && relatedTreatment.href) {
        relatedLink.href = relatedTreatment.href;
    }

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

async function loadPatientStory() {
    const parameters = new URLSearchParams(
        window.location.search
    );

    const storyId = parameters.get("id");

    if (!storyId) {
        showError();
        return;
    }

    try {
        const response = await fetch(
            "../../data/patient-stories.json"
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load stories: ${response.status}`
            );
        }

        const stories = await response.json();

        const selectedStory = stories.find(
            (story) => story.id === storyId
        );

        if (!selectedStory) {
            showError();
            return;
        }

        renderStory(selectedStory);
    } catch (error) {
        console.error(
            "Unable to load patient story:",
            error
        );

        showError();
    }
}

loadPatientStory();