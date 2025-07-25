/**
 * Mixin for adding light DOM styles
 */
import { adoptCSS, fetchCSS } from "./util.js";

export default {
	setup () {
		if (!this.globalStyles) {
			return;
		}

		// Initiate fetching when the first element is constructed
		let styles = this.fetchedGlobalStyles = Array.isArray(this.globalStyles) ? this.globalStyles.slice() : [this.globalStyles];
		this.roots = new WeakSet();

		for (let i = 0; i < styles.length; i++) {
			styles[i] = fetchCSS(styles[i], this.url);
		}

	},

	async connected () {
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
			// FIXME this will do nothing if the component gets moved to a different shadow root
			let root;
			do {
				root = this.getRootNode();
				if (!Self.roots.has(root)) {
					adoptCSS(css, root);
					Self.roots.add(root);
				}
			}
			while (root && root.nodeType !== Node.DOCUMENT_NODE);
		}
	}
}
