/**
 * Main entry point.
 * Use @link{index-fn} for tree-shaking and no side effects
 * @modifies {Element}
 */

import { Element, commonPlugins } from "./index-fn.js";

Element.plugins.push(...commonPlugins);
Element.setup();

export * from "./index-fn.js";
export default Element;
