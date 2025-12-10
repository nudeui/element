import newSymbols, { internals } from "../util/symbols.js";

const defaultRole = newSymbols;

export const defaultRoles = {
	textarea: "textbox",
	button: "button",
	input: {
		[defaultRole]: "textbox",
		"[type=checkbox][switch]": "switch",
		"[type=checkbox]": "checkbox",
		"[type=radio]": "radio",
		"[type=range]": "slider",
		"[type=number]": "spinbutton",
		"[type=button], [type=submit], [type=reset]": "button",
	},
	select: {
		[defaultRole]: "combobox",
		"[size]:not([size='1'])": "listbox",
	},
	option: "option",
	optgroup: "group",
};

export function getDefaultRole (element) {
	if (!element) {
		return null;
	}

	let tag = element.tagName.toLowerCase();
	let roles = defaultRoles[tag];

	if (!roles) {
		return null;
	}

	if (typeof roles === "string") {
		return roles;
	}

	for (let [selector, role] of Object.entries(roles)) {
		if (element.matches(selector)) {
			return role;
		}
	}

	return roles[defaultRole];
}

export function getRole (element) {
	if (!element) {
		return null;
	}

	if (element.role) {
		return element.role;
	}

	if (element[internals].role) {
		return element[internals].role;
	}

	return getDefaultRole(element);
}

export default getRole;
