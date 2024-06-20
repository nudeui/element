import { default as Props } from "../src/props/Props.js";

export default {
	name: "Props class",
	run (Class) {
		return new Props(Class);
	},
	tests: [
		{
			name: "add()",
			run (...args) {
				let FooClass = class {
					static props = {};
				};

				let props = new Props(FooClass);
				props.add(...args);

				return props;
			},
			check (actual, expected) {
				return expected.every(name => actual.has(name));
			},
			tests: [
				{
					name: "Single prop",
					args: ["foo", {}],
					expect: ["foo"],
				},
				{
					name: "Object with props",
					args: [{ foo: {}, bar: {} }],
					expect: ["foo", "bar"],
				},
			],
		},
		{
			name: "observedAttributes()",
			run (Class) {
				let props = new Props(Class);
				return props.observedAttributes;
			},
			tests: [
				{
					name: "No props",
					arg: class {
						static props = {};
					},
					expect: [],
				},
				{
					name: "All props",
					arg: class {
						static props = {
							foo: {},
							bar: {},
						};
					},
					expect: ["foo", "bar"],
				},
				{
					name: "Reflected only",
					arg: class {
						static props = {
							foo: {},
							bar: {
								reflect: false,
							},
						};
					},
					expect: ["foo"],
				},
			],
		},
	],
};
