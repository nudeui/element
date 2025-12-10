/**
 * Mixin for adding shadow DOM styles
 */
import { getSupers, adoptCSS, fetchCSS } from "./util.js";
import getSymbols from "../util/symbols.js";

const { fetchedStyles } = getSymbols;

export const hooks = {
	first_constructor_static () {
		if (!this.styles) {
			return;
		}

		let supers = getSupers(this, HTMLElement);

		for (let Class of supers) {
			if (Object.hasOwn(Class, "styles") && !Object.hasOwn(Class, fetchedStyles)) {
				// Initiate fetching when the first element is constructed
				let styles = (Class[fetchedStyles] = Array.isArray(Class.styles)
					? Class.styles.slice()
					: [Class.styles]);

				for (let i = 0; i < styles.length; i++) {
					styles[i] = fetchCSS(styles[i], Class.url);
				}
			}
		}
	},

	async first_connected () {
		if (!this.shadowRoot) {
			return;
		}

		let Self = this.constructor;
		let supers = getSupers(Self, HTMLElement);

		for (let Class of supers) {
			if (Class[fetchedStyles]) {
				for (let css of Class[fetchedStyles]) {
					if (css instanceof Promise) {
						css = await css;
					}

					adoptCSS(css, this.shadowRoot);
				}
			}
		}
	},
};
