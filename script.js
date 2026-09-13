/* =========================================================
   CONFIGURATION
   ========================================================= */

/*
 * Le nom de la recette est déterminé automatiquement
 * par le nom du fichier HTML.
 *
 * opera.html    -> opera
 * tiramisu.html -> tiramisu
 *
 * Donc :
 *
 * recipes/opera.json
 * recipes/tiramisu.json
 */

const pageName = window.location.pathname
    .split("/")
    .pop()
    .replace(/\.html$/, "");


/*
 * Compatibilité avec une éventuelle URL de type :
 *
 * recipe.html?recipe=opera
 *
 * Le paramètre URL est prioritaire s'il existe.
 */
const params = new URLSearchParams(window.location.search);
const recipeName = params.get("recipe") || pageName;


/*
 * La page d'accueil n'est pas une page de recette.
 */
const isRecipePage =
    recipeName &&
    recipeName !== "index";


const RECIPE_FILE =
    `recipes/${recipeName}.json`;


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

    const element =
        document.createElement(tag);

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

    if (!isRecipePage) {
        return;
    }


    try {

        const response =
            await fetch(RECIPE_FILE);


        if (!response.ok) {

            throw new Error(
                `Impossible de charger ${RECIPE_FILE}`
            );
        }


        const recipe =
            await response.json();


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

    document.title =
        recipe.title;


    const title =
        document.getElementById("recipe-title");

    if (title) {
        title.textContent =
            recipe.title;
    }


    const description =
        document.getElementById("recipe-description");

    if (description) {
        description.textContent =
            recipe.description || "";
    }


    const servings =
        document.getElementById("recipe-servings");

    if (servings) {
        servings.textContent =
            recipe.servings || "—";
    }


    const panSize =
        document.getElementById("recipe-pan-size");

    if (panSize) {
        panSize.textContent =
            recipe.pan_size || "—";
    }


    const preparationTime =
        document.getElementById(
            "recipe-preparation-time"
        );

    if (preparationTime) {
        preparationTime.textContent =
            recipe.total_time?.preparation || "—";
    }


    const restingTime =
        document.getElementById(
            "recipe-resting-time"
        );

    if (restingTime) {
        restingTime.textContent =
            recipe.total_time?.resting || "—";
    }


    /*
     * L'image suit automatiquement le nom
     * de la recette :
     *
     * opera    -> images/opera.jpg
     * tiramisu -> images/tiramisu.jpg
     */
    const image =
        document.getElementById("recipe-image");

    if (image && recipeName) {

        image.src =
            `images/${recipeName}.jpg`;

        image.alt =
            recipe.title;
    }


    renderTableOfContents(
        recipe.steps
    );


    renderIngredients(
        recipe.ingredients
    );


    renderSteps(
        recipe.steps
    );
}


/* =========================================================
   SOMMAIRE
   ========================================================= */

function renderTableOfContents(steps) {

    const container =
        document.getElementById(
            "toc-container"
        );


    if (!container) {
        return;
    }


    clearElement(container);


    steps.forEach((step, index) => {

        const link =
            document.createElement("a");


        link.className =
            "toc-item";


        link.href =
            `#step-${index + 1}`;


        const number =
            document.createElement("span");


        number.className =
            "toc-number";


        number.textContent =
            String(index + 1).padStart(2, "0");


        const title =
            document.createElement("span");


        title.className =
            "toc-title";


        title.textContent =
            step.title.replace(
                /^\d+\.\s*/,
                ""
            );


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
        document.getElementById(
            "ingredients-container"
        );


    if (!container) {
        return;
    }


    clearElement(container);


    for (
        const [groupName, items]
        of Object.entries(ingredients)
    ) {

        const group =
            createElement(
                "div",
                "ingredient-group"
            );


        const title =
            createElement(
                "h3",
                "ingredient-group-title",
                formatGroupName(groupName)
            );


        group.appendChild(title);


        for (const item of items) {

            const ingredient =
                createElement(
                    "div",
                    "ingredient"
                );


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
        document.getElementById(
            "steps-container"
        );


    if (!container) {
        return;
    }


    clearElement(container);


    steps.forEach((step, index) => {

        const article =
            createElement(
                "article",
                "step"
            );


        /*
         * Permet au sommaire de pointer vers
         * chaque étape.
         */
        article.id =
            `step-${index + 1}`;


        /* Numéro */

        const number =
            createElement(
                "div",
                "step-number",
                String(index + 1).padStart(2, "0")
            );


        /* Contenu */

        const content =
            createElement(
                "div",
                "step-content"
            );


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

        if (
            Array.isArray(step.before) &&
            step.before.length > 0
        ) {

            const block =
                createElement(
                    "div",
                    "step-block"
                );


            const blockTitle =
                createElement(
                    "div",
                    "step-block-title",
                    "Avant de commencer"
                );


            block.appendChild(blockTitle);


            const list =
                createList(
                    step.before
                );


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
                createElement(
                    "div",
                    "step-block"
                );


            const blockTitle =
                createElement(
                    "div",
                    "step-block-title",
                    "Préparation"
                );


            block.appendChild(blockTitle);


            const list =
                createList(
                    step.instructions,
                    true
                );


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

function createList(
    items,
    numbered = false
) {

    const list =
        createElement(
            numbered
                ? "ol"
                : "ul",

            numbered
                ? "step-list numbered"
                : "step-list"
        );


    items.forEach(item => {

        const li =
            createElement("li");


        li.textContent =
            item;


        list.appendChild(li);
    });


    return list;
}


/* =========================================================
   BOITES D'INFORMATION
   ========================================================= */

function createInfoBox(
    className,
    items
) {

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


        li.textContent =
            item;


        list.appendChild(li);
    });


    box.appendChild(list);


    return box;
}


/* =========================================================
   LANCEMENT
   ========================================================= */

loadRecipe();
