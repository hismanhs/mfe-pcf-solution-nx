/**
 * Writes manifest.json -- the contract file the PCF host reads BEFORE
 * it ever loads remoteEntry.js. Run this as a post-build step so the
 * manifest's version fields can never drift from what was actually built.
 *
 * Usage:
 *   node scripts/write-manifest.js            writes to ../dist  (production build)
 *   node scripts/write-manifest.js public      writes to ../public (dev server)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pkg = require("../package.json");
const reactPkg = require("react/package.json");
const reactDomPkg = require("react-dom/package.json");

function safeGitSha() {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return undefined;
  }
}

const targetName = process.argv[2] || "dist";
const outDir = path.resolve(__dirname, "..", targetName);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const manifest = {
  name: "swift_transformation_mfe",
  version: pkg.version,
  // Force React 16 range to match the PCF host runtime used in this repo.
  // Change this if you intentionally upgrade the host to React 17/18.
  reactVersion: "^16.14.0",
  reactDomVersion: "^16.14.0",
  // Which version(s) of the PCF host's props/events contract this build expects.
  compatibleHostVersion: "^1.0.0",
  remoteEntry: "remoteEntry.js",
  buildTime: new Date().toISOString(),
  commitSha: safeGitSha(),
};

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
// eslint-disable-next-line no-console
console.log("Wrote", path.join(outDir, "manifest.json"), manifest);

