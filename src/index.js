/**
 * Main entry point.
 * Use @link{index-fn} for tree-shaking
 */

export * from "./index-fn.js";
import { ElementFactory, commonPlugins, Element as NudeElement } from "./index-fn.js";
export { NudeElement };

const Element = ElementFactory(HTMLElement, commonPlugins);
Element.setup();
export default Element;
