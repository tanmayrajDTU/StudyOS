# GATE CSE 2027 — Prep Command Deck

## Structure
```
index.html                    → hub page (subject cards, countdown, links)
assets/site-nav.js             → shared top nav bar, injected on every page
subjects/digital-logic.html    → live
subjects/linear-algebra.html   → live
subjects/calculus.html         → live
subjects/aptitude.html         → live
subjects/analysis.html         → live (20-year PYQ trend analysis)
subjects/c-programming.html    → live
subjects/data-structures.html  → coming soon placeholder
subjects/algorithms.html       → coming soon placeholder
subjects/computer-organization.html → live
```

The old combined "C, Data Structures & Algorithms" subject has been split into three
separate subjects (`c-programming`, `data-structures`, `algorithms`) so each can be
filled in and go live independently. Each currently ships as a lightweight
"coming soon" page listing its planned syllabus coverage.

## Deploy (GitHub Pages — free, works great for this)
1. Create a new GitHub repo, e.g. `gate-prep`.
2. Push this whole folder as the repo root (`index.html` must sit at the repo root, not inside a subfolder).
3. Repo → Settings → Pages → Source: "Deploy from a branch" → branch `main`, folder `/ (root)`.
4. Your site goes live at `https://<username>.github.io/gate-prep/` within a minute or two.
5. Every time you `git push` a new subject page, the live site updates automatically.

Alternative: Vercel — `vercel deploy` from this folder, zero config needed since it's static HTML.

## Adding a new subject page
1. Copy `subjects/digital-logic.html` as a starting template (it already has the shared design tokens).
2. Write your notes content inside `.main` — reuse the existing CSS classes (`.hero`, `.sheet`, `.chip`, `.callout`, etc. — check the file for what's already styled).
3. At the top of `<body>`, add:
   ```html
   <script>window.SITE_NAV_CONFIG={current:'your-subject-id', base:'../'};</script>
   <script src="../assets/site-nav.js"></script>
   ```
4. Register it in `assets/site-nav.js` — add a line to the `SUBJECTS` array:
   ```js
   { id: 'your-subject-id', label: 'Your Subject', href: base + 'subjects/your-subject.html', status: 'live' }
   ```
5. In `index.html`, flip the matching card from `class="card soon"` (plain div) to
   `<a class="card live" href="subjects/your-subject.html">` and update its status badge to `s-live`.

## Design system (for consistency across new pages)
- Palette: `--bg:#0a1c2c` `--panel:#0f2438` `--cyan:#5ad1e6` `--amber:#f2a65a` `--coral:#ff8272` `--mint:#6fe6b8` `--text:#e7f1f5`
- Fonts: Space Grotesk (headings), IBM Plex Sans (body), IBM Plex Mono (data/labels/nav)
- Background: faint cyan grid pattern on deep navy (see any page's `body{background:...}`)
