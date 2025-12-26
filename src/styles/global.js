/**
 * Mixin for adding light DOM styles
 */
import { adoptStyleByUrl, getAllValues } from "./util.js";
import symbols from "../plugins/symbols.js";

const { globalStyles } = symbols.new;

export const hooks = {
	// Initiate fetching when the first element is constructed
	first_constructor_static () {
		if (Object.hasOwn(this, "globalStyles")) {
			// Get fetched styles from this and all superclasses that define any
			this[globalStyles] = getAllValues(this, "globalStyles").flat();
		}
	},

	async connected () {
		let Self = this.constructor;

		if (!Self[globalStyles]) {
			return;
		}

		let styles = Self[globalStyles];
		let roots = getRoots(this);

		for (let url of styles) {
			// Recursively adopt style on all shadow roots all the way up to the document
			for (let root of roots) {
				adoptStyleByUrl(url, root);
			}
		}
	},
};

export default {hooks};

function getRoots (element) {
	let roots = [];
	let root = element;
	do {
		root = root.host ?? root;
		root = root.getRootNode();
		roots.push(root);
	} while (root && root.nodeType !== Node.DOCUMENT_NODE);
	return roots;
}
