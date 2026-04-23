# Manual Verification Scenarios

Referencni scenare pro rychlou regresni kontrolu po zmenach vypoctu.

## 1. Bezny mesic bez odchylek

- Zamestnanec: `mzda`
- Fond: 160 h
- Odpracovano: 160 h
- Ocekavani:
  - `saldoMesic = 0`
  - bez priplatku
  - hruba mzda = zaklad + osobni ohodnoceni

## 2. Svatek v pracovnim dni bez prace

- Den je statni svatek
- Rozvrzena bezna smena
- Zadny prichod / odchod
- Ocekavani:
  - `holidayCredit = planHours`
  - `worked = 0`
  - `holidayTotal = planHours`
  - `saldo = 0`

## 3. Prace ve svatek s nahradnim volnem

- Den je statni svatek
- Zamestnanec pracuje
- `holidayCompensationMode = time-off`
- Ocekavani:
  - `holidaySurchargeCalc = 0`
  - `holidayCompLeaveHours = totalHolidayWorked`

## 4. Prace ve svatek s priplatkem

- Den je statni svatek
- Zamestnanec pracuje
- `holidayCompensationMode = premium`
- Ocekavani:
  - `holidaySurchargeCalc > 0`
  - `holidayCompLeaveHours = 0`

## 5. Vikend + nocni v rezimu mzda

- `remunerationType = mzda`
- Prace v noci o vikendu
- Ocekavani:
  - nocni priplatek nejmene 10 %
  - vikendovy priplatek nejmene 10 %
  - obe slozky se scitaji

## 6. Vikend + nocni v rezimu plat

- `remunerationType = plat`
- Prace v noci o vikendu
- Ocekavani:
  - nocni priplatek nejmene 20 %
  - vikendovy priplatek nejmene 25 %
  - obe slozky se scitaji

## 7. Prescas mimo rozvrh

- Den bez planu
- Zamestnanec odpracuje smenu
- Ocekavani:
  - `planHours = 0`
  - `overtime = worked`
  - `saldo = worked`

## 8. Dovolena pres svatek

- Na den dovolene pripadne svatek
- Ocekavani:
  - `vacation = 0`
  - `holidayCredit = planHours`

## 9. DPN v prvnich 14 dnech

- Souvisla DPN
- Ocekavani:
  - v prvnich 14 kalendarnich dnech se DPN zapocita do `sick`
  - `sickCalc` vychazi z `reducedAverageHourlyEarnings`

## 10. DPN po 14. dni a pres hranici mesice

- DPN zacala v minulem mesici
- Vyplneno `sickCarryoverDays`
- Ocekavani:
  - po prekroceni 14 kalendarnich dni dalsi dny nevstupuji do `sick`
  - saldo a uznane hodiny se tomu prizpusobi
