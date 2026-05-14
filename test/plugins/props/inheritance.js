import ElementFactory from "../../../src/element/factory.js";
import { default as propsPlugin } from "../../../src/plugins/props/index.js";

export default {
	name: "Inheritance",

	tests: [
		{
			name: "Child inherits, overrides, and adds props",
			description:
				"Combines the #104 baseline (parent prop installs) with the override rule (child wins when both classes declare the same prop).",
			run () {
				let Parent = class extends ElementFactory(HTMLElement, [propsPlugin]) {
					static props = {
						inherited: { type: Number },
						shared: { type: Number },
					};
				};
				let Child = class extends Parent {
					static props = {
						shared: { type: String },
						own: { type: Number },
					};
				};

				let tag = "nude-element-hierarchy";
				customElements.define(tag, Child);

				let element = document.createElement(tag);
				document.body.append(element);

				element.inherited = "3";
				element.shared = "5";
				element.own = "7";

				return {
					inherited: element.inherited,
					shared: element.shared,
					own: element.own,
				};
			},
			expect: {
				inherited: 3,
				shared: "5",
				own: 7,
			},
		},
	],
};
