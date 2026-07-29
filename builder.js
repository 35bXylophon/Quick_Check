/* =====================================================
   QUICKCHECK BUILDER
   builder.js

   Zweck:
   Diese Datei steuert die Admin-Oberfläche admin.html.
   Sie lädt die bestehende config.json, macht sie in Formularfeldern bearbeitbar
   und ermöglicht den Export einer neuen config.json.

   Wichtiges Prinzip:
   Der Builder verändert nicht automatisch Dateien auf dem Server oder lokal.
   Stattdessen wird eine neue config.json heruntergeladen, die anschließend
   manuell im Projektordner oder GitHub-Repository ersetzt werden muss.
   ===================================================== */

/* =====================================================
   GLOBALE KONFIGURATION
   ===================================================== */

/**
 * Globale Arbeitskopie der Quickcheck-Konfiguration.
 *
 * CONFIG enthält nach dem Laden die komplette config.json als JavaScript-Objekt.
 * Alle Eingaben im Builder lesen aus CONFIG oder schreiben in CONFIG zurück.
 * Beim Download wird genau diese CONFIG wieder als config.json exportiert.
 *
 * @type {Object|null}
 */
let CONFIG = null;

/**
 * Startet den Builder, sobald die HTML-Seite vollständig geladen ist.
 *
 * Der Event Listener stellt sicher, dass alle Formularfelder aus admin.html
 * bereits existieren, bevor builder.js versucht, darauf zuzugreifen.
 */
window.addEventListener("DOMContentLoaded", initBuilder);

/* =====================================================
   INITIALISIERUNG
   ===================================================== */

/**
 * Initialisiert die gesamte Builder-Oberfläche.
 *
 * Ablauf:
 * 1. Konfiguration laden, entweder aus localStorage-Vorschau oder config.json
 * 2. Import-Funktion für JSON-Dateien aktivieren
 * 3. Alle Admin-Bereiche rendern
 *
 * Diese Funktion ist der Einstiegspunkt für admin.html.
 *
 * @returns {Promise<void>}
 */
async function initBuilder() {
  CONFIG = await loadBuilderConfig();
  bindImport();
  renderAll();
}

/**
 * Lädt die Konfiguration für den Builder.
 *
 * Priorität:
 * 1. Wenn eine lokale Vorschau im Browser gespeichert ist, wird diese genutzt.
 * 2. Ansonsten wird config.json per fetch geladen.
 *
 * Die lokale Vorschau wird verwendet, wenn im Builder zuvor
 * „Vorschau speichern“ genutzt wurde. Dadurch kann index.html testweise
 * eine noch nicht final heruntergeladene Konfiguration verwenden.
 *
 * Hinweis:
 * fetch("config.json") funktioniert zuverlässig über einen lokalen Server
 * oder GitHub Pages, aber meist nicht per Doppelklick auf admin.html.
 *
 * @returns {Promise<Object>} Geladene Quickcheck-Konfiguration.
 */
async function loadBuilderConfig() {
  const local = localStorage.getItem("quickcheckConfigPreview");

  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.warn("Lokale Vorschau defekt.");
    }
  }

  const response = await fetch("config.json", { cache: "no-store" });
  return response.json();
}

/* =====================================================
   ZENTRALES RENDERING UND LESEN
   ===================================================== */

/**
 * Rendert alle sichtbaren Bereiche der Admin-Oberfläche neu.
 *
 * Diese Funktion wird immer dann verwendet, wenn sich die Struktur ändert,
 * zum Beispiel wenn ein Block oder eine Frage hinzugefügt, gelöscht oder
 * dupliziert wurde.
 *
 * Gerenderte Bereiche:
 * - Metadaten
 * - Scoring-Einstellungen
 * - Fragenblöcke und Fragen
 * - Empfehlungen
 * - JSON-Vorschau
 * - Header-Platzhalter für Logo und Partner
 */
function renderAll() {
  renderMeta();
  renderScoring();
  renderSections();
  renderRecommendations();
  updateJsonPreview();
  updateHeaderPlaceholders();
}

/**
 * Liest alle aktuellen Formularwerte zurück in CONFIG.
 *
 * Diese Funktion wird nach Eingaben, vor Strukturänderungen und vor Exporten
 * aufgerufen, damit keine Eingabe verloren geht.
 *
 * Gelesene Bereiche:
 * - Metadaten
 * - Scoring-Einstellungen
 * - Fragenblöcke und Fragen
 * - Empfehlungen
 *
 * Anschließend werden JSON-Vorschau und Header-Platzhalter aktualisiert.
 */
function readAll() {
  readMeta();
  readScoring();
  readSections();
  readRecommendations();
  updateJsonPreview();
  updateHeaderPlaceholders();
}

/* =====================================================
   METADATEN
   ===================================================== */

/**
 * Schreibt die Metadaten aus CONFIG in die Formularfelder.
 *
 * Metadaten sind allgemeine Einstellungen des Quickchecks:
 * - Titel
 * - Untertitel
 * - Logo-Text
 * - Partner-Text
 * - PDF-Dateiname
 * - CSV-Dateiname
 *
 * Zusätzlich werden Event Handler gesetzt, damit Änderungen sofort in CONFIG
 * übernommen werden.
 */
function renderMeta() {
  setValue("metaTitle", CONFIG.meta.title);
  setValue("metaSubtitle", CONFIG.meta.subtitle);
  setValue("metaLogoText", CONFIG.meta.logoText);
  setValue("metaPartnerText", CONFIG.meta.partnerText);
  setValue("metaPdfFileName", CONFIG.meta.pdfFileName);
  setValue("metaCsvFileName", CONFIG.meta.csvFileName);

  [
    "metaTitle",
    "metaSubtitle",
    "metaLogoText",
    "metaPartnerText",
    "metaPdfFileName",
    "metaCsvFileName"
  ].forEach(id => {
    document.getElementById(id).oninput = readAll;
  });
}

/**
 * Liest die Metadaten aus den Formularfeldern zurück in CONFIG.
 *
 * Diese Werte werden später von index.html genutzt, um Titel, Branding
 * und Export-Dateinamen im fertigen Quickcheck zu setzen.
 */
function readMeta() {
  CONFIG.meta.title = getValue("metaTitle");
  CONFIG.meta.subtitle = getValue("metaSubtitle");
  CONFIG.meta.logoText = getValue("metaLogoText");
  CONFIG.meta.partnerText = getValue("metaPartnerText");
  CONFIG.meta.pdfFileName = getValue("metaPdfFileName");
  CONFIG.meta.csvFileName = getValue("metaCsvFileName");
}

/* =====================================================
   SCORING-EINSTELLUNGEN
   ===================================================== */

/**
 * Schreibt die Scoring-Einstellungen aus CONFIG in die Formularfelder.
 *
 * Scoring-Einstellungen steuern unter anderem:
 * - ab welchem Wert KI-Fragen freigeschaltet werden
 * - ab wann ein Ergebnis rot/gelb/grün ist
 * - ob Ergebnisse erst nach vollständiger Beantwortung angezeigt werden
 *
 * Zusätzlich werden Event Handler gesetzt, damit Änderungen direkt übernommen
 * werden.
 */
function renderScoring() {
  setValue("scoreAiUnlockThreshold", CONFIG.scoring.aiUnlockThreshold);
  setValue("scoreRedBelow", CONFIG.scoring.redBelow);
  setValue("scoreYellowBelow", CONFIG.scoring.yellowBelow);
  setValue(
    "scoreShowResultsOnlyWhenComplete",
    String(CONFIG.scoring.showResultsOnlyWhenComplete)
  );

  [
    "scoreAiUnlockThreshold",
    "scoreRedBelow",
    "scoreYellowBelow",
    "scoreShowResultsOnlyWhenComplete"
  ].forEach(id => {
    document.getElementById(id).oninput = readAll;
    document.getElementById(id).onchange = readAll;
  });
}

/**
 * Liest die Scoring-Einstellungen aus den Formularfeldern zurück in CONFIG.
 *
 * Zahlenfelder werden in Number umgewandelt.
 * Boolean-Werte werden aus den Select-Werten "true" und "false" abgeleitet.
 */
function readScoring() {
  CONFIG.scoring.aiUnlockThreshold = Number(getValue("scoreAiUnlockThreshold"));
  CONFIG.scoring.redBelow = Number(getValue("scoreRedBelow"));
  CONFIG.scoring.yellowBelow = Number(getValue("scoreYellowBelow"));
  CONFIG.scoring.showResultsOnlyWhenComplete =
    getValue("scoreShowResultsOnlyWhenComplete") === "true";
}

/* =====================================================
   FRAGENBLÖCKE UND FRAGEN
   ===================================================== */

/**
 * Rendert alle Fragenblöcke aus CONFIG.sections in die Admin-Oberfläche.
 *
 * Für jeden Block wird eine Builder-Card erzeugt mit:
 * - Block-ID
 * - Titel
 * - Radar-Label
 * - Einstellung, ob der Block KI-Fragen enthält
 * - Liste der Fragen
 * - Buttons für Hinzufügen, Duplizieren und Löschen
 *
 * Nach dem Rendern werden Event Listener für alle erzeugten Eingabefelder
 * registriert.
 */
function renderSections() {
  const root = document.getElementById("sectionsEditor");
  root.innerHTML = "";

  CONFIG.sections.forEach((section, sectionIndex) => {
    const container = document.createElement("div");
    container.className = "builder-section";

    container.innerHTML = `
      <h3>Block ${escapeHTML(section.id)}</h3>
      <div class="builder-grid">
        <div><label>Block-ID</label><input data-section-field="id" data-section-index="${sectionIndex}" value="${escapeAttr(section.id)}"></div>
        <div><label>Titel</label><input data-section-field="title" data-section-index="${sectionIndex}" value="${escapeAttr(section.title)}"></div>
        <div><label>Radar-Label</label><input data-section-field="radarLabel" data-section-index="${sectionIndex}" value="${escapeAttr(section.radarLabel || section.id)}"></div>
        <div><label>Enthält KI-Fragen</label>
          <select data-section-field="hasAiQuestions" data-section-index="${sectionIndex}">
            <option value="true" ${section.hasAiQuestions ? "selected" : ""}>Ja</option>
            <option value="false" ${!section.hasAiQuestions ? "selected" : ""}>Nein</option>
          </select>
        </div>
      </div>
      <h3>Fragen</h3>
      <div data-question-list="${sectionIndex}"></div>
      <button type="button" onclick="addQuestion(${sectionIndex})" class="success-button">+ Frage hinzufügen</button>
      <button type="button" onclick="duplicateSection(${sectionIndex})" class="secondary-button">Block duplizieren</button>
      <button type="button" onclick="deleteSection(${sectionIndex})" class="danger-button">Block löschen</button>
    `;

    root.appendChild(container);

    const list = container.querySelector(`[data-question-list="${sectionIndex}"]`);

    section.questions.forEach((question, questionIndex) => {
      list.appendChild(renderQuestionEditor(sectionIndex, questionIndex, question));
    });
  });

  root.querySelectorAll("input, select, textarea").forEach(el => {
    el.addEventListener("input", readAll);
    el.addEventListener("change", readAll);
  });
}

/**
 * Erzeugt den Editor für eine einzelne Frage.
 *
 * Der Editor enthält alle konfigurierbaren Eigenschaften einer Frage:
 * - Frage-ID
 * - Fragetyp
 * - Kategorie
 * - Pflichtfrage
 * - Fragetext
 * - invertiertes Scoring
 * - maximale Checkbox-Auswahl
 * - Sonstiges-Feld
 * - Checkbox-Optionen
 *
 * @param {number} sectionIndex - Index des Fragenblocks in CONFIG.sections.
 * @param {number} questionIndex - Index der Frage im jeweiligen Block.
 * @param {Object} question - Die Frage aus der Konfiguration.
 * @returns {HTMLDivElement} Fertiges HTML-Element für den Frageneditor.
 */
function renderQuestionEditor(sectionIndex, questionIndex, question) {
  const div = document.createElement("div");
  div.className = "question-editor";

  div.innerHTML = `
    <div class="builder-grid">
      <div><label>Frage-ID</label><input data-question-field="id" data-section-index="${sectionIndex}" data-question-index="${questionIndex}" value="${escapeAttr(question.id)}"></div>
      <div><label>Typ</label>
        <select data-question-field="type" data-section-index="${sectionIndex}" data-question-index="${questionIndex}">
          <option value="scale" ${question.type === "scale" ? "selected" : ""}>Skala 1–4</option>
          <option value="text" ${question.type === "text" ? "selected" : ""}>Freitext</option>
          <option value="checkbox" ${question.type === "checkbox" ? "selected" : ""}>Checkbox</option>
        </select>
      </div>
      <div><label>Kategorie</label>
        <select data-question-field="category" data-section-index="${sectionIndex}" data-question-index="${questionIndex}">
          <option value="digital" ${question.category === "digital" ? "selected" : ""}>Digitalisierung</option>
          <option value="ai" ${question.category === "ai" ? "selected" : ""}>KI</option>
          <option value="info" ${question.category === "info" ? "selected" : ""}>Info / nicht bewertet</option>
        </select>
      </div>
      <div><label>Pflichtfrage</label>
        <select data-question-field="required" data-section-index="${sectionIndex}" data-question-index="${questionIndex}">
          <option value="true" ${question.required ? "selected" : ""}>Ja</option>
          <option value="false" ${!question.required ? "selected" : ""}>Nein</option>
        </select>
      </div>
    </div>
    <label>Fragetext</label>
    <textarea rows="3" data-question-field="text" data-section-index="${sectionIndex}" data-question-index="${questionIndex}">${escapeHTML(question.text)}</textarea>
    <div class="builder-grid">
      <div><label>Invertiertes Scoring</label>
        <select data-question-field="invertScore" data-section-index="${sectionIndex}" data-question-index="${questionIndex}">
          <option value="false" ${!question.invertScore ? "selected" : ""}>Nein</option>
          <option value="true" ${question.invertScore ? "selected" : ""}>Ja</option>
        </select>
      </div>
      <div><label>Max. Checkbox-Auswahl</label><input type="number" data-question-field="maxChoices" data-section-index="${sectionIndex}" data-question-index="${questionIndex}" value="${question.maxChoices || ""}"></div>
      <div><label>Sonstiges erlauben</label>
        <select data-question-field="allowOther" data-section-index="${sectionIndex}" data-question-index="${questionIndex}">
          <option value="false" ${!question.allowOther ? "selected" : ""}>Nein</option>
          <option value="true" ${question.allowOther ? "selected" : ""}>Ja</option>
        </select>
      </div>
      <div><label>Checkbox-Optionen, kommagetrennt</label><input data-question-field="options" data-section-index="${sectionIndex}" data-question-index="${questionIndex}" value="${escapeAttr((question.options || []).join(", "))}"></div>
    </div>
    <button type="button" onclick="duplicateQuestion(${sectionIndex}, ${questionIndex})" class="secondary-button">Frage duplizieren</button>
    <button type="button" onclick="deleteQuestion(${sectionIndex}, ${questionIndex})" class="danger-button">Frage löschen</button>
  `;

  return div;
}

/**
 * Liest alle Fragenblöcke und Fragen aus der Admin-Oberfläche zurück in CONFIG.
 *
 * Dafür werden die data-Attribute der Eingabefelder genutzt:
 * - data-section-field für Blockfelder
 * - data-question-field für Fragenfelder
 *
 * Werte werden je nach Feldtyp umgewandelt:
 * - Boolean-Felder zu true/false
 * - maxChoices zu Number oder undefined
 * - options zu Array
 */
function readSections() {
  document.querySelectorAll("[data-section-field]").forEach(input => {
    const index = Number(input.dataset.sectionIndex);
    const field = input.dataset.sectionField;
    let value = input.value;

    if (field === "hasAiQuestions") value = value === "true";

    CONFIG.sections[index][field] = value;
  });

  document.querySelectorAll("[data-question-field]").forEach(input => {
    const sectionIndex = Number(input.dataset.sectionIndex);
    const questionIndex = Number(input.dataset.questionIndex);
    const field = input.dataset.questionField;
    let value = input.value;

    if (
      field === "required" ||
      field === "invertScore" ||
      field === "allowOther"
    ) {
      value = value === "true";
    }

    if (field === "maxChoices") {
      value = value === "" ? undefined : Number(value);
    }

    if (field === "options") {
      value = value
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);
    }

    CONFIG.sections[sectionIndex].questions[questionIndex][field] = value;
  });
}

/**
 * Fügt einen neuen Fragenblock zur Konfiguration hinzu.
 *
 * Danach wird ein Standardblock angelegt und die Oberfläche neu gerendert.
 */
function addSection() {
  readAll();

  CONFIG.sections.push({
    id: "X",
    title: "Neuer Fragenblock",
    radarLabel: "Neu",
    hasAiQuestions: false,
    questions: []
  });

  renderAll();
}

/**
 * Dupliziert einen bestehenden Fragenblock inklusive aller enthaltenen Fragen.
 *
 * Die Kopie wird direkt hinter dem Original eingefügt.
 * ID und Titel werden um "_Kopie" bzw. "Kopie" ergänzt,
 * damit die Kopie leichter erkennbar ist.
 *
 * @param {number} index - Index des zu duplizierenden Blocks.
 */
function duplicateSection(index) {
  readAll();

  const copy = JSON.parse(JSON.stringify(CONFIG.sections[index]));
  copy.id = copy.id + "_Kopie";
  copy.title = copy.title + " Kopie";

  CONFIG.sections.splice(index + 1, 0, copy);
  renderAll();
}

/**
 * Löscht einen Fragenblock nach Bestätigung.
 *
 * Alle im Block enthaltenen Fragen werden ebenfalls entfernt.
 *
 * @param {number} index - Index des zu löschenden Blocks.
 */
function deleteSection(index) {
  if (!confirm("Block wirklich löschen?")) return;

  readAll();
  CONFIG.sections.splice(index, 1);
  renderAll();
}

/**
 * Fügt einem Fragenblock eine neue Standardfrage hinzu.
 *
 * Standardwerte:
 * - Typ: scale
 * - Kategorie: digital
 * - Pflichtfrage: true
 *
 * @param {number} sectionIndex - Index des Blocks, dem die Frage hinzugefügt wird.
 */
function addQuestion(sectionIndex) {
  readAll();

  CONFIG.sections[sectionIndex].questions.push({
    id: "Neue Frage",
    text: "Neue Frage",
    type: "scale",
    category: "digital",
    required: true
  });

  renderAll();
}

/**
 * Dupliziert eine bestehende Frage innerhalb eines Blocks.
 *
 * Die Kopie wird direkt hinter der Originalfrage eingefügt.
 * Die ID wird um "_Kopie" erweitert.
 *
 * @param {number} sectionIndex - Index des Fragenblocks.
 * @param {number} questionIndex - Index der zu duplizierenden Frage.
 */
function duplicateQuestion(sectionIndex, questionIndex) {
  readAll();

  const copy = JSON.parse(
    JSON.stringify(CONFIG.sections[sectionIndex].questions[questionIndex])
  );

  copy.id = copy.id + "_Kopie";

  CONFIG.sections[sectionIndex].questions.splice(questionIndex + 1, 0, copy);
  renderAll();
}

/**
 * Löscht eine Frage nach Bestätigung.
 *
 * @param {number} sectionIndex - Index des Fragenblocks.
 * @param {number} questionIndex - Index der zu löschenden Frage.
 */
function deleteQuestion(sectionIndex, questionIndex) {
  if (!confirm("Frage wirklich löschen?")) return;

  readAll();
  CONFIG.sections[sectionIndex].questions.splice(questionIndex, 1);
  renderAll();
}

/* =====================================================
   EMPFEHLUNGEN
   ===================================================== */

/**
 * Rendert alle Empfehlungseinträge aus CONFIG.recommendations.
 *
 * Eine Empfehlung besteht typischerweise aus:
 * - scope: Zielbereich, zum Beispiel overall, digital, ai oder Block-ID
 * - below: Schwellenwert in Prozent
 * - text: Empfehlungstext
 *
 * Empfehlungen können später im Quickcheck verwendet werden, um abhängig
 * von Ergebnissen konkrete Handlungshinweise auszugeben.
 */
function renderRecommendations() {
  const root = document.getElementById("recommendationsEditor");
  root.innerHTML = "";

  (CONFIG.recommendations || []).forEach((rec, index) => {
    const div = document.createElement("div");
    div.className = "question-editor";

    div.innerHTML = `
      <div class="builder-grid">
        <div><label>Scope</label><input data-rec-field="scope" data-rec-index="${index}" value="${escapeAttr(rec.scope)}"></div>
        <div><label>Wenn unter (%)</label><input type="number" data-rec-field="below" data-rec-index="${index}" value="${rec.below}"></div>
      </div>
      <label>Empfehlungstext</label>
      <textarea rows="3" data-rec-field="text" data-rec-index="${index}">${escapeHTML(rec.text)}</textarea>
      <button type="button" onclick="deleteRecommendation(${index})" class="danger-button">Empfehlung löschen</button>
    `;

    root.appendChild(div);
  });

  root.querySelectorAll("input, textarea").forEach(el => {
    el.addEventListener("input", readAll);
  });
}

/**
 * Liest alle Empfehlungseinträge aus der Admin-Oberfläche zurück in CONFIG.
 *
 * Der Prozentwert below wird in eine Zahl umgewandelt.
 */
function readRecommendations() {
  if (!CONFIG.recommendations) CONFIG.recommendations = [];

  document.querySelectorAll("[data-rec-field]").forEach(input => {
    const index = Number(input.dataset.recIndex);
    const field = input.dataset.recField;
    let value = input.value;

    if (field === "below") value = Number(value);

    CONFIG.recommendations[index][field] = value;
  });
}

/**
 * Fügt eine neue Standardempfehlung hinzu.
 *
 * Standard:
 * - scope: overall
 * - below: 50
 * - text: Neue Empfehlung
 */
function addRecommendation() {
  readAll();

  if (!CONFIG.recommendations) CONFIG.recommendations = [];

  CONFIG.recommendations.push({
    scope: "overall",
    below: 50,
    text: "Neue Empfehlung"
  });

  renderAll();
}

/**
 * Löscht eine Empfehlung nach Bestätigung.
 *
 * @param {number} index - Index der zu löschenden Empfehlung.
 */
function deleteRecommendation(index) {
  if (!confirm("Empfehlung wirklich löschen?")) return;

  readAll();
  CONFIG.recommendations.splice(index, 1);
  renderAll();
}

/* =====================================================
   JSON-VORSCHAU UND EXPORT
   ===================================================== */

/**
 * Aktualisiert die sichtbare JSON-Vorschau im Builder.
 *
 * Die JSON-Vorschau zeigt den aktuellen Stand von CONFIG formatiert an.
 * Dadurch kann technisch nachvollzogen werden, welche config.json später
 * exportiert wird.
 */
function updateJsonPreview() {
  document.getElementById("jsonPreview").value = JSON.stringify(CONFIG, null, 2);
}

/**
 * Übernimmt manuelle Änderungen aus der JSON-Vorschau zurück in CONFIG.
 *
 * Diese Funktion ist nützlich für fortgeschrittene Nutzer, die direkt im JSON
 * Anpassungen durchführen möchten.
 *
 * Bei ungültigem JSON wird eine Fehlermeldung angezeigt und CONFIG bleibt
 * unverändert.
 */
function applyJsonPreview() {
  try {
    CONFIG = JSON.parse(document.getElementById("jsonPreview").value);
    renderAll();
  } catch (e) {
    alert("JSON ist ungültig: " + e.message);
  }
}

/**
 * Erstellt aus CONFIG eine neue config.json und startet den Download.
 *
 * Vor dem Download werden alle aktuellen Formularwerte mit readAll()
 * gesichert.
 *
 * Die heruntergeladene Datei muss anschließend manuell im Projektordner oder
 * GitHub-Repository ersetzt werden.
 */
function downloadConfig() {
  readAll();

  const blob = new Blob([JSON.stringify(CONFIG, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "config.json";
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Speichert die aktuelle CONFIG als lokale Vorschau im Browser.
 *
 * Dadurch kann index.html testweise diese Konfiguration verwenden,
 * ohne dass die config.json bereits ersetzt wurde.
 *
 * Die Vorschau wird im localStorage des Browsers gespeichert.
 */
function previewConfig() {
  readAll();
  localStorage.setItem("quickcheckConfigPreview", JSON.stringify(CONFIG));

  alert(
    "Vorschau gespeichert. Öffne jetzt index.html, um die Änderungen zu testen."
  );
}

/**
 * Entfernt die lokal gespeicherte Vorschau aus dem Browser.
 *
 * Danach wird beim nächsten Laden wieder die echte config.json verwendet.
 */
function clearPreview() {
  localStorage.removeItem("quickcheckConfigPreview");

  alert(
    "Lokale Vorschau zurückgesetzt. Danach wird wieder config.json geladen."
  );
}

/* =====================================================
   IMPORT
   ===================================================== */

/**
 * Aktiviert den Import einer lokalen JSON-Datei.
 *
 * Wenn im Builder eine Datei ausgewählt wird, wird diese gelesen,
 * als JSON geparst und als neue CONFIG verwendet.
 * Anschließend wird die komplette Oberfläche neu gerendert.
 */
function bindImport() {
  document.getElementById("importFile").addEventListener("change", async event => {
    const file = event.target.files[0];

    if (!file) return;

    const text = await file.text();

    try {
      CONFIG = JSON.parse(text);
      renderAll();
    } catch (e) {
      alert("Import fehlgeschlagen: " + e.message);
    }
  });
}

/* =====================================================
   HEADER / BRANDING
   ===================================================== */

/**
 * Aktualisiert die Logo- und Partner-Platzhalter im Admin-Header.
 *
 * Dadurch sieht man direkt im Builder, welche Branding-Texte aktuell
 * in der Konfiguration gesetzt sind.
 */
function updateHeaderPlaceholders() {
  document.getElementById("adminLogoBox").innerText =
    CONFIG.meta.logoText || "Logo";

  document.getElementById("adminPartnerBox").innerText =
    CONFIG.meta.partnerText || "Partner";
}

/* =====================================================
   KLEINE HILFSFUNKTIONEN
   ===================================================== */

/**
 * Liest den Wert eines Eingabefeldes anhand seiner ID aus.
 *
 * @param {string} id - ID des HTML-Elements.
 * @returns {string} Aktueller Wert des Eingabefeldes.
 */
function getValue(id) {
  return document.getElementById(id).value;
}

/**
 * Setzt den Wert eines Eingabefeldes anhand seiner ID.
 *
 * Null- oder undefined-Werte werden als leerer String dargestellt.
 *
 * @param {string} id - ID des HTML-Elements.
 * @param {*} value - Zu setzender Wert.
 */
function setValue(id, value) {
  document.getElementById(id).value = value ?? "";
}

/**
 * Escaped Text für die sichere Verwendung in HTML-Attributen.
 *
 * Dadurch werden Sonderzeichen wie & und " entschärft,
 * damit Werte in input value="..." keine HTML-Struktur beschädigen.
 *
 * @param {*} value - Ursprünglicher Wert.
 * @returns {string} Für Attribute sicherer Text.
 */
function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;");
}

/**
 * Escaped Text für die sichere Ausgabe innerhalb von HTML.
 *
 * Dadurch werden Zeichen wie < und > entschärft,
 * damit Nutzereingaben nicht als HTML interpretiert werden.
 *
 * @param {*} value - Ursprünglicher Wert.
 * @returns {string} Für HTML-Inhalte sicherer Text.
 */
function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* =====================================================
   GLOBALE FUNKTIONSFREIGABE FÜR ONCLICK-HANDLER
   ===================================================== */

/**
 * Macht ausgewählte Funktionen global verfügbar.
 *
 * Hintergrund:
 * admin.html nutzt teilweise onclick="..." direkt in Buttons.
 * Damit diese Inline-Handler funktionieren, müssen die Funktionen am
 * window-Objekt registriert sein.
 *
 * Ohne diese Freigabe könnten Buttons wie „+ Block hinzufügen“
 * oder „config.json herunterladen“ im Browser nicht gefunden werden.
 */
Object.assign(window, {
  downloadConfig,
  previewConfig,
  clearPreview,
  applyJsonPreview,
  addSection,
  duplicateSection,
  deleteSection,
  addQuestion,
  duplicateQuestion,
  deleteQuestion,
  addRecommendation,
  deleteRecommendation
});
