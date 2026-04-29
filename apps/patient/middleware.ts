/* Relative path (not the workspace specifier) so Vercel's Edge bundler walks
 * into the actual source instead of externalizing `@lewis/gate` and erroring
 * with "unsupported modules" at deploy time. The vite.config.ts uses the same
 * relative-import trick for its dev plugin. */
export { gateMiddleware as default, gateConfig as config } from "../../packages/gate/src/index.js";
