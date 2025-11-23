/**
 * Mixin for adding light DOM styles
 */
import { adoptCSSRecursive } from "../../util/adopt-css.js";
import { fetchCSS } from "../../util/fetch-css.js";
import { newSymbols, satisfiedBy } from "../../util/symbols.js";

export const { resolvedStyles, render, initialized, self } = newSymbols;

export const Mixin = (Super = HTMLElement) => class GlobalStyles extends Super {
	constructor () {
		super();

		// Initiate fetching when the first element is constructed
		// if nothing has called it yet
		this.constructor.init();
	}

	async [render] () {
		let Self = this.constructor;

		if (!Self[resolvedStyles]?.length) {
			return;
		}

		let styles = Self[resolvedStyles].map(style => fetchCSS(style, Self.url));

		for (let css of styles) {
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

	static [self] = self;

	static init () {
		super.init?.();

		if (!this.globalStyles || Object.hasOwn(this, initialized)) {
			return;
		}

		this[initialized] = true;

		let Super = Object.getPrototypeOf(this);

		if (!Super[self]) {
			// If self is not defined, it means we've gone past the subclass that included this
			this.init.call(Super);
		}

		if (Object.hasOwn(this, "globalStyles")) {
			if (!Array.isArray(this.globalStyles)) {
				this.globalStyles = [this.globalStyles];
			}

			this[resolvedStyles] = this.globalStyles.slice();

			if (Super[resolvedStyles]) {
				this[resolvedStyles].unshift(...Super[resolvedStyles]);
			}
		}
	}

	static [satisfiedBy] = "globalStyles";
};

export default Mixin();
