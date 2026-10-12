import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://local-security.devince.dev",
  trailingSlash: "always",
  vite: {
    // Emit every font as a file: inlined data: URIs would need a looser CSP (font-src data:).
    build: { assetsInlineLimit: 0 },
  },
});
