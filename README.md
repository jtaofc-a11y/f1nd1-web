# F1ND1 website (apps/web)

The public marketing page — plain static files (no build step): `index.html`,
`assets/site.css`, `assets/i18n.js` (Slovak + English copy), `assets/site.js`
(language switch, the animated sky, GSAP scroll motion from cdnjs), `favicon.svg`.

- Colours and voice follow the app (CLAUDE.md §27 dark language, Aurélia gold;
  copy from `packages/i18n` landing strings). No prices (payments are closed),
  no legal text (lawyer), store / social / legal links are "coming soon".
- Published from a separate PUBLIC repository (`f1nd1-web`) to GitHub Pages,
  because this repository is private: `scripts/publish-web.ps1` copies only this
  folder there. Nothing else of the codebase is ever pushed to it.
- Preview locally: open `index.html` in a browser (`?lang=en` for English).
