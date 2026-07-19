const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-navigation]");

if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
        const isOpen =
            menuButton.getAttribute("aria-expanded") === "true";

        menuButton.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );

        navigation.classList.toggle("is-open", !isOpen);
        document.body.classList.toggle("menu-open", !isOpen);
    });

    navigation.addEventListener("click", (event) => {
        const clickedLink = event.target.closest("a");

        if (!clickedLink) {
            return;
        }

        menuButton.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
        document.body.classList.remove("menu-open");
    });

    /*
     * Keep the JavaScript breakpoint aligned with responsive.css.
     * The desktop navigation returns above 1040px.
     */
    window.addEventListener("resize", () => {
        if (window.innerWidth > 1040) {
            menuButton.setAttribute("aria-expanded", "false");
            navigation.classList.remove("is-open");
            document.body.classList.remove("menu-open");
        }
    });
}