# local-security-landing

The landing page for [ai-agent-audit](https://github.com/bartek-filipiuk/ai-agent-audit), served at
https://local-security.devince.dev in Polish (`/`) and English (`/en/`).

Static Astro site, no JavaScript, served by unprivileged nginx (see `Dockerfile`, `nginx.conf`).
All copy lives in `src/copy.ts` (landing) and `src/guide.ts` (the fix-it guide shown after signup);
components only render it. Text in `backticks` renders as `<code>`.

## Signup

The form posts to `https://devince.dev/api/newsletter/subscribe` with `source=local-security`
(or `local-security-en`). devince.dev picks the Brevo list and double opt-in template server-side,
sends the confirmation email, redirects to `/sprawdz-poczte/` (`/en/check-email/`), and after the
confirmation click to `/poradnik/` (`/en/guide/`). Those pages are `noindex`. The CSP allows that one
form target and nothing else.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # static output in dist/
docker build -t local-security-landing . && docker run -p 8080:8080 local-security-landing
```

Node 22.12+ (see `.nvmrc`). `pnpm-workspace.yaml` refuses package versions younger than one day.

## Licence

MIT
