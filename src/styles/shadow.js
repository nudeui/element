/**
 * Mixin for adding shadow DOM styles
 */
import { adoptCSS, toArray, fetchCSS } from "./util.js";

export default {
	setup () {
		if (!this.styles) {
			return;
		}

		// Initiate fetching when the first element is constructed
		let styles = this.fetchedStyles = Array.isArray(this.styles) ? this.styles.slice() : [this.styles];

		for (let i = 0; i < styles.length; i++) {
			styles[i] = fetchCSS(styles[i], this.url);
		}
	},
	async init () {
		if (!this.shadowRoot) {
			return;
		}

		let Self = this.constructor;

		if (Self.fetchedStyles) {
			for (let css of Self.fetchedStyles) {
				if (css instanceof Promise) {
					// Why not just await css anyway?
					// Because this way if this is already fetched it will happen synchronously
					css = await css;
				}

				adoptCSS(css, this.shadowRoot);
			}
		}
	}
}
