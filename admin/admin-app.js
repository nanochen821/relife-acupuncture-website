const currentUserElement = document.querySelector("#current-user");
const logoutButton = document.querySelector("#logout-button");

const articleStatus = document.querySelector("#article-status");
const articleList = document.querySelector("#article-list");


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
                headers: {
                    Accept: "application/json"
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

        await loadArticles();
        
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

        renderArticles(
            result.articles
        );
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


function renderArticles(articles) {
    articleList.replaceChildren();

    if (
        !Array.isArray(articles) ||
        articles.length === 0
    ) {
        setArticleStatus(
            "目前沒有已發布的文章。"
        );

        return;
    }

    for (const article of articles) {
        articleList.append(
            createArticleCard(article)
        );
    }

    articleStatus.hidden = true;
    articleList.hidden = false;
}


function createArticleCard(article) {
    const articleElement = document.createElement(
        "article"
    );

    articleElement.className = "article-item";

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

    contentElement.append(
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

    articleElement.append(
        contentElement
    );

    return articleElement;
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
    articleList.hidden = true;
}