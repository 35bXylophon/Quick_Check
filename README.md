# DIGI-CO Quickcheck Builder

Dieses Paket macht den DIGI-CO Quickcheck konfigurierbar. Das originale Design bleibt erhalten, aber Fragen, Scoring, Empfehlungen, Partnertexte und Thresholds werden über `config.json` gesteuert.

## Dateien

- `index.html`: öffentlicher Quickcheck
- `admin.html`: Eingabemaske / Builder
- `style.css`: gemeinsames Design
- `script.js`: dynamischer Fragebogen
- `builder.js`: Builder-Logik
- `config.json`: zentrale Konfiguration

## Nutzung

1. Alle Dateien ins GitHub-Pages-Repository hochladen.
2. `admin.html` öffnen, Inhalte bearbeiten und `config.json herunterladen` klicken.
3. Die heruntergeladene `config.json` im Repository ersetzen.
4. `index.html` zeigt danach den aktualisierten Quickcheck.

Die lokale Vorschau wird im Browser-LocalStorage gespeichert und verändert noch nicht die Datei im Repository.
