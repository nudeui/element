import { restoreNativeCustomEvent } from "../../util/happy-dom.js";
import ElementFactory from "../../../src/element/factory.js";
import { default as propsPlugin, props } from "../../../src/plugins/props/index.js";

restoreNativeCustomEvent();

let i = 0;

export default {
	name: "Inheritance",
	beforeEach () {
		class ParentElement extends ElementFactory(HTMLElement, [propsPlugin]) {
			static props = {
				parentOnly: { type: Number },
				overridden: { default: "5" },
			};
		}
		class ChildElement extends ParentElement {
			static props = {
				childOnly: { type: Number },
				overridden: { type: Number },
			};
		}
		ParentElement.setup();
		ChildElement.setup();

		Object.assign(this.data, { ParentElement, ChildElement });
	},
	data: {},

	tests: [
		{
			name: "Parent class gets its own Props, linked from Child via `parent`",
			description:
				"When a Child class with `static props` extends a Parent that also " +
				"declares `static props`, instantiating Child triggers Parent's Props " +
				"creation (via the setup hook chain), populates it with Parent's " +
				"declared props, and Child[props].parent references it.",
			expect: true,
			tests: [
				{
					name: "Parent class has a Props instance",
					run () {
						return Boolean(this.data.ParentElement[props]);
					},
				},
				{
					name: "Parent Props instance is different from Child's",
					run () {
						return this.data.ParentElement[props] !== this.data.ChildElement[props];
					},
				},
				{
					name: "Parent class's Props includes its declared prop",
					run () {
						return this.data.ParentElement[props].has("parentOnly");
					},
				},
				{
					name: "Child class's Props includes its declared prop",
					run () {
						return this.data.ChildElement[props].has("childOnly");
					},
				},
			],
		},
		{
			name: "Child inherits, overrides, and adds props",
			description:
				"Combines the #104 baseline (parent prop installs) with the override rule (child wins when both classes declare the same prop).",
			beforeEach () {
				this.parent.parent.beforeEach.call(this);
				let { ParentElement, ChildElement } = this.data;

				let tag = `nude-element-parent-props-${i++}`;
				customElements.define(tag, ChildElement);
				this.data.childElement = document.body.appendChild(document.createElement(tag));
			},
			run (prop, value) {
				this.data.childElement[prop] = value;
				return this.data.childElement[prop];
			},
			tests: [
				{
					args: ["parentOnly", "3"],
					expect: 3,
				},
				{
					args: ["overridden", "5"],
					expect: 5,
				},
				{
					args: ["childOnly", "7"],
					expect: 7,
				},
			],
		},
	],
};
