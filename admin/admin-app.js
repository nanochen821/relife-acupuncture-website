const currentUserElement = document.querySelector("#current-user");
const logoutButton = document.querySelector("#logout-button");

const articleStatus =
    document.querySelector("#article-status");

const articleContent =
    document.querySelector("#article-content");

const draftArticleList =
    document.querySelector("#draft-article-list");

const publishedArticleList =
    document.querySelector("#published-article-list");

const draftEmpty =
    document.querySelector("#draft-empty");

const publishedEmpty =
    document.querySelector("#published-empty");

const draftCount =
    document.querySelector("#draft-count");

const publishedCount =
    document.querySelector("#published-count");


function redirectToLogin() {
    window.location.replace("/admin/login.html");
}


function setLoadingState(isLoading) {
    logoutButton.disabled = isLoading;

    logoutButton.textContent = isLoading
        ? "處理中..."
        : "登出";
}


async function loadSession() {
    try {
        const response = await fetch(
            "/.netlify/functions/admin-session",
            {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                    "Cache-Control": "no-cache"
                }
            }
        );

        if (!response.ok) {
            redirectToLogin();
            return;
        }

        const result = await response.json();

        if (
            !result.authenticated ||
            !result.user?.username
        ) {
            redirectToLogin();
            return;
        }

        currentUserElement.textContent =
            `登入帳號：${result.user.username}`;

        if (
            articleStatus &&
            articleContent &&
            draftArticleList &&
            publishedArticleList
        ) {
            await loadArticles();
        }

    } catch (error) {
        console.error(
            "[CMS Auth] Session request failed:",
            error
        );

        redirectToLogin();
    }
}


async function logout() {
    setLoadingState(true);

    try {
        const response = await fetch(
            "/.netlify/functions/admin-logout",
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Logout failed with status ${response.status}.`
            );
        }

        redirectToLogin();
    } catch (error) {
        console.error(
            "[CMS Auth] Logout request failed:",
            error
        );

        window.alert(
            "登出失敗，請稍後再試。"
        );
    } finally {
        setLoadingState(false);
    }
}


logoutButton.addEventListener("click", logout);

loadSession();

async function loadArticles() {
    setArticleStatus(
        "正在載入文章..."
    );

    try {
        const response = await fetch(
            "/.netlify/functions/admin-articles",
            {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const result = await response.json();

        if (response.status === 401) {
            window.location.replace(
                "/admin/login.html"
            );

            return;
        }

        if (!response.ok || !result.ok) {
            throw new Error(
                result.error ||
                "Unable to load articles."
            );
        }

        renderArticleGroups({
            drafts: result.drafts,
            published: result.published
        });
    } catch (error) {
        console.error(
            "[CMS Admin] Failed to load articles:",
            error
        );

        setArticleStatus(
            "文章載入失敗，請重新整理頁面後再試。",
            true
        );
    }
}

function renderArticleGroups({
    drafts,
    published
}) {
    const normalizedDrafts =
        Array.isArray(drafts) ? drafts : [];

    const normalizedPublished =
        Array.isArray(published) ? published : [];

    renderArticleList({
        articles: normalizedDrafts,
        listElement: draftArticleList,
        emptyElement: draftEmpty,
        countElement: draftCount
    });

    renderArticleList({
        articles: normalizedPublished,
        listElement: publishedArticleList,
        emptyElement: publishedEmpty,
        countElement: publishedCount
    });

    articleStatus.hidden = true;
    articleContent.hidden = false;
}


function renderArticleList({
    articles,
    listElement,
    emptyElement,
    countElement
}) {
    listElement.replaceChildren();

    countElement.textContent =
        `${articles.length} 篇`;

    if (articles.length === 0) {
        listElement.hidden = true;
        emptyElement.hidden = false;
        return;
    }

    for (const article of articles) {
        listElement.append(
            createArticleCard(article)
        );
    }

    emptyElement.hidden = true;
    listElement.hidden = false;
}

function createArticleCard(article) {
    const articleElement = document.createElement(
        "article"
    );

    articleElement.className =
        `article-item article-item--${article.status || "unknown"}`;

    const contentElement = document.createElement(
        "div"
    );

    contentElement.className = "article-item__content";

    const titleElement = document.createElement(
        "h3"
    );

    titleElement.className = "article-item__title";
    titleElement.textContent =
        article.title ||
        article.filename ||
        "Untitled article";

    const metaElement = document.createElement(
        "p"
    );

    metaElement.className = "article-item__meta";
    metaElement.textContent = formatArticleMeta(
        article
    );

    const statusElement = document.createElement(
        "span"
    );

    statusElement.className = "article-item__status";

    statusElement.textContent =
        article.status === "draft"
            ? "草稿"
            : "已發布";

    contentElement.append(
        statusElement,
        titleElement,
        metaElement
    );

    if (article.description) {
        const descriptionElement =
            document.createElement("p");

        descriptionElement.className =
            "article-item__description";

        descriptionElement.textContent =
            article.description;

        contentElement.append(
            descriptionElement
        );
    }

    const actionsElement = createArticleActions(
        article
    );
    
    articleElement.append(
        contentElement,
        actionsElement
    );
    
    return articleElement;
}

function createArticleActions(article) {
    const actionsElement = document.createElement(
        "div"
    );

    actionsElement.className = "article-item__actions";

    const editButton = createArticleActionButton({
        label: "編輯",
        variant: "secondary",
        action: "edit"
    });

    const deleteButton = createArticleActionButton({
        label: "刪除",
        variant: "danger",
        action: "delete"
    });

    if (article.status === "draft") {
        const publishButton = createArticleActionButton({
            label: "發布文章",
            variant: "primary",
            action: "publish",
            article
        });

        actionsElement.append(
            editButton,
            publishButton,
            deleteButton
        );

        return actionsElement;
    }

    const viewButton = createArticleActionButton({
        label: "檢視",
        variant: "secondary",
        action: "view"
    });

    const unpublishButton = createArticleActionButton({
        label: "取消發布",
        variant: "secondary",
        action: "unpublish"
    });

    actionsElement.append(
        viewButton,
        editButton,
        unpublishButton,
        deleteButton
    );

    return actionsElement;
}


function createArticleActionButton({
    label,
    variant,
    action,
    article = null
}) {
    const button = document.createElement(
        "button"
    );

    button.type = "button";

    button.className =
        `article-action article-action--${variant}`;

        button.dataset.articleAction = action;

        button.textContent = label;
        
        button.disabled = action !== "publish";
        if (action === "publish" && article) {
            button.addEventListener(
                "click",
                () => publishArticle(article, button)
            );
        }
        
        return button;
}

async function publishArticle(
    article,
    button
) {
    const confirmed = window.confirm(
        `確定要發布「${article.title || article.filename}」嗎？`
    );

    if (!confirmed) {
        return;
    }

    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = "發布中...";

    try {
        const response = await fetch(
            "/.netlify/functions/admin-publish-article",
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: article.path
                })
            }
        );

        const result = await response.json();

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok || !result.ok) {
            throw new Error(
                result.error ||
                "Unable to publish article."
            );
        }

        window.alert(
            "文章已成功發布。公開網站會在部署完成後更新。"
        );

        await loadArticles();
    } catch (error) {
        console.error(
            "[CMS Admin] Failed to publish article:",
            error
        );

        window.alert(
            error.message ||
            "文章發布失敗，請稍後再試。"
        );

        button.disabled = false;
        button.textContent = originalText;
    }
}

function formatArticleMeta(article) {
    const parts = [];

    if (article.date) {
        parts.push(
            formatArticleDate(article.date)
        );
    }

    if (article.filename) {
        parts.push(
            article.filename
        );
    }

    return parts.join(" · ");
}


function formatArticleDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "zh-TW",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(date);
}


function setArticleStatus(
    message,
    isError = false
) {
    articleStatus.textContent = message;

    articleStatus.classList.toggle(
        "content-status--error",
        isError
    );

    articleStatus.hidden = false;

    if (articleContent) {
        articleContent.hidden = true;
    }
}