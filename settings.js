/* =========================================================
   PARAMETRES DE L'UTILISATEUR
   (œufs, unités, températures, farine disponible)
   ========================================================= */

/*
 * Poids moyens SANS coquille, par calibre.
 * Le calibre M correspond à la convention pâtissière :
 * 1 œuf = 50 g, 1 jaune = 20 g, 1 blanc = 30 g.
 */
const EGG_SIZES = {
    S:  { label: "Petits (S)",     whole: 42, yolk: 16, white: 26 },
    M:  { label: "Moyens (M)",     whole: 50, yolk: 20, white: 30 },
    L:  { label: "Gros (L)",       whole: 58, yolk: 21, white: 37 },
    XL: { label: "Très gros (XL)", whole: 66, yolk: 22, white: 44 },
};


/*
 * Farines : les recettes du site sont mises au point avec de
 * la farine tout usage, riche en protéines, qui boit plus de
 * liquide. "absorption" est relatif à cette farine : les
 * liquides sensibles d'une recette sont multipliés par ce
 * coefficient (ou la farine divisée, selon la recette).
 */
const FLOURS = {
    tout_usage: { label: "Farine tout usage",       absorption: 1.00 },
    t45:        { label: "Farine T45",              absorption: 0.94 },
    t55:        { label: "Farine T55",              absorption: 0.96 },
    t65:        { label: "Farine T65",              absorption: 0.98 },
    t80:        { label: "Farine T80",              absorption: 1.03 },
    type00:     { label: "Farine italienne type 00", absorption: 0.95 },
};


const DEFAULT_SETTINGS = {
    eggDisplay: "both",        // both | grams | count
    eggSize: "M",              // S | M | L | XL | custom
    eggCustom: 50,             // poids d'un œuf sans coquille (g)
    liquidUnit: "recipe",      // recipe | g | ml | cl
    temperature: "C",          // C | F
    flour: "tout_usage",
};


const SETTINGS_KEY = "settings";


function loadSettings() {

    let stored = {};

    try {
        stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch (error) {
        stored = {};
    }

    const settings = { ...DEFAULT_SETTINGS, ...stored };

    if (!EGG_SIZES[settings.eggSize] && settings.eggSize !== "custom") {
        settings.eggSize = DEFAULT_SETTINGS.eggSize;
    }

    if (!FLOURS[settings.flour]) {
        settings.flour = DEFAULT_SETTINGS.flour;
    }

    const custom = Number(settings.eggCustom);

    settings.eggCustom =
        custom >= 25 && custom <= 90 ? custom : DEFAULT_SETTINGS.eggCustom;

    return settings;
}


let currentSettings = loadSettings();


function saveSettings() {

    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (error) {
        // Navigation privée ou stockage bloqué : les réglages
        // restent valables pour la page en cours.
    }

    document.dispatchEvent(
        new CustomEvent("settingschange", { detail: currentSettings })
    );
}


/**
 * Poids d'un œuf entier, d'un jaune et d'un blanc
 * selon le calibre choisi.
 */
function getEggWeights() {

    if (currentSettings.eggSize === "custom") {

        const whole = currentSettings.eggCustom;
        const yolk = Math.round(whole * 0.37);

        return { whole, yolk, white: whole - yolk };
    }

    return EGG_SIZES[currentSettings.eggSize];
}


function getFlour() {
    return FLOURS[currentSettings.flour];
}


/* =========================================================
   PANNEAU DE PARAMETRES
   ========================================================= */

const SETTINGS_FIELDS = [
    {
        key: "eggDisplay",
        title: "Œufs : affichage",
        options: [
            ["both", "Poids et nombre"],
            ["grams", "Poids"],
            ["count", "Nombre"],
        ],
    },
    {
        key: "eggSize",
        title: "Œufs : calibre",
        hint: "Le nombre d'œufs est calculé à partir de ce calibre (poids sans coquille). Pour les recettes sensibles, pesez toujours vos œufs.",
        options: [
            ...Object.entries(EGG_SIZES).map(
                ([value, size]) => [value, `${size.label} · ${size.whole} g`]
            ),
            ["custom", "Mes œufs"],
        ],
    },
    {
        key: "liquidUnit",
        title: "Liquides",
        options: [
            ["recipe", "Comme la recette"],
            ["g", "Grammes"],
            ["ml", "Millilitres"],
            ["cl", "Centilitres"],
        ],
    },
    {
        key: "temperature",
        title: "Températures",
        options: [
            ["C", "°C"],
            ["F", "°F"],
        ],
    },
    {
        key: "flour",
        title: "Farine disponible",
        hint: "Les recettes sont mises au point avec de la farine tout usage. Avec une autre farine, les quantités sensibles (lait des crêpes, farine des pâtes fraîches…) sont ajustées.",
        options: Object.entries(FLOURS).map(
            ([value, flour]) => [value, flour.label]
        ),
    },
];


function buildSettingsPanel() {

    const overlay = document.createElement("div");
    overlay.className = "settings-overlay";
    overlay.hidden = true;

    const panel = document.createElement("aside");
    panel.className = "settings-panel";
    panel.id = "settings-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "settings-title");
    panel.hidden = true;

    panel.innerHTML = `
        <div class="settings-header">
            <h2 class="settings-title" id="settings-title">Paramètres</h2>
            <button type="button" class="settings-close" aria-label="Fermer les paramètres">×</button>
        </div>
        <p class="settings-intro">
            Les recettes s'adaptent à ces réglages, enregistrés sur cet appareil.
        </p>
        <form class="settings-form"></form>
        <button type="button" class="settings-reset">Réinitialiser</button>
    `;

    const form = panel.querySelector(".settings-form");

    SETTINGS_FIELDS.forEach(field => {

        const fieldset = document.createElement("fieldset");
        fieldset.className = "settings-field";

        const legend = document.createElement("legend");
        legend.className = "settings-legend";
        legend.textContent = field.title;
        fieldset.appendChild(legend);

        const choices = document.createElement("div");
        choices.className = "settings-choices";

        field.options.forEach(([value, label]) => {

            const choice = document.createElement("label");
            choice.className = "settings-choice";

            const input = document.createElement("input");
            input.type = "radio";
            input.name = field.key;
            input.value = value;

            const text = document.createElement("span");
            text.textContent = label;

            choice.appendChild(input);
            choice.appendChild(text);
            choices.appendChild(choice);
        });

        fieldset.appendChild(choices);

        if (field.key === "eggSize") {

            const custom = document.createElement("label");
            custom.className = "settings-custom";
            custom.innerHTML = `
                <span>Poids moyen d'un de mes œufs, sans coquille</span>
                <span class="settings-custom-input">
                    <input type="number" name="eggCustom" min="25" max="90" step="1" inputmode="numeric">
                    <span>g</span>
                </span>
            `;
            fieldset.appendChild(custom);
        }

        if (field.hint) {
            const hint = document.createElement("p");
            hint.className = "settings-hint";
            hint.textContent = field.hint;
            fieldset.appendChild(hint);
        }

        form.appendChild(fieldset);
    });

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    return { overlay, panel, form };
}


function syncSettingsForm(form) {

    SETTINGS_FIELDS.forEach(field => {
        form
            .querySelectorAll(`input[name="${field.key}"]`)
            .forEach(input => {
                input.checked = input.value === String(currentSettings[field.key]);
            });
    });

    const custom = form.querySelector(".settings-custom");
    custom.hidden = currentSettings.eggSize !== "custom";

    const customInput = form.querySelector('input[name="eggCustom"]');

    if (document.activeElement !== customInput) {
        customInput.value = currentSettings.eggCustom;
    }
}


function initSettings() {

    const controls = document.querySelector(".header-controls");

    if (!controls) {
        return;
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "header-icon-btn settings-toggle";
    toggle.id = "settings-toggle";
    toggle.setAttribute("aria-label", "Paramètres");
    toggle.setAttribute("aria-controls", "settings-panel");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `
        <svg class="settings-icon" viewBox="0 0 24 24" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
            <circle cx="9" cy="6" r="2"></circle>
            <circle cx="15" cy="12" r="2"></circle>
            <circle cx="7" cy="18" r="2"></circle>
        </svg>
    `;

    controls.insertBefore(toggle, controls.firstChild);

    const { overlay, panel, form } = buildSettingsPanel();

    function open() {
        syncSettingsForm(form);
        overlay.hidden = false;
        panel.hidden = false;
        // Force le rendu de la position fermée pour que la transition joue.
        void panel.offsetWidth;
        overlay.classList.add("open");
        panel.classList.add("open");
        toggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("settings-open");
        panel.querySelector(".settings-close").focus();
    }

    function close() {
        overlay.classList.remove("open");
        panel.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("settings-open");
        setTimeout(() => {
            if (!panel.classList.contains("open")) {
                overlay.hidden = true;
                panel.hidden = true;
            }
        }, 300);
        toggle.focus();
    }

    toggle.addEventListener("click", open);
    overlay.addEventListener("click", close);
    panel.querySelector(".settings-close").addEventListener("click", close);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && panel.classList.contains("open")) {
            close();
        }
    });

    form.addEventListener("submit", event => event.preventDefault());

    form.addEventListener("change", event => {

        const { name, value } = event.target;

        if (name === "eggCustom") {
            return;
        }

        if (name in DEFAULT_SETTINGS) {
            currentSettings[name] = value;
            syncSettingsForm(form);
            saveSettings();
        }
    });

    form.addEventListener("input", event => {

        if (event.target.name !== "eggCustom") {
            return;
        }

        const weight = Number(event.target.value);

        if (weight >= 25 && weight <= 90) {
            currentSettings.eggCustom = weight;
            saveSettings();
        }
    });

    panel.querySelector(".settings-reset").addEventListener("click", () => {
        currentSettings = { ...DEFAULT_SETTINGS };
        syncSettingsForm(form);
        saveSettings();
    });

    // Lien "Modifier" affiché sur les pages de recette.
    document.addEventListener("click", event => {
        if (event.target.closest("[data-open-settings]")) {
            event.preventDefault();
            open();
        }
    });
}


initSettings();
