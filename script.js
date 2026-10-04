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
   QUANTITES ET UNITES
   (voir settings.js pour les réglages de l'utilisateur)
   ========================================================= */

/*
 * Format d'un ingrédient dans le JSON :
 *
 * { "ingredient": "Lait", "amount": 520, "unit": "g", "kind": "milk" }
 * { "ingredient": "Sel", "quantity": "1 pincée" }   (texte libre)
 *
 * kind :
 *   egg / yolk / white       -> œufs entiers, jaunes, blancs (toujours en g)
 *   flour                    -> farine (nom remplacé par la farine choisie)
 *   water / milk / cream /
 *   oil / wine / coffee      -> liquides (convertis selon l'unité choisie)
 *
 * absorption (facultatif) :
 *   "liquid" -> quantité multipliée par l'absorption de la farine
 *   "flour"  -> quantité divisée par l'absorption de la farine
 *
 * note (facultatif) : texte ajouté après la quantité.
 *
 * Dans le texte des étapes, {{150 g egg}} ou {{50 g water}}
 * est remplacé par la quantité formatée selon les réglages.
 */

const LIQUID_DENSITIES = {
    water: 1,
    coffee: 1,
    milk: 1.03,
    cream: 1,
    oil: 0.92,
    wine: 0.99,
};

const EGG_NAMES = {
    egg: ["œuf", "œufs"],
    yolk: ["jaune", "jaunes"],
    white: ["blanc", "blancs"],
};

const UNITS = {
    g: { type: "mass", factor: 1 },
    kg: { type: "mass", factor: 1000 },
    ml: { type: "volume", factor: 1 },
    cl: { type: "volume", factor: 10 },
    l: { type: "volume", factor: 1000 },
};


function formatNumber(value) {
    return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}


function roundQuantity(value, unit) {

    if (unit === "cl") {
        return Math.round(value * 2) / 2;
    }

    if (unit === "kg" || unit === "l") {
        return Math.round(value * 100) / 100;
    }

    return value >= 100
        ? Math.round(value / 5) * 5
        : Math.round(value);
}


function flourAdjustment(absorption) {

    const factor = getFlour().absorption;

    if (absorption === "liquid") {
        return factor;
    }

    if (absorption === "flour") {
        return 1 / factor;
    }

    return 1;
}


function formatEggs(grams, kind, inText) {

    const weight = getEggWeights()[kind === "egg" ? "whole" : kind];
    const exact = grams / weight;

    // Œufs entiers au demi-œuf près, jaunes et blancs à l'unité.
    const count = kind === "egg"
        ? Math.max(0.5, Math.round(exact * 2) / 2)
        : Math.max(1, Math.round(exact));

    const whole = Math.floor(count);
    const half = count % 1 !== 0;

    const number =
        whole === 0 ? "½" : half ? `${whole} ½` : String(whole);

    const [singular, plural] = EGG_NAMES[kind];
    const countText = `${number} ${count >= 2 ? plural : singular}`;

    const approximate =
        Math.abs(count * weight - grams) / grams > 0.05;

    const gramsText = `${formatNumber(grams)} g`;

    switch (currentSettings.eggDisplay) {

        case "grams":
            return gramsText;

        case "count":
            return approximate ? `≈ ${countText}` : countText;

        default:
            if (inText) {
                return approximate
                    ? `${gramsText}, soit environ ${countText}`
                    : `${gramsText}, soit ${countText}`;
            }

            return approximate
                ? `${gramsText} (≈ ${countText})`
                : `${gramsText} (${countText})`;
    }
}


function formatLiquid(amount, unit, kind) {

    const target = currentSettings.liquidUnit;

    if (target === "recipe" || !UNITS[unit]) {
        return `${formatNumber(roundQuantity(amount, unit))} ${unit}`;
    }

    const density = LIQUID_DENSITIES[kind];
    const source = UNITS[unit];

    const grams = source.type === "mass"
        ? amount * source.factor
        : amount * source.factor * density;

    const value = target === "g"
        ? grams
        : grams / density / UNITS[target].factor;

    return `${formatNumber(roundQuantity(value, target))} ${target}`;
}


/**
 * Formate une quantité structurée selon les réglages.
 * inText : formulation adaptée à une phrase des étapes.
 */
function formatAmount(amount, unit, kind, absorption, inText = false) {

    const adjusted = amount * flourAdjustment(absorption);

    if (EGG_NAMES[kind]) {
        return formatEggs(roundQuantity(adjusted, "g"), kind, inText);
    }

    if (LIQUID_DENSITIES[kind]) {
        return formatLiquid(adjusted, unit, kind);
    }

    return `${formatNumber(roundQuantity(adjusted, unit))} ${unit}`;
}


function formatIngredientQuantity(item) {

    if (typeof item.amount !== "number") {
        return item.quantity || "";
    }

    const text = formatAmount(
        item.amount,
        item.unit || "g",
        item.kind,
        item.absorption
    );

    return item.note ? `${text}, ${item.note}` : text;
}


function convertTemperature(celsius) {

    const fahrenheit = celsius * 9 / 5 + 32;

    // Four : arrondi à 5 °F. Sucre, beurre : au degré près.
    return celsius >= 130
        ? Math.round(fahrenheit / 5) * 5
        : Math.round(fahrenheit);
}


/**
 * Remplace les quantités {{...}} et convertit les
 * températures d'un texte de recette.
 */
function renderText(text) {

    let result = text.replace(
        /\{\{\s*([\d.,]+)\s*(g|kg|ml|cl|l)\s*(\w+)?\s*(liquid|flour)?\s*\}\}/g,
        (match, amount, unit, kind, absorption) =>
            formatAmount(
                Number(amount.replace(",", ".")),
                unit,
                kind,
                absorption,
                true
            )
    );

    if (currentSettings.temperature === "F") {

        result = result.replace(
            /(\d+)(?:(\s*(?:à|-)\s*)(\d+))?\s*°C/g,
            (match, first, separator, second) =>
                second
                    ? `${convertTemperature(Number(first))}${separator}${convertTemperature(Number(second))} °F`
                    : `${convertTemperature(Number(first))} °F`
        );
    }

    return result;
}


/**
 * Rappel des réglages au-dessus des ingrédients,
 * avec un lien pour ouvrir le panneau.
 */
function renderSettingsSummary(ingredients) {

    const section =
        document.getElementById("ingredients");

    const container =
        document.getElementById("ingredients-container");

    if (!section || !container) {
        return;
    }

    let summary =
        section.querySelector(".settings-summary");

    if (!summary) {
        summary = createElement("div", "settings-summary");
        section.insertBefore(summary, container);
    }

    clearElement(summary);

    const items = Object.values(ingredients).flat();
    const parts = [];

    if (items.some(item => EGG_NAMES[item.kind])) {

        const size = currentSettings.eggSize === "custom"
            ? "mes œufs"
            : `calibre ${currentSettings.eggSize}`;

        parts.push(`Œufs : ${size}, ${getEggWeights().whole} g sans coquille`);
    }

    if (items.some(item => item.kind === "flour")) {
        parts.push(getFlour().label);
    }

    if (parts.length > 0) {
        summary.appendChild(
            createElement("span", "settings-summary-text", parts.join(" · "))
        );
    }

    const link = createElement("a", "settings-summary-link", "Modifier les paramètres");
    link.href = "#";
    link.setAttribute("data-open-settings", "");

    summary.appendChild(link);

    const adjusted =
        currentSettings.flour !== "tout_usage" &&
        items.some(item => item.absorption);

    if (adjusted) {

        summary.appendChild(
            createElement(
                "p",
                "settings-summary-note",
                `Les quantités en couleur sont ajustées pour la ${getFlour().label.replace(/^Farine /, "farine ")} : la recette est mise au point avec de la farine tout usage, qui n'absorbe pas la même quantité de liquide.`
            )
        );
    }
}


/* =========================================================
   CHARGEMENT DE LA RECETTE
   ========================================================= */

let currentRecipe = null;


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


        currentRecipe = recipe;

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


    renderSettingsSummary(
        recipe.ingredients
    );


    renderIngredients(
        recipe.ingredients
    );


    renderSteps(
        recipe.steps
    );
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
                    item.kind === "flour"
                        ? getFlour().label
                        : item.ingredient
                );


            const quantity =
                createElement(
                    "span",
                    "ingredient-quantity",
                    formatIngredientQuantity(item)
                );


            if (
                item.absorption &&
                currentSettings.flour !== "tout_usage"
            ) {
                quantity.classList.add("adjusted");
            }


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
                renderText(step.title)
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
                    renderText(step.doneness)
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
            renderText(item);


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
            renderText(item);


        list.appendChild(li);
    });


    box.appendChild(list);


    return box;
}


/* =========================================================
   LANCEMENT
   ========================================================= */

loadRecipe();


document.addEventListener("settingschange", () => {

    if (currentRecipe) {
        renderRecipe(currentRecipe);
    }
});
