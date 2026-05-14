import { default as propsPlugin } from "../../../src/plugins/props/index.js";
import { defineElement } from "../../util/dom.js";
import reflection from "./reflection.js";

export default {
	name: "Props plugin",

	beforeEach () {
		let props = this.arg.props || this.arg || this.data.props;
		let tag = defineElement({
			plugins: [propsPlugin],
			props,
		});
		let element = document.createElement(tag);
		document.body.append(element);
		Object.assign(this.data, { element });
	},

	afterEach () {
		this.data.element.remove();
	},

	tests: [
		reflection,
	],
};
