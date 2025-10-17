/**
 * Mixin for adding shadow DOM styles
 */
import { adoptCSS, fetchCSS, getSupers } from "./util.js";
import mounted from "../mounted.js";

export class ShadowStylesMixin extends HTMLElement {
	static mixins = [mounted];

	static setup () {
		if (!this.styles) {
			return;
		}

		let supers = getSupers(this);

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
	}

	async mounted () {
		if (!this.shadowRoot) {
			return;
		}

		let Self = this.constructor;
		let supers = getSupers(Self);

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
