/**
 * Main entry point.
 * Use @link{index-fn} for tree-shaking
 */

export * from "./index-fn.js";
import { getElement, commonPlugins, Element as NudeElement } from "./index-fn.js";
export { NudeElement };

const Element = getElement(HTMLElement, commonPlugins);
Element.setup();
export default Element;
