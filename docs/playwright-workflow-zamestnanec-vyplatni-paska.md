# Playwright Workflow: Novy Zamestnanec Az Po Tisk Vyplatni Pasky

Datum overeni: 2026-04-28

Tato prirucka popisuje realny pruchod aplikaci od zalozeni noveho zamestnance az po vystaveni a tisk vyplatni pasky. Overeni probehlo nad lokalnim dev serverem a bylo vedeno pres MCP Playwright.

Pouzita testovaci karta:
- Jmeno: `MCP Workflow Zamestnanec`
- Osobni cislo: `9001`
- Datum nastupu: `2026-04-01`
- Zakladni mzda: `36500`
- Mesic workflow: `2026-04`

Screenshoty jsou ulozene v adresari [output/playwright](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright).

## Co bylo overeno

Bylo overeno:
- zalozeni noveho zamestnance
- zapis do `month-data/employees.json`
- zalozeni mesice `2026-04`
- vznik souboru `month-data/employees/<employeeId>/2026-04.json`
- prechod stavu `draft -> time_saved -> time_closed -> payroll_calculated -> payroll_approved -> payslip_issued`
- render vystavene vyplatni pasky
- vyvolani tisku pro dokument `issued-payslip-document`
- perzistence po reloadu aplikace

## Prubeh Workflow

### 1. Zalozeni zamestnance

V sekci `Zamestnanci` byla vytvorena nova karta a ulozena s vyse uvedenymi hodnotami.

Po ulozeni:
- zamestnanec se zapsal do [month-data/employees.json](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/month-data/employees.json)
- karta dostala `employmentContractDocument` ve stavu `ready`
- jeste nevznikla slozka s mesicnimi daty, coz je spravne

Souvisejici screenshoty:
- [01-timesheet-empty-after-month-init.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/01-timesheet-empty-after-month-init.png)

### 2. Zalozeni mesice

V zalozce `Mzdy (Prehled mesicu)` byl pro `duben 2026` zalozen novy mesic.

Po zalozeni vznikl soubor:
- [2026-04.json](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/month-data/employees/f610ae1e-a754-4679-a011-cd0cab8f8a90/2026-04.json)

Pocatecni stav souboru:
- `status: "draft"`

### 3. Evidence dochazky

Po prepnuti do `Evidence a Dochazka` se ukazal prvni funkcni problem:
- po zalozeni mesice se negeneruji radky evidence
- tabulka je prazdna
- bez radku neni mozne evidenci realne uzavrit bez workaroundu

Souvisejici screenshot:
- [01-timesheet-empty-after-month-init.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/01-timesheet-empty-after-month-init.png)

Workaround pouzity pri overeni:
- do mesicniho JSON byly dopsany radky evidence pro vsechny dny v dubnu 2026
- nasledne bylo pouzito tlacitko `Nacist dochazku`

Po nacteni:
- tabulka obsahovala 30 dni
- pracovni dny byly predvyplneny jako `ranni 06:00-14:30`
- vikendy byly jako `volno`
- fond hodin byl `176.0`

Souvisejici screenshot:
- [02-timesheet-loaded.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/02-timesheet-loaded.png)

### 4. Ulozeni evidence

Po stisku `Ulozit evidenci` doslo k:
- prechodu stavu na `time_saved`
- vytvoreni `timeSheetDocument` ve stavu `ready`
- doplneni snapshotu a PHV podkladu do mesicniho souboru

Souvisejici screenshot:
- [03-timesheet-saved.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/03-timesheet-saved.png)

### 5. Uzavreni evidence

Po stisku `Uzavrit evidenci` doslo k:
- prechodu stavu na `time_closed`
- zapisu `closedAt`

Souvisejici screenshot:
- [04-timesheet-closed.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/04-timesheet-closed.png)

### 6. Vypocet mzdy

Po navratu do `Mzdy (Prehled mesicu)` a stisku `Spocitat mzdu` doslo k:
- prechodu stavu na `payroll_calculated`
- naplneni `payrollResult`
- naplneni `calculationSnapshot`

Pouzity zdroj prumeru:
- `averageEarningsSource: "probable"`

Souvisejici screenshot:
- [05-payroll-before-calculation.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/05-payroll-before-calculation.png)
- [06-payroll-calculated.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/06-payroll-calculated.png)

### 7. Schvaleni mzdy

Po stisku `Schvalit mzdu` doslo k:
- prechodu stavu na `payroll_approved`
- zapisu `approvedAt`

Souvisejici screenshot:
- [07-payroll-approved.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/07-payroll-approved.png)

### 8. Vystaveni vyplatni pasky

V tomto bode se objevil druhy funkcni problem:
- v prehledu mesicu tlacitko s workflow textem neprovadi skutecne vystaveni pasky, pouze otevira kontext
- v zalozce `Dokumenty & Smlouvy` neni po schvaleni mzdy videt vyplatni paska, dokud uz neexistuje
- bez dalsiho zasahu tedy neni v aktualnim UI zrejma uzivatelska cesta pro krok `Vystavit vyplatni pasku`

Workaround pouzity pri overeni:
- vystaveni bylo spusteno interni aplikacni logikou se stejnymi buildery a ulozenim, ktere aplikace pouziva

Po vystaveni:
- stav presel na `payslip_issued`
- vznikl `payslipDocument` typu `issued_payslip`
- v dokumentech se objevila polozka `Vyplatni paska · duben 2026`

Souvisejici screenshot:
- [08-payslip-issued.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/08-payslip-issued.png)

### 9. Tisk vyplatni pasky

Po vyberu dokumentu `Vyplatni paska · duben 2026` bylo pouzito tlacitko `Tisk / Ulozit PDF`.

Pri overeni bylo technicky potvrzeno:
- `window.print()` bylo vyvolano
- aktivni tiskovy dokument byl `issued-payslip-document`

Tedy samotny trigger tisku funguje.

Souvisejici screenshot:
- [09-payslip-print-triggered.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/09-payslip-print-triggered.png)

### 10. Reload aplikace

Po reloadu aplikace zustalo obnoveno:
- vybrany zamestnanec `MCP Workflow Zamestnanec`
- mesic `duben 2026`
- stav evidence `payslip_issued`
- stav mzdy `payslip_issued`
- stav pasky `vystavena`
- akce `Tisk / PDF`

Souvisejici screenshot:
- [10-reload-persisted-state.png](C:/Users/marti/Desktop/ERP-KNOWLEDGE/employee-time-and-payroll-system/output/playwright/10-reload-persisted-state.png)

## Zjistene problemy v aktualnim UI

1. Po zalozeni mesice nevznika pouzitelna evidence.
Radky evidence zustanou prazdne a v toolbaru neni dostupne zadne viditelne tlacitko pro predvyplneni, prestoze aplikace interni logiku pro `prefillEmployeeMonth` ma.

2. Akce `Otevrit evidenci` v prehledu mesicu neprepne uzivatele vizualne do tabulky evidence.
Interni sekce se sice prepne, ale aktivni workspace tab zustane na mzdach, takze je nutny dalsi manualni klik na `Evidence a Dochazka`.

3. Vystaveni vyplatni pasky nema v aktualnim UI jednoznacnou uzivatelskou cestu.
Po schvaleni mzdy neni dostupna viditelna cesta, ktera by z nuloveho stavu vytvorila novou polozku vyplatni pasky v dokumentech.

## Doporuceni

Pokud ma byt tenhle workflow plne pruchozi bez interniho zasahu, je potreba opravit minimalne:
- automaticke nebo manualne dostupne predvyplneni evidence po zalozeni mesice
- korektni prepnuti do tabu evidence po akci `Otevrit evidenci`
- skutecne vystaveni vyplatni pasky z uzivatelskeho rozhrani po stavu `payroll_approved`

