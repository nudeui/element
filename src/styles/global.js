/**
 * Mixin for adding light DOM styles
 */
import { getSupers } from "../util/get-supers.js";
import { adoptCSS } from "../util/adopt-css.js";
import { fetchCSS } from "../util/fetch-css.js";
import mounted from "../mounted.js";

export const globalStylesFetched = Symbol("global styles fetched");

export class GlobalStylesMixin extends HTMLElement {
	static mixins = [mounted];

	/** Automatically runs once per class the first time an instance is connected */
	static mounted () {
		if (!this.globalStyles || Object.hasOwn(this, globalStylesFetched)) {
			return;
		}

		let supers = getSupers(this, HTMLElement);

		for (let Class of supers) {
			if (
				Object.hasOwn(Class, "globalStyles") &&
				!Object.hasOwn(Class, "fetchedGlobalStyles")
			) {
				// Initiate fetching when the first element is constructed
				let styles = (Class.fetchedGlobalStyles = Array.isArray(Class.globalStyles)
					? Class.globalStyles.slice()
					: [Class.globalStyles]);
				Class.roots = new WeakSet();

				for (let i = 0; i < styles.length; i++) {
					styles[i] = fetchCSS(styles[i], Class.url);
				}
			}
		}

		this[globalStylesFetched] = true;
	}

	async mounted () {
		let Self = this.constructor;

		if (!Self.fetchedGlobalStyles?.length) {
			return;
		}

		for (let css of Self.fetchedGlobalStyles) {
			if (css instanceof Promise) {
				// Why not just await css anyway?
				// Because this way if this is already fetched, we don’t need to wait for a microtask
				css = await css;
			}

			if (!css) {
				continue;
			}

			// Recursively adopt style on all shadow roots all the way up to the document
			let root = this;
			do {
				root = root.host ?? root;
				root = root.getRootNode();

				if (!Self.roots.has(root)) {
					adoptCSS(css, root);
					Self.roots.add(root);
				}
			} while (root && root.nodeType !== Node.DOCUMENT_NODE);
		}
	}
}

export default GlobalStylesMixin;
