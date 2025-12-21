/**
 * Main entry point
 * when tree-shaking and no side effects are desired
 */
export { default as Element } from "./element/Element.js";
export * from "./common-plugins.js";
export { default as commonPlugins } from "./common-plugins.js";
export { default as Hooks } from "./plugins/hooks.js";
export { default as symbols } from "./plugins/symbols.js";
export * from "./plugins/plugins.js";
