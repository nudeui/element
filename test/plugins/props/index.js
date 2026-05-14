import { default as propsPlugin } from "../../../src/plugins/props/index.js";
import { defineElement } from "../../util/dom.js";
import reflection from "./reflection.js";
import defaults from "./defaults.js";
import computed from "./computed.js";

export default {
	name: "Props plugin",

	beforeEach () {
		let { props, attributes } = this.arg;
		let tag = defineElement({ plugins: [propsPlugin], props });
		let element = document.createElement(tag);

		for (let [name, value] of Object.entries(attributes ?? {})) {
			element.setAttribute(name, value);
		}

		document.body.append(element);

		Object.assign(this.data, { element });
	},

	afterEach () {
		this.data.element.remove();
	},

	tests: [reflection, defaults, computed],
};
