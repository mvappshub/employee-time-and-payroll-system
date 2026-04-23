# Opravy vypoctu mezd a dochazky

> Aktualni stav repa po provedene implementaci. Tento soubor uz neni historicky wish-list, ale kratky stavovy backlog odpovidajici realite kodu a testu.

## Completed

- [x] Payroll flow je oddelen na hrubou mzdu, odvody, zalohu na dan a cistou mzdu.
- [x] ZP/SP sazby a smer mezi zamestnancem a zamestnavatelem jsou v kodu opraveny.
- [x] Zalohova dan pouziva samostatny zaklad a centralizovane rounding helpery.
- [x] Hruba mzda uz neobsahuje funkcni dvojkolejnost odmen.
- [x] Existuje pouze jeden reward input: mesicni `manualReward` ve vyplatni pasce.
- [x] Svatek rozlisuje rezim `time-off` vs. `premium`.
- [x] Svatecni premium nikdy neklesne pod 100 % pri rezimu `premium`.
- [x] Dovolena na svatek se nespotrebovava.
- [x] DPN pouziva redukovany hodinovy zaklad.
- [x] DPN je omezena na prvnich 14 kalendarnich dnu souvisleho streaku.
- [x] DPN umi carryover z minuleho mesice pres `sickCarryoverDays`.
- [x] Nocni a vikendove priplatky respektuji minima pro `mzda` i `plat`.
- [x] Prescas se pocita i pro den bez planu a umi nepenizni vyporadani.
- [x] Svatek i prescas umi nepenizni vyporadani pres nahradni volno.
- [x] Prestavka vychazi z delky smeny a `standardBreak`, neni natvrdo 0,5 h.
- [x] Pole `Odpracovano (realne)` bylo odstraneno jako mrtvy input.
- [x] `saldoMesic` vychazi z uznanych hodin a salda dochazky, ne z oddelene rucni logiky.
- [x] `Neplacene volno / absence` ma v UI i vypoctu sjednocenou semantiku.
- [x] Kalendar svatku se generuje pro aktualni i budouci roky.
- [x] Rounding je centralizovany pres helpery v `src/calc.ts`.
- [x] Automaticke testy pokryvaji manualni scenare i edge cases z aktualniho scope.
- [x] Referencni manualni scenare jsou v `docs/manual-verification-scenarios.md`.

## Covered Audit Areas

- [x] DPN carryover pres hranici mesice
- [x] minima nocniho priplatku
- [x] minima vikendoveho priplatku
- [x] logika svatku `time-off` vs. `premium`
- [x] reward single source
- [x] holiday premium minimum clamp
- [x] rounding consolidation
- [x] test expansion pro manualni scenare a edge cases

## Remaining Open Items

- [ ] Zadny otevreny implementacni task v aktualnim scope.

## Deferred / Not Now

- [ ] Varovani pro limit 150 h prescasu
- [ ] Dalsi specialni priplatkove rezimy a nestandardni sazby
- [ ] Dalsi danove slevy a zvyhodneni
- [ ] Dalsi redefinice vyznamu `saldoMesic`
- [ ] Sirsi UX prejmenovani poli bez primeho dopadu na vypocet

## Verification Snapshot

- [x] `npm test`
- [x] `npm run build`
- [x] Backlog odpovida aktualnimu stavu repa
