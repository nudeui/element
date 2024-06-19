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
};

let propsMap = new Map(Object.entries(props));

export default {
	name: "Prop constructor",
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
			name: "Computed prop",
			args: "computed",
			expect: { dependencies: new Set(), reflect: false},
		},
		{
			name: "Reflected computed prop",
			args: "computedReflected",
			expect: { dependencies: new Set(), reflect: true },
		},
		{
			name: "With simple type",
			args: "simpleType",
			expect: {
				type: { is: String },
			},
		},
		{
			name: "With complex type",
			args: "complexType",
			expect: {
				type: {
					is: String,
					foo: 42,
				},
			},
		},
		{
			name: "With default value",
			args: "defaultValue",
			expect: { default: "default" },
		},
		{
			name: "With default function",
			args: "defaultFunction",
			expect: { default: props.defaultFunction.default },
		},
		{
			name: "With default prop",
			args: "defaultProp",
			expect: { default: propsMap.get("defaultValue") },
		},
	],
};
