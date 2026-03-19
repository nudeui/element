import { default as Prop } from "../src/props/Prop.js";
import { default as Props } from "../src/props/Props.js";
import { resolveValue } from "../src/util.js";

export default {
	name: "Prop class",
	tests: [
		{
			name: "constructor()",
			tests: [
				{
					name: "Defaults",
					run (spec) {
						let Class = class {
							static props = {
								foo: spec,
								bar: {
									default: "bar",
								},
							};
						};

						let props = new Props(Class);

						let fooProp = props.get("foo");
						let ret = fooProp.default;
						if (ret instanceof Prop) {
							// Function defaults become computed props;
							// their value is only available via get(element)
							ret = ret.spec.get;
						}

						return resolveValue(ret, []);
					},
					tests: [
						{
							name: "Value",
							arg: {
								default: "foo",
							},
							expect: "foo",
						},
						{
							name: "Function",
							arg: {
								default () {
									return 42;
								},
							},
							expect: 42,
						},
						{
							name: "Prop",
							arg: {
								defaultProp: "bar",
							},
							expect: "bar",
						},
						{
							name: "Value and prop",
							description:
								"What should be used if both default and defaultProp are specified? If defaultProp, where should default go?",
							arg: {
								default: "foo",
								defaultProp: "bar",
							},
							expect: "foo", // ??
							skip: true,
						},
						{
							name: "Function and prop",
							description:
								"What should be used if both default and defaultProp are specified? If defaultProp, where should default go?",
							arg: {
								default () {
									return 42;
								},
								defaultProp: "bar",
							},
							expect: 42, // ??
							skip: true,
						},
					],
				},
				{
					name: "Reflections",
					run (spec) {
						let prop = new Prop("foo", spec);
						return prop.reflect;
					},
					tests: [
						{
							name: "By default, props are reflected",
							arg: {},
							expect: true,
						},
						{
							name: "Disable reflection",
							arg: {
								reflect: false,
							},
							expect: false,
						},
						{
							name: "Computed props are not reflected by default",
							arg: {
								get () {},
							},
							expect: false,
						},
						{
							name: "Reflected computed prop",
							arg: {
								get () {},
								reflect: true,
							},
							expect: true,
						},
					],
				},
				{
					name: "fromAttribute() / toAttribute()",
					run (spec) {
						let prop = new Prop("foo", spec);
						return [prop.fromAttribute, prop.toAttribute];
					},
					tests: [
						{
							name: "By default, props are reflected",
							arg: {},
							expect: ["foo", "foo"],
						},
						{
							arg: {
								reflect: true,
							},
							expect: ["foo", "foo"],
						},
						{
							arg: {
								reflect: false,
							},
							expect: [null, null],
						},
						{
							arg: {
								reflect: "bar",
							},
							expect: ["bar", "bar"],
						},
						{
							arg: {
								reflect: {
									from: "bar",
									to: "bar",
								},
							},
							expect: ["bar", "bar"],
						},
						{
							arg: {
								reflect: {
									from: "bar",
									to: "baz",
								},
							},
							expect: ["bar", "baz"],
						},
						{
							arg: {
								reflect: {
									from: "bar",
								},
							},
							expect: ["bar", null],
						},
						{
							arg: {
								reflect: {
									to: "baz",
								},
							},
							expect: [null, "baz"],
						},
						{
							arg: {
								reflect: {
									from: true,
								},
							},
							expect: ["foo", null],
						},
						{
							arg: {
								reflect: {
									to: true,
								},
							},
							expect: [null, "foo"],
						},
						{
							arg: {
								reflect: {
									from: false,
								},
							},
							expect: [null, null],
						},
						{
							arg: {
								reflect: {
									to: false,
								},
							},
							expect: [null, null],
						},
						{
							arg: {
								reflect: {
									from: true,
									to: "baz",
								},
							},
							expect: ["foo", "baz"],
						},
						{
							arg: {
								reflect: {
									from: "bar",
									to: true,
								},
							},
							expect: ["bar", "foo"],
						},
						{
							arg: {
								reflect: {
									from: false,
									to: "baz",
								},
							},
							expect: [null, "baz"],
						},
						{
							arg: {
								reflect: {
									from: "bar",
									to: false,
								},
							},
							expect: ["bar", null],
						},
						{
							arg: {
								reflect: {
									from: false,
									to: false,
								},
							},
							expect: [null, null],
						},
						{
							arg: {
								reflect: {
									from: true,
									to: true,
								},
							},
							expect: ["foo", "foo"],
						},
						{
							arg: {
								reflect: {
									from: true,
									to: false,
								},
							},
							expect: ["foo", null],
						},
						{
							arg: {
								reflect: {
									from: false,
									to: true,
								},
							},
							expect: [null, "foo"],
						},
					],
				},
			],
		},
	],
};
