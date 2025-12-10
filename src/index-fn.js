/**
 * Main entry point
 * when tree-shaking and no side effects are desired
 */
export { default as Element } from "./Element.js";
export * from "./common-plugins.js";
export { default as commonPlugins } from "./common-plugins.js";
export { default as Hooks } from "./mixins/hooks.js";
export { default as symbols } from "./util/symbols.js";
export * from "./plugins.js";
