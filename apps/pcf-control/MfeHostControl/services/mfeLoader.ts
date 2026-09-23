import * as React from "react";
import { MfeManifest, MfeLoadResult } from "./types";
import { checkCompatibility } from "./versionCheck";
import { loadRemoteModule } from "./federationRuntime";

/** Bump whenever the props/events contract this host offers to remotes changes. */
export const HOST_CONTRACT_VERSION = "1.0.0";

/**
 * The pcf-scripts local test harness pre-fills every unset bound
 * SingleLine.Text property with the literal string "val" as placeholder
 * sample data. If a maker hasn't opened the harness's properties panel and
 * typed a real value yet, `mfeUrl` will be exactly "val" -- which is a
 * valid-looking (but wrong) string, so it sails past a plain truthiness
 * check and turns into a confusing `GET http://localhost:8181/val/manifest.json 404`.
 * We detect this specific case and every other "PLAINLY not a URL" value
 * up front, before making any network request, and say so directly instead.
 */
const HARNESS_DEFAULT_PLACEHOLDER = "val";

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return /^https?:\/\//i.test(v) || v.startsWith("/");
}

function invalidMfeUrlMessage(mfeUrl: string): string | null {
  const trimmed = (mfeUrl ?? "").trim();

  if (!trimmed) {
    return 'The "MFE Base URL" property is empty. Set it to an absolute http(s) URL where remoteEntry.js and manifest.json are hosted.';
  }

  if (trimmed === HARNESS_DEFAULT_PLACEHOLDER) {
    return (
      `"val" is the pcf-scripts local test harness's default placeholder value for an unset bound ` +
      `text property, not a real URL. Open the test harness's properties panel (the table below the ` +
      `rendered control, or the gear icon depending on your pcf-scripts version) and set "mfeUrl" to ` +
      `a real address -- e.g. http://localhost:4001/ if you have sample-mfe's dev server running ` +
      `locally (cd sample-mfe && npm start), or your hosted dist/ URL.`
    );
  }

  if (!looksLikeUrl(trimmed)) {
    return `"${trimmed}" doesn't look like an absolute http(s) URL. Set "MFE Base URL" to something like https://cdn.example.com/sample-mfe/1.0.0/.`;
  }

  return null;
}

const manifestCache = new Map<string, Promise<MfeManifest>>();

async function fetchManifest(baseUrl: string): Promise<MfeManifest> {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const manifestUrl = `${normalizedBase}manifest.json`;

  const cached = manifestCache.get(manifestUrl);
  if (cached) return cached;

  const promise = (async () => {
    const res = await fetch(manifestUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Could not fetch MFE manifest at ${manifestUrl} (HTTP ${res.status})`);
    }
    const json = (await res.json()) as MfeManifest;
    for (const field of ["name", "version", "reactVersion", "remoteEntry"] as const) {
      if (!json[field]) {
        throw new Error(`MFE manifest at ${manifestUrl} is missing required field "${field}"`);
      }
    }
    return json;
  })();

  manifestCache.set(manifestUrl, promise);
  return promise;
}

export interface LoadMfeOptions {
  mfeUrl: string;
  remoteName: string;
  exposedModule: string;
  allowVersionMismatch: boolean;
}

export async function loadMfe(opts: LoadMfeOptions): Promise<MfeLoadResult> {
  const warnings: string[] = [];

  // 0. Fail fast with a specific, actionable message for the harness
  //    placeholder / empty / non-URL cases, before making any network call.
  const urlProblem = invalidMfeUrlMessage(opts.mfeUrl);
  if (urlProblem) {
    return { status: "error", warnings, error: urlProblem };
  }

  // 1. Fetch the manifest FIRST. We never execute remote code before we've
  //    inspected its declared compatibility -- this is the whole point.
  let manifest: MfeManifest;
  try {
    manifest = await fetchManifest(opts.mfeUrl);
  } catch (e) {
    return { status: "error", warnings, error: e instanceof Error ? e.message : String(e) };
  }

  // 2. Compare declared requirements against what's actually running.
  const hostReactVersion = React.version;
  const compat = checkCompatibility({
    hostReactVersion,
    mfeReactVersionRange: manifest.reactVersion,
    mfeCompatibleHostRange: manifest.compatibleHostVersion ?? "*",
    hostContractVersion: HOST_CONTRACT_VERSION,
  });

  if (!compat.compatible) {
    if (!opts.allowVersionMismatch) {
      return {
        status: "version-mismatch",
        manifest,
        warnings: compat.reasons,
        error: "MFE failed the version compatibility check. See warnings for details.",
      };
    }
    // Explicit opt-in override: proceed, but surface the risk loudly.
    warnings.push(
      "allowVersionMismatch is enabled -- proceeding despite failed compatibility check:",
      ...compat.reasons
    );
  }

  // 3. Resolve remoteEntry.js relative to the manifest and load the module.
  const normalizedBase = opts.mfeUrl.endsWith("/") ? opts.mfeUrl : `${opts.mfeUrl}/`;
  const remoteEntryUrl = new URL(manifest.remoteEntry, normalizedBase).toString();

  try {
    const Component = await loadRemoteModule<React.ComponentType<Record<string, unknown>>>({
      remoteEntryUrl,
      remoteName: opts.remoteName,
      exposedModule: opts.exposedModule,
    });

    if (typeof Component !== "function") {
      throw new Error(
        `Exposed module "${opts.exposedModule}" did not resolve to a React component (got ${typeof Component}).`
      );
    }

    return { status: "ready", manifest, warnings, Component };
  } catch (e) {
    return {
      status: "error",
      manifest,
      warnings,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
