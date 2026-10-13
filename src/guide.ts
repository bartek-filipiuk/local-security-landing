// The fix-it guide behind the signup, both languages, same shape.
// Each block is a paragraph or a command; commands render as selectable terminal lines.
type Block = { p: string } | { cmd: string } | { file: string; body: string };
export type Step = { title: string; finding: string; why: string; do: Block[]; check?: string; trap: string };
export type Guide = {
  title: string; description: string; h1: string; intro: string[];
  labels: { finding: string; check: string; trap: string; toc: string };
  steps: Step[]; outro: { h2: string; p: string[] };
};

const pl: Guide = {
  title: "Naprawa po audycie · ai-agent-audit",
  description: "Osiem kroków od najważniejszego: co zrobić z wynikiem ai-agent-audit.",
  h1: "Naprawa po audycie",
  intro: [
    "Osiem kroków w kolejności, w jakiej warto je zrobić: najpierw to, co daje atakującemu najwięcej, potem drogi wejścia. Każdy krok ma komendę, sposób sprawdzenia i pułapkę, na którą łatwo trafić.",
    "Pomiń kroki, których Twój raport nie zgłosił. Kod znaleziska w nawiasie (np. A.1) znajdziesz w `action-plan.md`. Komendy są dla Linuksa i macOS.",
  ],
  labels: { finding: "Znalezisko", check: "Sprawdź", trap: "Pułapka", toc: "Kroki" },
  steps: [
    {
      title: "Hasło na kluczach SSH",
      finding: "A.1 · SSH private key has NO passphrase",
      why: "Klucz bez hasła to plik, który wystarczy skopiować, żeby wejść na Twoje serwery. Z hasłem skopiowany plik jest bezużyteczny.",
      do: [
        { p: "Najpierw sprawdź, czy coś używa klucza automatycznie (cron, timery, skrypty wdrożeń). Klucz z hasłem w automatyzacji przestanie działać." },
        { cmd: "crontab -l; systemctl --user list-timers" },
        { p: "Dodaj hasło. Komenda pyta o stare (Enter, jeśli go nie było), potem dwa razy o nowe:" },
        { cmd: "ssh-keygen -p -f ~/.ssh/id_ed25519" },
        { p: "Żeby nie wpisywać hasła przy każdym połączeniu, niech ssh-agent zapamięta klucz po pierwszym użyciu. Dopisz na końcu `~/.ssh/config`:" },
        { file: "~/.ssh/config", body: "Host *\n  AddKeysToAgent yes" },
        { p: "Jeszcze lepiej: klucz sprzętowy FIDO2 (np. YubiKey). Prywatny klucz nie opuszcza urządzenia, a każde użycie wymaga dotknięcia. Wymaga OpenSSH 8.2 lub nowszego; jeśli Twój klucz nie obsługuje `ed25519-sk`, użyj `ecdsa-sk`." },
        { cmd: "ssh-keygen -t ed25519-sk" },
      ],
      check: "ssh-keygen -y -P '' -f ~/.ssh/id_ed25519   # musi odmówić: incorrect passphrase",
      trap: "Hasło zapisz w menedżerze haseł. Klucz, do którego zapomnisz hasła, jest bezużyteczny także dla Ciebie.",
    },
    {
      title: "Tokeny, którymi da się publikować",
      finding: "A.3 · npm auth token · A.7 · GitHub CLI token has powerful scopes",
      why: "Token npm albo GitHub pozwala opublikować zainfekowaną paczkę w Twoim imieniu. Tak robaki w npm przechodzą z jednego komputera na kolejne projekty.",
      do: [
        { p: "npm: jeśli nie publikujesz paczek co tydzień, wyloguj się. Token zniknie z `~/.npmrc`; do publikacji zalogujesz się na chwilę, z 2FA." },
        { cmd: "npm whoami && npm logout" },
        { p: "GitHub CLI: zobacz, jakie uprawnienia ma token, i usuń te, których nie używasz (przykład poniżej, wpisz swoje):" },
        { cmd: "gh auth status" },
        { cmd: "gh auth refresh --remove-scopes delete_repo,admin:org" },
      ],
      check: "grep -c _authToken ~/.npmrc   # 0 albo brak pliku",
      trap: "Ten sam token bywa też w `~/.bashrc` albo `~/.zshrc` jako `export GH_TOKEN=…` lub `NPM_TOKEN=…`. To ten sam problem w innym miejscu.",
    },
    {
      title: "Przypięte wersje serwerów MCP",
      finding: "M.2 · MCP server launched via npx without pinned version",
      why: "`npx paczka@latest` pobiera najnowszą wersję przy każdym starcie agenta. Gdy ktoś przejmie konto autora, Twój agent uruchomi jego kod przy najbliższym starcie. Przypięta wersja się nie zmienia.",
      do: [
        { p: "Raport podaje dokładne pliki. Najczęściej: `~/.claude.json` (także sekcje projects), `~/.codex/config.toml`, konfiguracja Claude Desktop, `~/.cursor/mcp.json` i `.mcp.json` w repozytoriach." },
        { p: "Wybierz wersję starszą niż mniej więcej dwa tygodnie: zainfekowane wydania zwykle wykrywa się i wycofuje w ciągu godzin albo dni. Daty wydań:" },
        { cmd: "npm view chrome-devtools-mcp time --json | tail -5" },
        { p: "Zamień `chrome-devtools-mcp@latest` (albo samą nazwę bez wersji) na konkretną wersję, np. `chrome-devtools-mcp@1.10.1`. Dla uvx: `pakiet==1.2.3`." },
        { p: "Claude Code sam zapisuje `~/.claude.json`, więc przed edycją zamknij sesje agenta albo zrób kopię. Kopia zawiera te same klucze: usuń ją po sprawdzeniu." },
        { p: "To samo dla Twoich projektów: pnpm od wersji 10.16 ma w `pnpm-workspace.yaml` ustawienie `minimumReleaseAge` (w minutach, 1440 to jeden dzień). Nowsze wersje npm mają `min-release-age` (w dniach); sprawdź w `npm help config`, czy Twoja je zna." },
      ],
      check: "grep -n '@latest' ~/.claude.json ~/.codex/config.toml   # nic",
      trap: "Przypięta wersja nie zaktualizuje się sama. Raz w miesiącu podnieś wersje ręcznie. O wycofanych, zainfekowanych wersjach piszemy w alertach.",
    },
    {
      title: "Uprawnienia plików z kluczami",
      finding: "M.1.perm · MCP config readable by other users",
      why: "Konfiguracje agentów trzymają klucze API. Uprawnienia 644 albo 664 pozwalają je czytać innym kontom na tym komputerze.",
      do: [
        { p: "Ustaw dostęp tylko dla siebie (pomiń pliki, których nie masz):" },
        { cmd: "chmod 600 ~/.claude.json ~/.codex/config.toml ~/.gemini/settings.json" },
      ],
      check: "ls -l ~/.claude.json   # -rw-------",
      trap: "Na laptopie z jednym kontem to drobiazg, ale kosztuje sekundę. Nie rozwiązuje problemu kluczy zapisanych otwartym tekstem: złośliwy kod działa jako Ty i czyta je tak samo.",
    },
    {
      title: "Najpierw zmień klucze, potem wyczyść historię",
      finding: "J.* · secrets in history and agent sessions",
      why: "Klucze wklejone kiedyś do rozmowy z agentem albo do terminala leżą w plikach historii. Złośliwy skrypt przeszukuje je w kilka sekund.",
      do: [
        { p: "Otwórz `secrets-inventory.md`. Każdy wiersz ma typ klucza, usługę, miejsce zmiany i odcisk (pierwsze i ostatnie 4 znaki), po którym znajdziesz klucz w panelu dostawcy." },
        { p: "Odsiej atrapy: `AKIA…MPLE` to przykład z dokumentacji AWS, `ghp_…1234` to zwykle token z testów, adresy baz na localhost nie są wyciekiem." },
        { p: "Kolejność rotacji: pieniądze i produkcja (Stripe live, chmura), dostęp do kodu (GitHub, GitLab), klucze AI, za które płacisz, potem reszta." },
        { p: "Nowych kluczy nie wklejaj do rozmowy z agentem, bo trafią do historii tak jak stare. Wpisz je sam do pliku albo menedżera haseł." },
        { p: "Dopiero po rotacji wyczyść historię. Zamknij sesje agentów, obejrzyj podgląd, potem zamaż:" },
        { cmd: "bash ai-agent-audit/scripts/purge-secrets.sh" },
        { cmd: "bash ai-agent-audit/scripts/purge-secrets.sh --purge" },
      ],
      check: "bash ai-agent-audit/scripts/run-audit.sh --modules J   # sekretów w historii powinno być wyraźnie mniej",
      trap: "Czyszczenie bez rotacji nic nie daje: historia mogła być już skopiowana, a treść rozmów trafiła wcześniej do dostawcy modelu. Kopie oryginałów w `~/.ai-agent-audit/purge-backups/` zawierają sekrety; usuń je po sprawdzeniu.",
    },
    {
      title: "Piaskownica dla agenta i ostrożność z obcymi repozytoriami",
      finding: "B.* · K.2 · bypass modes, repo-level hooks",
      why: "Poprzednie kroki ograniczają szkody. Ten zmniejsza szansę, że obcy kod w ogóle zadziała z Twoimi uprawnieniami.",
      do: [
        { p: "W Claude Code komenda `/sandbox` włącza piaskownicę dla poleceń Basha: zapis tylko w katalogu projektu, sieć tylko do dozwolonych domen. Na Linuksie potrzebne są pakiety bubblewrap i socat:" },
        { cmd: "sudo apt-get install bubblewrap socat" },
        { p: "Ważne: domyślnie piaskownica nie blokuje odczytu, więc agent nadal widzi `~/.ssh` i `~/.aws`. Dopisz katalogi z kluczami do `sandbox.filesystem.denyRead` w ustawieniach (opis w dokumentacji Claude Code: `https://code.claude.com/docs/en/sandboxing`)." },
        { p: "Serwery MCP i hooki działają poza piaskownicą. Dlatego przypięte wersje MCP (krok 3) to osobny krok." },
        { p: "Zanim otworzysz agenta w sklonowanym repozytorium, zajrzyj do `.claude/settings.json`, `.mcp.json` i `CLAUDE.md`. Do naprawdę obcego kodu użyj devcontainera albo osobnej maszyny wirtualnej." },
      ],
      check: "jq .sandbox ~/.claude/settings.json   # \"enabled\": true i Twoje katalogi w filesystem.denyRead",
      trap: "Piaskownica nie jest pełną izolacją. Szerokie domeny na liście dozwolonych (np. github.com) nadal pozwalają wysłać dane na zewnątrz.",
    },
    {
      title: "Firewall na ruch wychodzący",
      finding: "I.* · network egress",
      why: "Skrypt, który coś ukradł, musi to gdzieś wysłać. Firewall aplikacyjny pyta o każde nowe połączenie wychodzące i pozwala odmówić.",
      do: [
        { p: "Linux: OpenSnitch. macOS: LuLu (darmowy, open source) albo Little Snitch. Przez pierwsze dni zatwierdzasz połączenia programów, których używasz; potem pytań jest mało." },
        { p: "Linux (Debian, Ubuntu): pobierz `opensnitch_*_amd64.deb` i `python3-opensnitch-ui_*_all.deb` ze strony github.com/evilsocket/opensnitch/releases, potem w tym samym katalogu:" },
        { cmd: "sudo apt install ./opensnitch_*_amd64.deb ./python3-opensnitch-ui_*_all.deb" },
        { p: "macOS:" },
        { cmd: "brew install --cask lulu" },
      ],
      check: "systemctl is-active opensnitch   # active (na macOS: ikona LuLu na pasku menu)",
      trap: "Nie złapie wysyłki przez serwery, którym ufasz, np. github.com z Twoim tokenem. Tak działał Shai-Hulud. Dlatego krok 2 jest wcześniej.",
    },
    {
      title: "Grupa docker i sudo bez hasła",
      finding: "F.docker · F.sudo.nopasswd",
      why: "Członkostwo w grupie docker daje w praktyce roota bez hasła: każdy Twój proces może uruchomić kontener z zamontowanym całym dyskiem. `NOPASSWD: ALL` w sudoers robi to samo wprost.",
      do: [
        { p: "Jeśli nie potrzebujesz dockera bez sudo, wypisz się z grupy (zadziała po ponownym zalogowaniu). Alternatywa: rootless Docker albo Podman." },
        { cmd: "sudo gpasswd -d $USER docker" },
        { p: "Wpis `NOPASSWD: ALL` usuń przez:" },
        { cmd: "sudo visudo" },
      ],
      check: "id -nG | grep -w docker   # nic",
      trap: "Zanim wyjdziesz z grupy docker, sprawdź, czy nie korzysta z niej jakieś narzędzie uruchamiane automatycznie (np. lokalne bazy w docker compose).",
    },
  ],
  outro: {
    h2: "Na koniec",
    p: [
      "Uruchom audyt jeszcze raz i porównaj `action-plan.md` z poprzednim. Zostały w nim rzeczy świadomie zaakceptowane albo do zrobienia później.",
      "Gdy pojawi się nowy atak na łańcuch dostaw, dostaniesz krótki mail z komendą, która sprawdzi, czy Cię dotyczy. Nic poza tym.",
    ],
  },
};

const en: Guide = {
  title: "Fixing what the audit found · ai-agent-audit",
  description: "Eight steps, most important first: what to do with an ai-agent-audit result.",
  h1: "Fixing what the audit found",
  intro: [
    "Eight steps in the order worth doing them: first what gives an attacker the most, then the ways in. Every step has the command, how to check it worked, and the trap that is easy to fall into.",
    "Skip steps your report did not flag. The finding code in brackets (e.g. A.1) is the one in `action-plan.md`. Commands are for Linux and macOS.",
  ],
  labels: { finding: "Finding", check: "Check", trap: "Trap", toc: "Steps" },
  steps: [
    {
      title: "A passphrase on your SSH keys",
      finding: "A.1 · SSH private key has NO passphrase",
      why: "A key without a passphrase is a file anyone can copy to log in to your servers. With a passphrase, a copied file is useless.",
      do: [
        { p: "First check whether anything uses the key unattended (cron, timers, deploy scripts). A key with a passphrase stops working in automation." },
        { cmd: "crontab -l; systemctl --user list-timers" },
        { p: "Add the passphrase. It asks for the old one (press Enter if there was none), then twice for the new one:" },
        { cmd: "ssh-keygen -p -f ~/.ssh/id_ed25519" },
        { p: "So you don't type it on every connection, let ssh-agent remember the key after first use. Add at the end of `~/.ssh/config`:" },
        { file: "~/.ssh/config", body: "Host *\n  AddKeysToAgent yes" },
        { p: "Better still: a FIDO2 hardware key (e.g. a YubiKey). The private key never leaves the device and every use needs a touch. Needs OpenSSH 8.2 or newer; if your key does not support `ed25519-sk`, use `ecdsa-sk`." },
        { cmd: "ssh-keygen -t ed25519-sk" },
      ],
      check: "ssh-keygen -y -P '' -f ~/.ssh/id_ed25519   # must fail: incorrect passphrase",
      trap: "Store the passphrase in a password manager. A key whose passphrase you forget is useless to you too.",
    },
    {
      title: "Tokens that can publish",
      finding: "A.3 · npm auth token · A.7 · GitHub CLI token has powerful scopes",
      why: "An npm or GitHub token lets someone publish an infected package in your name. That is how npm worms jump from one machine to more projects.",
      do: [
        { p: "npm: unless you publish every week, log out. The token leaves `~/.npmrc`; log in briefly, with 2FA, when you publish." },
        { cmd: "npm whoami && npm logout" },
        { p: "GitHub CLI: see which scopes the token has and drop the ones you don't use (example below, use your own):" },
        { cmd: "gh auth status" },
        { cmd: "gh auth refresh --remove-scopes delete_repo,admin:org" },
      ],
      check: "grep -c _authToken ~/.npmrc   # 0 or no file",
      trap: "The same token often sits in `~/.bashrc` or `~/.zshrc` as `export GH_TOKEN=…` or `NPM_TOKEN=…`. Same problem, different place.",
    },
    {
      title: "Pinned MCP server versions",
      finding: "M.2 · MCP server launched via npx without pinned version",
      why: "`npx package@latest` downloads the newest release every time your agent starts. If someone takes over the author's account, your agent runs their code on the next start. A pinned version does not change.",
      do: [
        { p: "The report lists the exact files. Usually: `~/.claude.json` (including its projects sections), `~/.codex/config.toml`, the Claude Desktop config, `~/.cursor/mcp.json` and `.mcp.json` in repositories." },
        { p: "Pick a version older than about two weeks: infected releases are usually found and pulled within hours or days. Release dates:" },
        { cmd: "npm view chrome-devtools-mcp time --json | tail -5" },
        { p: "Replace `chrome-devtools-mcp@latest` (or the bare name without a version) with a specific one, e.g. `chrome-devtools-mcp@1.10.1`. For uvx: `package==1.2.3`." },
        { p: "Claude Code writes `~/.claude.json` itself, so close agent sessions before editing or make a copy. The copy holds the same keys: delete it once you have checked." },
        { p: "Same idea for your projects: pnpm 10.16+ has `minimumReleaseAge` in `pnpm-workspace.yaml` (in minutes, 1440 is one day). Newer npm versions have `min-release-age` (in days); check `npm help config` to see whether yours does." },
      ],
      check: "grep -n '@latest' ~/.claude.json ~/.codex/config.toml   # nothing",
      trap: "A pinned version never updates itself. Bump versions by hand once a month. The alerts tell you about pulled, infected releases.",
    },
    {
      title: "Permissions on files that hold keys",
      finding: "M.1.perm · MCP config readable by other users",
      why: "Agent configs hold API keys. Mode 644 or 664 lets other accounts on the machine read them.",
      do: [
        { p: "Make them readable by you only (skip files you don't have):" },
        { cmd: "chmod 600 ~/.claude.json ~/.codex/config.toml ~/.gemini/settings.json" },
      ],
      check: "ls -l ~/.claude.json   # -rw-------",
      trap: "On a single-user laptop this is minor, but it takes a second. It does not fix keys stored in plain text: malicious code runs as you and reads them anyway.",
    },
    {
      title: "Rotate keys first, then clean the history",
      finding: "J.* · secrets in history and agent sessions",
      why: "Keys you once pasted into an agent chat or a terminal sit in history files. A malicious script searches them in seconds.",
      do: [
        { p: "Open `secrets-inventory.md`. Each row has the key type, the service, where to rotate it, and a fingerprint (first and last 4 characters) to find the key in the provider's panel." },
        { p: "Drop the dummies: `AKIA…MPLE` is the AWS documentation example, `ghp_…1234` is usually a test token, database URLs on localhost are not leaks." },
        { p: "Rotation order: money and production (Stripe live, cloud), code access (GitHub, GitLab), AI keys you pay for, then the rest." },
        { p: "Don't paste new keys into an agent chat; they land in history just like the old ones. Type them into a file or a password manager yourself." },
        { p: "Only after rotating, clean the history. Close agent sessions, look at the preview, then redact:" },
        { cmd: "bash ai-agent-audit/scripts/purge-secrets.sh" },
        { cmd: "bash ai-agent-audit/scripts/purge-secrets.sh --purge" },
      ],
      check: "bash ai-agent-audit/scripts/run-audit.sh --modules J   # far fewer secrets left in history",
      trap: "Cleaning without rotating achieves nothing: the history may already be copied, and the chat content already went to the model provider. Backups in `~/.ai-agent-audit/purge-backups/` contain the secrets; delete them once you have checked.",
    },
    {
      title: "A sandbox for the agent, care with foreign repositories",
      finding: "B.* · K.2 · bypass modes, repo-level hooks",
      why: "The previous steps limit the damage. This one lowers the chance that foreign code runs with your permissions at all.",
      do: [
        { p: "In Claude Code, `/sandbox` turns on the sandbox for Bash commands: writes only inside the project, network only to allowed domains. On Linux it needs bubblewrap and socat:" },
        { cmd: "sudo apt-get install bubblewrap socat" },
        { p: "Important: by default the sandbox does not block reads, so the agent still sees `~/.ssh` and `~/.aws`. Add your key directories to `sandbox.filesystem.denyRead` in settings (see the Claude Code docs: `https://code.claude.com/docs/en/sandboxing`)." },
        { p: "MCP servers and hooks run outside the sandbox. That is why pinning MCP versions (step 3) is a separate step." },
        { p: "Before you open an agent in a cloned repository, look at `.claude/settings.json`, `.mcp.json` and `CLAUDE.md`. For truly foreign code use a devcontainer or a separate virtual machine." },
      ],
      check: "jq .sandbox ~/.claude/settings.json   # \"enabled\": true and your directories in filesystem.denyRead",
      trap: "The sandbox is not full isolation. Broad allowed domains (e.g. github.com) still let data out.",
    },
    {
      title: "An outbound firewall",
      finding: "I.* · network egress",
      why: "A script that stole something has to send it somewhere. An application firewall asks about every new outbound connection and lets you refuse.",
      do: [
        { p: "Linux: OpenSnitch. macOS: LuLu (free, open source) or Little Snitch. For the first few days you approve the programs you use; after that it rarely asks." },
        { p: "Linux (Debian, Ubuntu): download `opensnitch_*_amd64.deb` and `python3-opensnitch-ui_*_all.deb` from github.com/evilsocket/opensnitch/releases, then in that directory:" },
        { cmd: "sudo apt install ./opensnitch_*_amd64.deb ./python3-opensnitch-ui_*_all.deb" },
        { p: "macOS:" },
        { cmd: "brew install --cask lulu" },
      ],
      check: "systemctl is-active opensnitch   # active (on macOS: the LuLu icon in the menu bar)",
      trap: "It will not catch exfiltration through servers you trust, such as github.com with your token. That is how Shai-Hulud worked, which is why step 2 comes first.",
    },
    {
      title: "The docker group and passwordless sudo",
      finding: "F.docker · F.sudo.nopasswd",
      why: "Being in the docker group is root without a password in practice: any of your processes can start a container with the whole disk mounted. `NOPASSWD: ALL` in sudoers does the same openly.",
      do: [
        { p: "If you don't need docker without sudo, leave the group (takes effect after you log in again). Alternatives: rootless Docker or Podman." },
        { cmd: "sudo gpasswd -d $USER docker" },
        { p: "Remove a `NOPASSWD: ALL` line with:" },
        { cmd: "sudo visudo" },
      ],
      check: "id -nG | grep -w docker   # nothing",
      trap: "Before leaving the docker group, check that nothing started automatically depends on it (e.g. local databases in docker compose).",
    },
  ],
  outro: {
    h2: "Finally",
    p: [
      "Run the audit again and compare `action-plan.md` with the previous one. What is left should be things you accepted on purpose or scheduled for later.",
      "When a new supply-chain attack appears, you get a short email with a command that tells you whether it affects you. Nothing else.",
    ],
  },
};

export const GUIDE = { pl, en };
