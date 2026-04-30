# employee-time-and-payroll-system

## macOS instalace a spuštění dev serveru

V projektu jsou tři macOS skripty:

- `scripts/install-from-github-macos.sh` - kompletní instalace i bez staženého projektu
- `scripts/setup-macos.sh` - instalace prereqvizit a závislostí v už staženém projektu
- `scripts/dev-macos.sh` - pouze spuštění dev serveru

Skripty jsou určené pro macOS. Na Windows/Linux záměrně skončí s jasnou chybou.

## 1. Kompletní instalace z GitHubu

Použij tento příkaz na čistém Macu, když projekt ještě není stažený:

```bash
curl -fsSL https://raw.githubusercontent.com/mvappshub/employee-time-and-payroll-system/main/scripts/install-from-github-macos.sh | bash
```

Výchozí cílová složka:

```text
~/employee-time-and-payroll-system
```

Co skript udělá:

- ověří, že běží na macOS
- ověří přístup na GitHub a `raw.githubusercontent.com`
- stáhne projekt přes `git clone`, pokud je Git použitelný
- pokud Git použitelný není, stáhne ZIP archiv z GitHubu
- pokud cílová složka už existuje, zkontroluje, že vypadá jako tento projekt
- pokud existující checkout obsahuje lokální změny, nepřepisuje je
- spustí `scripts/setup-macos.sh`
- tím doinstaluje všechny níže uvedené prereqvizity a spustí dev server

Instalace do vlastní složky:

```bash
curl -fsSL https://raw.githubusercontent.com/mvappshub/employee-time-and-payroll-system/main/scripts/install-from-github-macos.sh | bash -s -- --dir ~/Projects/employee-time-and-payroll-system
```

Instalace bez spuštění dev serveru:

```bash
curl -fsSL https://raw.githubusercontent.com/mvappshub/employee-time-and-payroll-system/main/scripts/install-from-github-macos.sh | bash -s -- --no-start
```

Čistá reinstalace npm závislostí:

```bash
curl -fsSL https://raw.githubusercontent.com/mvappshub/employee-time-and-payroll-system/main/scripts/install-from-github-macos.sh | bash -s -- --setup-clean
```

Stažení konkrétní větve:

```bash
curl -fsSL https://raw.githubusercontent.com/mvappshub/employee-time-and-payroll-system/main/scripts/install-from-github-macos.sh | bash -s -- --branch main
```

## 2. Setup v už staženém projektu

Použij, když už projekt na Macu existuje:

```bash
cd ~/employee-time-and-payroll-system
./scripts/setup-macos.sh
```

Co `setup-macos.sh` kontroluje nebo instaluje:

- macOS
- přístup na GitHub
- přístup na `raw.githubusercontent.com`
- přístup na npm registry
- Xcode Command Line Tools
- Homebrew
- Node.js `20.19+`
- npm
- npm závislosti projektu přes `npm ci`
- fallback na `npm install`, když je potřeba recovery
- existenci `scripts.dev` v `package.json`
- spuštění Vite dev serveru

Setup bez spuštění dev serveru:

```bash
./scripts/setup-macos.sh --no-start
```

Čistá reinstalace závislostí:

```bash
./scripts/setup-macos.sh --clean
```

Vlastní port:

```bash
PORT=3000 ./scripts/setup-macos.sh
```

Vlastní host:

```bash
HOST=127.0.0.1 ./scripts/setup-macos.sh
```

## 3. Pouze spuštění dev serveru

Použij, když už jsou prereqvizity i npm závislosti nainstalované:

```bash
cd ~/employee-time-and-payroll-system
./scripts/dev-macos.sh
```

Vlastní port:

```bash
PORT=3000 ./scripts/dev-macos.sh
```

Vlastní host:

```bash
HOST=127.0.0.1 ./scripts/dev-macos.sh
```

Spuštění s automatickou instalací chybějících npm závislostí:

```bash
./scripts/dev-macos.sh --install-if-missing
```

`dev-macos.sh` neinstaluje Homebrew ani Node. Pokud tyto prereqvizity chybí,
řekne, že máš spustit:

```bash
./scripts/setup-macos.sh
```

## Porty a síť

Výchozí host:

```text
0.0.0.0
```

Výchozí port:

```text
5173
```

Pokud je port obsazený, skripty hledají první volný port v rozsahu:

```text
PORT až PORT+20
```

Například při `PORT=3000` zkusí `3000` až `3020`.

## Logy

Setup a dev skripty zapisují log sem:

```text
.logs/dev-macos.log
```

Vlastní umístění logu:

```bash
LOG_FILE=~/payroll-install.log ./scripts/setup-macos.sh
```

## Help

Každý skript má nápovědu:

```bash
./scripts/install-from-github-macos.sh --help
./scripts/setup-macos.sh --help
./scripts/dev-macos.sh --help
```

## Troubleshooting

Pokud macOS otevře instalátor Xcode Command Line Tools, dokonči instalaci a
spusť stejný příkaz znovu.

Pokud firemní VPN, proxy, firewall nebo DNS filtr blokuje GitHub, raw GitHub
nebo npm registry, skripty skončí brzo s konkrétní síťovou chybou.

Pokud existující checkout obsahuje lokální změny, kompletní GitHub installer
neprovede `git pull`, aby nepřepsal práci v projektu.
