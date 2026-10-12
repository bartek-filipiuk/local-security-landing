// Everything that is the same in both languages, in one place.
export const SITE = {
  name: "ai-agent-audit",
  url: "https://local-security.devince.dev",
  author: "Bartek Filipiuk",
  authorUrl: "https://devince.dev",
  repo: "https://github.com/bartek-filipiuk/ai-agent-audit",
  landingRepo: "https://github.com/bartek-filipiuk/local-security-landing",
  sibling: "https://security-audit.dev",
  clone: "git clone https://github.com/bartek-filipiuk/ai-agent-audit.git",
  run: "bash ai-agent-audit/scripts/run-audit.sh",
  runMac: '"$(brew --prefix)/bin/bash" ai-agent-audit/scripts/run-audit.sh',
  // Signup: devince.dev picks the Brevo list and DOI template from `source` and only
  // redirects to allow-listed origins (NEWSLETTER_REDIRECT_ORIGINS).
  signupAction: "https://devince.dev/api/newsletter/subscribe",
};

export type Lang = "pl" | "en";

export const ROUTES = {
  pl: { home: "/", checkEmail: "/sprawdz-poczte/", guide: "/poradnik/", privacy: "https://devince.dev/polityka-prywatnosci", source: "local-security" },
  en: { home: "/en/", checkEmail: "/en/check-email/", guide: "/en/guide/", privacy: "https://devince.dev/en/privacy", source: "local-security-en" },
} as const;
