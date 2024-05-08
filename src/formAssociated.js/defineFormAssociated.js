import {
	defineInstanceProperty,
	getValue,
} from "../util.js";

export default function (Class, {
	like,
	role,
	valueProp = "value",
	changeEvent = "input",
	internalsProp = "_internals",
	getters = ["labels", "form", "type", "name", "validity", "validationMessage", "willValidate"],
} = Class.formAssociated) {
	defineInstanceProperty(Class, internalsProp, el => {
		let source = getValue(like, [el, el]);
		let internals = el.attachInternals?.();

		if (internals) {
			internals.ariaRole = role ?? source?.computedRole ?? "textbox";
			internals.setFormValue(el[valueProp]);
			el.addEventListener(changeEvent, () => internals.setFormValue(el[valueProp]));
		}

		return internals;
	});

	for (let prop of getters) {
		Object.defineProperty(Class.prototype, prop, {
			get () {
				return this[internalsProp][prop];
			},
			enumerable: true,
		});
	}

	Class.formAssociated = true;
}