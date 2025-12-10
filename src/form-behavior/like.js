import { internals, newKnownSymbols } from "../util/symbols.js";
import { resolveValue } from "../util.js";
import { getRole } from "./role.js";

const { formBehavior } = newKnownSymbols;

export const hooks = {
	first_connected () {
		let { like, role, valueProp = "value", changeEvent = "input" } = this.constructor[formBehavior];

		if (!like) {
			return;
		}

		let source = resolveValue(like, [this, this]);
		if (source && !role) {
			role = source.computedRole ?? getRole(source);
		}

		if (role) {
			// XXX Should we set a default role? E.g. "textbox"?
			this[internals].role = role;
		}

		// Set up value reflection
		this[internals].setFormValue(this[valueProp]);
		source.addEventListener(changeEvent, () => this[internals].setFormValue(this[valueProp]));
	},
};
