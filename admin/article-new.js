const pageParameters =
    new URLSearchParams(window.location.search);

const editingPath =
    pageParameters.get("path")?.trim() || "";

const isEditMode =
    editingPath.length > 0;

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

const formEyebrow = document.querySelector(
    "#article-form-eyebrow"
);

const formTitle = document.querySelector(
    "#article-form-title"
);

const formDescription = document.querySelector(
    "#article-form-description"
);

initializeArticleForm();


async function initializeArticleForm() {
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
            "[CMS Article Form] Required form elements are missing."
        );

        return;
    }

    articleForm.addEventListener(
        "input",
        updateSubmitState
    );

    articleForm.addEventListener(
        "submit",
        handleSubmit
    );

    if (isEditMode) {
        await initializeEditMode();
        return;
    }

    initializeCreateMode();
}

function initializeCreateMode() {
    setDefaultDate();

    submitButton.textContent =
        "儲存文章";

    updateSubmitState();
}


async function initializeEditMode() {
    updatePageForEditMode();

    submitButton.disabled = true;

    showFormMessage(
        "正在載入文章，請稍候。"
    );

    try {
        const article =
            await loadArticle(editingPath);

        populateArticleForm(article);

        showFormMessage(
            "文章已載入，可以開始編輯。"
        );

        updateSubmitState();
    } catch (error) {
        console.error(
            "[CMS Edit Article] Failed to load article:",
            error
        );

        showFormMessage(
            error.message ||
            "無法載入文章，請返回文章列表後重試。",
            "error"
        );

        submitButton.disabled = true;
    }
}

function updatePageForEditMode() {
    document.title =
        "編輯文章｜Relife Admin";

    if (formEyebrow) {
        formEyebrow.textContent =
            "Edit Article";
    }

    if (formTitle) {
        formTitle.textContent =
            "編輯健康文章";
    }

    if (formDescription) {
        formDescription.textContent =
            "修改草稿的基本資料與文章內容。";
    }

    submitButton.textContent =
        "儲存變更";
}


async function loadArticle(articlePath) {
    const response = await fetch(
        "/.netlify/functions/admin-get-article",
        {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                path: articlePath
            })
        }
    );

    const result =
        await readJsonResponse(response);

    if (response.status === 401) {
        window.location.replace(
            "/admin/login.html"
        );

        throw new Error(
            "Authentication required."
        );
    }

    if (!response.ok || !result?.ok) {
        throw new Error(
            result?.error ||
            "文章載入失敗，請稍後再試。"
        );
    }

    return result.article;
}


function populateArticleForm(article) {
    titleInput.value =
        article.title || "";

    dateInput.value =
        article.date || "";

    summaryInput.value =
        article.summary || "";

    bodyInput.value =
        article.body || "";
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
        isEditMode
            ? "正在儲存文章變更，請稍候。"
            : "正在建立文章，請稍候。"
    );

    try {
        const endpoint =
            isEditMode
                ? "/.netlify/functions/admin-update-article"
                : "/.netlify/functions/admin-create-article";

        const response = await fetch(
            endpoint,
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
            isEditMode
                ? `文章「${result.article.title}」已成功更新。`
                : `文章「${result.article.title}」已成功建立。`,
            "success"
        );
        
        if (!isEditMode) {
            articleForm.reset();
        }

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
            isEditMode
                ? "[CMS Update Article] Request failed:"
                : "[CMS Create Article] Request failed:",
            error
        );

        showFormMessage(
            error.message ||
            (
                isEditMode
                    ? "文章更新失敗，請稍後再試。"
                    : "文章建立失敗，請稍後再試。"
            ),
            "error"
        );

        setSubmittingState(false);
    }
}

function createArticlePayload() {
    const payload = {
        title: titleInput.value.trim(),
        date: dateInput.value,
        summary: summaryInput.value.trim(),
        body: bodyInput.value.trim()
    };

    if (isEditMode) {
        payload.path = editingPath;
    }

    return payload;
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
            : isEditMode
                ? "儲存變更"
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