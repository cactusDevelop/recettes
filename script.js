/* =========================================================
   CONFIGURATION
   ========================================================= */

const params = new URLSearchParams(window.location.search);
const recipeName = params.get("recipe");

const RECIPE_FILE = `recipes/${recipeName}.json`;


/* =========================================================
   UTILITAIRES
   ========================================================= */

/**
 * Transforme une clé JSON en titre lisible.
 *
 * Exemple :
 * coffee_buttercream
 * -> Coffee Buttercream
 */
function formatGroupName(name) {
    return name
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}


/**
 * Vide complètement un élément HTML.
 */
function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}


/**
 * Crée un élément HTML avec une classe et éventuellement
 * un contenu texte.
 */
function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text) {
        element.textContent = text;
    }

    return element;
}


/* =========================================================
   CHARGEMENT DE LA RECETTE
   ========================================================= */

async function loadRecipe() {

    try {

        const response = await fetch(RECIPE_FILE);

        if (!response.ok) {
            throw new Error(
                `Impossible de charger ${RECIPE_FILE}`
            );
        }

        const recipe = await response.json();

        renderRecipe(recipe);

    } catch (error) {

        console.error(error);

        document.body.innerHTML = `
            <main style="
                padding: 50px;
                font-family: sans-serif;
            ">
                <h1>Impossible de charger la recette</h1>

                <p>
                    Vérifie que le fichier
                    <strong>${RECIPE_FILE}</strong>
                    existe bien.
                </p>

                <p>
                    Si tu ouvres le fichier HTML directement
                    avec ton navigateur, utilise plutôt GitHub
                    Pages ou un serveur local.
                </p>
            </main>
        `;
    }
}


/* =========================================================
   INFORMATIONS GÉNÉRALES
   ========================================================= */

function renderRecipe(recipe) {

    document.title = recipe.title;

    document
        .getElementById("recipe-title")
        .textContent = recipe.title;

    document
        .getElementById("recipe-description")
        .textContent = recipe.description || "";

    document
        .getElementById("recipe-servings")
        .textContent = recipe.servings || "—";

    document
        .getElementById("recipe-pan-size")
        .textContent = recipe.pan_size || "—";

    document
        .getElementById("recipe-preparation-time")
        .textContent =
        recipe.total_time?.preparation || "—";

    document
        .getElementById("recipe-resting-time")
        .textContent =
        recipe.total_time?.resting || "—";

    renderTableOfContents(recipe.steps);

    renderIngredients(recipe.ingredients);

    renderSteps(recipe.steps);
}


function renderTableOfContents(steps) {

    const container =
        document.getElementById("toc-container");

    clearElement(container);

    steps.forEach((step, index) => {

        const link =
            document.createElement("a");

        link.className = "toc-item";

        link.href = `#step-${index + 1}`;

        const number =
            document.createElement("span");

        number.className = "toc-number";

        number.textContent =
            String(index + 1).padStart(2, "0");


        const title =
            document.createElement("span");

        title.className = "toc-title";

        title.textContent =
            step.title.replace(/^\d+\.\s*/, "");


        link.appendChild(number);
        link.appendChild(title);

        container.appendChild(link);
    });
}

/* =========================================================
   INGREDIENTS
   ========================================================= */

function renderIngredients(ingredients) {

    const container =
        document.getElementById("ingredients-container");

    clearElement(container);


    for (const [groupName, items] of Object.entries(ingredients)) {

        const group =
            createElement("div", "ingredient-group");


        const title =
            createElement(
                "h3",
                "ingredient-group-title",
                formatGroupName(groupName)
            );


        group.appendChild(title);


        for (const item of items) {

            const ingredient =
                createElement("div", "ingredient");


            const name =
                createElement(
                    "span",
                    "ingredient-name",
                    item.ingredient
                );


            const quantity =
                createElement(
                    "span",
                    "ingredient-quantity",
                    item.quantity
                );


            ingredient.appendChild(name);
            ingredient.appendChild(quantity);

            group.appendChild(ingredient);
        }


        container.appendChild(group);
    }
}


/* =========================================================
   ETAPES
   ========================================================= */

function renderSteps(steps) {

    const container =
        document.getElementById("steps-container");

    clearElement(container);


    steps.forEach((step, index) => {

        const article =
            createElement("article", "step");


        /* Numéro */

        const number =
            createElement(
                "div",
                "step-number",
                String(index + 1).padStart(2, "0")
            );


        /* Contenu */

        const content =
            createElement("div", "step-content");


        const title =
            createElement(
                "h3",
                "step-title",
                step.title
            );


        content.appendChild(title);


        /*
         * AVANT DE COMMENCER
         */

        if (Array.isArray(step.before) && step.before.length > 0) {

            const block =
                createElement("div", "step-block");

            const blockTitle =
                createElement(
                    "div",
                    "step-block-title",
                    "Avant de commencer"
                );

            block.appendChild(blockTitle);

            const list =
                createList(step.before);

            block.appendChild(list);

            content.appendChild(block);
        }


        /*
         * INSTRUCTIONS
         */

        if (
            Array.isArray(step.instructions) &&
            step.instructions.length > 0
        ) {

            const block =
                createElement("div", "step-block");

            const blockTitle =
                createElement(
                    "div",
                    "step-block-title",
                    "Préparation"
                );

            block.appendChild(blockTitle);

            const list =
                createList(step.instructions, true);

            block.appendChild(list);

            content.appendChild(block);
        }


        /*
         * DONENESS
         */

        if (step.doneness) {

            const box =
                createElement(
                    "div",
                    "doneness",
                    step.doneness
                );

            content.appendChild(box);
        }


        /*
         * IMPORTANT
         */

        if (
            Array.isArray(step.important) &&
            step.important.length > 0
        ) {

            const box =
                createInfoBox(
                    "important",
                    step.important
                );

            content.appendChild(box);
        }


        /*
         * RESCUE
         */

        if (
            Array.isArray(step.rescue) &&
            step.rescue.length > 0
        ) {

            const box =
                createInfoBox(
                    "rescue",
                    step.rescue
                );

            content.appendChild(box);
        }


        /*
         * COOLING
         */

        if (
            Array.isArray(step.cooling) &&
            step.cooling.length > 0
        ) {

            const box =
                createInfoBox(
                    "cooling",
                    step.cooling
                );

            content.appendChild(box);
        }


        article.appendChild(number);
        article.appendChild(content);

        container.appendChild(article);
    });
}


/* =========================================================
   LISTES
   ========================================================= */

function createList(items, numbered = false) {

    const list =
        createElement(
            numbered ? "ol" : "ul",
            numbered ? "step-list numbered" : "step-list"
        );


    items.forEach(item => {

        const li =
            createElement("li");

        li.textContent = item;

        list.appendChild(li);
    });


    return list;
}


/* =========================================================
   BOITES D'INFORMATION
   ========================================================= */

function createInfoBox(className, items) {

    const box =
        createElement(
            "div",
            className
        );


    const list =
        createElement(
            "ul",
            "info-list"
        );


    items.forEach(item => {

        const li =
            createElement("li");

        li.textContent = item;

        list.appendChild(li);
    });


    box.appendChild(list);

    return box;
}


/* =========================================================
   LANCEMENT
   ========================================================= */

loadRecipe();
