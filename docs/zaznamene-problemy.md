# Zaznamene Problemy

Tento dokument shrnuje problemy identifikovane behem Playwright pruchodu workflow od zalozeni zamestnance po tisk vyplatni pasky.

## Problem 1 - Prazdna Evidence Po Zalozeni Mesice

Priorita: vysoka

Dopad:
- uzivatel se zastavi hned na zacatku workflow pro dany mesic
- bez dalsi znalosti systemu nevi, jak pokracovat

Popis:
- po zalozeni mesice nevzniknou pouzitelne radky evidence
- tabulka zustane prazdna

Zdroj:
- [playwright-workflow-zamestnanec-vyplatni-paska.md](./playwright-workflow-zamestnanec-vyplatni-paska.md)

## Problem 2 - Otevrit Evidenci Neprepne Viditelny Tab

Priorita: stredni

Dopad:
- uzivatel musi udelat dalsi manualni krok
- vznikne pocit, ze akce nefungovala

Popis:
- interni sekce se prepne
- aktivni workspace tab zustane na mzdach

Zdroj:
- [playwright-workflow-zamestnanec-vyplatni-paska.md](./playwright-workflow-zamestnanec-vyplatni-paska.md)

## Problem 3 - Chybi Viditelna Cesta Pro Vystaveni Vyplatni Pasky

Priorita: kriticka

Dopad:
- workflow nejde dokoncit ciste pres uzivatelske rozhrani
- uzivatel nema jasny dalsi krok po schvaleni mzdy

Popis:
- po schvaleni mzdy neni dostupna jednoznacna uzivatelska akce, ktera by vystavila novou vyplatni pasku

Zdroj:
- [playwright-workflow-zamestnanec-vyplatni-paska.md](./playwright-workflow-zamestnanec-vyplatni-paska.md)
