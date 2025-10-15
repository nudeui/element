import { resolveValue } from "./util/resolve-value.js";
import mounted from "./mounted.js";

export default function  (
	Class,
	{
		like,
		role,
		valueProp = "value",
		changeEvent = "input",
		internalsProp = "_internals",
		getters = [
			"labels",
			"form",
			"type",
			"name",
			"validity",
			"validationMessage",
			"willValidate",
		],
	} = Class.formAssociated,
) {
	// Stuff that runs once per mixin
	if (HTMLElement.prototype.attachInternals === undefined) {
		// Not supported
		return;
	}

	let ret = class FormAssociatedMixin extends HTMLElement {
		static mixins = [mounted];

		mounted () {
			let internals = (this[internalsProp] ??= this.attachInternals());

			if (internals) {
				let source = resolveValue(like, [this, this]);
				role ??= source?.computedRole;

				if (role) {
					internals.ariaRole = role ?? source?.computedRole;
				}

				internals.setFormValue(this[valueProp]);
				(source || this).addEventListener(changeEvent, () =>
					internals.setFormValue(this[valueProp]));
			}
		}

		static formAssociated = true;
	};

	for (let prop of getters) {
		Object.defineProperty(ret.prototype, prop, {
			get () {
				return this[internalsProp][prop];
			},
			enumerable: true,
		});
	}

	return ret;
}
