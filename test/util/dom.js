import ElementFactory from "../../src/element/factory.js";

let counter = 0;

/**
 * Define a one-off custom element for tests; returns the tag name.
 * `plugins` composes the element class; every other key becomes a static class
 * member (`props`, `states`, `events`, …) for the matching plugin to read.
 * `mixin` (optional) is called with the class so tests can install instance
 * methods (e.g. `updated`, `propChangedCallback`) before `customElements.define`.
 */
export function defineElement ({ plugins, mixin, ...statics } = {}) {
	let tag = `nude-element-${counter++}`;
	let Class = class extends ElementFactory(HTMLElement, plugins) {};
	Object.assign(Class, statics);
	mixin?.(Class);
	customElements.define(tag, Class);
	return tag;
}
