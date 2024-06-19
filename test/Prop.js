import { default as Prop } from "../src/props/Prop.js";
import { equals } from "htest.dev/check";

let props = {
	empty: {},
	computed: {
		get () {},
	},
	computedReflected: {
		get () {},
		reflect: true,
	},
	reflectFalse: {
		reflect: false,
	},
	reflectName: {
		reflect: "foo",
	},
	reflectFromTrue: {
		reflect: { from: true },
	},
	reflectFromFalse: {
		reflect: { from: false },
	},
	reflectFromName: {
		reflect: { from: "foo" },
	},
	reflectToTrue: {
		reflect: { to: true },
	},
	reflectToFalse: {
		reflect: { to: false },
	},
	reflectToName: {
		reflect: { to: "foo" },
	},
	reflectBoth: {
		reflect: { from: true, to: false },
	},
	reflectBothName: {
		reflect: { from: "foo", to: "bar" },
	},
	simpleType: {
		type: String,
	},
	complexType: {
		type: {
			is: String,
			foo: 42,
		},
	},
	defaultValue: {
		default: "default",
	},
	defaultFunction: {
		default: () => "default",
	},
	defaultProp: {
		defaultProp: "defaultValue",
	},
	dependencies: {
		dependencies: ["foo", "bar"],
	},
	dependenciesInferred: {
		get: () => this.foo + this.bar,
		convert: () => this.bar + this.baz,
	},
	dependenciesAdditional: {
		get: () => this.foo + this.bar,
		additionalDependencies: ["yolo"],
	},
	dependenciesIgnoreInferred: {
		convert: () => this.bar + this.baz,
		dependencies: ["yolo"],
	},
};

let propsMap = new Map(Object.entries(props));

export default {
	name: "Prop class",
	tests: [
		{
			name: "constructor()",
			run (name) {
				return new Prop(name, props[name], propsMap);
			},
			check (actual, expected) {
				let keys = Object.keys(expected);
				for (let key of keys) {
					if (!equals(actual[key], expected[key])) {
						return false;
					}
				}

				return true;
			},
			tests: [
				{
					name: "Empty spec",
					arg: "empty",
					expect: {
						name: "empty",
						type: undefined,
						default: undefined,
						dependencies: new Set(),
						reflect: true,
					},
				},
				{
					name: "Types",
					tests: [
						{
							name: "Simple",
							args: "simpleType",
							expect: {
								type: { is: String },
							},
						},
						{
							name: "Complex",
							args: "complexType",
							expect: {
								type: {
									is: String,
									foo: 42,
								},
							},
						},
					],
				},
				{
					name: "Defaults",
					tests: [
						{
							name: "Value",
							args: "defaultValue",
							expect: { default: "default" },
						},
						{
							name: "Function",
							args: "defaultFunction",
							expect: { default: props.defaultFunction.default },
						},
						{
							name: "Prop",
							args: "defaultProp",
							expect: { default: propsMap.get("defaultValue") },
						},
					],
				},
				{
					name: "Dependencies",
					tests: [
						{
							args: "dependencies",
							expect: { dependencies: new Set(["foo", "bar"]) },
						},
						{
							name: "Inferred dependencies",
							args: "dependenciesInferred",
							expect: { dependencies: new Set(["foo", "bar", "baz"]) },
						},
						{
							name: "Additional dependencies",
							args: "dependenciesAdditional",
							expect: { dependencies: new Set(["foo", "bar", "yolo"]) },
						},
						{
							name: "Ignore inferred dependencies",
							args: "dependenciesIgnoreInferred",
							expect: { dependencies: new Set(["yolo"]) },
						},
					],
				},
				{
					name: "Reflections",
					tests: [
						{
							name: "No reflect, no getter",
							arg: "empty",
							expect: { reflect: true },
						},
						{
							name: "Computed prop",
							args: "computed",
							expect: { reflect: false },
						},
						{
							name: "Reflected computed prop",
							args: "computedReflected",
							expect: { reflect: true },
						},
						{
							name: "Disable reflection",
							args: "reflectFalse",
							expect: { reflect: false },
						},
					],
				},
			],
		},
		{
			name: "fromAttribute()",
			run (name) {
				let prop = new Prop(name, props[name], propsMap);
				return prop.fromAttribute;
			},
			tests: [
				{
					name: "No reflect",
					arg: "empty",
					expect: "empty",
				},
				{
					name: "reflect: { from: true }",
					args: "reflectFromTrue",
					expect: "reflectFromTrue",
				},
				{
					name: "reflect: { from: false }",
					args: "reflectFromFalse",
					expect: null,
				},
				{
					name: `reflect: { from: "foo" }`,
					args: "reflectFromName",
					expect: "foo",
				},
				{
					name: "reflect: { from: true, to: false }",
					args: "reflectBoth",
					expect: "reflectBoth",
				},
				{
					name: `reflect: { from: "foo", to: "bar" }`,
					args: "reflectBothName",
					expect: "foo",
				},
			],
		},
	],
};
