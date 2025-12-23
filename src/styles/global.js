/**
 * Mixin for adding light DOM styles
 */
import { adoptCSS, fetchCSS, getAllValues } from "./util.js";
import symbols from "../plugins/symbols.js";

const { globalStyles, roots } = symbols.new;

export const hooks = {
	// Initiate fetching when the first element is constructed
	first_constructor_static () {
		if (Object.hasOwn(this, "globalStyles")) {
			// Get fetched styles from this and all superclasses that define any
			// We're doing a bit of duplicate work here, but that's ok because fetchCSS() caches results anyway
			this[globalStyles] = getAllValues(this, "globalStyles").flat().map(localUrl => fetchCSS(localUrl, this.url));
		}
	},

	async connected () {
		let Self = this.constructor;

		if (!Self[globalStyles]) {
			return;
		}

		let styles = Self[globalStyles];
		Self[roots] ??= new WeakSet();

		for (let css of styles) {
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

				if (!Self[roots].has(root)) {
					adoptCSS(css, root);
					Self[roots].add(root);
				}
			} while (root && root.nodeType !== Node.DOCUMENT_NODE);
		}
	},
};

export default {hooks};
