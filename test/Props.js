import { default as Props } from "../src/plugins/props/util/Props.js";

export default {
	name: "Props class",
	tests: [
		{
			name: "Class with a static props property",
			run (Class) {
				let props = new Props(Class, Class.props);
				return [...props.keys()];
			},
			arg: class {
				static props = {
					foo: {},
					bar: {},
				};
			},
			expect: ["foo", "bar"],
		},
		{
			name: "add()",
			run (...args) {
				let Class = class {
					static props = {};
				};

				let props = new Props(Class, Class.props);
				props.add(...args);

				return [...props.keys()];
			},
			tests: [
				{
					name: "Single prop",
					args: ["foo", {}],
					expect: ["foo"],
				},
				{
					name: "Object literal with props",
					args: [{ foo: {}, bar: {} }],
					expect: ["foo", "bar"],
				},
			],
		},
		{
			name: "observedAttributes()",
			run (Class) {
				let props = new Props(Class, Class.props);
				return props.observedAttributes;
			},
			tests: [
				{
					name: "No props === no observed attributes",
					arg: class {
						static props = {};
					},
					expect: [],
				},
				{
					name: "Observed attributes correspond to reflected props",
					arg: class {
						static props = {
							foo: {},
							bar: {
								reflect: false,
							},
							baz: {
								reflect: { from: "yolo" },
							},
							foobar: {
								reflect: "foo",
							},
						};
					},
					expect: ["foo", "yolo"],
				},
				{
					name: "Props reflecting from an empty string should be ignored",
					arg: class {
						static props = {
							foo: {
								reflect: "",
							},
						};
					},
					expect: [],
				},
			],
		},
	],
};
