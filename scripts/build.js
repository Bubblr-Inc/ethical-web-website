#!/usr/bin/env node
// Static site generator for ethicalweb.ai.
//
// Content model: every file in /content/*.json is one page, made of an ordered
// list of "blocks" (heading, richtext, iconGrid, cardGrid, columns, iconList,
// videoHero, pageHeading). To add a page: drop a new JSON file in /content/,
// give it a unique "slug", and it is picked up automatically — no other code
// changes needed. Site-wide chrome (nav/footer/branding) lives in site.config.json.
'use strict';

const fs = require('fs');
const path = require('path');
const { renderIcon } = require('./icons');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const ASSETS_DIR = path.join(ROOT, 'assets');
const OUT_DIR = path.join(ROOT, 'dist');
const CONFIG_PATH = path.join(ROOT, 'site.config.json');

const site = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readPages() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8')));
}

function outPathFor(page) {
  if (page.slug === '' || page.slug === '/') return path.join(OUT_DIR, 'index.html');
  if (page.slug === '404') return path.join(OUT_DIR, '404.html');
  return path.join(OUT_DIR, page.slug, 'index.html');
}

function hrefFor(slug) {
  if (slug === '' || slug === '/') return '/';
  return `/${slug}/`;
}

// ---- block renderers -------------------------------------------------

function bgClass(bg) {
  if (bg === 'tint') return ' section--tint';
  return '';
}

function renderLinkedText(text, link) {
  if (!link) return escapeHtml(text);
  return `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
}

// Shared <li> markup for iconList and columns[].list — kept as one function
// so both blocks stay visually identical and only need one CSS rule set.
function renderIconListItem(item) {
  const text = renderLinkedText(item.text, item.link);
  return `<li><span class="icon-badge icon-badge--sm">${renderIcon(item.icon || 'check', 'icon-list__icon')}</span><span>${text}</span></li>`;
}

const blockRenderers = {
  pageHeading(block) {
    return `<section class="section section--page-heading"><div class="container"><span class="eyebrow">Ethical Web AI</span><h1>${escapeHtml(block.text)}</h1></div></section>`;
  },

  heading(block) {
    return `<section class="section section--flow${bgClass(block.background)}"><div class="container"><h2 class="heading">${escapeHtml(block.text)}</h2></div></section>`;
  },

  richtext(block) {
    const align = block.align ? ` align-${block.align}` : '';
    return `<section class="section section--flow${bgClass(block.background)}"><div class="container richtext${align}">${block.html}</div></section>`;
  },

  iconGrid(block) {
    const cols = block.columns || 3;
    const items = block.items
      .map((item) => {
        const title = renderLinkedText(item.title, item.link);
        return `<div class="icon-card"><span class="icon-badge">${renderIcon(item.icon, 'icon-card__icon')}</span><h3 class="icon-card__title">${title}</h3></div>`;
      })
      .join('');
    return `<section class="section${bgClass(block.background)}"><div class="container"><div class="icon-grid cols-${cols}">${items}</div></div></section>`;
  },

  cardGrid(block) {
    const items = block.items
      .map((item) => {
        return `<div class="card">
          <a class="card__media" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt || '')}" loading="lazy" width="640" height="360">
          </a>
          <h3 class="card__title">${escapeHtml(item.title)}</h3>
          <a class="card__link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${renderIcon(item.linkIcon || 'video', 'card__link-icon')}<span>${escapeHtml(item.linkText || 'Read more')}</span></a>
        </div>`;
      })
      .join('');
    return `<section class="section${bgClass(block.background)}"><div class="container"><div class="card-grid">${items}</div></div></section>`;
  },

  iconList(block) {
    const align = block.align ? ` align-${block.align}` : '';
    const items = block.items.map(renderIconListItem).join('');
    return `<section class="section section--flow${bgClass(block.background)}"><div class="container"><ul class="icon-list${align}">${items}</ul></div></section>`;
  },

  columns(block) {
    const cols = block.items
      .map((col) => {
        const logo = col.logo
          ? `<span class="col__logo-wrap"><img class="col__logo" src="${escapeHtml(col.logo)}" alt="${escapeHtml(col.logoAlt || '')}" loading="lazy"></span>`
          : '';
        const list = col.list.map(renderIconListItem).join('');
        return `<div class="col">${logo}<h2 class="col__heading">${escapeHtml(col.heading)}</h2><ul class="icon-list">${list}</ul></div>`;
      })
      .join('');
    return `<section class="section"><div class="container"><div class="columns cols-${block.items.length}">${cols}</div></div></section>`;
  },

  videoHero(block) {
    let src = '';
    if (block.provider === 'vimeo') {
      const params = new URLSearchParams({
        title: '0',
        byline: '0',
        portrait: '0',
        dnt: '1'
      });
      if (block.autoplay) {
        params.set('autoplay', '1');
        params.set('muted', '1');
        params.set('loop', '1');
      }
      src = `https://player.vimeo.com/video/${encodeURIComponent(block.videoId)}?${params.toString()}`;
    }
    return `<section class="hero">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="container">
        <div class="hero-video__frame">
          <iframe src="${src}" title="Ethical Web AI overview" loading="lazy"
            allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>
    </section>`;
  }
};

function renderBlock(block) {
  const renderer = blockRenderers[block.type];
  if (!renderer) {
    throw new Error(`Unknown block type "${block.type}" — add a renderer in scripts/build.js`);
  }
  return renderer(block);
}

// ---- page chrome -------------------------------------------------

function renderHeader(page) {
  const navItems = (site.nav || [])
    .map((item) => {
      const active = item.href === hrefFor(page.slug) ? ' is-active' : '';
      return `<a class="nav__link${active}" href="${item.href}">${escapeHtml(item.label)}</a>`;
    })
    .join('');
  return `<header class="site-header">
    <div class="container header__inner">
      <a href="/"><img src="${site.logo}" alt="${escapeHtml(site.logoAlt || site.siteName)}" width="160" height="45"></a>
      <button class="nav-toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
        ${renderIcon('grip-lines', 'nav-toggle__icon')}<span>Menu</span>
      </button>
      <nav class="site-nav" id="site-nav">${navItems}</nav>
    </div>
  </header>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  const text = (site.footer && site.footer.text || '').replace('{{year}}', year);
  const links = ((site.footer && site.footer.links) || [])
    .map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`)
    .join('');
  return `<footer class="site-footer">
    <div class="container footer__inner">
      <p>${escapeHtml(text)}</p>
      <nav class="footer-links">${links}</nav>
    </div>
  </footer>`;
}

function renderPage(page) {
  const body = page.blocks.map(renderBlock).join('\n');
  const canonical = `${site.siteUrl}${hrefFor(page.slug)}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description || '')}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="${site.favicon}">
<meta name="theme-color" content="${site.themeColor || '#000000'}">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description || '')}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
${renderHeader(page)}
<main>
${body}
</main>
${renderFooter()}
<script src="/assets/js/main.js"></script>
</body>
</html>
`;
}

// ---- copy helpers -------------------------------------------------

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ---- main -------------------------------------------------

function build() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pages = readPages();

  for (const page of pages) {
    const outPath = outPathFor(page);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, renderPage(page));
    console.log(`built ${path.relative(ROOT, outPath)}`);
  }

  copyDir(ASSETS_DIR, path.join(OUT_DIR, 'assets'));

  if (site.customDomain) {
    fs.writeFileSync(path.join(OUT_DIR, 'CNAME'), `${site.customDomain}\n`);
  }

  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

  console.log(`\nBuilt ${pages.length} page(s) to ${path.relative(ROOT, OUT_DIR)}/`);
}

build();
