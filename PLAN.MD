Níže je **implementační plán pro Codex**. Je psaný jako vykonávací checklist, ne jako analýza.

Repo ground truth ověřený proti kódu: `calcAverageHourlyEarnings()` už dnes přepíná mezi skutečným PHV a `probableHourlyEarnings`, `calcReducedAverageHourlyBasis()` teď jen vrací nezredukované PHV, PHV pole už existují v `EmployeeSettings`, ve store i v UI, a testy už pokrývají skutečný/pravděpodobný PHV i failure path.      Výzkumný podklad k tomu samému směru změny: 

---

# IMPLEMENTATION PLAN FOR CODEX

## Execution directive

* Začni implementovat **okamžitě po převzetí tohoto plánu**.
* Nevracej další plán. Dělej změny.
* Postupuj inkrementálně po taskách níže.
* Neoznačuj práci jako hotovou, dokud nesplníš všechny verification a revision gates.
* Na konci změny **commitni a pushni**.

## Objective

Opravit implementaci PHV/DPN tak, aby:

* zůstala zachována už správná volba mezi skutečným PHV a pravděpodobným výdělkem,
* byla doplněna reálná redukce základu pro DPN místo dnešního passthrough,
* nevznikl nepovolený fallback na `hourlyRate`,
* byly pokryty edge cases a regrese testy,
* změna byla prokazatelně ověřena.

## Confirmed current state in repo

* `calcAverageHourlyEarnings()`:

  * používá skutečný průměr jen při `priorQuarterWorkedDaysForAverage >= 21` a kladných quarter inputs,
  * jinak použije `probableHourlyEarnings`,
  * jinak vyhodí chybu. 
* `calcReducedAverageHourlyBasis()` aktuálně vrací `averageHourlyEarnings` beze změny. 
* PHV vstupy už existují v:

  * `src/types.ts`,
  * `src/store.ts`,
  * `src/Employee.tsx`.   
* Testy dnes výslovně očekávají nezredukovaný sick basis (`250`) a sick calc (`1200`) a už kryjí actual/probable/error scénáře pro PHV. 

## Non-goals

* Nedělej broad refactor payrollu.
* Neměň architekturu store/UI bez nutnosti.
* Nepřidávej fallback PHV z `baseSalary / monthlyFundHours`.
* Nezaváděj nové PHV input pole, pokud nejsou nezbytná.
* Nehardcoduj legislativní redukční konstanty naslepo. Použij jen projektově potvrzený zdroj; pokud v repu/issue/research není finální autoritativní číselná specifikace, odděl konstanty do jednoho místa a označ je jako ověřené proti schválenému podkladu před finalizací.

---

# CHECKLIST

## Task 1 — Baseline audit a pracovní větev

* [x] Založ pracovní branch pro opravu PHV/DPN.
* [x] Zaznamenej výchozí stav:

  * které soubory jsou relevantní,
  * které testy dnes procházejí,
  * které stávající assertiony budou muset být změněny kvůli redukci DPN.

### Files to inspect

* `src/calc.ts`
* `src/calc.test.ts`
* `src/types.ts`
* `src/store.ts`
* `src/Employee.tsx`

### Verification

* [x] Potvrď, že branch vznikla z aktuálního `main`.
* [x] Potvrď, že relevantní testy před změnou běží a že rozumíš jejich současným očekáváním.

### Completion gate

* Task není hotový, dokud není jasné:

  * co už repo dělá správně,
  * co je skutečný change scope,
  * které testy se změní.

---

## Task 2 — Zachovej správnou volbu PHV/PV a neporuš ji

* [x] Nechej `calcAverageHourlyEarnings()` funkčně kompatibilní se stávajícím chováním:

  * actual average při splnění podmínek,
  * probable earnings při `< 21` dnech,
  * error bez validních vstupů.
* [x] Nepřidávej fallback na `hourlyRate`.
* [x] Pokud přidáš guardy/validace, nesmí změnit core decision tree.

### Implementation instructions

* Uprav `calcAverageHourlyEarnings()` jen pokud:

  * opravuješ validaci vstupů,
  * zpřesňuješ error conditions,
  * nebo přidáváš ochranu proti nesmyslným záporným hodnotám.
* Zachovej sémantiku:

  * actual path má prioritu, jen když splňuje threshold i kladné inputs,
  * probable path je fallback pouze pro validní `probableHourlyEarnings > 0`,
  * jinak explicitní chyba.

### Verification

* [x] Test actual PHV stále prochází.
* [x] Test probable earnings stále prochází.
* [x] Test missing inputs stále končí chybou.
* [x] Nikde v diffu nevznikl výpočet PHV přes `calcHourlyRate()` nebo `baseSalary`.

### Failure signals

* PHV se odvozuje z měsíční mzdy.
* Error path zmizí a je nahrazen tichým `0`.
* Při `< 21` dnech se použije actual average místo probable earnings.

---

## Task 3 — Implementuj skutečnou redukci základu pro DPN

* [x] Nahraď passthrough v `calcReducedAverageHourlyBasis()` skutečnou redukcí.
* [x] Redukční logiku drž izolovaně a čitelně.
* [x] Nepoužívej „magic numbers“ rozházené v business logice.

### Implementation instructions

* Preferovaný postup:

  1. Vytvoř jedno centrální místo pro redukční konstanty / pásma a případně rok/verzi.
  2. Implementuj čistou funkci pro redukci hodinového základu.
  3. `calcPaySlip()` nech používat výhradně výstup této funkce pro `sickHourlyBasis`.
* Pokud projekt už má schválený zdroj redukčních hranic/sazeb, použij jej.
* Pokud schválený zdroj v repu není, vytvoř strukturu tak, aby šly konstanty snadno auditovat a měnit na jednom místě; neukrývej je v několika podmínkách.

### Required design constraints

* Redukce musí být deterministická a testovatelná samostatně.
* Výsledek musí být:

  * `<= averageHourlyEarnings`,
  * `>= 0`,
  * stabilní pro hraniční vstupy.
* Funkce nesmí při validním vstupu vyhazovat chybu jen kvůli redukci.

### Verification

* [x] Přidej samostatné unit testy na redukční funkci:

  * nulový vstup,
  * nízký vstup,
  * hraniční hodnoty pásem,
  * vyšší vstup,
  * monotonicitu / ne-negativitu.
* [x] Přidej integrační test, že `calcPaySlip()` už nepoužívá full PHV jako `sickHourlyBasis`, ale redukovanou hodnotu.
* [x] Přepiš stávající assertions, které dnes čekají `sickHourlyBasis = 250` a `sickCalc = 1200`, na nové správné očekávání podle implementované redukce. 

### Failure signals

* `calcReducedAverageHourlyBasis()` stále vrací input beze změny.
* Redukce je rozkopírovaná přímo v `calcPaySlip()`.
* Testy kontrolují jen „něco se změnilo“, místo konkrétního očekávaného výsledku.

---

## Task 4 — Ošetři vstupní validaci a edge cases pro PHV/DPN

* [x] Zkontroluj, zda záporné nebo zjevně nesmyslné hodnoty nemohou tichounce vytvořit chybný PHV/DPN výstup.
* [x] Přidej minimální ochrany tam, kde dávají smysl, bez rozbití stávajícího UX.

### Implementation instructions

* V jádru výpočtu:

  * nepřipusť, aby záporné quarter inputs vedly na validní PHV,
  * nepřipusť záporný probable earnings jako validní fallback,
  * nepřipusť záporný reduced basis.
* V UI/store dělej změny jen pokud jsou skutečně potřeba:

  * pole už existují,
  * defaulty už existují,
  * zásah má smysl jen kvůli validaci nebo srozumitelnějšímu vedení uživatele.  

### Verification

* [x] Přidej test alespoň pro jeden invalid input scénář:

  * záporná quarter gross,
  * záporné hours,
  * záporné probable earnings,
  * nebo kombinace.
* [x] Potvrď, že error/fallback chování je explicitní a ne tiché.

### Failure signals

* Invalidní data se promění na „nějaký výsledek“ bez alarmu.
* Validace je jen v UI, ale ne v core funkci.

---

## Task 5 — Udrž konzistenci UI/store/types bez zbytečných změn

* [x] Ověř, že `types.ts`, `store.ts` a `Employee.tsx` stále odpovídají finální logice.
* [x] Neměň tyto soubory, pokud to není opravdu potřeba.
* [x] Pokud je změníš, změna musí být přímo vázaná na validaci nebo auditovatelnost.

### Implementation instructions

* `src/types.ts`: měň jen při nutnosti nové konfigurační struktury pro redukci.
* `src/store.ts`: měň jen pokud je potřeba default/config pro novou redukční konfiguraci.
* `src/Employee.tsx`: měň jen pokud přidáváš ochranu/nápovědu k PHV inputům nebo bráníš chybnému zadání.

### Verification

* [x] Build/UI se po změně nerozbije.
* [x] Persisted state zůstává kompatibilní, nebo je změna doplněna bezpečnou migrací.
* [x] Žádná existující PHV pole nezmizela bez náhrady.

### Failure signals

* Změny v UI/store nejsou nutné, ale byly udělány.
* Nová pole vzniknou bez skutečné potřeby.
* Persistovaná data přestanou být čitelná.

---

## Task 6 — Rozšiř test suite tak, aby bránila nedokončené implementaci

* [x] Doplň testy tak, aby nešlo „projít“ s napůl hotovou implementací.
* [x] Kryj jak pure function level, tak integration level.

### Minimum required tests

* [x] `calcAverageHourlyEarnings()`:

  * actual average path,
  * probable earnings path,
  * missing inputs error,
  * invalid negative input behavior.
* [x] `calcReducedAverageHourlyBasis()`:

  * 0 input,
  * representative positive input,
  * threshold boundary cases,
  * monotonic / never negative.
* [x] `calcPaySlip()`:

  * sick basis uses reduced basis, not full PHV,
  * sick compensation still excluded from contribution/tax base if that behavior already exists,
  * vacation/night/weekend calculations remain tied to PHV path as before.
* [x] Regression:

  * no fallback to hourly rate,
  * existing non-DPN payroll behavior remains unchanged unless directly affected.

### Verification

* [x] Test names popisují business intent, ne jen interní implementaci.
* [x] Každý nový branch v logice má alespoň jeden explicitní test.
* [x] Žádný stávající failing test není „opraven“ jen oslabením assertion.

### Failure signals

* Testy jsou přepsané na obecné `toBeGreaterThan(0)` místo přesných hodnot.
* Chybí boundary tests pro redukční pásma.
* Chybí integration test přes `calcPaySlip()`.

---

## Task 7 — Proveď regression audit diffu

* [x] Udělej self-review celého diffu.
* [x] Zkontroluj, že změna scope zůstala omezena na PHV/DPN a přímé integrační body.

### Review checklist

* [x] Nezměnil ses omylem i jiný payroll výpočet?
* [x] Nezměnilo se chování dovolené/příplatků mimo záměr?
* [x] Nezmizela nějaká existující ochrana/error path?
* [x] Neobsahuje diff debug code, commented-out code nebo dead code?
* [x] Jsou názvy helperů, konstant a testů auditovatelné?

### Completion gate

* Práci neuzavírej, dokud nebudeš schopen stručně vyjmenovat:

  * co se změnilo,
  * proč se to změnilo,
  * jak to bylo ověřeno.

---

## Task 8 — Build, test, evidence

* [x] Spusť relevantní testy po každém významném kroku.
* [x] Na konci spusť plnou validaci projektu.

### Required validation

* [x] unit tests
* [x] full test suite
* [x] build
* [x] lint/typecheck, pokud projekt má

### Evidence block to produce

Na konci práce vypiš:

* seznam spuštěných příkazů,
* jejich výsledky,
* seznam změněných souborů,
* stručné shrnutí behavior change,
* explicitní potvrzení, že DPN sick basis už není passthrough full PHV.

### Failure signals

* „Mělo by to fungovat“ bez běžících testů/buildu.
* Jen lokální dílčí test bez full validation.
* Bez evidence konkrétních command outputs.

---

## Task 9 — Commit a push

* [x] Vytvoř smysluplný commit message.
* [x] Pushni branch se změnami na remote.

### Commit requirements

* Commit message musí říct věcně, co bylo opraveno.
* Doporučený styl:

  * `fix(payroll): implement reduced DPN hourly basis from PHV`
  * nebo
  * `fix(phv): apply reduced sick compensation basis and add regression tests`

### Push requirements

* Pushni aktuální branch.
* Pokud push selže kvůli auth/remote problému:

  * nevydávej to za hotový push,
  * vypiš přesnou chybu,
  * ponech lokální commit SHA v reportu.

### Final report format

Na konci vrať:

* branch name
* commit SHA
* pushed: yes/no
* changed files
* tests/build status
* stručné shrnutí implementace

---

# REVISION GATES

Neoznačuj implementaci za hotovou, dokud nejsou splněny všechny body:

* [x] `calcReducedAverageHourlyBasis()` už není passthrough.
* [x] PHV selection logic zůstala zachována.
* [x] Neexistuje fallback na `hourlyRate`.
* [x] Stávající PHV tests stále dávají smysl a procházejí po úpravě očekávání.
* [x] Nové redukční testy existují a procházejí.
* [x] `calcPaySlip()` integračně používá redukovaný sick basis.
* [x] Full validation prošla.
* [x] Změny jsou commitnuté.
* [x] Změny jsou pushnuté, nebo je explicitně nahlášen důvod, proč push nešel.

# Definition of done

Hotovo je pouze tehdy, když:

1. DPN basis je implementačně opravena.
2. Repo má odpovídající test coverage.
3. Nejsou rozbité existující správné části PHV flow.
4. Existuje evidence z testů/buildů.
5. Existuje commit.
6. Existuje push nebo přesně nahlášený důvod jeho selhání.

---

POSTUPNĚ SI ODŠKRTÁVEJ CO JE HOTOVO A DOKUD NEODŠKRTNEŠ NEPŘERUŠUJ PRÁCI ABYS MĚ O NĚČEM INFORMOVAL. A SNAŽ SE ŠETŘIT TOKENY .
