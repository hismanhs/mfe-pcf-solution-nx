# SWIFT Modernization Demo — PCF + Nx Monorepo + React MFEs

A **virtual PCF control** (using the React/Fluent *platform library* pattern from
[Microsoft's blog post](https://www.microsoft.com/en-us/power-platform/blog/power-apps/virtual-code-components-for-power-apps-using-react-and-fluent-ui-react-platform-libraries/))
that hosts **two independently-deployable React micro-frontends (MFEs)** via
Webpack Module Federation, behind a clickable **tab header** — one tab per MFE —
with an explicit runtime **version-compatibility gate** in front of each, a
genuine **two-way shared value** (backed by RxJS) that the host and both MFEs
can all read and write and which **survives switching tabs**, and optional
**New Relic** telemetry. Orchestrated as an **Nx monorepo**.

The two MFEs are deliberately themed around SWIFT/ISO 20022 modernization
(Message Transformation, Compliance Validation — the same categories of
capability described at
[prowidesoftware.com/solutions/swift-modernization](https://www.prowidesoftware.com/solutions/swift-modernization))
as a demo of the *architecture pattern* — composable, independently-deployable
UI modules sharing live data through one host — applied to that domain. **The
widgets are illustrative demos with mocked data, not certified SWIFT/ISO 20022
translation or validation logic** — see the disclaimer rendered in each
widget itself.

```
mfe-pcf-solution/                (npm workspace root: apps/mfe-transformation + apps/mfe-compliance;
│                                  apps/pcf-control deliberately excluded -- see "Nx monorepo" below)
├── nx.json, package.json         Nx workspace config; `nx run-many -t build` builds all three
├── apps/pcf-control/            PCF virtual control (the "host")
│   └── MfeHostControl/
│       ├── ControlManifest.Input.xml   declares React 16.14.0 / Fluent 8.29.0 platform libs,
│       │                               mfeUrl/mfeUrl2 config, bound "sharedValue" property,
│       │                               optional newRelicAccountId/LicenseKey/ApplicationId
│       ├── index.ts                    PCF ReactControl lifecycle; owns the RxJS
│       │                               BehaviorSubject + event bus; wires sharedValue's
│       │                               notifyOutputChanged <-> getOutputs round trip
│       ├── components/App.tsx          orchestrates both remotes, the tab header, and the shared value
│       ├── components/TabHeader.tsx    clickable header switching which MFE is visible
│       ├── components/RemoteSlot.tsx   one remote's load/status/error/render, reused x2, always mounted
│       ├── components/SharedValuePanel.tsx  host's own editable view of the shared value
│       ├── components/ErrorBoundary.tsx
│       ├── components/StatusPanel.tsx  loading / mismatch / error UI
│       ├── hooks/useMfe.ts             load-one-remote hook, used once per MFE
│       ├── hooks/useRxValue.ts         bridges an RxJS BehaviorSubject to React state
│       └── services/
│           ├── mfeLoader.ts            fetch manifest → compat check → load remote
│           ├── versionCheck.ts         dependency-free semver range matcher
│           ├── federationRuntime.ts    consumes a remote via @module-federation/runtime
│           ├── eventBus.ts             per-instance RxJS Subject<AppEvent> event bus
│           ├── telemetry.ts            New Relic MicroAgent wrapper, no-ops if unconfigured
│           └── types.ts
├── apps/mfe-transformation/     MFE 1 -- "Message Transformation" (MT ↔ MX demo), container swift_transformation_mfe
│   ├── netlify.toml              CORS headers for free hosting (see DEPLOYMENT.md)
│   ├── webpack.config.js         ModuleFederationPlugin, exposes "./Widget", shares react singleton
│   ├── scripts/write-manifest.js writes manifest.json from package.json
│   └── src/App.tsx               reads/writes `sharedValue` as the message reference
├── apps/mfe-compliance/         MFE 2 -- "Compliance Validation" demo, container swift_compliance_mfe,
│   │                             same shape as mfe-transformation, different port (4002)
│   ├── netlify.toml
│   └── src/App.tsx               also reads/writes the SAME `sharedValue`
├── DEPLOYMENT.md                 free hosting steps (Netlify + Cloudflare Tunnel + Power Apps Developer Plan)
├── PROJECT_DOCUMENTATION.md      full setup + every configuration attribute, in one reference doc
└── scripts/build-all.sh
```

## Nx monorepo

`nx run-many -t build` builds all three projects (with real caching — a
repeat run with no changes reads from cache instead of re-running); `nx
run-many -t start -p mfe-transformation mfe-compliance --parallel=2` starts
both MFEs' dev servers together. Nx wraps each project's *existing* npm
scripts (`nx:run-commands` executor) rather than replacing their toolchains
— `pcf-scripts`/webpack still do the actual building exactly as they did
before Nx was introduced; Nx adds orchestration and caching on top.

**Deliberately not a full npm workspace.** The root `package.json`'s
`workspaces` array lists only `apps/mfe-transformation` and
`apps/mfe-compliance` — `apps/pcf-control` is excluded, and has to
`npm install` its own dependencies separately. This was discovered, not
assumed: an npm-workspaces-hoisted `node_modules` broke `pcf-scripts
start`, which spawns `pcf-start` via a path that assumes a *local*,
non-hoisted `node_modules` sits right next to it. Since `pcf-scripts`'
`build` target worked fine hoisted (it doesn't shell out to a sibling
package the same way), only `start` was affected — caught by actually
running `npm start` after the restructure, not just `npm run build`.
Excluding `pcf-control` from the workspace while still wrapping it in Nx's
project graph fixes this cleanly: `nx run-many -t build` still builds all
three, but each manages its own dependency tree the way its own tooling
expects.

`apps/pcf-control/tsconfig.json`'s `extends` is also written as
`"pcf-scripts/tsconfig_base.json"` (a bare package-name specifier resolved
via Node's upward `node_modules` search) rather than a relative path like
`"./node_modules/pcf-scripts/tsconfig_base.json"` — the bare form resolves
correctly regardless of hoisting depth, so it keeps working whether
`pcf-scripts` ends up local or hoisted.

## Why this shape

- **Virtual control, not standard control** — per the linked article, the control
  never bundles its own React/ReactDOM/Fluent. It declares `<platform-library>`
  entries in the manifest and the Power Apps runtime injects the shared copies.
  That keeps the host control's bundle tiny.
- **The MFE is a completely separate, independently deployable project.** It's
  built with Module Federation so it can be updated/redeployed without
  touching, rebuilding, or re-importing the PCF solution.
- **Version safety is explicit, not assumed.** Two independent layers:
  1. **Manifest gate (authoritative):** before any remote code executes, the
     host fetches `manifest.json` next to the remote's bundle and compares
     `reactVersion` / `compatibleHostVersion` against what's actually running,
     using `services/versionCheck.ts`. If it fails, the control renders a
     diagnostic panel instead of the remote — it never silently loads
     incompatible code. Overridable per-instance via the `allowVersionMismatch`
     input property (off by default).
  2. **Module Federation shared scope (defense in depth):** the host uses
     `@module-federation/runtime` to declare its own `react` instance (the
     platform-provided one) as a `singleton` share, and the remote's
     `webpack.config.js` declares `react`/`react-dom` as
     `singleton: true, strictVersion: false`. Even if the manifest check is
     bypassed, the federation runtime reuses the host's already-loaded React
     instead of loading a second copy and silently breaking hooks/context.
     Verified for real: the remote's `useState` counter correctly persists
     across clicks when rendered inside the host, which only works if hooks
     are running against the same React instance on both sides.
- **Two remotes are loaded and tracked completely independently.** `useMfe`
  (a hook) and `RemoteSlot` (a component) encapsulate one remote's
  load/version-check/error/retry lifecycle; `App.tsx` uses each twice, once
  per MFE, with zero shared state between the two loaders themselves. A
  failure, crash, or version mismatch in MFE 1 has no effect on MFE 2 or the
  host, and vice versa.

## Data sharing: MFE 1 ↔ MFE 2 ↔ PCF host

One value — `sharedValue`, used here as a SWIFT message reference (field
20 / MsgId) — is readable and writable from all three places: the host's
own `SharedValuePanel`, MFE 1's widget ("Message Transformation"), and MFE
2's widget ("Compliance Validation"). Typing in any one of them updates the
other two immediately, **including when the other one is on a hidden tab.**
This is not a simulated or polling-based sync; it works because of three
things that are all actually true in this architecture, not just asserted:

1. **The host, MFE 1, and MFE 2 all run in one JavaScript runtime, sharing
   one React instance.** `App.tsx` passes the same `sharedValue` string and
   the same `onSharedValueChange` callback down as props to
   `SharedValuePanel` and to both `RemoteSlot`s (which forward them into
   each remote's props). This only works because MFE 1, MFE 2, and the host
   all resolve `react` to the *same* singleton instance (see "Version
   safety" above) — with two different React copies, calling the setter
   from one MFE would not re-render the other.

2. **An RxJS `BehaviorSubject<string>` (`index.ts`'s `sharedValueSubject`),
   not host-local `useState`, is the actual source of truth.** `useRxValue`
   (a small hook, `hooks/useRxValue.ts`) subscribes `App.tsx`'s React state
   to it. Because `Subject.next()` invokes every subscriber synchronously,
   calling the setter from any of the three UIs updates the other two in
   the same tick — no polling, and critically, no dependency on the slower
   async PCF round trip below for propagation between the three UIs. A
   `Subject<AppEvent>` (`services/eventBus.ts`) plays the same role for a
   second concern: `RemoteSlot` and `App` push load/crash/value-change
   events into it, and `services/telemetry.ts` subscribes to report them to
   New Relic — producers and consumers of "things happened" are decoupled
   through the bus rather than threading a growing pile of callback props
   through every layer for each new consumer.

3. **`sharedValue` is *also* a real, bound PCF property**, kept in sync with
   the subject, not merely host-local state that happens to be shared with
   the remotes. `index.ts` wires the standard PCF two-way-binding contract
   as a second, independent path: whenever the subject changes,
   `index.ts`'s subscription calls `notifyOutputChanged()` → the platform
   calls `getOutputs()` → for a real bound field, the platform commits that
   value to whatever data source `sharedValue` is bound to (a Dataverse
   text column, a canvas app variable) → the platform calls `updateView()`
   again with the new value in `context.parameters.sharedValue.raw` →
   `App.tsx` reconciles that back into the subject (in a `useEffect`, see
   below). Leave `sharedValue` unbound and you still get in-session sharing
   between the host and both MFEs via the subject alone; bind it and you
   also get persistence, exactly like any other bound PCF field.

**The tab header (`TabHeader.tsx`) only toggles visibility, never mounting.**
`App.tsx` renders *both* `RemoteSlot`s unconditionally, each wrapped in a
plain `<div style={{ display: active === X ? "block" : "none" }}>`. Clicking
a tab never unmounts the other MFE — it's a CSS-only hide. This is why data
sharing demonstrably survives a tab switch (see the verified example below):
the hidden MFE hasn't gone anywhere, hasn't lost its Module Federation load
state, and hasn't stopped listening to the shared subject; it's simply not
painted to the screen. Unmounting on every switch was considered and
rejected — it would force a full manifest re-fetch and remote reload every
time you switched back, which is both slower and a worse demo (it would look
like the tabs don't share state, when really they'd just be re-initializing).

**Two real bugs surfaced while wiring this up, both fixed and verified, not
just patched over:**

- **Dropped characters when typing fast.** An earlier version had each
  widget render the PCF bound-property value directly as its controlled
  input's value. That value only updates after the
  `notifyOutputChanged → getOutputs → updateView` round trip completes,
  which is not guaranteed to be faster than keystrokes, so a stale
  re-render landing mid-typing visibly reverted/dropped characters. Once
  the RxJS subject became the thing each UI actually renders (synchronous,
  same-tick propagation for same-session edits), this was fixed at the
  root — not patched with a local buffer — and the local-buffer code was
  *removed* from all three widgets as unnecessary complexity.

- **React warning: "Cannot update a component while rendering a different
  component."** Reconciling an external platform value into the subject
  was originally done directly inside `index.ts`'s `updateView()`. That
  method runs *during* the platform's own render pass, so calling
  `subject.next()` there synchronously fired the already-mounted `App`
  component's `setState` while a different component (the platform's host
  root) was still mid-render — exactly the situation React warns about.
  Fixed by moving that reconciliation into a `useEffect` inside `App.tsx`
  instead (runs after the commit phase completes), leaving `index.ts` to
  only ever do a plain, side-effect-free field assignment during render.

Verified for real, not just by inspection: typing `"typed-in-MFE2"` into MFE
2's own input correctly appeared, character-for-character, in MFE 1's input,
the host panel, and the test harness's own "Data Outputs" panel (proving the
`getOutputs()` call genuinely fires) — and separately, typing into the host
panel correctly propagated into MFE 1. Both checks were re-run after the
React-warning fix above to confirm it didn't regress the sync itself.

## Telemetry: New Relic

`services/telemetry.ts` reports three kinds of events (`mfe_load`,
`widget_crash`, `shared_value_change` — the same `AppEvent` union the RxJS
event bus carries) to New Relic, via the real, officially published
[`@newrelic/browser-agent`](https://www.npmjs.com/package/@newrelic/browser-agent)
npm package — bundled directly into the control, not loaded from New
Relic's CDN as a `<script>` tag. A PCF control has no way to inject a script
into the page's `<head>` even if it wanted to (it only ever returns a React
element), and depending on some *other* script having already set
`window.newrelic` would be fragile and specific to whatever environment
happens to already have one loaded. Bundling the agent instance makes the
control self-contained.

**Entirely optional, and safe by construction.** Three new input properties
— `New Relic Account ID`, `New Relic License Key`, `New Relic Application
ID` — default to empty. `initTelemetry()` only activates if all three are
set; otherwise `reportEvent()` is a silent no-op, checked and verified: the
test harness (where none of these are set) produces zero telemetry-related
console output, and setting all three to dummy values produces zero
JavaScript exceptions even though the resulting network calls to New
Relic's real ingest servers can't succeed from a sandboxed test environment.
Every call in `telemetry.ts` is additionally wrapped in try/catch — a
telemetry misconfiguration must never be able to break the control itself.

**`MicroAgent`, not the full `BrowserAgent` loader — a real bundle-size bug,
caught and fixed.** The first working version used
`@newrelic/browser-agent/loaders/browser-agent`'s `BrowserAgent` class, the
one shown first in New Relic's own docs. It compiled and worked, but pushed
this control's production bundle from 288 KiB to **2.17 MiB** — `BrowserAgent`
pulls in `@newrelic/rrweb` for session replay recording (over 1 MiB alone)
*unconditionally*, regardless of whether session replay is enabled in its
`init` config; disabling a feature there is a runtime toggle, not a
build-time exclusion. Measuring
[`MicroAgent`](https://www.npmjs.com/package/@newrelic/browser-agent) (a
second loader New Relic ships specifically for "capturing data in a
controlled manner via the API interfaces," which their own docs call out as
fitting "specialized use cases, such as segmented UI designs (e.g., the
micro frontend pattern)") in isolation showed it and its dependencies total
around 113 KiB — `telemetry.ts` uses this instead, and the control's
production bundle is back to 288 KiB. (New Relic's docs currently flag this
loader strategy as slated for eventual deprecation in favor of a future
"centralized agent instance" approach; `MicroAgent` is still the correct,
smallest, currently-supported choice for this control's actual needs —
manual `noticeError`/`addPageAction` calls only, no automatic page/session
instrumentation a small embedded control shouldn't be doing anyway.)

To wire it up for real: create a Browser app in New Relic, copy the
`accountID`, `licenseKey`, and `applicationID` values from its "Copy/Paste
JavaScript" settings page into this control's three New Relic properties.
Load statuses, crashes, and shared-value edits (tagged with which of the
three UIs made the edit) will then show up as Page Actions and, for errors,
noticed JavaScript errors, in that Browser app.

## 1. Build both MFEs

```bash
cd apps/mfe-transformation
npm install
npm run build          # webpack --mode production && write-manifest.js

cd ../mfe-compliance
npm install
npm run build
```

Output in `apps/mfe-transformation/dist/` (and identically in `apps/mfe-compliance/dist/`):
- `remoteEntry.js` — the Module Federation container
- `manifest.json` — `{ name, version, reactVersion, compatibleHostVersion, remoteEntry, buildTime, ... }`
- hashed chunk files

Host **each `dist/` folder separately** at a stable, CORS-enabled HTTPS URL
(Azure Static Web Apps, an Azure Storage static website, a CDN, an S3 bucket
+ CloudFront, etc.) — they're independent deployables with independent
URLs, versions, and release cadences. The URLs are what you'll put in the
PCF control's `mfeUrl` / `mfeUrl2` properties, e.g.
`https://cdn.contoso.com/apps/mfe-transformation/1.0.0/` and
`https://cdn.contoso.com/apps/mfe-compliance/1.0.0/`.

> Version your hosting paths (`/1.0.0/`, `/1.1.0/`, …) rather than
> overwriting `latest/` in place — that's what lets you roll a Power Apps
> maker's MFE pointer forward deliberately and roll back instantly by
> repointing the URL, independently for each MFE.

To iterate on either widget without a Power Apps environment:
```bash
cd apps/mfe-transformation && npm start    # webpack-dev-server on :4001, opens the widget standalone
cd apps/mfe-compliance && npm start   # webpack-dev-server on :4002, opens the widget standalone
```
Both `npm start` scripts write a dev-mode `manifest.json` into `public/`
automatically first (see the Troubleshooting table below for why that step
exists), so the PCF host can load them immediately in dev mode too.

## 2. Build & run the PCF control

```bash
cd apps/pcf-control
npm install
npm start           # pcf-scripts test harness at http://localhost:8181
```

The test harness renders the platform's React/Fluent exactly like a real
model-driven/canvas app would, so this is a faithful local test of the whole
load → version-check → render → data-share flow. In the harness's **Data
Inputs** panel, set:
- `mfeUrl` → `http://localhost:4001/` (MFE 1, if its dev server is running)
- `mfeUrl2` → `http://localhost:4002/` (MFE 2, if its dev server is running)
- `sharedValue` → anything, or leave it — it'll sync live from any of the
  three UIs once both MFEs are loaded


## 3. Package & deploy to Dataverse

This repo ships the control's source, not a pre-built Dataverse solution,
because solution packaging is environment/publisher-specific. From
`apps/pcf-control/`, with the [Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction) installed:

```bash
npm run build                              # pcf-scripts build (production bundle)
pac solution init --publisher-name <pub> --publisher-prefix <prefix>
pac solution add-reference --path .
msbuild /t:build /restore                  # or: pac solution pack, per your CI
pac auth create --url https://yourorg.crm.dynamics.com
pac pcf push --publisher-prefix <prefix>   # for quick dev-environment iteration
# or import the packed .zip solution via pac solution import for production
```

After import, add the control to a field/view/canvas app, then set its
properties: `MFE Base URL`, `Remote Container Name` (must match
`REMOTE_NAME`/`name` in `webpack.config.js`, default `swift_transformation_mfe`),
`Exposed Module` (default `./Widget`), and the equivalent `MFE 2 Base URL` /
`Remote 2 Container Name` (default `swift_compliance_mfe`) / `Exposed Module 2` for
the second MFE, plus optionally `Widget Props (JSON)` and the three New
Relic properties (see "Telemetry: New Relic" above — leave them blank to
skip telemetry entirely). Since the control lives on a field, `sharedValue`
is bound to that field automatically — bind the control to a text column
and both MFEs (and the host panel) will read and write that column's value
live, with real Dataverse persistence.

## Keeping platform library versions correct

`ControlManifest.Input.xml` currently pins:
```xml
<platform-library name="React" version="16.14.0" />
<platform-library name="Fluent" version="8.29.0" />
```

**Why Fluent v8, not v9:** recent `pcf-scripts`/`pac pcf init -fw react`
scaffolds default new projects to Fluent **v9** `9.68.0`. That version is
currently **rejected by the platform** at push time —
`platform library fluent_9_68_0 with version 9.68.0 is not supported by the
platform` (tracked at
[powerplatform-build-tools#1265](https://github.com/microsoft/powerplatform-build-tools/issues/1265)).
Fluent **v8** (`@fluentui/react` 8.29.0) is the long-stable version that's
actually supported, and is what
[the standard `pac pcf init -fw react` tutorial](https://carldesouza.com/creating-a-virtual-pcf-react-control-with-fluent-ui-v8/)
uses — so this project uses it too, in `StatusPanel.tsx` and `App.tsx`
(`MessageBar`, `Spinner`, `DefaultButton`, `Stack`, `Text` from
`@fluentui/react/lib/...`).

If you'd rather use Fluent v9 (`@fluentui/react-components`), first confirm
the exact supported version for your target environment on the
[supported platform libraries list](https://learn.microsoft.com/power-apps/developer/component-framework/react-controls-platform-libraries#supported-platform-libraries-list)
— **do not** trust whatever `pac pcf init` scaffolds by default without
checking that list first. Whichever you use, keep the manifest,
`services/versionCheck.ts`'s `SUPPORTED_PLATFORM_LIBS`, and `pcf-control`'s
`package.json` dependency versions in lockstep — a drift between any of
these three is exactly the class of bug this whole template's version-check
layer exists to catch on the *MFE* side, so don't let it happen on the *host*
side by hand.

## Production checklist

- [ ] Both MFEs hosted over HTTPS with CORS enabled for your Power Apps
      origins (`*.dynamics.com`, `*.powerapps.com`, `*.crm*.dynamics.com`, etc.)
- [ ] Both MFEs deployed to **immutable, versioned paths**; `mfeUrl` /
      `mfeUrl2` properties pinned to specific versions, not floating `latest`
- [ ] `manifest.json` regenerated on every MFE build (never hand-edited —
      see `scripts/write-manifest.js`, used identically by both MFEs)
- [ ] `allowVersionMismatch` left `false` in production environments
      (applies to both remotes)
- [ ] If `sharedValue` is bound to a Dataverse column, confirm the column's
      max length comfortably fits whatever either MFE or the host panel
      might write to it
- [ ] Content-Security-Policy on the Power Apps side allows script-src from
      both MFEs' hosts (ask your Dataverse admin about the environment's CSP
      settings if a remote script is blocked)
- [ ] Monitor `console.error` output from `ErrorBoundary` / `mfeLoader`, and
      set the three New Relic properties (see "Telemetry: New Relic" above)
      if you want load failures, crashes, and shared-value edits reported
      automatically instead of only ever appearing in the browser console
- [ ] Confirm `npm run build` (which now defaults to
      `pcf-scripts build --buildMode production`) reports a `bundle.js`
      size you're comfortable with — this repo's is ~288 KiB with RxJS,
      Module Federation runtime, and New Relic's `MicroAgent` all included;
      a size that jumps dramatically after adding a dependency is worth
      investigating (see the New Relic section above for a real example:
      one loader choice was the difference between 288 KiB and 2.17 MiB)
- [ ] Load-test the manifest fetch path — it's two network round trips (one
      per MFE) on every control mount; consider a short-lived CDN cache
      header on `manifest.json` if the control is used on high-traffic forms

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `pac pcf push` fails: `platform library ... is not supported by the platform` | Wrong Fluent/React version in `ControlManifest.Input.xml`. Use the versions in this repo (React 16.14.0, Fluent 8.29.0) or check the [supported list](https://learn.microsoft.com/power-apps/developer/component-framework/react-controls-platform-libraries#supported-platform-libraries-list) before changing them. |
| `npm start` fails at the "Running ESLint" step: `Failed to load config "plugin:@microsoft/eslint-plugin-power-apps/recommended"` | That config name doesn't exist in the published `@microsoft/eslint-plugin-power-apps` package (it only ships a `paCheckerHosted` rules object, not a `recommended` shareable config) — this repo's `.eslintrc.json` no longer depends on that package at all, so this shouldn't recur. If you added it back in yourself, either drop it or extend `plugin:@microsoft/eslint-plugin-power-apps/paCheckerHosted` instead. |
| `pcf-scripts build`/`start` fails compiling: `TS2503: Cannot find namespace 'ComponentFramework'` | The public `pcf-scripts`/`pcf-start` npm packages don't ship the `ComponentFramework` ambient types themselves — install `@types/powerapps-component-framework` (already in this repo's `package.json` devDependencies; if it's missing, `npm install @types/powerapps-component-framework --save-dev`). |
| `pcf-scripts build` fails at "Generating build outputs": `Resource file .../img/preview.png not found` | `ControlManifest.Input.xml`'s `preview-image` attribute points at a file that must exist — this repo ships a placeholder `MfeHostControl/img/preview.png`; replace it with a real icon, or remove the `preview-image` attribute if you don't want one. |
| `npm install` in `apps/pcf-control/` fails resolving `@fluentui/react` types | Make sure `@types/react`/`@types/react-dom` are pinned to `16.14.0`/`16.9.16` (already set) — Fluent v8 expects React 16 typings, not 17/18. |
| Status panel shows `Module Federation runtime not found on window` | This was a real bug in an earlier version of `federationRuntime.ts`, not something you did wrong. It tried to read `window.__webpack_init_sharing__`/`window.__webpack_share_scopes__` directly — but those aren't real browser globals in standard webpack 5 Module Federation; they only exist as internal identifiers inside a bundle that was itself built with `ModuleFederationPlugin`, which the PCF host bundle (built by `pcf-scripts` with a plain webpack config) never is, regardless of script-load order. Fixed by switching to `@module-federation/runtime`, the officially published package for exactly this "non-federated host consumes a federated remote" scenario. |
| Status panel stuck on "Checking manifest…" / network error | `mfeUrl` doesn't resolve to a folder serving `manifest.json` with CORS headers allowing the Power Apps origin. Open `<mfeUrl>/manifest.json` directly in a browser first. |
| Console shows `GET http://localhost:8181/val/manifest.json 404` right after `npm start` | Fixed at the source: `mfeUrl` is now declared `usage="input"` with `default-value=""` in `ControlManifest.Input.xml`, instead of `usage="bound"` (which the PCF schema forbids from having any `default-value` — that's specifically why the harness had no choice but to invent the generic `"val"` placeholder every reload). With this fix an unset `mfeUrl` now comes through as an empty string, which `mfeLoader.ts` reports as *"The 'MFE Base URL' property is empty"* — an accurate, actionable message instead of a confusing 404. **To set it**, confirmed directly from `pcf-start`'s own source (`node_modules/pcf-start/loc/en/diagnosticMessages.localized.json`) and from an actual headless-browser run of the harness: the harness page has a **"Data Inputs"** panel (separate from the **"Context Inputs"** panel, which only holds Component Container Width/Height) — a table with **Property**, **Value**, and **Type** for each property. Find the `mfeUrl` row, type a real URL into its Value box — e.g. `http://localhost:4001/` if `mfe-transformation`'s dev server is running (`cd apps/mfe-transformation && npm start`), or your hosted `dist/` URL — and press Enter. If you specifically want the MFE URL to vary per Dataverse record instead of being one fixed value per control instance, switch it back to `usage="bound"` and bind it to a text column — you'll then need to set it manually every harness reload, since bound properties can't carry a manifest default. |
| Browser console shows `Warning: NaN is an invalid value for the width css style property` in the test harness | Not from this control — verified by grepping the entire `MfeHostControl` source for any `width` style and finding none, and by reproducing it in a real headless-browser run of the harness. It's the harness's own container-sizing code running before it has measured the page layout on first paint. It is cosmetic, harness-only, and does not occur in a real Power Apps page. |
| `mfe-transformation`'s `npm run build` fails with dozens of `TS1139`/`TS1005`/`TS1109` errors inside `node_modules/@types/node/ffi.d.ts` | Harmless-looking but real: nothing in `mfe-transformation` imports `@types/node`, but `webpack-dev-server`/`ts-loader`/`html-webpack-plugin` pull in a very recent transitive copy of it (Node's newer `node:ffi` typings use syntax TypeScript 4.9's parser can't read). By default TypeScript auto-includes *every* package under `node_modules/@types` even if nothing references it, so that unrelated file blocks the whole build. Fixed by `"types": []` in `apps/mfe-transformation/tsconfig.json` (and identically in `apps/mfe-compliance/tsconfig.json`), which stops TypeScript from auto-including any `@types/*` package (neither project needs Node's globals in a browser bundle). Verified by reproducing the exact failure (a transitively-installed `@types/node@26.x`) and confirming the build succeeds with this setting. |
| `mfe-transformation`'s dev server (`npm start`) returns 404 for `manifest.json` | `write-manifest.js` originally only wrote to `dist/` (used by `npm run build`), which `npm start` (webpack-dev-server) never runs — it serves `public/` plus an in-memory bundle, so there was no `manifest.json` for it to find. Fixed: `npm start` now runs `node scripts/write-manifest.js public` first, which writes it into `public/` where webpack-dev-server's static file serving picks it up. Verified by hitting `http://localhost:4001/manifest.json` directly after `npm start` and confirming `200` with `Access-Control-Allow-Origin: *` (the CORS header comes from `devServer.headers` in `webpack.config.js`). `mfe-compliance` has the identical fix on port 4002. |
| Typing quickly into the shared-value field drops or scrambles characters | Was a real bug, caught by testing with actual fast keystrokes, not just a single click-and-check. Originally fixed with a per-widget local-buffer workaround; superseded by a more fundamental fix once the shared value moved onto an RxJS `BehaviorSubject` (see "Data sharing" above) — same-session propagation no longer depends on the async PCF round trip at all, so the local buffers were removed as no-longer-necessary. Verified by typing `"typed-in-MFE2"` and separately `"rxjs-and-newrelic-added"` at speed and confirming every character landed correctly, in order, everywhere, both before and after the RxJS refactor. |
| Console warning: `Cannot update a component (App) while rendering a different component (CustomControlHostRootInternal)` | A real bug introduced while wiring the shared value onto an RxJS subject, caught by a headless-browser console-error check, not just a visual glance at the screenshot (the data still *looked* right; the warning was easy to miss). Caused by calling `sharedValueSubject.next()` directly inside `index.ts`'s `updateView()`, which runs *during* the platform's own render pass — that synchronously fired the already-mounted `App` component's `setState` while a different component was still mid-render. Fixed by moving that reconciliation into a `useEffect` in `App.tsx` (see "Data sharing" above). Verified by re-running the identical test and confirming the warning no longer appears in the console-error list. |
| `pcf-control`'s production bundle jumped to 2+ MiB after adding New Relic | A real bundle-size bug, caught by reading webpack's own build output, not assumed away. `@newrelic/browser-agent/loaders/browser-agent`'s `BrowserAgent` class unconditionally bundles `@newrelic/rrweb` (session replay recording, over 1 MiB alone) regardless of `init` config toggles — those toggles are runtime options, not build-time exclusions. Fixed by switching to `loaders/micro-agent`'s `MicroAgent` class instead (see "Telemetry: New Relic" above), which New Relic's own docs specifically recommend for "segmented UI designs (e.g., the micro frontend pattern)." Verified by measuring the isolated bundle size before and after (2.17 MiB → ~113 KiB for the New Relic portion) and confirming `npm run build`'s reported `bundle.js` size dropped to 288 KiB. |
| Remote loads locally (`pcf-scripts start`) but not once imported into Dataverse | Usually CSP: the model-driven app's Content Security Policy is blocking `script-src` from your MFE's host. Check with your Dataverse admin / the environment's security settings. |
| `pac pcf init`-generated project looks different from this one | That's expected — Microsoft's scaffolding changes over time (see the Fluent v9→v8 note above). This repo is hand-built to match the *stable, documented* contract, not whatever the CLI happens to generate today; diff against [Carl de Souza's walkthrough](https://carldesouza.com/creating-a-virtual-pcf-react-control-with-fluent-ui-v8/) if something looks off. |

**Every fix in this table was reproduced and verified for real** — including full
headless-browser runs (both MFEs' dev servers + `pcf-control`'s test harness +
Puppeteer, with console-error capture, not just screenshots) that rendered both
remote widgets inside the host, confirmed clicking MFE 1's button correctly
incremented local `useState` across three clicks (proving React hooks work
across the host/remote boundary), confirmed typing into MFE 2's shared-value
input propagated character-for-character into MFE 1's input, the host's
`SharedValuePanel`, and the harness's own `Data Outputs` panel, confirmed the
same after the RxJS refactor with zero unexpected console errors/warnings, and
confirmed New Relic telemetry causes zero JavaScript exceptions both
unconfigured and configured with dummy values.

**This repo's own `npm install && npm run build` (`apps/pcf-control/`, `apps/mfe-transformation/`,
and `apps/mfe-compliance/`) and `npm start` in `apps/pcf-control/` have been run end-to-end
against the real `pcf-scripts`/`webpack` toolchain from a clean install to
confirm they succeed** — the issues above were caught and fixed exactly this
way, not guessed at.

If you hit a build/push error not listed here, paste the exact error text —
"not working" without the message is the one thing this table can't debug for you.

## Known limitations / what you still need to decide

- This template does **not** include a pre-built Dataverse solution `.zip`
  (see §3) — that has to be generated for your org/publisher.
- The compatibility check compares **declared** ranges from `manifest.json`,
  not the MFE's actual transpiled output; a mismatched manifest (hand-edited,
  stale) can still lie. Always regenerate it from the build.
- `federationRuntime.ts` consumes a remote via `@module-federation/runtime`,
  called once per MFE via `useMfe`/`RemoteSlot`. If you need dynamic remote
  *discovery* (an arbitrary/unknown number of MFEs, remote-of-remotes),
  extend `registerRemotes` calls accordingly — the package supports it, this
  repo just demonstrates a fixed two.
- `sharedValue` is a single flat string. For structured shared state
  (multiple fields, arrays, nested objects), either JSON-encode/decode it
  through the same one bound property, or add more bound properties
  following the same `notifyOutputChanged`/`getOutputs` pattern in
  `index.ts` — the mechanism generalizes, this repo just demonstrates one
  value end-to-end.
- New Relic config (`newRelicAccountId`/`LicenseKey`/`ApplicationId`) is
  read once, in `init()`. Changing these properties after the control has
  already mounted won't re-initialize telemetry with the new values — that
  would need explicit teardown/recreation logic this repo doesn't
  implement, since these are realistically set once per deployed instance,
  not toggled at runtime.
- `MicroAgent` (used for its much smaller bundle footprint — see "Telemetry:
  New Relic" above) is flagged in New Relic's own docs as a loader strategy
  slated for eventual deprecation. It's still the correct, currently-shipped
  choice; if New Relic's replacement "centralized agent instance" approach
  becomes available and is smaller or better suited to a multi-instance
  embedded-control scenario, `services/telemetry.ts` is the one file to update.
