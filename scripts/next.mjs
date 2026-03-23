import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function realpathNative(p) {
  try {
    return fs.realpathSync.native ? fs.realpathSync.native(p) : fs.realpathSync(p);
  } catch {
    return p;
  }
}

function normalizeCwd() {
  const cwd = process.cwd();
  const real = realpathNative(cwd);

  if (real && real !== cwd) {
    try {
      process.chdir(real);
    } catch {
      // Keep original cwd.
    }
  }
}

normalizeCwd();

const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [nextCli, ...args], {
  stdio: "inherit",
  env: process.env,
});

process.exit(typeof result.status === "number" ? result.status : 1);
