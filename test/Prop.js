import { default as Prop } from "../src/plugins/props/util/Prop.js";
import { default as Props } from "../src/plugins/props/util/Props.js";
import { resolveValue } from "../src/util/resolve-value.js";
import FakeElement from "./util/FakeElement.js";

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

						let props = new Props(Class, Class.props);

						// `defaultProp` sugars into `function () { return this[propName] }` — eval against a stub.
						return resolveValue(props.get("foo").default, [{ bar: "bar" }]);
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
							description: "Explicit `default` wins over `defaultProp`.",
							arg: {
								default: "foo",
								defaultProp: "bar",
							},
							expect: "foo",
						},
						{
							name: "Function and prop",
							description: "Explicit `default` wins over `defaultProp`.",
							arg: {
								default () {
									return 42;
								},
								defaultProp: "bar",
							},
							expect: 42,
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
		{
			name: "Runtime behavior",
			tests: [
				{
					name: "propchange events",
					async run ({ props, actions, only }) {
						let { events } = await FakeElement.from(props, actions);
						let stream = only ? events.filter(e => only.includes(e.name)) : events;
						return stream.map(({ name, source }) => `${name}/${source}`);
					},
					tests: [
						{
							name: "defaultProp propagates source change",
							arg: {
								props: {
									src: { type: String, default: "initial" },
									mirror: { type: String, defaultProp: "src" },
								},
								actions: [el => (el.src = "changed")],
							},
							expect: [
								"src/default",
								"mirror/default",
								"src/property",
								"mirror/default",
							],
						},
						{
							name: "default() fires on declared name only",
							arg: {
								props: { bar: { default: () => 42 } },
								only: ["bar", "defaultBar"],
							},
							expect: ["bar/default"],
						},
						{
							name: "No double-fire on mount for Computed-backed props",
							arg: {
								props: {
									base: { type: Number, default: 7 },
									derived: {
										get () {
											return this.base + 1;
										},
									},
								},
								only: ["derived"],
							},
							expect: ["derived/get"],
						},
						{
							name: "default() reactive on declared name",
							arg: {
								props: {
									base: { type: Number, default: 1 },
									derived: {
										type: Number,
										default () {
											return this.base * 10;
										},
									},
								},
								actions: [el => (el.base = 2)],
								only: ["derived"],
							},
							expect: ["derived/default", "derived/default"],
						},
						{
							name: "Events fan out across plain, get, and default() props",
							arg: {
								props: {
									plain: { type: Number, default: 1 },
									computed: {
										get () {
											return this.plain + 10;
										},
									},
									fnDefault: {
										type: Number,
										default () {
											return this.plain * 100;
										},
									},
								},
								actions: [el => (el.plain = 5)],
							},
							expect: [
								// Mount
								"plain/default",
								"computed/get",
								"fnDefault/default",

								// Update
								"plain/property",
								"computed/get",
								"fnDefault/default",
							],
						},
						{
							name: "Assigning current default-resolved value is a no-op",
							arg: {
								props: { v: { type: Number, default: 0 } },
								actions: [el => (el.v = 0)],
							},
							expect: ["v/default"],
						},
					],
				},
				{
					name: "Final value",
					async run ({ props, actions, read }) {
						let { el } = await FakeElement.from(props, actions);
						return el[read];
					},
					tests: [
						{
							name: "defaultProp severs on explicit write",
							arg: {
								props: {
									src: { type: String, default: "initial" },
									mirror: { type: String, defaultProp: "src" },
								},
								actions: [
									el => (el.mirror = "explicit"),
									el => (el.src = "after-sever"),
								],
								read: "mirror",
							},
							expect: "explicit",
						},
						{
							name: "defaultProp restores on undefined",
							arg: {
								props: {
									src: { type: String, default: "initial" },
									mirror: { type: String, defaultProp: "src" },
								},
								actions: [
									el => (el.mirror = "explicit"),
									el => (el.src = "x"),
									el => (el.mirror = undefined),
								],
								read: "mirror",
							},
							expect: "x",
						},
						{
							name: "default() return is coerced via parse",
							arg: {
								props: { n: { type: Number, default: () => "42" } },
								read: "n",
							},
							expect: 42,
						},
						{
							name: "default() pass through convert",
							arg: {
								props: {
									n: {
										default: 5,
										convert (v) {
											return v * 2;
										},
									},
								},
								read: "n",
							},
							expect: 10,
						},
						{
							name: "Plain literal default restored via undefined write",
							arg: {
								props: { v: { type: Number, default: 0 } },
								actions: [el => (el.v = 100), el => (el.v = undefined)],
								read: "v",
							},
							expect: 0,
						},
						{
							name: "null preserved on Computed-backed prop with default",
							arg: {
								props: {
									base: { type: Number, default: 7 },
									v: {
										type: Number,
										default () {
											return this.base * 10;
										},
									},
								},
								actions: [el => (el.v = null)],
								read: "v",
							},
							expect: null,
						},
						{
							name: "null release: undefined re-resolves default()",
							arg: {
								props: {
									base: { type: Number, default: 7 },
									v: {
										type: Number,
										default () {
											return this.base * 10;
										},
									},
								},
								actions: [el => (el.v = null), el => (el.v = undefined)],
								read: "v",
							},
							expect: 70,
						},
						{
							name: "get() updates when its dependency changes",
							arg: {
								props: {
									base: { type: Number, default: 1 },
									derived: {
										get () {
											return this.base * 2;
										},
									},
								},
								actions: [el => (el.base = 5)],
								read: "derived",
							},
							expect: 10,
						},
						{
							name: "Dynamic deps: branch flip switches the tracked dep",
							arg: {
								props: {
									cond: { default: true },
									a: { type: Number, default: 100 },
									b: { type: Number, default: 200 },
									out: {
										get () {
											return this.cond ? this.a : this.b;
										},
									},
								},
								actions: [el => (el.cond = false), el => (el.b = 777)],
								read: "out",
							},
							expect: 777,
						},
						{
							name: "Dynamic deps: stale dep no longer propagates",
							arg: {
								props: {
									cond: { default: true },
									a: { type: Number, default: 100 },
									b: { type: Number, default: 200 },
									out: {
										get () {
											return this.cond ? this.a : this.b;
										},
									},
								},
								actions: [el => (el.cond = false), el => (el.a = 999)],
								read: "out",
							},
							expect: 200,
						},
						{
							name: "spec.equals: tolerated dep change leaves cached value",
							arg: {
								props: {
									base: { type: Number, default: 42 },
									derived: {
										get () {
											return this.base;
										},
										equals: (a, b) => Math.abs(a - b) < 0.1,
									},
								},
								actions: [el => (el.base = 42.05)],
								read: "derived",
							},
							expect: 42,
						},
						{
							name: "removeAttribute restores default",
							arg: {
								props: { v: { type: Number, reflect: true, default: 5 } },
								actions: [
									el => el.setAttribute("v", "6"),
									el => el.removeAttribute("v"),
								],
								read: "v",
							},
							expect: 5,
						},
					],
				},
				{
					name: "Attribute reflection",
					async run ({ props, actions, attr }) {
						let { el } = await FakeElement.from(props, actions);
						return el.getAttribute(attr);
					},
					tests: [
						{
							name: "Prop write reflects to attribute",
							arg: {
								props: { v: { type: Number, reflect: true } },
								actions: [el => (el.v = 42)],
								attr: "v",
							},
							expect: "42",
						},
						{
							name: "Default does NOT reflect on mount (plain)",
							arg: {
								props: { plain: { type: Number, default: 7, reflect: true } },
								attr: "plain",
							},
							expect: null,
						},
						{
							name: "Default does NOT reflect on mount (with convert)",
							arg: {
								props: {
									val: {
										type: Number,
										default: 5,
										convert (v) {
											return v * 2;
										},
										reflect: true,
									},
								},
								attr: "val",
							},
							expect: null,
						},
						{
							name: "removeAttribute clears the reflected attribute",
							arg: {
								props: { v: { type: Number, reflect: true, default: 5 } },
								actions: [
									el => el.setAttribute("v", "6"),
									el => el.removeAttribute("v"),
								],
								attr: "v",
							},
							expect: null,
						},
						{
							name: "Explicit write equal to default still reflects",
							arg: {
								props: { v: { type: Number, reflect: true, default: 5 } },
								actions: [el => (el.v = 5)],
								attr: "v",
							},
							expect: "5",
						},
					],
				},
			],
		},
	],
};
