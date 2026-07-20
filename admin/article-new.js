const articleForm = document.querySelector("#article-form");

const titleInput = document.querySelector("#article-title");
const dateInput = document.querySelector("#article-date");
const summaryInput = document.querySelector(
    "#article-description"
);
const bodyInput = document.querySelector("#article-body");

const submitButton = articleForm?.querySelector(
    'button[type="submit"]'
);

const formMessage = document.querySelector(".form-help");


initializeArticleForm();


function initializeArticleForm() {
    if (
        !articleForm ||
        !titleInput ||
        !dateInput ||
        !summaryInput ||
        !bodyInput ||
        !submitButton ||
        !formMessage
    ) {
        console.error(
            "[CMS Create Article] Required form elements are missing."
        );

        return;
    }

    setDefaultDate();
    updateSubmitState();

    articleForm.addEventListener(
        "input",
        updateSubmitState
    );

    articleForm.addEventListener(
        "submit",
        handleSubmit
    );
}


function setDefaultDate() {
    if (dateInput.value) {
        return;
    }

    const today = new Date();

    const timezoneOffset =
        today.getTimezoneOffset() * 60_000;

    dateInput.value = new Date(
        today.getTime() - timezoneOffset
    )
        .toISOString()
        .slice(0, 10);
}


function updateSubmitState() {
    if (submitButton.dataset.submitting === "true") {
        return;
    }

    submitButton.disabled =
        !hasRequiredArticleContent();
}


function hasRequiredArticleContent() {
    return (
        titleInput.value.trim().length > 0 &&
        dateInput.value.length > 0 &&
        bodyInput.value.trim().length > 0
    );
}


async function handleSubmit(event) {
    event.preventDefault();

    if (
        !hasRequiredArticleContent() ||
        submitButton.dataset.submitting === "true"
    ) {
        return;
    }

    setSubmittingState(true);
    showFormMessage(
        "正在建立文章，請稍候。"
    );

    try {
        const response = await fetch(
            "/.netlify/functions/admin-create-article",
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(
                    createArticlePayload()
                )
            }
        );

        const result = await readJsonResponse(
            response
        );

        if (response.status === 401) {
            window.location.replace(
                "/admin/login.html"
            );

            return;
        }

        if (!response.ok || !result?.ok) {
            throw new Error(
                result?.error ||
                "文章建立失敗，請稍後再試。"
            );
        }

        showFormMessage(
            `文章「${result.article.title}」已成功建立。`,
            "success"
        );

        articleForm.reset();

        window.setTimeout(
            () => {
                window.location.replace(
                    "/admin/app/"
                );
            },
            1200
        );
    } catch (error) {
        console.error(
            "[CMS Create Article] Request failed:",
            error
        );

        showFormMessage(
            error.message ||
            "文章建立失敗，請稍後再試。",
            "error"
        );

        setSubmittingState(false);
    }
}


function createArticlePayload() {
    return {
        title: titleInput.value.trim(),
        date: dateInput.value,
        summary: summaryInput.value.trim(),
        body: bodyInput.value.trim()
    };
}


function setSubmittingState(isSubmitting) {
    submitButton.dataset.submitting =
        String(isSubmitting);

    titleInput.disabled = isSubmitting;
    dateInput.disabled = isSubmitting;
    summaryInput.disabled = isSubmitting;
    bodyInput.disabled = isSubmitting;

    submitButton.disabled =
        isSubmitting ||
        !hasRequiredArticleContent();

    submitButton.textContent =
        isSubmitting
            ? "儲存中..."
            : "儲存文章";
}


function showFormMessage(
    message,
    type = "info"
) {
    formMessage.textContent = message;

    formMessage.classList.remove(
        "form-help--success",
        "form-help--error"
    );

    if (type === "success") {
        formMessage.classList.add(
            "form-help--success"
        );
    }

    if (type === "error") {
        formMessage.classList.add(
            "form-help--error"
        );
    }
}


async function readJsonResponse(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}