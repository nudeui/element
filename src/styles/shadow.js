/**
 * Mixin for adding shadow DOM styles
 */
import { adoptCSS, fetchCSS, getSupers, getSymbols } from "./util.js";

const { fetchedStyles, initialized, render, init } = getSymbols;

export function appliesTo (Class) {
	return "shadowStyles" in Class;
}

export const Mixin = (Super = HTMLElement) => class ShadowStyles extends Super {
	constructor () {
		super();
		this.init();
	}

	init () {
		if (!this.shadowRoot) {
			return;
		}

		this.constructor[init]();
		this[render]();
	}

	async [render] () {
		let Self = this.constructor;

		let supers = getSupers(Self, HTMLElement);

		for (let Class of supers) {
			if (Class[fetchedStyles]) {
				for (let css of Class[fetchedStyles]) {
					if (css instanceof Promise) {
						// Why not just await css anyway?
						// Because this way if this is already fetched, we don’t need to wait for a microtask
						css = await css;
					}

					adoptCSS(css, this.shadowRoot);
				}
			}
		}
	}

	static [init] () {
		super[init]?.();

		if (!this.shadowStyles || Object.hasOwn(this, initialized)) {
			return;
		}

		this[initialized] = true;

		let supers = getSupers(this, HTMLElement);

		for (let Class of supers) {
			if (Object.hasOwn(Class, "shadowStyles") && !Object.hasOwn(Class, fetchedStyles)) {
				// Initiate fetching when the first element is constructed
				let styles = (Class[fetchedStyles] = Array.isArray(Class["shadowStyles"])
					? Class["shadowStyles"].slice()
					: [Class["shadowStyles"]]);

				for (let i = 0; i < styles.length; i++) {
					styles[i] = fetchCSS(styles[i], Class.url);
				}
			}
		}
	}

	static appliesTo = appliesTo;
};

Mixin.appliesTo = appliesTo;

export default Mixin();
