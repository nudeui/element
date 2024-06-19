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
	run (...args) {
		return new Prop(...args);
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
			args: ["empty", props.empty, propsMap],
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
			args: ["computed", props.computed, propsMap],
			expect: {
				name: "computed",
				type: undefined,
				default: undefined,
				dependencies: new Set(),
				reflect: false,
			},
		},
		{
			name: "Reflected computed prop",
			args: ["computedReflected", props.computedReflected, propsMap],
			expect: {
				name: "computedReflected",
				type: undefined,
				default: undefined,
				dependencies: new Set(),
				reflect: true,
			},
		},
		{
			name: "With simple type",
			args: ["simpleType", props.simpleType, propsMap],
			expect: {
				name: "simpleType",
				type: { is: String },
				default: undefined,
				dependencies: new Set(),
				reflect: true,
			},
		},
		{
			name: "With complex type",
			args: ["complexType", props.complexType, propsMap],
			expect: {
				name: "complexType",
				type: {
					is: String,
					foo: 42,
				},
				default: undefined,
				dependencies: new Set(),
				reflect: true,
			},
		},
		{
			name: "With default value",
			args: ["defaultValue", props.defaultValue, propsMap],
			expect: {
				name: "defaultValue",
				type: undefined,
				default: "default",
				dependencies: new Set(),
				reflect: true,
			},
		},
		{
			name: "With default function",
			args: ["defaultFunction", props.defaultFunction, propsMap],
			expect: {
				name: "defaultFunction",
				type: undefined,
				default: props.defaultFunction.default,
				dependencies: new Set(),
				reflect: true,
			},
		},
		{
			name: "With default prop",
			args: ["defaultProp", props.defaultProp, propsMap],
			expect: {
				name: "defaultProp",
				type: undefined,
				default: propsMap.get("defaultValue"),
				dependencies: new Set(),
				reflect: true,
			},
		},
	],
};
