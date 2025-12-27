import stylesPlugin from "./base.js";

export const dependencies = [stylesPlugin];

export const hooks = {
	first_constructor_static () {
		if (Object.hasOwn(this, "documentStyles")) {
			this.defineStyles(this.documentStyles, { document: true });
		}
	},

	connected_apply_style ({ roots, options}) {
		if (options.roots.has("document")) {
			roots.add(this.ownerDocument);
		}
	},

	define_style ({ style }) {
		if (style.document) {
			style.roots.add("document");
		}
	},
};

export default { dependencies, hooks };
