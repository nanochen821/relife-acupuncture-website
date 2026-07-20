const currentUserElement = document.querySelector("#current-user");
const logoutButton = document.querySelector("#logout-button");


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