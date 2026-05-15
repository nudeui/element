import { defineElement } from "../../util/dom.js";
import { default as propsPlugin } from "../../../src/plugins/props/index.js";

export default {
	name: "Installation",

	tests: [
		{
			name: "Property and attribute set before connect survive mount",
			description:
				"Consumer pattern: createElement, set a prop, set an attribute, then append",
			run () {
				let tag = defineElement({
					plugins: [propsPlugin],
					props: {
						foo: {},
						bar: { type: Number, reflect: true },
						derived: {
							get () {
								return `${this.foo}/${this.bar}`;
							},
						},
					},
				});

				let element = document.createElement(tag);
				element.foo = "hello";
				element.setAttribute("bar", "42");
				document.body.append(element);

				let result = {
					foo: element.foo,
					bar: element.bar,
					derived: element.derived,
				};
				element.remove();
				return result;
			},
			expect: {
				foo: "hello",
				bar: 42,
				derived: "hello/42",
			},
		},
	],
};
