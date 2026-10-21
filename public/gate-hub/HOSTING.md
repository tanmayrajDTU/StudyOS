# Hosting the Study Hub so it installs and works offline

The offline / "Add to Home Screen" feature (a PWA) only works when the site is opened over **https**
(or http://localhost). It does **not** work when you double-click `index.html` from a folder, because
browsers do not allow service workers on `file://` pages. Everything else (notes, quizzes, cheat sheets)
still works from a local folder.

## Easiest options (free)
- **Netlify Drop**: go to app.netlify.com/drop and drag this whole folder in. You get an https link.
- **GitHub Pages**: put all files in a repo, then Settings → Pages → deploy from the main branch.
- **Cloudflare Pages**: create a project and upload the folder.

Upload **all** files. There are no sub-folders: every file sits in one single directory, next to `sw.js` and the HTML files.

## Installing
1. Open the https link once while online. The home page shows "Saving everything for offline use…"
   and then "Installed & offline ✓" when the copy is complete.
2. Android / Chrome: use **Install app** on the home page (or the browser menu → Install app).
   iPhone / iPad (Safari): **Share → Add to Home Screen**.
3. Open it from the home-screen icon. It runs full screen and works with no internet.

## Updating after you change any file
Edit `VERSION` at the top of `sw.js` (for example `v18` → `v19`) **and** change the same name in the
`caches.open('gate2027-v17')` line in `index.html`. Installed copies refresh the next time they open the app
while online (they show the old version once, then the new one).

## Test locally
Run `python3 -m http.server 8000` in this folder and open http://localhost:8000
