import stylesPlugin from "./base.js";

export const dependencies = [stylesPlugin];

export const hooks = {
	first_constructor_static () {
		if (Object.hasOwn(this, "lightStyles")) {
			this.defineStyles(this.lightStyles, { light: true });
		}
	},

	connected_apply_style ({ roots, options}) {
		if (options.roots.has("light")) {
			roots.add(this.getRootNode());
		}
	},

	define_style ({ style }) {
		if (style.light) {
			style.roots.add("light");
		}
	},
};

export default { dependencies, hooks };
