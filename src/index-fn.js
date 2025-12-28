/**
 * /fn entry point
 * when tree-shaking and no side effects are desired
 */
export * from "./element/index.js";
export { default as default } from "./element/index.js";
export * from "./plugins/index-fn.js";
export { default as commonPlugins } from "./plugins/index.js";
