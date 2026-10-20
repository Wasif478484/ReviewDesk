/**
 * loader.mjs, a small ESM resolver hook for the unit tests.
 *
 * Two things it fixes:
 *   1. Node's ESM loader needs a file extension on relative imports. The
 *      source uses extensionless imports, which is fine for the bundler.
 *   2. The source uses the `@/` path alias. Node has no idea what that is.
 *
 * The hook only affects `node --test` runs. The app itself is bundled by
 * Next.js and never loads this file.
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

export async function resolve(specifier, context, nextResolve) {
  // `@/lib/engine/policy` -> `<root>/src/lib/engine/policy.ts`
  if (specifier.startsWith("@/")) {
    const base = path.join(SRC, specifier.slice(2));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (existsSync(candidate) && path.extname(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true, format: formatFor(candidate) };
      }
    }
  }

  // Extensionless relative import -> try `.ts` and `.tsx`.
  if (specifier.startsWith(".") && !path.extname(specifier)) {
    const parent = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : ROOT;
    const base = path.resolve(parent, specifier);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true, format: formatFor(candidate) };
      }
    }
  }

  return nextResolve(specifier, context);
}

/**
 * Node strips types from `.ts` files when the module format says so. Handing
 * back plain "module" would make Node try to parse TypeScript as JavaScript.
 */
function formatFor(filePath) {
  if (filePath.endsWith(".ts")) return "module-typescript";
  if (filePath.endsWith(".tsx")) return "module-typescript";
  return "module";
}
