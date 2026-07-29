/* =====================================================
   DIGI-CO QUICKCHECK
   Dynamische Version auf Basis von config.json
   ===================================================== */

// Globale Konfiguration des Quickchecks. Wird beim Start aus config.json geladen.
let CONFIG = null;

// Chart.js-Instanzen. Sie werden gespeichert, damit sie vor dem Neuzeichnen zerstört werden können.
let radarChart = null;
let barChart = null;

// Startet die Initialisierung, sobald das HTML-Dokument vollständig geladen ist.
window.addEventListener("DOMContentLoaded", initQuickcheck);

/**
 * Startet den Quickcheck, sobald die Seite vollständig geladen ist.
 *
 * Diese zentrale Initialisierungsfunktion lädt zuerst die Konfiguration,
 * überträgt Titel und Branding in die Oberfläche, rendert anschließend
 * den Fragebogen und registriert alle Eingabe-Listener. Danach werden
 * KI-Sichtbarkeit und Dashboard initial berechnet.
 *
 * Ablauf:
 * 1. config.json oder lokale Vorschau laden
 * 2. Metadaten anwenden
 * 3. Fragebogen aus der Konfiguration erzeugen
 * 4. Event Listener registrieren
 * 5. KI-Fragen und Dashboard initialisieren
 *
 * @returns {Promise<void>}
 */
async function initQuickcheck() {
  CONFIG = await loadConfig();
  applyMeta();
  renderQuestionnaire();
  initListeners();
  updateAiVisibility();
  updateDashboard();
}

/**
 * Lädt die zentrale Quickcheck-Konfiguration.
 *
 * Zuerst wird geprüft, ob im Browser eine lokale Vorschau-Konfiguration
 * aus dem Builder gespeichert ist. Falls ja, wird diese verwendet.
 * Falls nicht, wird die Datei config.json aus dem gleichen Verzeichnis
 * wie index.html geladen.
 *
 * Wichtig: Beim lokalen Test sollte ein lokaler Server genutzt werden,
 * da fetch("config.json") per file:// häufig blockiert wird.
 *
 * @returns {Promise<Object>} Die geladene Konfiguration als JavaScript-Objekt.
 * @throws {Error} Wenn config.json nicht geladen werden kann.
 */
async function loadConfig() {
  const localConfig = localStorage.getItem("quickcheckConfigPreview");
  if (localConfig) {
    try { return JSON.parse(localConfig); } catch (e) { console.warn("Lokale Vorschau-Konfiguration fehlerhaft."); }
  }

  const response = await fetch("config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("config.json konnte nicht geladen werden.");
  return response.json();
}

/**
 * Überträgt allgemeine Metadaten aus der Konfiguration in die Oberfläche.
 *
 * Dazu gehören:
 * - Browser-Titel
 * - sichtbarer Titel
 * - Untertitel
 * - Logo-Platzhalter
 * - Partner-/Geldgeber-Platzhalter
 */
function applyMeta() {
  document.title = CONFIG.meta.title || "Quickcheck";
  setText("appTitle", CONFIG.meta.title || "Quickcheck");
  setText("appSubtitle", CONFIG.meta.subtitle || "");
  setText("logoBox", CONFIG.meta.logoText || "Logo");
  setText("partnerBox", CONFIG.meta.partnerText || "Partner");
}

/**
 * Setzt den Textinhalt eines HTML-Elements, falls dieses Element existiert.
 *
 * Diese Hilfsfunktion verhindert Fehler, wenn ein optionales Element
 * in einer Variante der index.html nicht vorhanden ist.
 *
 * @param {string} id - ID des HTML-Elements.
 * @param {string} value - Text, der eingesetzt werden soll.
 */
function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.innerText = value;
}

/**
 * Baut den kompletten Fragebogen dynamisch aus CONFIG.sections auf.
 *
 * Für jeden konfigurierten Fragenblock wird eine Card erzeugt.
 * Digital-/Info-Fragen werden direkt angezeigt, KI-Fragen werden in einem
 * separaten, zunächst ausgeblendeten KI-Container gesammelt.
 *
 * Dadurch muss index.html keine festen Fragen mehr enthalten.
 */
function renderQuestionnaire() {
  const root = document.getElementById("questionnaire");
  root.innerHTML = "";

  CONFIG.sections.forEach(section => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.sectionCard = section.id;

    const title = document.createElement("h2");
    title.innerText = section.title;
    card.appendChild(title);

    const digitalQuestions = section.questions.filter(q => q.category !== "ai");
    const aiQuestions = section.questions.filter(q => q.category === "ai");

    digitalQuestions.forEach(question => {
      card.appendChild(renderQuestion(section, question));
    });

    if (aiQuestions.length > 0) {
      const aiContainer = document.createElement("div");
      aiContainer.id = getAiContainerId(section.id);
      aiContainer.className = "hidden ai-container";
      aiContainer.dataset.section = section.id;

      aiQuestions.forEach(question => {
        aiContainer.appendChild(renderQuestion(section, question));
      });

      card.appendChild(aiContainer);
    }

    root.appendChild(card);
  });
}

/**
 * Erstellt das HTML für eine einzelne Frage.
 *
 * Je nach Fragetyp wird ein anderes Eingabeelement erzeugt:
 * - scale: Select mit Skala 1 bis 4
 * - text: Textarea
 * - checkbox: Checkbox-Gruppe mit optionalem Sonstiges-Feld
 *
 * Zusätzlich werden data-Attribute und Klassen gesetzt, die später für
 * Scoring, Export, Fortschritt und KI-Logik benötigt werden.
 *
 * @param {Object} section - Der Fragenblock, zu dem die Frage gehört.
 * @param {Object} question - Die Frage aus der config.json.
 * @returns {HTMLDivElement} Fertiges Frage-Wrapper-Element.
 */
function renderQuestion(section, question) {
  const wrapper = document.createElement("div");
  wrapper.className = "question";
  wrapper.dataset.section = section.id;
  wrapper.dataset.questionId = question.id;
  wrapper.dataset.category = question.category || "digital";
  wrapper.dataset.type = question.type;

  if (question.category === "ai") wrapper.classList.add("ai-question");
  if (question.category === "digital") wrapper.classList.add("digital-question");

  const label = document.createElement("label");
  label.innerText = `${question.id} ${question.text}`;
  wrapper.appendChild(label);

  if (question.type === "scale") {
    const select = document.createElement("select");
    select.dataset.questionId = question.id;
    if (question.required) select.classList.add("required");

    const empty = document.createElement("option");
    empty.value = "";
    empty.innerText = "Bitte wählen";
    select.appendChild(empty);

    select.appendChild(option("1", "1 - gar nicht"));
    select.appendChild(option("2", "2 - kaum"));
    select.appendChild(option("3", "3 - teilweise"));
    select.appendChild(option("4", "4 - vollständig"));

    wrapper.appendChild(select);
  }

  if (question.type === "text") {
    const textarea = document.createElement("textarea");
    textarea.rows = 5;
    textarea.dataset.questionId = question.id;
    if (question.required) textarea.classList.add("required");
    wrapper.appendChild(textarea);
  }

  if (question.type === "checkbox") {
    const group = document.createElement("div");
    group.className = "checkbox-group";
    group.dataset.questionId = question.id;
    group.dataset.maxChoices = question.maxChoices || "";
    if (question.required) group.classList.add("required", "checkbox-required");

    (question.options || []).forEach(item => {
      const optionLabel = document.createElement("label");
      optionLabel.className = "checkbox-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = question.id;
      input.value = item;

      optionLabel.appendChild(input);
      optionLabel.appendChild(document.createTextNode(item));
      group.appendChild(optionLabel);
    });

    if (question.allowOther) {
      const otherInput = document.createElement("input");
      otherInput.type = "text";
      otherInput.placeholder = "Sonstiges";
      otherInput.dataset.otherFor = question.id;
      group.appendChild(otherInput);
    }

    wrapper.appendChild(group);
  }

  return wrapper;
}

/**
 * Erstellt eine einzelne Option für ein Select-Feld.
 *
 * Wird vor allem für die Skala 1 bis 4 verwendet.
 *
 * @param {string} value - Technischer Wert der Option.
 * @param {string} label - Sichtbarer Text der Option.
 * @returns {HTMLOptionElement} Fertiges option-Element.
 */
function option(value, label) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.innerText = label;
  return opt;
}

/**
 * Registriert Event Listener für alle Eingabefelder des gerenderten Fragebogens.
 *
 * Bei jeder Änderung werden folgende Aktionen ausgelöst:
 * - Ampelfarbe der Frage aktualisieren
 * - Checkbox-Limits prüfen
 * - KI-Fragen ein-/ausblenden
 * - Fortschritt, Scores, Diagramme und Empfehlungen aktualisieren
 *
 * Diese Funktion muss nach renderQuestionnaire() aufgerufen werden,
 * weil die Eingabefelder erst dann im DOM existieren.
 */
function initListeners() {
  document.querySelectorAll("select, textarea, input").forEach(element => {
    element.addEventListener("change", () => {
      if (element.tagName === "SELECT") updateQuestionColor(element);
      enforceCheckboxLimit(element);
      updateAiVisibility();
      updateDashboard();
    });

    element.addEventListener("input", () => {
      updateAiVisibility();
      updateDashboard();
    });
  });
}

/**
 * Aktualisiert die Ampelfarbe einer Skalenfrage.
 *
 * Farbregel:
 * - 1 oder 2 = rot / bad
 * - 3 = gelb / medium
 * - 4 = grün / good
 *
 * @param {HTMLSelectElement} select - Das geänderte Select-Feld.
 */
function updateQuestionColor(select) {
  const question = select.closest(".question");
  if (!question) return;

  question.classList.remove("good", "medium", "bad");

  const value = Number(select.value);
  if (value === 4) question.classList.add("good");
  else if (value === 3) question.classList.add("medium");
  else if (value === 1 || value === 2) question.classList.add("bad");
}

/**
 * Erzwingt eine maximale Anzahl auswählbarer Checkboxen.
 *
 * Wenn für eine Checkbox-Gruppe maxChoices definiert wurde, verhindert
 * diese Funktion, dass mehr Optionen gewählt werden als erlaubt.
 *
 * @param {HTMLElement} element - Das geänderte Eingabeelement.
 */
function enforceCheckboxLimit(element) {
  if (element.type !== "checkbox") return;

  const group = element.closest(".checkbox-group");
  if (!group) return;

  const max = Number(group.dataset.maxChoices);
  if (!max) return;

  const checked = [...group.querySelectorAll("input[type='checkbox']:checked")];
  if (checked.length > max) {
    element.checked = false;
    alert(`Bitte maximal ${max} Optionen auswählen.`);
  }
}

/**
 * Prüft pro Fragenblock, ob die KI-Fragen sichtbar sein dürfen.
 *
 * KI-Fragen werden nur dann eingeblendet, wenn alle digitalen Basisfragen
 * desselben Blocks mindestens den konfigurierten aiUnlockThreshold erreichen.
 *
 * Wird die Bedingung nicht erfüllt, wird der KI-Container ausgeblendet
 * und alle Antworten innerhalb dieses Containers werden zurückgesetzt.
 */
function updateAiVisibility() {
  CONFIG.sections.forEach(section => {
    const aiContainer = document.getElementById(getAiContainerId(section.id));
    if (!aiContainer) return;

    const digitalSelects = [...document.querySelectorAll(`.digital-question[data-section="${section.id}"] select`)];

    const unlock = digitalSelects.length > 0 &&
      digitalSelects.every(select => Number(select.value) >= CONFIG.scoring.aiUnlockThreshold);

    if (unlock) {
      aiContainer.classList.remove("hidden");
    } else {
      aiContainer.classList.add("hidden");
      resetFieldsInside(aiContainer);
    }
  });
}

/**
 * Erzeugt die ID des KI-Containers für einen Fragenblock.
 *
 * Beispiel:
 * sectionId = "A" -> "ai-A"
 *
 * @param {string} sectionId - ID des Fragenblocks.
 * @returns {string} ID des zugehörigen KI-Containers.
 */
function getAiContainerId(sectionId) {
  return `ai-${sectionId}`;
}

/**
 * Aktualisiert den gesamten Auswertungsbereich des Quickchecks.
 *
 * Diese Funktion ist die zentrale Steuerstelle nach jeder Eingabeänderung.
 * Sie aktualisiert den Fortschritt, prüft die Vollständigkeit, steuert die
 * Sichtbarkeit der KI-Reifegrad-Card und berechnet bei vollständiger
 * Beantwortung alle Scores, Charts und Empfehlungen.
 *
 * Wenn showResultsOnlyWhenComplete aktiv ist, wird die Auswertung erst
 * angezeigt, wenn alle aktuell sichtbaren Pflichtfragen beantwortet wurden.
 */
function updateDashboard() {
  updateProgress();

  const allVisibleAnswered = areAllVisibleRequiredAnswered();
  const aiReady = allVisibleAnswered && allVisibleAiQuestionsAnswered();

  updateAiScoreVisibility(aiReady);

  if (CONFIG.scoring.showResultsOnlyWhenComplete && !allVisibleAnswered) {
    hideResultsUntilComplete();
    updateAiScoreVisibility(false);
    return;
  }

  const overallPercent = calculateOverallScore();
  const digitalPercent = calculateDigitalScore();
  const aiPercent = aiReady ? calculateAiScore() : null;

  updateScoreBox("scoreBox", overallPercent, "Gesamt-Reifegrad");
  updateScoreBox("digitalScoreBox", digitalPercent, "Digitalisierungsgrad");

  if (aiReady) updateScoreBox("aiScoreBox", aiPercent, "KI-Reifegrad");

  updateCharts(overallPercent, digitalPercent, aiPercent);
  updateRecommendations(overallPercent, digitalPercent, aiPercent);
}

/**
 * Aktualisiert die Fortschrittsanzeige.
 *
 * Es werden nur sichtbare Pflichtfelder gezählt. Verborgene KI-Fragen
 * zählen also nicht als offen, solange sie nicht freigeschaltet sind.
 *
 * Aktualisiert:
 * - Anzahl offener Fragen
 * - Fortschrittsbalken in Prozent
 */
function updateProgress() {
  const visibleRequired = getVisibleRequiredFields();
  const answered = visibleRequired.filter(isFieldAnswered).length;
  const total = visibleRequired.length;
  const remaining = total - answered;
  const progress = total === 0 ? 0 : Math.round((answered / total) * 100);

  setText("remaining", remaining);

  const bar = document.getElementById("progressBar");
  if (bar) {
    bar.style.width = progress + "%";
    bar.innerText = progress + "%";
  }
}

/**
 * Sammelt alle aktuell sichtbaren Pflichtfelder.
 *
 * Pflichtfelder sind Elemente mit der Klasse .required. Unsichtbare Felder,
 * zum Beispiel verborgene KI-Fragen, werden ausgeschlossen.
 *
 * @returns {HTMLElement[]} Liste sichtbarer Pflichtfelder.
 */
function getVisibleRequiredFields() {
  return [...document.querySelectorAll(".required")].filter(isVisible);
}

/**
 * Prüft, ob alle sichtbaren Pflichtfelder beantwortet wurden.
 *
 * Diese Prüfung steuert, ob die Auswertung angezeigt werden darf.
 *
 * @returns {boolean} true, wenn alle sichtbaren Pflichtfelder beantwortet sind.
 */
function areAllVisibleRequiredAnswered() {
  const fields = getVisibleRequiredFields();
  return fields.length > 0 && fields.every(isFieldAnswered);
}

/**
 * Prüft, ob ein einzelnes Eingabefeld beantwortet wurde.
 *
 * Unterstützt:
 * - Checkbox-Gruppen
 * - einzelne Checkboxen / Radio-Buttons
 * - Selects, Textareas und Textfelder
 *
 * @param {HTMLElement} field - Das zu prüfende Feld.
 * @returns {boolean} true, wenn das Feld als beantwortet gilt.
 */
function isFieldAnswered(field) {
  if (field.classList.contains("checkbox-group")) {
    return field.querySelectorAll("input[type='checkbox']:checked").length > 0;
  }
  if (field.type === "checkbox" || field.type === "radio") return field.checked;
  return field.value !== "";
}

/**
 * Prüft, ob alle aktuell sichtbaren KI-Fragen beantwortet wurden.
 *
 * Diese Funktion verhindert, dass der KI-Reifegrad schon nach einer
 * einzelnen beantworteten KI-Frage angezeigt wird.
 *
 * @returns {boolean} true, wenn mindestens eine KI-Frage sichtbar ist und alle sichtbaren KI-Fragen beantwortet sind.
 */
function allVisibleAiQuestionsAnswered() {
  const visibleAiSelects = [...document.querySelectorAll(".ai-question select")].filter(isVisible);
  return visibleAiSelects.length > 0 && visibleAiSelects.every(select => select.value !== "");
}

/**
 * Steuert die Sichtbarkeit der KI-Reifegrad-Card.
 *
 * Die Funktion enthält bewusst keine eigene Entscheidungslogik. Sie zeigt
 * oder versteckt die Card ausschließlich anhand des übergebenen Parameters.
 *
 * @param {boolean} show - true zeigt die KI-Card, false versteckt sie.
 */
function updateAiScoreVisibility(show) {
  const card = document.getElementById("aiScoreCard");
  if (!card) return;
  card.classList.toggle("hidden", show !== true);
}

/**
 * Blendet Auswertungselemente aus bzw. zeigt Platzhalter, solange der Fragebogen unvollständig ist.
 *
 * Betroffen sind:
 * - Gesamt-Reifegrad
 * - Digitalisierungsgrad
 * - KI-Reifegrad
 * - Empfehlungen
 * - Diagramme
 */
function hideResultsUntilComplete() {
  updateScorePlaceholder("scoreBox");
  updateScorePlaceholder("digitalScoreBox");
  updateAiScoreVisibility(false);
  hideRecommendations();
  destroyCharts();
}

/**
 * Setzt eine Score-Box auf den neutralen Platzhalterzustand.
 *
 * Wird genutzt, solange die Auswertung noch nicht angezeigt werden darf.
 *
 * @param {string} id - ID der Score-Box.
 */
function updateScorePlaceholder(id) {
  const box = document.getElementById(id);
  if (!box) return;
  box.className = "score-box neutral";
  box.innerText = "Auswertung nach vollständiger Beantwortung";
}

/**
 * Berechnet den Gesamt-Reifegrad des Quickchecks.
 *
 * Bewertet werden alle Skalenfragen aus der Konfiguration. Die Berechnung
 * erfolgt gegen die maximal mögliche Punktzahl aller entsprechenden Fragen.
 * Dadurch können nicht beantwortete oder nicht freigeschaltete Scoringfragen
 * den Gesamtwert nicht künstlich überhöhen.
 *
 * @returns {number} Gesamt-Reifegrad in Prozent.
 */
function calculateOverallScore() {
  const scaleQuestions = getAllScaleQuestionsFromConfig();
  return calculateScoreAgainstAllQuestions(scaleQuestions);
}

/**
 * Berechnet den Digitalisierungsgrad.
 *
 * Bewertet werden alle Skalenfragen mit der Kategorie "digital".
 * Die Berechnung erfolgt gegen alle möglichen Digitalisierungsfragen aus
 * der Konfiguration, nicht nur gegen bereits beantwortete Fragen.
 *
 * @returns {number} Digitalisierungsgrad in Prozent.
 */
function calculateDigitalScore() {
  const digitalQuestions = getAllScaleQuestionsFromConfig(q => q.category === "digital");
  return calculateScoreAgainstAllQuestions(digitalQuestions);
}

/**
 * Berechnet den KI-Reifegrad.
 *
 * Bewertet werden alle Skalenfragen mit der Kategorie "ai" aus der gesamten
 * Konfiguration. Nicht sichtbare bzw. nicht freigeschaltete KI-Fragen bleiben
 * dabei mit 0 Punkten in der maximal möglichen Punktzahl enthalten.
 *
 * Dadurch kann der KI-Reifegrad nicht 100 % erreichen, wenn nur ein kleiner
 * Teil der möglichen KI-Fragen sichtbar und beantwortet wurde.
 *
 * @returns {number} KI-Reifegrad in Prozent.
 */
function calculateAiScore() {
  const aiQuestions = getAllScaleQuestionsFromConfig(q => q.category === "ai");
  return calculateScoreAgainstAllQuestions(aiQuestions);
}

/**
 * Berechnet den Score eines einzelnen Fragenblocks.
 *
 * Diese Funktion wird vor allem für das Radar-Diagramm genutzt. Jeder Block
 * wird separat gegen seine eigenen möglichen Skalenfragen bewertet.
 *
 * @param {string} sectionId - ID des Fragenblocks.
 * @returns {number} Bereichs-Reifegrad in Prozent.
 */
function calculateSectionScore(sectionId) {
  const section = CONFIG.sections.find(s => s.id === sectionId);
  if (!section) return 0;
  const scaleQuestions = section.questions.filter(q => q.type === "scale");
  return calculateScoreAgainstAllQuestions(scaleQuestions);
}

/**
 * Berechnet einen Prozent-Score gegen die maximal mögliche Punktzahl einer Fragenliste.
 *
 * Formel:
 * erreichte Punkte / maximal mögliche Punkte * 100
 *
 * Die maximal mögliche Punktzahl wird aus Anzahl der Fragen und scaleMax
 * berechnet. Nicht beantwortete Fragen tragen 0 Punkte bei.
 * Bei invertierten Fragen wird der Wert umgedreht.
 *
 * @param {Object[]} questions - Liste von Skalenfragen aus der Konfiguration.
 * @returns {number} Prozentwert zwischen 0 und 100.
 */
function calculateScoreAgainstAllQuestions(questions) {
  if (!questions || questions.length === 0) return 0;

  let achieved = 0;
  const max = questions.length * CONFIG.scoring.scaleMax;

  questions.forEach(question => {
    const select = document.querySelector(`[data-question-id="${cssEscape(question.id)}"]`);
    if (select && select.value !== "") {
      let value = Number(select.value);
      if (question.invertScore) value = CONFIG.scoring.scaleMax + CONFIG.scoring.scaleMin - value;
      achieved += value;
    }
  });

  return Math.round((achieved / max) * 100);
}

/**
 * Sammelt alle Skalenfragen aus der Konfiguration.
 *
 * Optional kann eine Filterfunktion übergeben werden, um nur bestimmte
 * Fragen zu erhalten, zum Beispiel nur digital- oder nur ai-Fragen.
 *
 * @param {Function|null} filterFn - Optionale Filterfunktion mit (question, section).
 * @returns {Object[]} Liste passender Skalenfragen.
 */
function getAllScaleQuestionsFromConfig(filterFn = null) {
  const result = [];
  CONFIG.sections.forEach(section => {
    section.questions.forEach(question => {
      if (question.type === "scale" && (!filterFn || filterFn(question, section))) {
        result.push(question);
      }
    });
  });
  return result;
}

/**
 * Aktualisiert eine Score-Box mit Wert und Ampelfarbe.
 *
 * Die Farblogik basiert auf den Schwellenwerten aus CONFIG.scoring:
 * - rot unter redBelow
 * - gelb unter yellowBelow
 * - grün ab yellowBelow
 *
 * @param {string} id - ID der Score-Box.
 * @param {number} percent - Reifegrad in Prozent.
 * @param {string} label - Sichtbare Beschriftung vor dem Prozentwert.
 */
function updateScoreBox(id, percent, label) {
  const box = document.getElementById(id);
  if (!box) return;

  box.classList.remove("red", "yellow", "green", "neutral");

  if (percent < CONFIG.scoring.redBelow) box.classList.add("red");
  else if (percent < CONFIG.scoring.yellowBelow) box.classList.add("yellow");
  else box.classList.add("green");

  box.innerText = `${label}: ${percent} %`;
}

/**
 * Aktualisiert alle Diagramme im Dashboard.
 *
 * Das Radar-Diagramm zeigt die Scores je Fragenblock. Das Balkendiagramm
 * zeigt Gesamt- und Digitalisierungsgrad sowie optional den KI-Reifegrad.
 *
 * @param {number} overallPercent - Gesamt-Reifegrad in Prozent.
 * @param {number} digitalPercent - Digitalisierungsgrad in Prozent.
 * @param {number|null} aiPercent - KI-Reifegrad in Prozent oder null, wenn kein KI-Balken angezeigt werden soll.
 */
function updateCharts(overallPercent, digitalPercent, aiPercent) {
  updateRadarChart();
  updateBarChart(overallPercent, digitalPercent, aiPercent);
}

/**
 * Zeichnet oder aktualisiert das Radar-Diagramm.
 *
 * Die Achsen des Radar-Diagramms werden aus CONFIG.sections erzeugt.
 * Dadurch passt sich die Anzahl der Ecken automatisch an die Anzahl der
 * konfigurierten Fragenblöcke an.
 *
 * Vor dem Neuzeichnen wird eine vorhandene Chart-Instanz zerstört, um
 * doppelte Darstellungen und Speicherprobleme zu vermeiden.
 */
function updateRadarChart() {
  const element = document.getElementById("radarChart");
  if (!element || typeof Chart === "undefined") return;

  if (radarChart) radarChart.destroy();

  radarChart = new Chart(element, {
    type: "radar",
    data: {
      labels: CONFIG.sections.map(s => s.radarLabel || s.id),
      datasets: [{
        label: "Reifegrad je Fragenblock (%)",
        data: CONFIG.sections.map(s => calculateSectionScore(s.id))
      }]
    },
    options: {
      responsive: true,
      scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } }
    }
  });
}

/**
 * Zeichnet oder aktualisiert das Balkendiagramm.
 *
 * Standardmäßig werden Gesamt-Reifegrad und Digitalisierungsgrad angezeigt.
 * Der KI-Balken wird nur ergänzt, wenn aiPercent nicht null ist.
 *
 * @param {number} overallPercent - Gesamt-Reifegrad in Prozent.
 * @param {number} digitalPercent - Digitalisierungsgrad in Prozent.
 * @param {number|null} aiPercent - KI-Reifegrad in Prozent oder null.
 */
function updateBarChart(overallPercent, digitalPercent, aiPercent) {
  const element = document.getElementById("barChart");
  if (!element || typeof Chart === "undefined") return;

  if (barChart) barChart.destroy();

  const labels = ["Gesamt", "Digitalisierung"];
  const values = [overallPercent, digitalPercent];

  if (aiPercent !== null) {
    labels.push("KI");
    values.push(aiPercent);
  }

  barChart = new Chart(element, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Reifegrad (%)", data: values }]
    },
    options: {
      responsive: true,
      scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } }
    }
  });
}

/**
 * Entfernt vorhandene Chart.js-Diagramme aus dem Dashboard.
 *
 * Diese Funktion wird genutzt, wenn die Auswertung ausgeblendet oder der
 * Fragebogen zurückgesetzt wird.
 */
function destroyCharts() {
  if (radarChart) { radarChart.destroy(); radarChart = null; }
  if (barChart) { barChart.destroy(); barChart = null; }
}

/**
 * Ermittelt und zeigt passende Empfehlungen anhand der Ergebniswerte.
 *
 * Empfehlungen werden aus CONFIG.recommendations gelesen. Je nach scope
 * wird gegen Gesamtwert, Digitalisierungsgrad, KI-Reifegrad oder einen
 * einzelnen Fragenblock geprüft.
 *
 * @param {number} overallPercent - Gesamt-Reifegrad in Prozent.
 * @param {number} digitalPercent - Digitalisierungsgrad in Prozent.
 * @param {number|null} aiPercent - KI-Reifegrad in Prozent oder null.
 */
function updateRecommendations(overallPercent, digitalPercent, aiPercent) {
  const card = document.getElementById("recommendationCard");
  const list = document.getElementById("recommendations");
  if (!card || !list) return;

  const recommendations = [];

  (CONFIG.recommendations || []).forEach(rule => {
    let value = null;
    if (rule.scope === "overall") value = overallPercent;
    if (rule.scope === "digital") value = digitalPercent;
    if (rule.scope === "ai") value = aiPercent;
    if (rule.scope && rule.scope.startsWith("section:")) {
      value = calculateSectionScore(rule.scope.split(":")[1]);
    }

    if (value !== null && value < rule.below) recommendations.push(rule.text);
  });

  list.innerHTML = recommendations.map(text => `<li>${escapeHTML(text)}</li>`).join("");
  card.classList.toggle("hidden", recommendations.length === 0);
}

/**
 * Blendet die Empfehlungs-Card aus und leert die Empfehlungsliste.
 *
 * Wird verwendet, wenn noch keine vollständige Auswertung vorliegt oder
 * der Fragebogen zurückgesetzt wird.
 */
function hideRecommendations() {
  const card = document.getElementById("recommendationCard");
  const list = document.getElementById("recommendations");
  if (card) card.classList.add("hidden");
  if (list) list.innerHTML = "";
}

/**
 * Erstellt einen PDF-Export des aktuellen Quickcheck-Zustands.
 *
 * Exportiert werden:
 * - Titel des Quickchecks
 * - Reifegrade, sofern die Auswertung vollständig ist
 * - alle sichtbaren Fragen und Antworten
 * - Checkbox-Auswahlen und Freitextantworten
 *
 * Unsichtbare KI-Fragen werden nicht exportiert.
 */
function downloadPDF() {
  if (!window.jspdf) { alert("jsPDF wurde nicht geladen."); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text(CONFIG.meta.title || "Quickcheck", 20, y);
  y += 15;

  doc.setFontSize(11);
  if (areAllVisibleRequiredAnswered()) {
    doc.text(`Gesamt-Reifegrad: ${calculateOverallScore()} %`, 20, y); y += 8;
    doc.text(`Digitalisierungsgrad: ${calculateDigitalScore()} %`, 20, y); y += 8;
    if (allVisibleAiQuestionsAnswered()) { doc.text(`KI-Reifegrad: ${calculateAiScore()} %`, 20, y); y += 8; }
  } else {
    doc.text("Auswertung: noch nicht vollständig beantwortet", 20, y); y += 8;
  }
  y += 8;

  CONFIG.sections.forEach(section => {
    const sectionTitle = section.title;
    if (y > 265) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text(sectionTitle, 20, y);
    y += 8;
    doc.setFontSize(10);

    section.questions.forEach(question => {
      const element = document.querySelector(`[data-question-id="${cssEscape(question.id)}"]`);
      const questionWrapper = document.querySelector(`[data-question-id="${cssEscape(question.id)}"]`)?.closest(".question");
      if (questionWrapper && !isVisible(questionWrapper)) return;

      const value = getQuestionValue(question);
      const lines = doc.splitTextToSize(`${question.id} ${question.text}: ${value}`, 170);
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(lines, 20, y);
      y += lines.length * 6 + 5;
    });
  });

  doc.save(CONFIG.meta.pdfFileName || "Quickcheck.pdf");
}

/**
 * Erstellt einen CSV-Export der sichtbaren Fragen und Antworten.
 *
 * Die Datei nutzt Semikolon als Trennzeichen, was für deutschsprachige
 * Excel-Umgebungen meist besser geeignet ist.
 */
function downloadCSV() {
  let csv = "Block;Frage;Antwort\n";

  CONFIG.sections.forEach(section => {
    section.questions.forEach(question => {
      const wrapper = document.querySelector(`[data-question-id="${cssEscape(question.id)}"]`)?.closest(".question");
      if (wrapper && !isVisible(wrapper)) return;
      csv += `"${escapeCSV(section.title)}";"${escapeCSV(question.id + " " + question.text)}";"${escapeCSV(getQuestionValue(question))}"\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = CONFIG.meta.csvFileName || "Quickcheck.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Liest die aktuelle Antwort zu einer Frage aus dem DOM aus.
 *
 * Unterstützte Fragetypen:
 * - scale: ausgewählter Dropdown-Text
 * - text: Inhalt der Textarea
 * - checkbox: alle ausgewählten Checkboxen plus optionales Sonstiges-Feld
 *
 * @param {Object} question - Frage aus der Konfiguration.
 * @returns {string} Antwort als lesbarer Text.
 */
function getQuestionValue(question) {
  if (question.type === "scale") {
    const select = document.querySelector(`[data-question-id="${cssEscape(question.id)}"]`);
    return select && select.value ? select.options[select.selectedIndex].text : "";
  }

  if (question.type === "text") {
    const textarea = document.querySelector(`[data-question-id="${cssEscape(question.id)}"]`);
    return textarea ? textarea.value : "";
  }

  if (question.type === "checkbox") {
    const group = document.querySelector(`.checkbox-group[data-question-id="${cssEscape(question.id)}"]`);
    if (!group) return "";
    const checked = [...group.querySelectorAll("input[type='checkbox']:checked")].map(i => i.value);
    const other = group.querySelector("input[type='text']")?.value.trim();
    if (other) checked.push("Sonstiges: " + other);
    return checked.join(", ");
  }

  return "";
}

/**
 * Setzt den gesamten Fragebogen auf den Ausgangszustand zurück.
 *
 * Zurückgesetzt werden:
 * - Select-Felder
 * - Textareas und Textfelder
 * - Checkboxen und Radio-Buttons
 * - Ampelfarben
 * - KI-Container
 * - KI-Reifegrad-Card
 * - Empfehlungen
 * - Diagramme
 *
 * Vor dem Zurücksetzen erscheint eine Sicherheitsabfrage.
 */
function resetQuestionnaire() {
  if (!confirm("Möchten Sie wirklich alle Antworten zurücksetzen?")) return;
  document.querySelectorAll("select").forEach(el => el.value = "");
  document.querySelectorAll("textarea, input[type='text']").forEach(el => el.value = "");
  document.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach(el => el.checked = false);
  document.querySelectorAll(".question").forEach(q => q.classList.remove("good", "medium", "bad"));
  document.querySelectorAll(".ai-container").forEach(c => c.classList.add("hidden"));
  updateAiScoreVisibility(false);
  hideRecommendations();
  destroyCharts();
  updateDashboard();
  window.scrollTo({ top:0, behavior:"smooth" });
}

/**
 * Setzt alle Eingabefelder innerhalb eines bestimmten Containers zurück.
 *
 * Wird vor allem genutzt, wenn ein KI-Fragenblock wieder ausgeblendet wird,
 * damit alte Antworten nicht unsichtbar im Hintergrund erhalten bleiben.
 *
 * @param {HTMLElement} container - Container, dessen Felder zurückgesetzt werden sollen.
 */
function resetFieldsInside(container) {
  container.querySelectorAll("select").forEach(el => el.value = "");
  container.querySelectorAll("textarea, input[type='text']").forEach(el => el.value = "");
  container.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach(el => el.checked = false);
  container.querySelectorAll(".question").forEach(q => q.classList.remove("good", "medium", "bad"));
}

/**
 * Prüft, ob ein HTML-Element aktuell sichtbar ist.
 *
 * Diese Prüfung ist wichtig, damit verborgene KI-Fragen weder als offen
 * gezählt noch exportiert werden.
 *
 * @param {HTMLElement} element - Zu prüfendes Element.
 * @returns {boolean} true, wenn das Element sichtbar ist.
 */
function isVisible(element) {
  return element && element.offsetParent !== null;
}

/**
 * Escaped eine Frage-ID für die sichere Verwendung in CSS-Selektoren.
 *
 * Falls CSS.escape im Browser verfügbar ist, wird diese native Funktion
 * genutzt. Andernfalls wird eine einfache Fallback-Escaping-Logik verwendet.
 *
 * @param {string} value - Ursprünglicher Selektorwert.
 * @returns {string} CSS-sicherer Selektorwert.
 */
function cssEscape(value) {
  if (window.CSS && CSS.escape) return CSS.escape(value);
  return String(value).replace(/"/g, '\\"');
}

/**
 * Bereitet einen Wert für den CSV-Export vor.
 *
 * Doppelte Anführungszeichen werden gemäß CSV-Konvention verdoppelt,
 * damit Inhalte korrekt in Excel oder Tabellenprogrammen gelesen werden.
 *
 * @param {*} value - Zu exportierender Wert.
 * @returns {string} CSV-sicherer Text.
 */
function escapeCSV(value) {
  return String(value ?? "").replaceAll('"', '""');
}

/**
 * Escaped HTML-Sonderzeichen in Texten.
 *
 * Diese Funktion verhindert, dass Empfehlungstexte oder andere dynamische
 * Inhalte als HTML interpretiert werden. Das reduziert Darstellungsfehler
 * und schützt vor unbeabsichtigter HTML-Injektion.
 *
 * @param {*} value - Ursprünglicher Textwert.
 * @returns {string} HTML-sicherer Text.
 */
function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
