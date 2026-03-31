/**
 * Extensible plugin for adding styles to an element's shadow root or other roots
 */
import { getOwnValue, adoptStyle, getStyle } from "./util.js";
import { getSuper, getComposedArray, defineOwnProperty, symbols } from "../../extensible.js";

export const { styles } = symbols.known;
const defaultBaseURL = globalThis.document?.location?.href ?? import.meta.url;

const hooks = {
	first_constructor_static () {
		if (Object.hasOwn(this, "styles")) {
			this.defineStyles(this.styles);
		}
		if (Object.hasOwn(this, "shadowStyles")) {
			this.defineStyles(this.shadowStyles, { shadow: true });
		}
	},

	connected () {
		if (!this.constructor[styles]) {
			return;
		}

		let allStyles = getComposedArray(this.constructor, styles);

		for (let options of allStyles) {
			let env = { options };
			env.roots = new Set();

			if (env.options.roots.has("shadow")) {
				let root = this.shadowRoot ?? this[symbols.known.shadowRoot];
				if (root) {
					env.roots.add(root);
				}
			}

			this.$hook("connected-apply-style", env);

			adoptStyle(env.options, env.roots);
		}
	},
};

const providesStatic = {
	/**
	 * Define styles for the component
	 * @param { (object | string | URL | CSSStyleSheet | Promise)[] } def - Styles to define
	 * @param {object} defaultOptions - Default options merged into each style entry
	 * @void
	 */
	defineStyles (
		def = getOwnValue(this, "styles"),
		defaultOptions = { roots: new Set(["shadow"]) },
	) {
		if (!def) {
			return;
		}

		if (!Array.isArray(def)) {
			def = [def];
		}

		const baseUrl = this.url ?? defaultBaseURL;

		for (let options of def) {
			options = getStyle(options, baseUrl, defaultOptions);

			let env = { options, style: options };

			if (options.fullUrl) {
				// Consolidate style definitions with the same URL
				env.existing = this[styles].find(style => style.fullUrl === options.fullUrl);

				if (env.existing) {
					env.style = Object.assign(env.existing, env.options);
				}
			}

			env.style.roots ??= new Set();

			this.$hook("define-style", env);

			if (env.style.roots.size === 0 || env.options.shadow) {
				env.style.roots.add("shadow");
			}

			if (!env.existing) {
				this[styles].push(env.style);
			}
		}
	},
};

defineOwnProperty(providesStatic, styles, () => []);

export default { hooks, providesStatic };
