/**
 * Extensible plugin for adding styles to an element's shadow root or other roots
 */
import { getOwnValue, adoptStyle } from "./util.js";
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
	 * @param { (object | string)[] } def - Styles to define
	 * @param {object} defaultOptions - Options for styles passed as string URLs
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
			if (typeof options === "string") {
				options = { url: options, ...defaultOptions };
			}
			else {
				options = Object.assign({}, defaultOptions, options);
			}

			let env = { options, style: options };

			if (options.url) {
				// Consolidate style definitions with the same URL
				env.fullUrl = new URL(options.url, baseUrl).href;
				env.existing = this[styles].find(style => style.fullUrl === env.fullUrl);

				if (env.existing) {
					env.style = Object.assign(env.existing, env.options);
				}
				else {
					env.style.fullUrl ??= env.fullUrl;
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
