# Kritika Workflow Z Pohledu Lineho Zamestnance

## Uvod

Tento pohled vychazi z perspektivy lineho zamestnance, ktery chce mit co nejmene kliku, co nejmensi mentalni namahu a co nejmene premysleni nad tim, co system po nem vlastne chce. Nechce studovat stavy workflow, nechce hledat skryte akce a nechce delat rucni mezikroky, ktere by system mohl udelat za nej.

## Problem 1 - Prazdna Evidence Po Zalozeni Mesice

Co se stane:
- po akci `Zalozit mesic` je tabulka evidence prazdna

Kde to boli:
- lineho zamestnance okamzite zastavi prazdna obrazovka
- musi hledat dalsi krok misto toho, aby jen pokracoval
- system po nem chce vic snahy, nez by cekal po kliknuti na `Zalozit mesic`

Konkretni priklad z Playwright:
- "Po zalozeni mesice se negeneruji radky evidence. Tabulka je prazdna. Bez radku neni mozne evidenci realne uzavrit bez workaroundu."

Dopad:
- vic kliku a vic premysleni hned na zacatku
- nejistota, jestli workflow funguje nebo je rozbite

Navrh zlepseni:
- po akci `Zalozit mesic` automaticky vytvorit radky evidence pro vsechny dny mesice nebo zobrazit viditelne primarni tlacitko `Predvyplnit mesic`

Ocekavany prinos:
- liny zamestnanec muze okamzite pokracovat bez hledani dalsiho kroku

## Problem 2 - Akce Otevrit Evidenci Neprepne Zalozku

Co se stane:
- kliknu na `Otevrit evidenci` v prehledu mesicu, ale zustanu na zalozce `Mzdy`

Kde to boli:
- liny zamestnanec musi delat dalsi zbytecny klik
- misto primeho prechodu musi sam odhadovat, kam se vlastne ma presunout

Konkretni priklad z Playwright:
- "Akce Otevrit evidenci v prehledu mesicu neprepne uzivatele vizualne do tabulky evidence. Interni sekce se sice prepne, ale aktivni workspace tab zustane na mzdach."

Dopad:
- zbytecny klik navic
- zvyseni kognitivni zateze kvuli nejasnemu prechodu mezi obrazovkami

Navrh zlepseni:
- po akci `Otevrit evidenci` automaticky prepnout aktivni workspace tab na `Evidence a Dochazka`

Ocekavany prinos:
- liny zamestnanec se dostane rovnou tam, kde ma pracovat, bez dalsiho rucniho kliku

## Problem 3 - Neexistuje Viditelna Cesta Pro Vystavit Vyplatni Pasku

Co se stane:
- po schvaleni mzdy neni v UI videt, jak vystavit pasku

Kde to boli:
- liny zamestnanec po schvaleni mzdy cekal posledni jednoduchy krok, ale misto toho nevidi, co ma delat
- musi rozumet vic systemu, nez chce, a to je presny opak pohodlneho workflow

Konkretni priklad z Playwright:
- "Vystaveni vyplatni pasky nema v aktualnim UI jednoznacnou uzivatelskou cestu. Po schvaleni mzdy neni dostupna viditelna cesta, ktera by z nuloveho stavu vytvorila novou polozku vyplatni pasky v dokumentech."

Dopad:
- workflow se neda dokoncit bez znalosti internich mechanismu
- narusta frustrace, protoze posledni krok neni viditelny ani samozrejmy

Navrh zlepseni:
- po stavu `payroll_approved` zobrazit jednoznacne a funkcni tlacitko `Vystavit vyplatni pasku`, ktere ihned vytvori dokument a prevede uzivatele na jeho nahled

Ocekavany prinos:
- workflow bude dokoncitelne ciste pres UI a liny zamestnanec nebude muset rozumet internim stavum aplikace

## Zaver

Workflow je funkcni, ale z pohledu lineho zamestnance neni pohodlne. Tri konkretni problemy zbytecne zvysuji pocet kliku, mentalni zatez a frustraci:
- prazdna evidence po zalozeni mesice
- nefunkcni vizualni prepnuti po akci `Otevrit evidenci`
- chybejici viditelna cesta pro vystaveni vyplatni pasky
