/**
 * Mixin for adding shadow DOM styles
 */
import { adoptStyleByUrl, getAllValues } from "./util.js";
import symbols from "../plugins/symbols.js";

const { shadowStyles } = symbols.new;
const { shadowRoot } = symbols.known;

export const hooks = {
	// Initiate fetching when the first element is constructed
	first_constructor_static () {
		if (Object.hasOwn(this, "styles")) {
			// Get fetched styles from this and all superclasses that define any
			this[shadowStyles] = getAllValues(this, "styles").flat();
		}
	},

	async first_connected () {
		let root = this.shadowRoot ?? this[shadowRoot];
		if (!root) {
			return;
		}

		let Self = this.constructor;

		if (!Self[shadowStyles]) {
			return;
		}

		for (let url of Self[shadowStyles]) {
			adoptStyleByUrl(url, root);
		}
	},
};

export default {hooks};
