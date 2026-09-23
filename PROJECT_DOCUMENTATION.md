# MfeHostControl — Setup & Attribute Reference

A virtual PCF control that hosts two independently-deployable React micro-frontends
(MFEs) via Webpack Module Federation, with runtime version checking, a two-way
shared value (RxJS-backed, bound to a real PCF property), and optional New Relic
telemetry.

This document covers two things end to end: **(1)** how to set the project up,
from an empty machine to a running local instance to a production deployment, and
**(2)** every configuration attribute used anywhere in the solution — what it's
called, what type it is, what it defaults to, and exactly what it controls.

---

## 1. Architecture at a glance

```
mfe-pcf-solution/
├── apps/pcf-control/            PCF virtual control (the "host")
│   └── MfeHostControl/
│       ├── ControlManifest.Input.xml   all host-configurable attributes
│       ├── index.ts                    PCF lifecycle; owns RxJS Subject/BehaviorSubject
│       ├── components/                 App, RemoteSlot, SharedValuePanel, StatusPanel, ErrorBoundary
│       ├── hooks/                      useMfe (load one remote), useRxValue (Rx -> React state)
│       └── services/                   mfeLoader, versionCheck, federationRuntime, eventBus, telemetry
├── apps/mfe-transformation/               MFE 1 (port 4001, container "swift_transformation_mfe")
├── apps/mfe-compliance/              MFE 2 (port 4002, container "swift_compliance_mfe")
└── scripts/build-all.sh      builds both MFEs then the control, in the right order
```

Three independently-versioned, independently-deployable artifacts:

| Artifact | What it is | Deployed as |
|---|---|---|
| `pcf-control` | The Dataverse/canvas-app control | Imported into a Dataverse solution |
| `mfe-transformation` | MFE 1's build output | Static files on any CORS-enabled HTTPS host |
| `mfe-compliance` | MFE 2's build output | Static files on any CORS-enabled HTTPS host |

---

## 2. Prerequisites

| Tool | Why | Verify with |
|---|---|---|
| Node.js 18+ and npm | All three projects | `node -v`, `npm -v` |
| [Power Platform CLI (`pac`)](https://learn.microsoft.com/power-platform/developer/cli/introduction) | Packaging/importing the control into Dataverse | `pac --version` |
| A Dataverse environment you can create solutions in | Actually running the control in Power Apps | — |
| (Optional) A New Relic account with a Browser app | Telemetry | — |
| (Optional) A static file host with CORS support (Azure Static Web Apps, S3+CloudFront, Azure Storage static website, etc.) | Production MFE hosting | — |

---

## 3. Initial setup — local development

### 3.1 Get the code onto disk

Unzip the delivered archive, or clone your own repo initialized from it. You should
see the three top-level project folders shown in §1.

### 3.2 Build both MFEs first

The PCF control's local test harness needs a `manifest.json` to fetch from each MFE
before it will render anything, so build (or dev-serve) the MFEs before touching
the control.

```bash
cd apps/mfe-transformation
npm install
npm start          # webpack-dev-server on :4001; writes public/manifest.json first

# in a second terminal
cd apps/mfe-compliance
npm install
npm start          # webpack-dev-server on :4002; writes public/manifest.json first
```

Confirm each is actually serving a manifest before moving on:
```bash
curl http://localhost:4001/manifest.json
curl http://localhost:4002/manifest.json
```

### 3.3 Build and run the PCF control

```bash
# in a third terminal
cd apps/pcf-control
npm install
npm start           # pcf-scripts test harness on http://localhost:8181
```

Open `http://localhost:8181`. In the harness's **Data Inputs** panel, set:

| Property | Value to enter |
|---|---|
| `mfeUrl` | `http://localhost:4001/` |
| `mfeUrl2` | `http://localhost:4002/` |

Everything else has a usable default (see the full table in §5). You should see
both MFE widgets render, plus a "Shared Value" box at the top — typing in any of
the three updates the other two immediately.

### 3.4 One-shot build script

`scripts/build-all.sh` runs `npm install && npm run build` for both MFEs, then for
the control, in the correct order:
```bash
./scripts/build-all.sh
```

---

## 4. Production setup — deploying for real

Local `npm start` is a dev harness only. Going to production means three separate
deployment actions:

### 4.1 Host both MFEs on real, versioned URLs

```bash
cd apps/mfe-transformation && npm run build      # -> apps/mfe-transformation/dist/
cd apps/mfe-compliance && npm run build     # -> apps/mfe-compliance/dist/
```

Each `dist/` folder is a complete, static, deployable unit (`remoteEntry.js`,
`manifest.json`, hashed chunk files). Upload each to its own CORS-enabled HTTPS
location, **using an immutable, versioned path** rather than overwriting a
floating `latest/`:

```
https://cdn.contoso.com/apps/mfe-transformation/1.0.0/
https://cdn.contoso.com/apps/mfe-compliance/1.0.0/
```

Versioned paths are what let you roll a maker's `mfeUrl`/`mfeUrl2` pointer forward
deliberately, and roll back instantly by repointing the URL — independently for
each MFE. The hosting location **must** send `Access-Control-Allow-Origin`
permitting the Power Apps origins that will fetch it (browser-enforced CORS
applies to the `manifest.json` fetch and to `remoteEntry.js`).

### 4.2 Build and package the control

```bash
cd apps/pcf-control
npm run build                              # pcf-scripts build --buildMode production
pac solution init --publisher-name <pub> --publisher-prefix <prefix>
pac solution add-reference --path .
msbuild /t:build /restore                  # or `pac solution pack` per your CI
pac auth create --url https://yourorg.crm.dynamics.com
pac solution import                        # production import
```

(`pac pcf push` is the fast dev-environment iteration path; use solution
import/export for anything you'd call production.)

### 4.3 Configure the control instance

Add the control to a field/view/canvas app, then set the properties from §5 —
critically `mfeUrl` and `mfeUrl2` pointed at your real hosted URLs, and, if you
want persistence, bind `sharedValue` to a Dataverse text column.

### 4.4 Production checklist

- [ ] Both MFEs on immutable, versioned, CORS-enabled HTTPS paths
- [ ] `allowVersionMismatch` left `false`
- [ ] `manifest.json` only ever produced by `scripts/write-manifest.js` (never hand-edited)
- [ ] Content-Security-Policy on the Power Apps side allows `script-src`/`connect-src`
      for both MFE hosts (and New Relic's ingest domain, if telemetry is enabled)
- [ ] If `sharedValue` is bound, the target column's max length comfortably fits
      whatever any of the three UIs might write to it
- [ ] `npm run build`'s reported `bundle.js` size checked — this repo's is ~288 KiB
      including RxJS, Module Federation runtime, and New Relic's `MicroAgent`
- [ ] New Relic properties set (or deliberately left blank) — see §5.4

---

## 5. Complete attribute reference

Every configuration surface in the solution, in one place.

### 5.1 `ControlManifest.Input.xml` — PCF control properties

These are what a maker sets in Power Apps' Properties pane (or the test harness's
Data Inputs panel). Full path: `apps/pcf-control/MfeHostControl/ControlManifest.Input.xml`.

| Attribute (`name`) | Display name | Type (`of-type`) | Usage | Required | Default | Purpose |
|---|---|---|---|---|---|---|
| `mfeUrl` | MFE Base URL | `SingleLine.Text` | `input` | `true` | `""` | Base URL where MFE 1's `remoteEntry.js`/`manifest.json` are hosted |
| `remoteName` | Remote Container Name | `SingleLine.Text` | `input` | `true` | `"swift_transformation_mfe"` | Must match MFE 1's `ModuleFederationPlugin` `name` |
| `exposedModule` | Exposed Module | `SingleLine.Text` | `input` | `true` | `"./Widget"` | MFE 1's exposed module path |
| `allowVersionMismatch` | Allow Version Mismatch | `TwoOptions` | `input` | `false` | `false` | If `true`, renders an MFE even if its declared React/host-contract range fails the compatibility check (applies to **both** MFEs) |
| `widgetProps` | Widget Props (JSON) | `Multiple` | `input` | `false` | *(none)* | Optional extra JSON object merged into both widgets' props |
| `mfeUrl2` | MFE 2 Base URL | `SingleLine.Text` | `input` | `false` | `""` | Same as `mfeUrl`, for MFE 2 |
| `remoteName2` | Remote 2 Container Name | `SingleLine.Text` | `input` | `false` | `"swift_compliance_mfe"` | Same as `remoteName`, for MFE 2 |
| `exposedModule2` | Exposed Module 2 | `SingleLine.Text` | `input` | `false` | `"./Widget"` | Same as `exposedModule`, for MFE 2 |
| `sharedValue` | Shared Value | `SingleLine.Text` | **`bound`** | `false` | *(none — bound properties can't have one)* | The value both MFEs and the host panel read/write. Bind to a Dataverse text column for persistence, or leave unbound for in-session-only sharing |
| `newRelicAccountId` | New Relic Account ID | `SingleLine.Text` | `input` | `false` | `""` | From a New Relic Browser app's settings. All three New Relic properties must be set for telemetry to activate |
| `newRelicLicenseKey` | New Relic License Key | `SingleLine.Text` | `input` | `false` | `""` | Same |
| `newRelicApplicationId` | New Relic Application ID | `SingleLine.Text` | `input` | `false` | `""` | Same |

**Why `mfeUrl`/`remoteName`/`exposedModule`/etc. are `usage="input"`, not `"bound"`:**
they're static per-instance configuration a maker sets once, not per-record data —
and critically, only `input` properties are allowed a `default-value` in the PCF
schema. `sharedValue` is the one property that's genuinely `bound`, because it's
live, two-way, record-relevant data.

**Platform libraries declared** (same file, `<resources>` block) — not properties,
but configuration in the same sense: they tell the platform which shared runtime
libraries this control needs injected, rather than bundling its own copies.

| `name` | `version` |
|---|---|
| `React` | `16.14.0` |
| `Fluent` | `8.29.0` |

### 5.2 MFE `manifest.json` — the contract each remote publishes

Generated by `scripts/write-manifest.js` in **both** `mfe-transformation` and `mfe-compliance`
(never hand-edited), fetched by the host's `mfeLoader.ts` before any remote code
executes.

| Field | Type | Source | Purpose |
|---|---|---|---|
| `name` | `string` | Hard-coded per MFE (`"swift_transformation_mfe"` / `"swift_compliance_mfe"`) | Must match the manifest's `remoteName`/`remoteName2` |
| `version` | `string` | `package.json`'s `version` | The MFE build's own semver |
| `reactVersion` | `string` (semver range) | `` `^${react.version}` `` | React version range this build was compiled against |
| `reactDomVersion` | `string` (semver range) | `` `^${react-dom.version}` `` | Same, for react-dom |
| `compatibleHostVersion` | `string` (semver range) | Hard-coded `"^1.0.0"` | Which host contract version(s) this MFE expects (see `HOST_CONTRACT_VERSION` in `mfeLoader.ts`) |
| `remoteEntry` | `string` | Hard-coded `"remoteEntry.js"` | Filename of the Module Federation container, resolved relative to the manifest |
| `buildTime` | `string` (ISO 8601) | `new Date().toISOString()` | Build timestamp, for support/debugging |
| `commitSha` | `string \| undefined` | `git rev-parse --short HEAD` (best-effort) | Build provenance, when available |

### 5.3 `webpack.config.js` — `ModuleFederationPlugin` options (each MFE)

| Option | `mfe-transformation` value | `mfe-compliance` value | Purpose |
|---|---|---|---|
| `name` | `"swift_transformation_mfe"` | `"swift_compliance_mfe"` | Container name; must match the control's `remoteName`/`remoteName2` |
| `filename` | `"remoteEntry.js"` | `"remoteEntry.js"` | Output filename for the federation container |
| `exposes["./Widget"]` | `"./src/App.tsx"` | `"./src/App.tsx"` | What `exposedModule`/`exposedModule2` resolve to |
| `shared.react.singleton` | `true` | `true` | Reuse one React instance instead of loading a second copy |
| `shared.react.requiredVersion` | installed `react` version | installed `react` version | Declared compatibility range for the shared runtime |
| `shared.react.strictVersion` | `false` | `false` | Don't hard-fail on a minor version difference; fall back gracefully |
| `shared.react.eager` | `false` | `false` | Don't force-bundle react into this chunk eagerly |
| `shared["react-dom"].*` | same four sub-options as `react` | same | Same reasoning, for react-dom |

Dev server: `mfe-transformation` on port **4001**, `mfe-compliance` on port **4002**, both with
`Access-Control-Allow-Origin: *` (see `devServer.headers`).

### 5.4 New Relic telemetry configuration

**Control properties** (input, §5.1) map directly to the config object
`services/telemetry.ts`'s `initTelemetry()` accepts:

```ts
interface TelemetryConfig {
  accountId: string;     // <- newRelicAccountId
  licenseKey: string;    // <- newRelicLicenseKey
  applicationId: string; // <- newRelicApplicationId
}
```

All three must be non-empty or telemetry stays a permanent no-op. Internally, these
map onto `@newrelic/browser-agent`'s `MicroAgent` constructor options:

| MicroAgent option | Value |
|---|---|
| `info.licenseKey` | `config.licenseKey` |
| `info.applicationID` | `config.applicationId` |
| `info.sa` | `1` (marks this as a SPA-style agent instance) |
| `loader_config.accountID` | `config.accountId` |
| `loader_config.agentID` | `config.applicationId` |
| `loader_config.applicationID` | `config.applicationId` |
| `loader_config.licenseKey` | `config.licenseKey` |
| `init` | `{}` (MicroAgent does no automatic instrumentation to configure) |

**Events reported** — the `AppEvent` union from `services/eventBus.ts`, which both
drives telemetry and could drive future consumers:

| `type` | Fields | Reported as |
|---|---|---|
| `mfe_load` | `which: 1 \| 2`, `status`, `manifest?`, `error?` | `addPageAction("MfeHostControl.mfe_load", {which, status, mfeName, mfeVersion, error})`; also `noticeError()` if `status` is `error` or `version-mismatch` |
| `widget_crash` | `which: 1 \| 2`, `message` | `noticeError(new Error(message), {which, control})` |
| `shared_value_change` | `value`, `source: "host" \| "mfe1" \| "mfe2"` | `addPageAction("MfeHostControl.shared_value_change", {source, length: value.length})` — logs the **length**, not the value itself |

### 5.5 Component props — what each MFE widget actually receives

Both `apps/mfe-transformation/src/App.tsx` and `apps/mfe-compliance/src/App.tsx` expose the same
shape (`WidgetProps`), so either could be swapped for a different implementation
without changing the host:

| Prop | Type | Purpose |
|---|---|---|
| `title` | `string?` | Heading text (has a sensible per-MFE default) |
| `sharedValue` | `string?` | Current shared value (defaults to `""`) |
| `onSharedValueChange` | `(value: string) => void` | Call to write a new shared value |
| `[key: string]` | `unknown` | Anything from the `widgetProps` (JSON) control property is spread in here too |

### 5.6 `npm` scripts reference

| Project | Script | Command | Purpose |
|---|---|---|---|
| `pcf-control` | `build` | `pcf-scripts build --buildMode production` | Minified production build |
| `pcf-control` | `start` | `pcf-scripts start` | Local test harness on `:8181` |
| `pcf-control` | `lint` / `lint:fix` | `eslint MfeHostControl/**/*.{ts,tsx}` | Lint the control's source |
| `mfe-transformation` / `mfe-compliance` | `start` | `node scripts/write-manifest.js public && webpack serve --mode development --port 4001` (or `4002`) | Dev server + dev-mode manifest |
| `mfe-transformation` / `mfe-compliance` | `build` | `webpack --mode production && npm run build:manifest` | Production build + manifest into `dist/` |
| `mfe-transformation` / `mfe-compliance` | `build:manifest` | `node scripts/write-manifest.js` | Manifest generation alone |

### 5.7 Dependency versions (pinned, not ranged, for the core stack)

| Package | Version | Where |
|---|---|---|
| `react` / `react-dom` | `16.14.0` | All three projects (must match the platform-library version in §5.1) |
| `@fluentui/react` | `8.29.0` | `pcf-control` only |
| `@module-federation/runtime` | `2.9.0` | `pcf-control` only |
| `rxjs` | `7.8.2` | `pcf-control` only |
| `@newrelic/browser-agent` | `1.322.0` | `pcf-control` only |
| `@types/powerapps-component-framework` | `^1.3.18` | `pcf-control` only (dev) |

---

## 6. Production-level code practices already implemented

Since this is meant to run in a real environment, not just a demo, here's what's
already built in — and why — so nothing here needs re-discovering under pressure:

- **Fail-fast, specific error messages**, not generic network errors — an empty or
  obviously-invalid `mfeUrl` is caught and explained *before* any fetch happens
  (`mfeLoader.ts`).
- **Version compatibility is checked before any remote code executes at all** —
  the manifest is fetched and validated first; a mismatch renders a diagnostic
  panel instead of silently loading incompatible code (unless explicitly
  overridden via `allowVersionMismatch`).
- **Defense in depth on React sharing** — both the manifest check *and* Module
  Federation's own `singleton`/`strictVersion:false` shared config guard against
  a duplicate React instance breaking hooks/context.
- **Crash isolation** — an `ErrorBoundary` around each remote means one MFE
  crashing can never take down the other MFE, the host panel, or the page.
- **Telemetry never breaks the control** — every New Relic call is wrapped in
  try/catch; a bad config or failed dynamic import degrades to silent no-op, not
  an exception.
- **Bundle size was actively managed, not assumed** — the New Relic integration
  was measured and switched from a 2.17 MiB loader to a 113 KiB one before
  shipping; `npm run build` defaults to production/minified output.
- **Render-phase correctness** — shared-state updates are deliberately kept out
  of `updateView()` (which runs during the platform's own render pass) and done
  in `useEffect` instead, avoiding React's cross-component setState-during-render
  warning.
- **Every fix and feature in this codebase was verified against a real, running
  instance** (headless-browser runs with console-error capture), not merely
  written and assumed correct — see the Troubleshooting section of `README.md`
  for the specific bugs this caught.

---

## 7. Where to go next

- `README.md` — architecture rationale, "why this shape," and a detailed
  Troubleshooting table of every real issue hit and fixed during development.
- `scripts/build-all.sh` — the one-command build path.
- `ControlManifest.Input.xml` — the source of truth for §5.1; if it and this
  document ever disagree, the manifest is correct and this document is stale.
