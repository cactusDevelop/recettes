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
                    step.before,
                    false,
                    `${index}-before`,
                    step.title
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
                    true,
                    `${index}-instructions`,
                    step.title
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
                    "doneness"
                );

            box.appendChild(
                renderRichText(step.doneness, `${index}-doneness`, step.title)
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
                    step.important,
                    `${index}-important`,
                    step.title
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
                    step.rescue,
                    `${index}-rescue`,
                    step.title
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
                    step.cooling,
                    `${index}-cooling`,
                    step.title
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
    numbered = false,
    keyPrefix = "",
    stepTitle = ""
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


    items.forEach((item, itemIndex) => {

        const li =
            createElement("li");


        li.appendChild(
            renderRichText(item, `${keyPrefix}-${itemIndex}`, stepTitle)
        );


        list.appendChild(li);
    });


    return list;
}


/* =========================================================
   BOITES D'INFORMATION
   ========================================================= */

function createInfoBox(
    className,
    items,
    keyPrefix = "",
    stepTitle = ""
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


    items.forEach((item, itemIndex) => {

        const li =
            createElement("li");


        li.appendChild(
            renderRichText(item, `${keyPrefix}-${itemIndex}`, stepTitle)
        );


        list.appendChild(li);
    });


    box.appendChild(list);


    return box;
}


/* =========================================================
   MINUTEURS
   ========================================================= */

/*
 * Dans le texte des étapes, une durée entre doubles crochets
 * devient un minuteur :
 *
 *   "Enfourner [[30 à 35 minutes]]."
 *   "Réfrigérer [[au moins 6 h]], idéalement toute une nuit."
 *
 * Le texte entre crochets est affiché tel quel, suivi d'un
 * bouton. Pour une fourchette, le minuteur sonne à la plus
 * courte durée : c'est le moment de vérifier.
 *
 * Au démarrage, un bip court permet de vérifier que le son
 * est allumé. À la fin, l'alarme sonne jusqu'à ce qu'on
 * l'arrête (2 minutes au maximum).
 */

const TIMER_PATTERN = /\[\[(.+?)\]\]/g;

const ALARM_MAX_DURATION = 2 * 60 * 1000;

const timers = new Map();

let timerInterval = null;
let audioContext = null;
let wakeLock = null;


/**
 * Durée en secondes d'un texte comme "15 minutes",
 * "30 à 35 min", "1 h 30", "30 s à 1 min" ou "au moins 6 h".
 */
function parseDuration(text) {

    const hoursMinutes =
        text.match(/(\d+)\s*h\s*(\d+)/);

    if (hoursMinutes) {
        return Number(hoursMinutes[1]) * 3600 + Number(hoursMinutes[2]) * 60;
    }

    const number =
        text.match(/(\d+(?:[.,]\d+)?)/);

    if (!number) {
        return 0;
    }

    const value =
        Number(number[1].replace(",", "."));

    const rest =
        text.slice(number.index + number[0].length);

    const unit =
        rest.match(/\b(h|heures?|min|minutes?|s|sec|secondes?)\b/);

    if (!unit) {
        return 0;
    }

    if (unit[1].startsWith("h")) {
        return Math.round(value * 3600);
    }

    if (unit[1].startsWith("m")) {
        return Math.round(value * 60);
    }

    return Math.round(value);
}


function formatClock(seconds) {

    const total = Math.max(0, Math.ceil(seconds));

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    const pad = value => String(value).padStart(2, "0");

    return hours > 0
        ? `${hours}:${pad(minutes)}:${pad(secs)}`
        : `${pad(minutes)}:${pad(secs)}`;
}


/**
 * Rend un texte d'étape : quantités, températures
 * et minuteurs.
 */
function renderRichText(text, keyPrefix = "", stepTitle = "") {

    const fragment =
        document.createDocumentFragment();

    let lastIndex = 0;
    let timerIndex = 0;

    for (const match of text.matchAll(TIMER_PATTERN)) {

        fragment.appendChild(
            document.createTextNode(
                renderText(text.slice(lastIndex, match.index))
            )
        );

        const label = renderText(match[1]);
        const seconds = parseDuration(match[1]);

        if (seconds > 0) {
            fragment.appendChild(
                createTimerWidget(
                    `${keyPrefix}-${timerIndex}`,
                    label,
                    seconds,
                    stepTitle
                )
            );
        } else {
            fragment.appendChild(document.createTextNode(label));
        }

        lastIndex = match.index + match[0].length;
        timerIndex++;
    }

    fragment.appendChild(
        document.createTextNode(
            renderText(text.slice(lastIndex))
        )
    );

    return fragment;
}


function getTimer(key, label, seconds, stepTitle) {

    if (!timers.has(key)) {

        timers.set(key, {
            key,
            label,
            stepTitle: stepTitle.replace(/^\d+\.\s*/, ""),
            stepId: `step-${Number(key.split("-")[0]) + 1}`,
            duration: seconds * 1000,
            remaining: seconds * 1000,
            endsAt: 0,
            state: "idle",          // idle | running | paused | done
            doneAt: 0,
        });
    }

    return timers.get(key);
}


function createTimerWidget(key, label, seconds, stepTitle) {

    const timer =
        getTimer(key, label, seconds, stepTitle);

    timer.label = label;

    const wrapper =
        createElement("span", "timer");

    wrapper.dataset.timerKey = key;

    wrapper.appendChild(
        createElement("span", "timer-label", label)
    );

    const toggle =
        createElement("button", "timer-toggle");

    toggle.type = "button";
    toggle.addEventListener("click", () => toggleTimer(timer));

    const reset =
        createElement("button", "timer-reset", "↺");

    reset.type = "button";
    reset.title = "Remettre à zéro";
    reset.setAttribute("aria-label", "Remettre le minuteur à zéro");
    reset.addEventListener("click", () => resetTimer(timer));

    wrapper.appendChild(toggle);
    wrapper.appendChild(reset);

    updateTimerElement(wrapper, timer);

    return wrapper;
}


function timerRemaining(timer) {

    if (timer.state === "running") {
        return Math.max(0, timer.endsAt - Date.now());
    }

    return timer.state === "done" ? 0 : timer.remaining;
}


function timerButtonText(timer) {

    const clock = formatClock(timerRemaining(timer) / 1000);

    switch (timer.state) {
        case "running": return `❚❚ ${clock}`;
        case "paused":  return `▶ ${clock}`;
        case "done":    return "⏰ Terminé";
        default:        return `▶ ${clock}`;
    }
}


function timerButtonTitle(timer) {

    switch (timer.state) {
        case "running": return "Mettre en pause";
        case "paused":  return "Reprendre";
        case "done":    return "Arrêter l'alarme";
        default:        return "Lancer le minuteur";
    }
}


function updateTimerElement(element, timer) {

    element.dataset.state = timer.state;

    const toggle = element.querySelector(".timer-toggle");

    toggle.textContent = timerButtonText(timer);
    toggle.title = timerButtonTitle(timer);
    toggle.setAttribute("aria-label", `${timerButtonTitle(timer)} (${timer.label})`);
}


/* ---------- Son ---------- */

function getAudioContext() {

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        return null;
    }

    if (!audioContext) {
        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}


/**
 * Joue une série de bips : [[fréquence, durée en s], ...]
 * séparés par un court silence.
 */
function playBeeps(beeps) {

    const context = getAudioContext();

    if (!context) {
        return;
    }

    let time = context.currentTime + 0.02;

    for (const [frequency, duration] of beeps) {

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.4, time + 0.01);
        gain.gain.setValueAtTime(0.4, time + duration - 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(time);
        oscillator.stop(time + duration + 0.02);

        time += duration + 0.12;
    }
}


function playStartBeep() {
    playBeeps([[880, 0.15]]);
}


function playAlarm() {

    playBeeps([[988, 0.18], [988, 0.18], [988, 0.18], [1319, 0.35]]);

    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
    }
}


/* ---------- Écran allumé ---------- */

async function updateWakeLock() {

    const needed =
        [...timers.values()].some(timer => timer.state === "running");

    try {

        if (needed && !wakeLock && "wakeLock" in navigator) {

            wakeLock = await navigator.wakeLock.request("screen");

            wakeLock.addEventListener("release", () => {
                wakeLock = null;
            });
        }

        if (!needed && wakeLock) {
            await wakeLock.release();
            wakeLock = null;
        }

    } catch (error) {
        wakeLock = null;
    }
}


document.addEventListener("visibilitychange", () => {

    if (document.visibilityState === "visible") {
        updateWakeLock();
        tickTimers();
    }
});


/* ---------- Actions ---------- */

function toggleTimer(timer) {

    if (timer.state === "running") {

        timer.remaining = Math.max(0, timer.endsAt - Date.now());
        timer.state = "paused";

    } else if (timer.state === "done") {

        resetTimer(timer);
        return;

    } else {

        timer.endsAt = Date.now() + timer.remaining;
        timer.state = "running";

        // Bip de démarrage : vérifie que le son est allumé.
        playStartBeep();
    }

    refreshTimers();
}


function resetTimer(timer) {

    timer.state = "idle";
    timer.remaining = timer.duration;
    timer.endsAt = 0;
    timer.doneAt = 0;

    refreshTimers();
}


function tickTimers() {

    const now = Date.now();

    for (const timer of timers.values()) {

        if (timer.state === "running" && timer.endsAt <= now) {

            timer.state = "done";
            timer.remaining = 0;
            timer.doneAt = now;
            timer.lastAlarm = 0;
        }

        if (timer.state === "done") {

            if (now - timer.doneAt > ALARM_MAX_DURATION) {
                continue;
            }

            if (now - (timer.lastAlarm || 0) >= 2000) {
                timer.lastAlarm = now;
                playAlarm();
            }
        }
    }

    refreshTimers();
}


function refreshTimers() {

    for (const element of document.querySelectorAll("[data-timer-key]")) {

        const timer = timers.get(element.dataset.timerKey);

        if (timer) {
            updateTimerElement(element, timer);
        }
    }

    renderTimerTray();

    const active =
        [...timers.values()].filter(timer => timer.state !== "idle");

    const ticking =
        active.some(timer => timer.state === "running" || timer.state === "done");

    if (ticking && !timerInterval) {
        timerInterval = setInterval(tickTimers, 250);
    }

    if (!ticking && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const ringing =
        active.some(timer => timer.state === "done");

    const baseTitle =
        currentRecipe ? currentRecipe.title : document.title;

    document.title =
        ringing ? `⏰ Terminé · ${baseTitle}` : baseTitle;

    updateWakeLock();
}


/* ---------- Panneau des minuteurs en cours ---------- */

function renderTimerTray() {

    let tray =
        document.getElementById("timer-tray");

    const active =
        [...timers.values()].filter(timer => timer.state !== "idle");

    if (active.length === 0) {

        if (tray) {
            tray.remove();
        }

        return;
    }

    if (!tray) {
        tray = createElement("aside", "timer-tray");
        tray.id = "timer-tray";
        tray.setAttribute("aria-label", "Minuteurs en cours");
        document.body.appendChild(tray);
    }

    // Reconstruit seulement si la liste change : sinon un clic
    // pourrait tomber pendant le remplacement des boutons.
    const signature =
        active.map(timer => `${timer.key}:${timer.state}`).join("|");

    if (tray.dataset.signature === signature) {

        tray.querySelectorAll(".timer-tray-item").forEach((row, index) => {
            row.querySelector(".timer-toggle").textContent =
                timerButtonText(active[index]);
        });

        return;
    }

    tray.dataset.signature = signature;

    clearElement(tray);

    for (const timer of active) {

        const row =
            createElement("div", "timer-tray-item");

        row.dataset.state = timer.state;

        const link =
            createElement("a", "timer-tray-label");

        link.href = `#${timer.stepId}`;

        link.appendChild(
            createElement("span", "timer-tray-step", timer.stepTitle)
        );

        link.appendChild(
            createElement("span", "timer-tray-duration", timer.label)
        );

        const toggle =
            createElement("button", "timer-toggle", timerButtonText(timer));

        toggle.type = "button";
        toggle.title = timerButtonTitle(timer);
        toggle.addEventListener("click", () => toggleTimer(timer));

        const reset =
            createElement("button", "timer-reset", "×");

        reset.type = "button";
        reset.title = "Fermer le minuteur";
        reset.setAttribute("aria-label", "Fermer le minuteur");
        reset.addEventListener("click", () => resetTimer(timer));

        row.appendChild(link);
        row.appendChild(toggle);
        row.appendChild(reset);

        tray.appendChild(row);
    }
}


window.addEventListener("beforeunload", event => {

    const running =
        [...timers.values()].some(timer => timer.state === "running");

    if (running) {
        event.preventDefault();
        event.returnValue = "";
    }
});


/* =========================================================
   LANCEMENT
   ========================================================= */

loadRecipe();


document.addEventListener("settingschange", () => {

    if (currentRecipe) {
        renderRecipe(currentRecipe);
    }
});
