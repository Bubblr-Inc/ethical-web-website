# ethicalweb.ai — static site

A JSON/config-driven static site generator that replaces the old WordPress
install. No framework, no database, no build dependencies — just Node's
built-in APIs turning `content/*.json` into plain HTML, ready for GitHub
Pages.

## How it's put together

```
site.config.json        global nav, footer, logo, brand colour
content/*.json           one file per page — see "Adding a page" below
scripts/build.js         reads config + content, renders dist/
scripts/icons.js         inline SVG icon set, referenced by name from JSON
scripts/serve.js         zero-dependency local preview server
assets/                  images, css, js — copied into dist/assets verbatim
.github/workflows/deploy.yml   builds + deploys dist/ to GitHub Pages on every push to main
```

Running `npm run build` (or the CI workflow) deletes `dist/` and regenerates
it from scratch. **`dist/` is build output — don't hand-edit it and don't
need to commit it**; the GitHub Actions workflow builds it fresh on every
push.

## Adding a page

Drop a new file in `content/`, e.g. `content/careers.json`:

```json
{
  "slug": "careers",
  "navLabel": "Careers",
  "title": "Careers — Ethical Web AI",
  "description": "One sentence for search engines and social previews.",
  "blocks": [
    { "type": "pageHeading", "text": "Careers" },
    { "type": "richtext", "align": "center", "html": "<p>We're hiring.</p>" }
  ]
}
```

That's it — the build script picks up every `content/*.json` file
automatically. `slug` controls the URL (`careers` → `/careers/`, `""` → `/`).
Set `"nav": false` to keep a page out of the header nav (used by the privacy
policy and the 404 page); otherwise it's added using `navLabel` in the order
the nav is listed in `site.config.json`.

### Available blocks

| type | fields | use |
|---|---|---|
| `pageHeading` | `text` | the page's `<h1>`, banner style |
| `heading` | `text`, `background` (`"tint"` optional) | centered `<h2>` |
| `richtext` | `html`, `align`, `background` | free-form HTML (paragraphs, sub-headings, links) |
| `iconGrid` | `columns`, `items: [{icon, title, link?}]` | icon + short statement, grid layout |
| `cardGrid` | `items: [{image, alt, title, link, linkText, linkIcon}]` | image cards linking out (video/article roundups) |
| `columns` | `items: [{logo, logoAlt, heading, list}]` | side-by-side product columns with bullet lists |
| `iconList` | `align`, `items: [{icon?, text, link?}]` | plain bullet list with an icon per line |
| `videoHero` | `provider: "vimeo"`, `videoId`, `autoplay` | full-width responsive video embed |

Icons are referenced by name (`"icon": "check"`) — see the keys in
`scripts/icons.js`. Add a new one there (viewBox + SVG path) and it's usable
everywhere.

To add a whole new block type, add a renderer function to the
`blockRenderers` map in `scripts/build.js` and a matching CSS rule in
`assets/css/style.css` — existing pages are unaffected.

## Local preview

```bash
npm run build   # content/*.json -> dist/
npm run serve   # builds, then serves dist/ at http://localhost:4000
```

## Deploying

The included workflow (`.github/workflows/deploy.yml`) builds the site and
publishes `dist/` via GitHub's official Pages Actions on every push to
`main`. One-time setup in the repo:

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source → GitHub Actions**.
3. Push to `main` — the workflow builds and deploys automatically.

To keep the `ethicalweb.ai` custom domain, add `"customDomain": "ethicalweb.ai"`
to `site.config.json` (the build writes the `CNAME` file for you), and point
the domain's DNS at GitHub Pages per
[GitHub's custom-domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Content source

Page copy and images were ported from the WordPress export
(`generativeaiwithguardrailsforenterprise.WordPress.2026-07-03.xml`) for the
four published pages (Home, AI's Problems Solved, Our Products and Patents,
Investment and Exit plans) plus a rewritten Privacy Policy. Icons are inline
SVGs (Font Awesome Free paths, CC-BY-4.0) so the site has zero external
runtime dependencies apart from the Vimeo embed on the homepage.
