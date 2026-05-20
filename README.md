# KPI Studio

KPI Studio este o aplicație web locală pentru construirea de dashboarduri interactive din fișiere `.xlsx`, `.xls` sau `.csv`. Aplicația permite importul datelor, configurarea filtrelor, definirea metricilor, aranjarea componentelor vizuale și exportul dashboardului final într-un singur fișier HTML care funcționează offline.

Prima versiune include un preset construit pentru fișierul `tabel_master.xlsx` și urmărește cât mai fidel stilul, logica și comportamentul din `export_analiza.html`.

## Cuprins

1. Cerințe
2. Instalare
3. Lansare rapidă
4. Pornire prin dublu click în Windows
5. Structura aplicației
6. Flux de lucru recomandat
7. Import date XLSX/CSV
8. Filtre condiționale
9. Configurare metrici
10. Configurare componente
11. Preview dashboard
12. Backup și restore JSON
13. Export HTML standalone
14. Iconul aplicației
15. Fișiere importante
16. Publicare pe GitHub
17. Depanare

## Cerințe

Pentru rularea aplicației ai nevoie de:

- Node.js instalat pe calculator.
- npm, inclus împreună cu Node.js.
- Un browser modern, de exemplu Chrome, Edge sau Firefox.

Aplicația nu are nevoie de server permanent, conturi, bază de date sau conexiune la internet pentru dashboardurile exportate.

## Instalare

Deschide un terminal în folderul proiectului:

```powershell
cd "C:\Users\Vlad\Documents\Codex\2026-05-18\KPI Studio"
```

Instalează dependențele:

```powershell
npm install
```

Această comandă creează folderul `node_modules/`, care este necesar local, dar nu trebuie urcat pe GitHub.

## Lansare rapidă

Pentru utilizare stabilă, recomand fluxul cu build:

```powershell
npm run build
npm run serve:dist
```

După pornire, deschide în browser:

```text
http://127.0.0.1:5174
```

Alternativ, pentru dezvoltare cu actualizare rapidă:

```powershell
npm run dev
```

În acest caz, aplicația este servită de Vite și de obicei se deschide la o adresă de tip:

```text
http://127.0.0.1:5173
```

Dacă portul este ocupat, Vite poate alege automat un alt port.

## Pornire prin dublu click în Windows

Pentru Windows 11 există fișierul:

```text
start.bat
```

Poți porni aplicația prin dublu click pe acest fișier. Scriptul face automat următoarele operațiuni:

1. intră în folderul proiectului;
2. verifică dacă Node.js și npm sunt disponibile;
3. instalează dependențele dacă folderul `node_modules/` lipsește;
4. construiește aplicația;
5. deschide browserul la `http://127.0.0.1:5174/`;
6. pornește serverul local pentru aplicație.

În mod normal aplicația pornește pe portul `5174`. Dacă acel port este deja folosit, scriptul încearcă automat porturile următoare și deschide browserul pe adresa corectă.

Fereastra deschisă de `start.bat` trebuie lăsată pornită cât timp folosești KPI Studio. Pentru oprire, închide fereastra sau apasă `Ctrl+C`.

Prima pornire poate dura mai mult, deoarece se instalează dependențele. Pornirile următoare ar trebui să fie mai rapide.

## Structura aplicației

Interfața este împărțită în trei zone principale:

- Panoul din stânga: informații despre date, filtre disponibile și lista de metrici.
- Zona centrală: canvasul dashboardului, unde sunt afișate cardurile KPI, graficele, tabelele și filtrele.
- Panoul din dreapta: configurarea proiectului, lista componentelor și setările componentei selectate.

Bara de sus conține acțiunile principale:

- `Demo`: încarcă automat fișierul demo `tabel_master.xlsx`.
- `Import`: permite importul unui fișier `.xlsx`, `.xls` sau `.csv`.
- `JSON`: salvează proiectul curent ca fișier de backup.
- `Restore`: restaurează proiectul dintr-un fișier JSON salvat anterior.
- `Export HTML`: generează dashboardul final ca fișier HTML unic, complet offline.

## Flux de lucru recomandat

1. Pornește aplicația.
2. Apasă `Demo` pentru a încărca datasetul inclus sau folosește `Import` pentru propriul fișier.
3. Verifică în panoul din stânga numărul de rânduri, totalul filtrat și câmpurile detectate.
4. Configurează filtrele condiționale.
5. Ajustează metricile și culorile lor.
6. Configurează componentele dashboardului: titluri, subtitluri, tipografie, culori, legendă, tooltipuri și câmpuri grafice.
7. Verifică rezultatul în preview.
8. Salvează proiectul cu `JSON`, pentru backup.
9. Generează dashboardul final cu `Export HTML`.

## Import date XLSX/CSV

Butonul `Import` permite încărcarea unui fișier local. Datele sunt citite direct în browser, fără backend.

Formate acceptate:

- `.xlsx`
- `.xls`
- `.csv`

La import, aplicația încearcă să detecteze automat:

- foile disponibile în fișier;
- rândul de antet;
- coloanele principale;
- câmpurile de rută;
- câmpurile de județ;
- coloanele de status pe ani;
- valori numerice pentru kilometri, segmente și loturi.

Pentru fișierul `tabel_master.xlsx`, aplicația transformă automat coloanele de tip `status_2014`, `status_2015`, ..., `status_2026` într-o structură normalizată pe ani. Astfel, fiecare componentă a dashboardului poate recalcula valorile în funcție de anul selectat.

## Filtre condiționale

Cardul `Filtre condiționale` permite filtrarea întregului dashboard. În presetul demo sunt disponibile:

- `An`
- `Cod rută`
- `Nume rută`
- `Status`
- `Județe`

Filtrele se aplică sincron pe toate componentele:

- carduri KPI;
- progres pe status;
- donut;
- grafice de trend;
- grafice bar;
- grafice stacked bar;
- tabel sumar.

Filtrul `Județe` tratează valorile multiple separate prin virgulă ca opțiuni separate. De exemplu, dacă o rută are județele `Cluj, Alba, Sibiu`, fiecare județ poate fi selectat individual din filtru.

## Configurare metrici

În secțiunea `Metrici` poți defini și ajusta valorile folosite în dashboard.

Tipuri de metrici disponibile:

- `sum`: însumează un câmp numeric.
- `count`: numără rândurile.
- `distinctCount`: numără valorile unice.
- `average`: calculează media.
- `min`: extrage valoarea minimă.
- `max`: extrage valoarea maximă.
- `conditionalSum`: însumează un câmp numeric doar pentru rândurile care respectă o condiție.
- procent din total;
- formule simple între metrici.

Pentru metricile care apar în grafice sau legende, poți configura culoarea. De exemplu, poți modifica separat culoarea pentru:

- `În utilizare`
- `În construcție`
- `În planificare`

Culorile metricilor sunt folosite automat în grafice, tooltipuri, legende și carduri unde metricile respective sunt afișate.

## Configurare componente

În panoul din dreapta, secțiunea `Componente` permite selectarea și modificarea fiecărei componente din dashboard.

Componente disponibile în versiunea curentă:

- filtre condiționale;
- card KPI;
- card progres status;
- donut;
- line chart;
- bar chart;
- stacked bar;
- tabel sumar;
- card text.

Pentru fiecare componentă poți modifica:

- titlul;
- subtitlul;
- slotul de layout;
- câmpurile sau metricile folosite;
- dimensiunea titlului;
- culoarea titlului;
- dimensiunea subtitlului;
- culoarea subtitlului;
- dimensiunea valorilor;
- culoarea valorilor;
- afișarea tooltipului la hover pentru grafice.

Pentru grafice, aplicația afișează:

- axă X;
- axă Y;
- valori pe axa Y;
- legendă;
- tooltip la hover, dacă opțiunea este activată.

Tooltipurile sunt gândite să afișeze anul sau categoria selectată, apoi valorile seriilor reprezentate, cu marcaje colorate corespunzătoare metricilor.

## Preview dashboard

Previewul folosește același runtime ca fișierul HTML exportat. Asta înseamnă că logica de filtrare, calculele, graficele, tabelele și stilurile sunt aceleași în aplicație și în export.

Este recomandat să verifici dashboardul în preview înainte de export:

- selectează mai mulți ani;
- testează filtrele de rută;
- testează filtrul de status;
- testează filtrul de județe;
- verifică dacă valorile din KPI, grafice și tabel se recalculează corect.

## Backup și restore JSON

Butonul `JSON` salvează proiectul curent într-un fișier de backup. Acest fișier include:

- datasetul normalizat;
- valorile filtrului curent;
- metricile definite;
- componentele dashboardului;
- tema vizuală;
- setările de layout.

Butonul `Restore` încarcă un backup JSON salvat anterior.

Folosește backupul JSON atunci când vrei să păstrezi o versiune editabilă a dashboardului. Exportul HTML este pentru distribuire și vizualizare finală, nu pentru editare în aplicație.

## Export HTML standalone

Butonul `Export HTML` generează un fișier HTML unic care conține:

- datele normalizate;
- configurația dashboardului;
- metricile;
- filtrele;
- stilurile CSS;
- runtimeul JavaScript necesar pentru interactivitate.

Fișierul exportat funcționează offline. Poate fi deschis direct în browser, fără server și fără conexiune la internet.

După export, poți trimite fișierul HTML altor persoane. Acestea vor putea folosi filtrele și graficele fără să instaleze KPI Studio.

## Iconul aplicației

Proiectul include un icon dedicat pentru KPI Studio:

- `public/kpi-studio-icon.svg`
- `public/kpi-studio-icon.ico`

Iconul este legat în `index.html` și apare ca favicon în browser. Fișierul `.ico` poate fi folosit și pentru shortcut-uri Windows.

Pentru a crea un shortcut cu icon personalizat:

1. click dreapta pe `start.bat`;
2. alege `Create shortcut`;
3. click dreapta pe shortcut;
4. alege `Properties`;
5. apasă `Change Icon`;
6. selectează `public/kpi-studio-icon.ico`;
7. salvează modificările.

## Fișiere importante

- `src/App.tsx`: interfața principală a aplicației.
- `src/data.ts`: importul datelor, normalizarea și presetul demo.
- `src/analytics.ts`: logica de filtrare și calculul metricilor.
- `src/runtime.ts`: runtimeul folosit pentru preview și export HTML.
- `src/styles.css`: stilurile interfeței aplicației.
- `scripts/serve-dist.mjs`: server local simplu pentru versiunea construită.
- `start.bat`: pornire rapidă prin dublu click în Windows.
- `public/kpi-studio-icon.svg`: iconul vectorial al aplicației.
- `public/kpi-studio-icon.ico`: iconul pentru browser și shortcut-uri Windows.
- `tabel_master.xlsx`: dataset demo.
- `export_analiza.html`: fișier de referință pentru stilul dashboardului exportat.
- `README.md`: manualul de utilizare.
- `.gitignore`: lista fișierelor care nu trebuie urcate pe GitHub.

## Publicare pe GitHub

Pentru GitHub, urcă fișierele sursă și configurația proiectului:

- `src/`
- `public/`
- `scripts/`
- `start.bat`
- `index.html`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `README.md`
- `.gitignore`
- `tabel_master.xlsx`, dacă vrei să păstrezi demo-ul în repository
- `export_analiza.html`, dacă vrei să păstrezi referința vizuală în repository

Nu urca:

- `node_modules/`
- `dist/`
- `.npm-cache/`
- exporturi HTML generate local;
- backupuri JSON personale, dacă includ date private.

Acestea sunt deja acoperite de `.gitignore`.

## Depanare

### Aplicația nu pornește

Verifică dacă dependențele sunt instalate:

```powershell
npm install
```

Apoi pornește aplicația:

```powershell
npm run build
npm run serve:dist
```

### Portul este deja folosit

Dacă `127.0.0.1:5174` este ocupat, oprește procesul care folosește portul sau rulează aplicația în modul de dezvoltare:

```powershell
npm run dev
```

### Importul nu detectează corect câmpurile

Verifică dacă fișierul are un rând clar de antet și coloane consistente. Pentru transformarea pe ani, coloanele de status trebuie să aibă un format recognoscibil, de exemplu:

```text
status_2014
status_2015
status_2016
```

### Filtrul `Județe` nu afișează valorile așteptate

Verifică dacă în fișier există o coloană pentru județe și dacă valorile multiple sunt separate clar, de exemplu prin virgulă:

```text
Cluj, Alba, Sibiu
```

### Exportul HTML nu arată ca previewul

Reconstruiește aplicația și generează din nou exportul:

```powershell
npm run build
npm run serve:dist
```

Apoi deschide aplicația, încarcă proiectul și apasă din nou `Export HTML`.

## Observații

KPI Studio este gândit ca aplicație locală, orientată spre lucru rapid cu fișiere și dashboarduri exportabile. Pentru versiunea curentă, metricile sunt intenționat simple și robuste, iar exportul HTML este prioritar: dashboardul final trebuie să fie ușor de distribuit și să funcționeze fără dependențe externe.

**@ concept și realizare vlad39**
