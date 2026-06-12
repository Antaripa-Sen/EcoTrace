# 🌿 TerraVerde — Final README

TerraVerde is a client-side, hackathon-ready web app that helps individuals measure, track, and reduce their carbon footprints. It ships as a static frontend (HTML/CSS/JS) with lightweight, interactive visuals and local demo data so you can run and demo it instantly.

## Quick start

Run locally (recommended: use a simple static server to avoid any path issues):

```bash
# from the project root
npx serve .
# or, if using VS Code: Live Server -> Open with Live Server
```

Then open `http://localhost:5000` (port may vary) and navigate the landing page and dashboard.

If you prefer file preview, double-click `index.html` — but a dev server gives consistent asset paths.

## Changes & Notes (final polish)
- Background assets: `hero_bg.png` and `dashboard_bg.png` are used as decorative textures. CSS now uses explicit relative paths (`./hero_bg.png`, `./dashboard_bg.png`) and places them behind UI layers. If you still don't see them, do a hard-refresh (Cmd+Shift+R) or run via a static server.
- Background visibility: Opacity and overlay levels were tuned so the hero and dashboard visuals are more visible while keeping contrast for legibility.
- Hero counters: Numeric targets were added to the hero counters to prevent `NaN` renderings when demo data is missing.
- Settings: The Settings email input now binds to the stored `tv_user.email` so the entered signup email is visible in the dashboard settings.

## Features

- Landing page: animated particle background and a rotating canvas globe.
- Demo stats: animated counters and floating demo cards driven from `localStorage` (`tv_demo_user`).
- Dashboard SPA: Chart.js visualizations, activity feed, community mock data, and settings persistence (`tv_user`, `tv_user_image`, `tv_theme`).
- Avatar upload: Upload an avatar in Settings — stored as a base64 data URL and displayed across the UI.
- Local-first: All user/demo data persists to `localStorage` for quick demos and offline testing.

## File overview

Key files:

- `index.html` — landing and hero visuals
- `dashboard.html` — main SPA dashboard
- `signup.html` / `onboarding.html` — signup flow and onboarding
- `styles.css` — theme variables, layout, background rules
- `app.js` — landing scripts, particle & globe canvases, hero stats
- `dashboard.js` — charts, actions, community data, settings

## Troubleshooting

- Missing background images: ensure `hero_bg.png` and `dashboard_bg.png` exist at the project root. If using a custom server root, update CSS URLs accordingly.
- Still seeing `NaN` in hero counters: verify `localStorage.tv_all_users` exists or let the landing page use fallback demo targets (already added to `index.html`).
- Signup email not showing: after signup/onboarding the dashboard reads `tv_user` — if the email isn't present, check for console errors or that `signup.html` completed storing `tv_user` before redirect.

## Want me to…

- Wire hero counters to update immediately when a new user signs up (append to `tv_all_users`)?
- Embed a small inline base64 fallback image so backgrounds always show even under unusual server setups?

If you want either, tell me which and I'll implement it now.

---

© TerraVerde — demo build
