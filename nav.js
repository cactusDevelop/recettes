/* =========================================================
   DONNEES DES RECETTES PAR CATEGORIE (menu du header)
   ========================================================= */

const NAV_RECIPES = {
    desserts: [
        { title: "Opéra classique", href: "opera.html", image: "images/opera.jpg" },
        { title: "Tiramisù", href: "tiramisu.html", image: "images/tiramisu.jpg" },
        { title: "Financiers", href: "financier.html", image: "images/financier.jpg" },
        { title: "Tarte Tatin", href: "tarte-tatin.html", image: "images/tarte-tatin.jpg" },
    ],
    sales: [
        { title: "Quiche saumon", href: "quiche.html", image: "images/quiche.jpg" },
        { title: "Moussaka", href: "moussaka.html", image: "images/moussaka.jpg" },
        { title: "Risotto de quinoa", href: "risotto-quinoa.html", image: "images/risotto-quinoa.jpg" },
    ],
};


/* =========================================================
   REMPLISSAGE DES MENUS DEROULANTS
   ========================================================= */

function populateNavDropdowns() {

    document
        .querySelectorAll("[data-nav-category]")
        .forEach(panel => {

            const recipes =
                NAV_RECIPES[panel.dataset.navCategory] || [];

            recipes.forEach(recipe => {

                const link = document.createElement("a");
                link.href = recipe.href;
                link.className = "nav-dropdown-item";

                const image = document.createElement("span");
                image.className = "nav-dropdown-item-image";

                const img = document.createElement("img");
                img.src = recipe.image;
                img.alt = "";
                image.appendChild(img);

                const label = document.createElement("span");
                label.className = "nav-dropdown-item-label";
                label.textContent = recipe.title;

                link.appendChild(image);
                link.appendChild(label);

                panel.appendChild(link);
            });
        });
}


/* =========================================================
   OUVERTURE / FERMETURE DES MENUS DEROULANTS
   (clic : nécessaire sur mobile/tactile, en plus du survol
   qui fonctionne déjà en CSS sur desktop)
   ========================================================= */

function initNavDropdowns() {

    const dropdowns =
        document.querySelectorAll("[data-nav-dropdown]");

    function closeAll() {

        dropdowns.forEach(dropdown => {

            dropdown.classList.remove("open");

            dropdown
                .querySelector(".nav-dropdown-toggle")
                .setAttribute("aria-expanded", "false");
        });
    }

    dropdowns.forEach(dropdown => {

        const toggle =
            dropdown.querySelector(".nav-dropdown-toggle");

        toggle.addEventListener("click", () => {

            const isOpen =
                dropdown.classList.contains("open");

            closeAll();

            if (!isOpen) {
                dropdown.classList.add("open");
                toggle.setAttribute("aria-expanded", "true");
            }
        });
    });

    document.addEventListener("click", event => {

        const insideAnyDropdown =
            [...dropdowns].some(
                dropdown => dropdown.contains(event.target)
            );

        if (!insideAnyDropdown) {
            closeAll();
        }
    });
}


/* =========================================================
   MENU HAMBURGER (MOBILE)
   ========================================================= */

function initHamburgerMenu() {

    const toggle =
        document.getElementById("menu-toggle");

    const nav =
        document.getElementById("site-nav");

    if (!toggle || !nav) {
        return;
    }

    toggle.addEventListener("click", () => {

        const isOpen =
            nav.classList.toggle("open");

        toggle.classList.toggle("open", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
    });

    window.addEventListener("resize", () => {

        if (window.innerWidth > 800) {

            nav.classList.remove("open");
            toggle.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");

            document
                .querySelectorAll("[data-nav-dropdown]")
                .forEach(dropdown => {

                    dropdown.classList.remove("open");

                    dropdown
                        .querySelector(".nav-dropdown-toggle")
                        .setAttribute("aria-expanded", "false");
                });
        }
    });
}


/* =========================================================
   MODE SOMBRE / CLAIR
   ========================================================= */

function initThemeToggle() {

    const toggle =
        document.getElementById("theme-toggle");

    if (!toggle) {
        return;
    }

    function applyTheme(theme) {

        document.documentElement.setAttribute("data-theme", theme);

        toggle.setAttribute("aria-pressed", String(theme === "dark"));
        toggle.setAttribute(
            "aria-label",
            theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"
        );
    }

    applyTheme(document.documentElement.getAttribute("data-theme") || "light");

    toggle.addEventListener("click", () => {

        const current =
            document.documentElement.getAttribute("data-theme");

        const next =
            current === "dark" ? "light" : "dark";

        applyTheme(next);

        localStorage.setItem("theme", next);
    });
}


populateNavDropdowns();
initNavDropdowns();
initHamburgerMenu();
initThemeToggle();
