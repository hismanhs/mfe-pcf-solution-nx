# Free Deployment Guide (Demo Setup)

Three things can be hosted, and each has a free option. You don't need all
three for a demo — pick based on your audience (see "Which path for which
audience" at the end).

| What | Free host used here | Needs a card? | Needs Power Apps/Dataverse? |
|---|---|---|---|
| `mfe-transformation` (MFE 1) | Netlify | No | No |
| `mfe-compliance` (MFE 2) | Netlify | No | No |
| `pcf-control` (live, shareable link) | Cloudflare Quick Tunnel | No | No |
| `pcf-control` (running inside real Power Apps) | Power Apps Developer Plan | No | Yes (it creates one for you, free) |

---

## 1. Host both MFEs on Netlify (free, ~5 minutes, no account required for the simplest path)

Netlify's free tier covers static hosting with custom headers (needed for
CORS — see `netlify.toml` in each MFE's folder, already configured) with no
credit card and a generous free allowance for a demo's traffic level.

### Fastest: drag-and-drop, no CLI, no account

1. Build each MFE: `cd apps/mfe-transformation && npm run build` (repeat for
   `mfe-compliance`).
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag the `apps/mfe-transformation/dist` folder onto the page. Netlify
   gives you an instant public HTTPS URL (something like
   `https://random-name-123.netlify.app`).
4. Repeat for `apps/mfe-compliance/dist`.

**Caveat:** drag-and-drop deploys don't read `netlify.toml` (no build
config to attach it to), so CORS headers won't be applied this way. For a
same-machine local demo that's fine (browsers don't enforce CORS between
`localhost` and a public origin in the fetch-only direction some setups
allow — but don't rely on that). For a real demo, use the CLI path below,
which does apply `netlify.toml`.

### Recommended: CLI deploy (applies `netlify.toml`'s CORS headers)

```bash
npm install -g netlify-cli      # or use `npx netlify-cli` each time, no global install
netlify login                   # free account, no card

cd apps/mfe-transformation
npm run build
netlify deploy --prod --dir=dist

cd ../mfe-compliance
npm run build
netlify deploy --prod --dir=dist
```

Each `netlify deploy --prod` prints a `Website URL`. **Copy both down** —
you'll paste them into the control's `mfeUrl`/`mfeUrl2` properties in step 3.

Verify CORS actually applied before moving on:
```bash
curl -sI https://<your-mfe1-site>.netlify.app/manifest.json | grep -i access-control
```
You should see `access-control-allow-origin: *`. If you don't, re-deploy —
drag-and-drop was used somewhere instead of the CLI.

---

## 2. Get a free, shareable, live link to the control itself

This is the fastest path to something you can literally send someone as a
link for a demo call — no Power Apps account, no waiting on approvals.

```bash
cd apps/pcf-control
npm start                                  # test harness on localhost:8181

# in a second terminal, no signup needed:
cloudflared tunnel --url http://localhost:8181
```

([Install `cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
first if you don't have it — it's free and doesn't require a Cloudflare
account for this "quick tunnel" mode.) `cloudflared` prints a public
`https://<random-words>.trycloudflare.com` URL that proxies straight to your
local harness. Anyone with the link sees exactly what you see, live,
including the tab switching and data sharing — this **is** the actual demo,
not a recording of it.

Caveats, both worth knowing before a live call: the tunnel dies when you
close the terminal or your machine sleeps, and it's genuinely your local
machine doing the work, so your own network's upload speed is the ceiling.
Fine for a scheduled demo call; not something to leave running unattended.

---

## 3. (Optional, for a more "official" demo) Run it inside real Power Apps

Free, via Microsoft's [Power Apps Developer Plan](https://powerapps.microsoft.com/en-us/developerplan/) —
gives you a personal Dataverse environment at no cost, no credit card.

1. Sign up at the link above with a Microsoft account (a free outlook.com
   one works). It provisions a Dataverse developer environment for you
   automatically.
2. Install the [Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction)
   if you haven't already.
3. Build and package the control:
   ```bash
   cd apps/pcf-control
   npm run build
   pac auth create --url https://<yourorg>-dev.crm.dynamics.com
   pac pcf push --publisher-prefix demo
   ```
   (`pac pcf push` deploys straight into your dev environment — the fastest
   path for a demo; use a packaged solution import instead if you want
   something you can hand off/re-import elsewhere.)
4. In Power Apps, add the control to a table's field, form, or a canvas app
   screen, then set its properties (see step 3 below for the exact values).

---

## 4. Wire it together

Wherever you're running/viewing the control (local harness, tunneled link,
or real Power Apps), set:

| Property | Value |
|---|---|
| `mfeUrl` | Your MFE 1 Netlify URL, e.g. `https://your-mfe1-site.netlify.app/` |
| `mfeUrl2` | Your MFE 2 Netlify URL, e.g. `https://your-mfe2-site.netlify.app/` |

Everything else already has a working default (`remoteName`/`remoteName2`,
`exposedModule`/`exposedModule2`). Leave the New Relic properties blank
unless you specifically want telemetry wired up for the demo too.

---

## Which path for which audience

- **Quick internal check / dry run before a call:** local `npm start` for
  everything, no hosting needed at all (§1–2 skipped entirely).
- **A scheduled demo/sales call, sharing a live link:** §1 (Netlify for both
  MFEs — do this once, URLs are stable) + §2 (Cloudflare tunnel, started
  fresh right before the call).
- **"Show it running inside actual Power Apps" for a more technical or
  skeptical audience:** all of §1, §3, and §4.
