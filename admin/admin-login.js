const loginForm = document.querySelector("#admin-login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const submitButton = document.querySelector("#login-submit");
const messageElement = document.querySelector("#login-message");


function showMessage(message, type = "error") {
    messageElement.textContent = message;
    messageElement.hidden = false;

    messageElement.classList.remove(
        "form-message--error",
        "form-message--success"
    );

    messageElement.classList.add(
        type === "success"
            ? "form-message--success"
            : "form-message--error"
    );
}


function clearMessage() {
    messageElement.textContent = "";
    messageElement.hidden = true;

    messageElement.classList.remove(
        "form-message--error",
        "form-message--success"
    );
}


function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    usernameInput.disabled = isSubmitting;
    passwordInput.disabled = isSubmitting;

    submitButton.textContent = isSubmitting
        ? "登入中..."
        : "登入";
}


async function checkExistingSession() {
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

        if (response.ok) {
            window.location.replace("/admin/app/");
        }
    } catch {
        // 無法確認 session 時仍保留登入畫面。
    }
}


async function submitLogin(event) {
    event.preventDefault();
    clearMessage();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showMessage("請輸入帳號與密碼。");
        return;
    }

    setSubmitting(true);

    try {
        const response = await fetch(
            "/.netlify/functions/admin-login",
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        let result = null;

        try {
            result = await response.json();
        } catch {
            result = null;
        }

        if (!response.ok) {
            showMessage(
                result?.error ||
                "登入失敗，請稍後再試。"
            );

            passwordInput.value = "";
            passwordInput.focus();
            return;
        }

        showMessage("登入成功，正在前往管理後台。", "success");

        window.location.replace("/admin/app/");
    } catch (error) {
        console.error(
            "[CMS Auth] Login request failed:",
            error
        );

        showMessage(
            "目前無法連線到登入服務，請稍後再試。"
        );
    } finally {
        setSubmitting(false);
    }
}


loginForm.addEventListener("submit", submitLogin);

checkExistingSession();