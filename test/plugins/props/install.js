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
		{
			name: "Computed reading a sibling during mount sees its parsed value, not a raw pre-mount write",
			description:
				"`derived` cascades from `trigger`'s init; it must read `items` through the accessor " +
				"(parse: \"x,y,z\" → array), not the still-shadowing pre-mount own data property.",
			run () {
				let observed;

				let tag = defineElement({
					plugins: [propsPlugin],
					props: {
						trigger: { type: Number },
						items: {
							parse: value => (typeof value === "string" ? value.split(",") : value),
						},
						derived: {
							get () {
								if (this.trigger !== undefined) {
									observed ??= this.items;
								}

								return observed;
							},
						},
					},
				});

				let element = document.createElement(tag);
				element.trigger = 1;
				element.items = "x,y,z";
				document.body.append(element);

				element.remove();
				return observed;
			},
			expect: ["x", "y", "z"],
		},
	],
};
