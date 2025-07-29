import { resolveValue } from "../util.js";
import defineMixin from "../mixins/defineMixin.js";

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
	if (HTMLElement.prototype.attachInternals === undefined) {
		// Not supported
		return;
	}

	for (let prop of getters) {
		Object.defineProperty(Class.prototype, prop, {
			get () {
				return this[internalsProp][prop];
			},
			enumerable: true,
		});
	}

	Class.formAssociated = true;

	return defineMixin(Class, function init () {
		let internals = (this[internalsProp] ??= this.attachInternals());

		if (internals) {
			let source = resolveValue(like, [this, this]);
			role ??= source?.computedRole;

			if (role) {
				// XXX Should we set a default role? E.g. "textbox"?
				internals.ariaRole = role ?? source?.computedRole;
			}

			internals.setFormValue(this[valueProp]);
			source.addEventListener(changeEvent, () => internals.setFormValue(this[valueProp]));
		}
	});
}
