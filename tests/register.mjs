/**
 * register.mjs, registers the test resolver hook.
 * Loaded through `node --import ./tests/register.mjs`.
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./loader.mjs", pathToFileURL("./tests/"));
