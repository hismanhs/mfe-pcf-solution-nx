/**
 * Dependency-free semver utilities.
 *
 * We deliberately avoid pulling in the `semver` npm package: this code runs
 * inside a *virtual* PCF control whose whole point (per the platform-library
 * pattern) is to keep the bundle tiny by not shipping extra copies of
 * common libraries. A ~40 line comparator is enough for the ranges we
 * actually need to support (exact, ^, ~, >=, <, x-ranges).
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(v: string): ParsedVersion | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function cmp(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Supports a pragmatic subset of semver ranges:
 *   "16.14.0"      exact major.minor.patch (patch is ignored for compatibility, only major.minor must match)
 *   "16.x" / "16"  any 16.*.*
 *   "^16.8.0"      >=16.8.0 <17.0.0
 *   "~16.8.0"      >=16.8.0 <16.9.0
 *   ">=16.8.0"     open-ended lower bound
 *   ">=16.8.0 <17.0.0"  space-separated AND of simple comparators
 */
export function satisfies(version: string, range: string): boolean {
  const v = parseVersion(version);
  if (!v) return false;

  const clauses = range.trim().split(/\s+/).filter(Boolean);
  if (clauses.length === 0) return true;

  // Single bare version or x-range, e.g. "16.x", "16", "16.14.0"
  if (clauses.length === 1 && !/^[\^~><=]/.test(clauses[0])) {
    const raw = clauses[0].replace(/\.x$/, "");
    const parts = raw.split(".").map(Number);
    if (parts.length >= 1 && !Number.isNaN(parts[0]) && v.major !== parts[0]) return false;
    if (parts.length >= 2 && !Number.isNaN(parts[1]) && v.minor !== parts[1]) return false;
    return true;
  }

  return clauses.every((clause) => evalClause(v, clause));
}

function evalClause(v: ParsedVersion, clause: string): boolean {
  if (clause.startsWith("^")) {
    const base = parseVersion(clause.slice(1));
    if (!base) return false;
    const upper: ParsedVersion = { major: base.major + 1, minor: 0, patch: 0 };
    return cmp(v, base) >= 0 && cmp(v, upper) < 0;
  }
  if (clause.startsWith("~")) {
    const base = parseVersion(clause.slice(1));
    if (!base) return false;
    const upper: ParsedVersion = { major: base.major, minor: base.minor + 1, patch: 0 };
    return cmp(v, base) >= 0 && cmp(v, upper) < 0;
  }
  if (clause.startsWith(">=")) {
    const base = parseVersion(clause.slice(2));
    return !!base && cmp(v, base) >= 0;
  }
  if (clause.startsWith("<=")) {
    const base = parseVersion(clause.slice(2));
    return !!base && cmp(v, base) <= 0;
  }
  if (clause.startsWith(">")) {
    const base = parseVersion(clause.slice(1));
    return !!base && cmp(v, base) > 0;
  }
  if (clause.startsWith("<")) {
    const base = parseVersion(clause.slice(1));
    return !!base && cmp(v, base) < 0;
  }
  if (clause.startsWith("=")) {
    const base = parseVersion(clause.slice(1));
    return !!base && cmp(v, base) === 0;
  }
  // Fallback: treat as exact major.minor match
  const base = parseVersion(clause);
  return !!base && v.major === base.major && v.minor === base.minor;
}

/**
 * Platform libraries currently supported by the PCF host, mirrored from
 * ControlManifest.Input.xml. Keep in sync manually, or generate this file
 * from the manifest at build time (see scripts/build-all.sh).
 */
export const SUPPORTED_PLATFORM_LIBS = {
  react: "16.14.0",
  // v8 (@fluentui/react), not v9 -- see the note in ControlManifest.Input.xml.
  fluent: "8.29.0",
} as const;

export interface CompatibilityCheckInput {
  hostReactVersion: string; // actual React.version loaded on the page right now
  mfeReactVersionRange: string; // manifest.reactVersion from the remote
  mfeCompatibleHostRange: string; // manifest.compatibleHostVersion
  hostContractVersion: string; // this control's own contract version (see index.ts CONTRACT_VERSION)
}

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

export function checkCompatibility(input: CompatibilityCheckInput): CompatibilityResult {
  const reasons: string[] = [];

  if (!satisfies(input.hostReactVersion, input.mfeReactVersionRange)) {
    reasons.push(
      `Host React ${input.hostReactVersion} does not satisfy MFE-required range "${input.mfeReactVersionRange}". ` +
        `Rendering the remote against a different React runtime than it was built for can cause silent ` +
        `hook/context failures or full crashes.`
    );
  }

  if (!satisfies(input.hostContractVersion, input.mfeCompatibleHostRange)) {
    reasons.push(
      `Host contract ${input.hostContractVersion} does not satisfy MFE-required range "${input.mfeCompatibleHostRange}". ` +
        `The MFE was built against a different host prop/event contract than this control implements.`
    );
  }

  return { compatible: reasons.length === 0, reasons };
}
