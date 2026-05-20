import { default as Prop } from "../src/plugins/props/util/Prop.js";
import { default as Props } from "../src/plugins/props/util/Props.js";
import { resolveValue } from "../src/util/resolve-value.js";

export default {
	name: "Prop class",
	tests: [
		{
			name: "constructor()",
			tests: [
				{
					name: "Dependencies",
					run (spec) {
						let prop = new Prop("foo", spec);
						return prop.dependencies;
					},
					tests: [
						{
							arg: {
								dependencies: ["foo", "bar"],
							},
							expect: new Set(["foo", "bar"]),
						},
						{
							name: "Inferred",
							arg: {
								get: () => this.foo + this.bar,
								convert: () => this.bar + this.baz,
							},
							expect: new Set(["foo", "bar", "baz"]),
						},
						{
							name: "Inferred from type",
							arg: {
								type: {
									is: Object,
									values: String,
									defaultKey: () => this.foo,
									defaultValue: () => this.bar,
								},
							},
							expect: new Set(["foo", "bar"]),
							skip: true, // Not implemented yet. See https://github.com/nudeui/element/issues/29
						},
						{
							name: "Additional",
							arg: {
								get: () => this.foo + this.bar,
								additionalDependencies: ["yolo"],
							},
							expect: new Set(["foo", "bar", "yolo"]),
						},
						{
							name: "Ignore inferred",
							arg: {
								convert: () => this.bar + this.baz,
								dependencies: ["yolo"],
							},
							expect: new Set(["yolo"]),
						},
						{
							name: "Dependencies from default",
							run (spec) {
								let Class = class {
									static props = {
										foo: spec,
									};
								};

								let props = new Props(Class, Class.props);
								return props.get("defaultFoo")?.dependencies;
							},
							tests: [
								{
									name: "Dependencies specified",
									arg: {
										default () {},
										defaultDependencies: ["foo"],
									},
									expect: new Set(["foo"]),
								},
								{
									name: "Inferred dependencies",
									arg: {
										default () {
											return this.foo + this.bar;
										},
									},
									expect: new Set(["foo", "bar"]),
								},
								{
									name: "Specified dependencies have priority over the inferred ones",
									arg: {
										default () {
											return this.foo + this.bar;
										},
										defaultDependencies: ["foo"],
									},
									expect: new Set(["foo"]),
								},
								{
									name: "default is a value",
									arg: {
										default: "foo",
									},
									expect: undefined,
								},
								{
									name: "default() has no references to other props",
									arg: {
										default () {
											return "foo";
										},
									},
									expect: undefined,
								},
							],
						},
					],
				},
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

						let props = new Props(Class, Class.props);

						let prop = props.get("foo");
						// Follow `defaultProp` chain to find the underlying default value.
						let ret = prop.defaultProp ? prop.defaultProp.default : prop.default;

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
					name: "reflect",
					description: "Normalized {from, to} attribute names for each spec shape.",
					run (spec) {
						let prop = new Prop("foo", spec);
						return [prop.reflect.from, prop.reflect.to];
					},
					tests: [
						{
							name: "By default, props are reflected",
							arg: {},
							expect: ["foo", "foo"],
						},
						{
							name: "Computed props are not reflected by default",
							arg: {
								get () {},
							},
							expect: [undefined, undefined],
						},
						{
							name: "Computed props can opt back in",
							arg: {
								get () {},
								reflect: true,
							},
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
							expect: [undefined, undefined],
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
							expect: ["bar", undefined],
						},
						{
							arg: {
								reflect: {
									to: "baz",
								},
							},
							expect: [undefined, "baz"],
						},
						{
							arg: {
								reflect: {
									from: true,
								},
							},
							expect: ["foo", undefined],
						},
						{
							arg: {
								reflect: {
									to: true,
								},
							},
							expect: [undefined, "foo"],
						},
						{
							arg: {
								reflect: {
									from: false,
								},
							},
							expect: [undefined, undefined],
						},
						{
							arg: {
								reflect: {
									to: false,
								},
							},
							expect: [undefined, undefined],
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
							expect: [undefined, "baz"],
						},
						{
							arg: {
								reflect: {
									from: "bar",
									to: false,
								},
							},
							expect: ["bar", undefined],
						},
						{
							arg: {
								reflect: {
									from: false,
									to: false,
								},
							},
							expect: [undefined, undefined],
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
							expect: ["foo", undefined],
						},
						{
							arg: {
								reflect: {
									from: false,
									to: true,
								},
							},
							expect: [undefined, "foo"],
						},
					],
				},
			],
		},
	],
};
