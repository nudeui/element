import { default as Props } from "../src/props/Props.js";

export default {
	name: "Props class",
	tests: [
		{
			name: "add()",
			run (...args) {
				let Class = class {
					static props = {};
				};

				let props = new Props(Class);
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
			name: "Props.add()",
			tests: [
				{
					name: "Class.props is an object literal",
					description: "Class.props should have a new property with the given name",
					run (name) {
						let Class = class {
							static props = {};
						};

						Props.add(Class, name, {});

						return Class.props;
					},
					arg: "foo",
					expect: { foo: {} },
				},
				{
					name: "Class.props is an instance of Props",
					description: "Class.props should have a new prop with the given name",
					run (name) {
						let Class = class {
							static props = {};
						};

						Class.props = new Props(Class);
						Props.add(Class, name, {});

						return Class.props.get(name).name;
					},
					arg: "foo",
					expect: "foo",
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
