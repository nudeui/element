/**
 * Mixin for adding shadow DOM styles
 */
import { adoptCSS } from "../util/adopt-css.js";
import { fetchCSS } from "../util/fetch-css.js";
import { getSupers } from "../util/get-supers.js";
import mounted from "../mounted.js";

export const shadowStylesFetched = Symbol("shadow styles fetched");

export class ShadowStylesMixin extends HTMLElement {
	static mixins = [mounted];

	/** Automatically runs once per class the first time an instance is connected */
	static mounted () {
		if (!this.styles || Object.hasOwn(this, shadowStylesFetched)) {
			return;
		}

		let supers = getSupers(this, HTMLElement);

		for (let Class of supers) {
			if (Object.hasOwn(Class, "styles") && !Object.hasOwn(Class, "fetchedStyles")) {
				// Initiate fetching when the first element is constructed
				let styles = (Class.fetchedStyles = Array.isArray(Class.styles)
					? Class.styles.slice()
					: [Class.styles]);

				for (let i = 0; i < styles.length; i++) {
					styles[i] = fetchCSS(styles[i], Class.url);
				}
			}
		}

		this[shadowStylesFetched] = true;
	}

	async mounted () {
		if (!this.shadowRoot) {
			return;
		}

		let Self = this.constructor;
		let supers = getSupers(Self, HTMLElement);

		for (let Class of supers) {
			if (Object.hasOwn(Class, "fetchedStyles")) {
				for (let css of Class.fetchedStyles) {
					if (css instanceof Promise) {
						css = await css;
					}

					adoptCSS(css, this.shadowRoot);
				}
			}
		}
	}
}

export default ShadowStylesMixin;
