import * as React from "react";
import { init, registerRemotes, loadRemote, getInstance } from "@module-federation/runtime";

/**
 * Module Federation consumption via the official `@module-federation/runtime`
 * package.
 *
 * We deliberately do NOT hand-roll the webpack MF runtime glue (an earlier
 * version of this file tried that, reading `window.__webpack_init_sharing__`
 * directly). That approach is fundamentally broken for this host: those
 * identifiers are internal to a webpack bundle that was itself built with
 * ModuleFederationPlugin, and are never exposed as real `window` globals.
 * The PCF host bundle is built by `pcf-scripts` with a plain webpack config
 * we don't control (no ModuleFederationPlugin), so it can never reach them,
 * regardless of script-load order. `@module-federation/runtime` exists
 * specifically to let a non-federated host consume federated remotes
 * (confirmed against its own shipped .d.ts / README) -- this is the
 * officially supported path, not a workaround.
 */

const HOST_NAME = "mfe_host_pcf";

let federationInitialized = false;

function ensureFederationHost(): void {
  if (federationInitialized || getInstance()) {
    federationInitialized = true;
    return;
  }
  init({
    name: HOST_NAME,
    remotes: [],
    shared: {
      // Only "react" is shared, deliberately -- this control is a *virtual*
      // PCF control, so it never calls ReactDOM.render/createRoot itself;
      // the platform's own host page owns that. "react-dom" is also not
      // externalized by the React platform-library (only "react" is), so
      // importing it here would bundle a full, redundant ~1MB copy of
      // react-dom into the control AND risk it being a different instance
      // than whatever ReactDOM the platform is actually rendering with.
      // The remote's own webpack.config.js can still declare react-dom as
      // shared/singleton on its side; it'll just be the sole provider for
      // it since the host doesn't offer one, which is fine for a component
      // that only uses hooks/JSX and never calls react-dom APIs directly.
      react: {
        version: React.version,
        shareConfig: { singleton: true, requiredVersion: false },
        lib: () => React,
      },
    },
  });
  federationInitialized = true;
}

/** "./Widget" -> "Widget" (loadRemote's module id format is "<remoteName>/<exposedPathWithoutLeadingDotSlash>"). */
function toModuleId(exposedModule: string): string {
  return exposedModule.replace(/^\.\/?/, "");
}

export async function loadRemoteModule<T = unknown>(opts: {
  remoteEntryUrl: string;
  remoteName: string;
  exposedModule: string;
}): Promise<T> {
  const { remoteEntryUrl, remoteName, exposedModule } = opts;

  ensureFederationHost();

  // Re-register on every call (not just once) so that changing the "MFE
  // Base URL" property at runtime -- e.g. a maker pointing the control at a
  // new version -- actually takes effect instead of being stuck with
  // whatever remoteEntry.js URL was registered first.
  // Compute a deterministic, compact alias for the remote to avoid
  // prefix collisions (e.g. "sample_mfe" vs "sample_mfe2"). The alias
  // is stable for a given remoteName and safe to use as a runtime key.
  function deterministicAlias(name: string): string {
    // djb2 hash -> unsigned -> base36 string. Works in browser and Node.
    let h = 5381;
    for (let i = 0; i < name.length; i++) {
      h = (h * 33) ^ name.charCodeAt(i);
    }
    // Ensure an alphabetic prefix so alias doesn't start with a digit.
    return `mf_${(h >>> 0).toString(36)}`;
  }

  const alias = deterministicAlias(remoteName);
  registerRemotes([{ name: remoteName, entry: remoteEntryUrl, alias }], { force: true });

  // Use the same identifier that was registered with `registerRemotes`.
  // When we provide an `alias` to registerRemotes it becomes the runtime
  // key that loadRemote expects; ensure moduleId uses that alias.
  const registeredKey = alias || remoteName;
  const moduleId = `${registeredKey}/${toModuleId(exposedModule)}`;
  const mod = await loadRemote<{ default?: T } | T>(moduleId);

  if (mod === null || mod === undefined) {
    throw new Error(
      `loadRemote("${moduleId}") returned nothing. Check that "${exposedModule}" is actually ` +
        `listed under exposes in the remote's webpack.config.js ModuleFederationPlugin.`
    );
  }

  return (mod && typeof mod === "object" && "default" in mod ? (mod as { default: T }).default : mod) as T;
}

/** No-op kept for API compatibility with callers that reset caches between loads. */
export function resetFederationCaches(): void {
  // @module-federation/runtime manages its own internal caches; nothing to clear here.
}
