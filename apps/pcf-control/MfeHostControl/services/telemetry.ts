import { AppEvent } from "./eventBus";

/**
 * We bundle @newrelic/browser-agent's BrowserAgent class directly into this
 * control's own webpack output, rather than relying on New Relic's classic
 * copy/paste <script> snippet being present on the host page. Two reasons:
 *   1. A PCF control has no way to inject a script into the page's <head>
 *      even if it wanted to -- it only returns a React element.
 *   2. Depending on some OTHER script already having set window.newrelic
 *      (e.g. hoping the org's Dataverse environment happens to have one
 *      loaded) is fragile and not something a reusable control should
 *      assume. Bundling our own agent instance makes this control
 *      self-contained: given three New Relic config values, it reports its
 *      own data, independent of whatever else is or isn't on the page.
 *
 * Docs: https://www.npmjs.com/package/@newrelic/browser-agent
 */

export interface TelemetryConfig {
  accountId: string;
  licenseKey: string;
  applicationId: string;
}

interface MinimalBrowserAgent {
  addPageAction: (name: string, attributes?: Record<string, unknown>) => void;
  noticeError: (error: Error, attributes?: Record<string, unknown>) => void;
}

let agent: MinimalBrowserAgent | undefined;
let initAttempted = false;

function configComplete(config: TelemetryConfig): boolean {
  return Boolean(config.accountId && config.licenseKey && config.applicationId);
}

/**
 * Initializes the bundled New Relic Browser Agent, once, if (and only if)
 * all three config values are present. Safe to call on every render --
 * it's a no-op after the first successful (or first attempted) call. Never
 * throws: a telemetry misconfiguration must never break the control.
 */
export function initTelemetry(config: TelemetryConfig): void {
  if (initAttempted) return;
  initAttempted = true;

  if (!configComplete(config)) {
    // Not configured -- stay a no-op. This is the expected state for the
    // test harness and for anyone who hasn't set up a New Relic Browser
    // app yet; reportEvent() below silently does nothing.
    return;
  }

  // Dynamic import, not require(): keeps this module free of any
  // dependency on @types/node's global `require` typing. Using
  // loaders/micro-agent specifically, not loaders/browser-agent: the
  // MicroAgent skips all "auto" page instrumentation (ajax, session trace,
  // session replay, automatic JS error capture) and only supports the
  // manual API calls this file actually uses (noticeError, addPageAction).
  // That keeps this control's bundle small -- the full BrowserAgent loader
  // pulls in @newrelic/rrweb for session replay and adds well over 1MB even
  // with those features toggled off in `init`, since toggling them off is a
  // runtime option, not a build-time exclusion. New Relic's own docs note
  // MicroAgent "can easily be instantiated multiple times on a single page
  // with low overhead... accommodates specialized use cases such as the
  // micro frontend pattern" -- which is exactly this control's situation.
  // (Their docs also currently flag this loader strategy as slated for
  // eventual deprecation in favor of a future "centralized agent instance"
  // approach; this is still the correct, small, currently-supported choice.)
  import("@newrelic/browser-agent/loaders/micro-agent")
    .then(({ MicroAgent }) => {
      agent = new MicroAgent({
        info: {
          licenseKey: config.licenseKey,
          applicationID: config.applicationId,
          sa: 1,
        },
        loader_config: {
          accountID: config.accountId,
          agentID: config.applicationId,
          applicationID: config.applicationId,
          licenseKey: config.licenseKey,
        },
        init: {},
      }) as unknown as MinimalBrowserAgent;
    })
    .catch((e) => {
      // e.g. the package failed to load, or a bad config shape. Telemetry
      // failures must never surface to the person using the control.
      // eslint-disable-next-line no-console
      console.warn("[MfeHostControl] New Relic telemetry failed to initialize:", e);
      agent = undefined;
    });
}

/** Reports one app event to New Relic. No-ops silently if not initialized/configured. */
export function reportEvent(event: AppEvent): void {
  if (!agent) return;

  try {
    switch (event.type) {
      case "mfe_load":
        agent.addPageAction("MfeHostControl.mfe_load", {
          which: event.which,
          status: event.status,
          mfeName: event.manifest?.name,
          mfeVersion: event.manifest?.version,
          error: event.error,
        });
        if (event.status === "error" || event.status === "version-mismatch") {
          agent.noticeError(new Error(event.error ?? event.status), {
            which: event.which,
            control: "MfeHostControl",
          });
        }
        break;

      case "widget_crash":
        agent.noticeError(new Error(event.message), {
          which: event.which,
          control: "MfeHostControl",
        });
        break;

      case "shared_value_change":
        agent.addPageAction("MfeHostControl.shared_value_change", {
          source: event.source,
          length: event.value.length,
        });
        break;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[MfeHostControl] New Relic telemetry call failed:", e);
  }
}

/** Test-only escape hatch to reset module state between test runs. */
export function __resetTelemetryForTests(): void {
  agent = undefined;
  initAttempted = false;
}
