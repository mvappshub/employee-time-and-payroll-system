# Manual Verification Scenarios

Tyto scenare overuj spustenim Vite dev serveru, protoze `vite.config.ts` poskytuje `/api/*` middleware pro kartoteku a mesice.

## End-to-end workflow kartoteka -> evidence -> mzda -> paska

1. Spust Vite dev server.
2. Otevri aplikaci a prejdi do `Zamestnanci`.
3. Klikni na `Novy zamestnanec`.
4. Vypln minimalne `Jmeno`, `Datum nastupu` a `Zakladni mzda`.
5. Klikni na `Ulozit zamestnance`.
6. Over, ze se novy zamestnanec objevil v `month-data/employees.json`.
7. Vyber ulozeneho zamestnance.
8. Zmen mesic v horni liste.
9. Over, ze se po zmene mesice sam od sebe nevytvoril zadny soubor v `month-data/employees/<employeeId>/`.
10. Klikni na `Zalozit mesic`.
11. Over, ze vznikl soubor `month-data/employees/<employeeId>/<month>.json` se stavem `draft`.
12. Prejdi do `Evidence` a over, ze je mesic otevreny.
13. Zadej dochazku a klikni na `Ulozit evidenci`.
14. Over, ze stav mesice presel na `time_saved`.
15. Klikni na `Uzavrit evidenci`.
16. Over, ze stav presel na `time_closed`.
17. Klikni na `Spocitat mzdu`.
18. Over, ze stav presel na `payroll_calculated`.
19. Klikni na `Schvalit mzdu`.
20. Over, ze stav presel na `payroll_approved`.
21. Klikni na `Vystavit vyplatni pasku`.
22. Over, ze stav presel na `payslip_issued`.
23. Proved reload aplikace.
24. Over, ze se stejny zamestnanec nacte z `employees.json`, mesic zustane dostupny a workflow stav po reloadu odpovida ulozenym JSON souborum.
