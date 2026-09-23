/**
 * Shape of the manifest.json every MFE MUST publish alongside its remoteEntry.js.
 * This is the contract the host uses to decide, BEFORE executing any remote code,
 * whether the remote is safe to load.
 */
export interface MfeManifest {
  /** Human readable remote name, must match webpack ModuleFederationPlugin `name`. */
  name: string;
  /** Semver of the MFE build itself, e.g. "1.4.0". Bump on every release. */
  version: string;
  /** Semver range of React the MFE was built/tested against, e.g. "16.x" or ">=16.8.0 <17.0.0". */
  reactVersion: string;
  /** Semver range of react-dom the MFE was built/tested against. */
  reactDomVersion: string;
  /** Semver range of the *host contract* this MFE expects (this PCF control's own contract version). */
  compatibleHostVersion: string;
  /** Path (relative to manifest.json) to the Module Federation remoteEntry.js file. */
  remoteEntry: string;
  /** Build metadata, useful for support/debugging. */
  buildTime?: string;
  commitSha?: string;
}

export type MfeLoadStatus =
  | "idle"
  | "checking"
  | "loading"
  | "ready"
  | "version-mismatch"
  | "error";

export interface MfeLoadResult {
  status: MfeLoadStatus;
  manifest?: MfeManifest;
  error?: string;
  /** Non-fatal warnings (e.g. mismatch overridden by allowVersionMismatch). */
  warnings: string[];
  Component?: React.ComponentType<Record<string, unknown>>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from "react";

/** Window augmentation for the Module Federation runtime bits we touch. */
declare global {
  interface Window {
    __webpack_init_sharing__?: (scope: string) => Promise<void>;
    __webpack_share_scopes__?: { default: unknown };
    [remoteGlobal: string]: unknown;
  }
}
