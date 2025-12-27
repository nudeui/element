/**
 * Plugin for adding light DOM styles on every root node all the way up to the document
 */

import stylesPlugin from "./base.js";

export const dependencies = [stylesPlugin];

export const hooks = {
	first_constructor_static () {
		if (Object.hasOwn(this, "globalStyles")) {
			this.defineStyles(this.globalStyles, { global: true });
		}
	},

	connected_apply_style ({ roots, options }) {
		if (options.roots.has("global")) {
			for (let root of getRoots(this)) {
				roots.add(root);
			}
		}
	},

	define_style ({ style }) {
		if (style.global) {
			style.roots.add("global");
			style.roots.delete("light");
			style.roots.delete("document");
		}
	},
};

export default { dependencies, hooks };

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
