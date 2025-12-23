/**
 * Mixin for adding shadow DOM styles
 */
import { getSupers, adoptCSS, fetchCSS, getAllValues } from "./util.js";
import symbols from "../plugins/symbols.js";

const { shadowStyles } = symbols.new;
const { shadowRoot } = symbols.known;

export const hooks = {
	// Initiate fetching when the first element is constructed
	first_constructor_static () {
		if (!this.styles) {
			return;
		}

		if (Object.hasOwn(this, "styles")) {
			// Get fetched styles from this and all superclasses that define any
			// We're doing a bit of duplicate work here, but that's ok because fetchCSS() caches results anyway
			this[shadowStyles] = getAllValues(this, "styles").flat().map(localUrl => fetchCSS(localUrl, this.url));
		}
	},

	async first_connected () {
		if (!this.shadowRoot && !this[shadowRoot]) {
			return;
		}

		let Self = this.constructor;

		if (!Self[shadowStyles]) {
			return;
		}

		for (let css of Self[shadowStyles]) {
			if (css instanceof Promise) {
				css = await css;
			}

			adoptCSS(css, this.shadowRoot);
		}
	},
};

export default {hooks};
