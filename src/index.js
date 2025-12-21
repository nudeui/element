/**
 * Main entry point.
 * Use @link{index-fn} for tree-shaking and no side effects
 * @modifies {Element}
 */

export * from "./index-fn.js";
import { getElement, commonPlugins } from "./index-fn.js";

const Element = getElement(HTMLElement, commonPlugins);
Element.setup();
export default Element;
