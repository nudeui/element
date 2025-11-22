/**
 * Mixin for adding light DOM styles
 */
import { adoptCSSRecursive, fetchCSS, getSuperclasses } from "./util.js";
import { getSymbols, satisfiedBy } from "../util/get-symbols.js";

const { fetchedGlobalStyles, roots, render, initialized } = getSymbols;

export const Mixin = (Super = HTMLElement) => class GlobalStyles extends Super {
	constructor () {
		super();
		this.init();
	}

	async [render] () {
		let Self = this.constructor;

		if (!Self[fetchedGlobalStyles]?.length) {
			return;
		}

		for (let css of Self[fetchedGlobalStyles]) {
			if (css instanceof Promise) {
				// Why not just await css anyway?
				// Because this way if this is already fetched, we don’t need to wait for a microtask
				css = await css;
			}

			if (!css) {
				continue;
			}

			adoptCSSRecursive(css, this);
		}
	}

	connectedCallback () {
		this[render]();
	}

	moveCallback () {
		this[render]();
	}

	static init () {
		super.init?.();

		if (!this.globalStyles || Object.hasOwn(this, initialized)) {
			return;
		}

		this[initialized] = true;

		let supers = getSuperclasses(this, HTMLElement);
		supers.push(this);

		for (let Class of supers) {
			if (
				Object.hasOwn(Class, "globalStyles") &&
				!Object.hasOwn(Class, fetchedGlobalStyles)
			) {
				// Initiate fetching when the first element is constructed
				let styles = (Class[fetchedGlobalStyles] = Array.isArray(Class.globalStyles)
					? Class.globalStyles.slice()
					: [Class.globalStyles]);
				Class[roots] ??= new WeakSet();

				for (let i = 0; i < styles.length; i++) {
					styles[i] = fetchCSS(styles[i], Class.url);
				}
			}
		}
	}

	static [satisfiedBy] = "globalStyles";
};

export default Mixin();
