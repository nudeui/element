import process from "node:process";
import { default as Prop } from "../src/plugins/props/util/Prop.js";
import { default as Props } from "../src/plugins/props/util/Props.js";
import { resolveValue } from "../src/util/resolve-value.js";
import FakeElement, { apply, flush } from "./util/FakeElement.js";

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
					async run ({ props, actions = [], only }) {
						let el = new (FakeElement.with(props))();

						let events = [];
						el.addEventListener("propchange", e =>
							events.push({ name: e.name, source: e.detail?.source }));

						el.mount();
						await apply(el, actions);

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
								actions: el => (el.src = "changed"),
							},
							expect: [
								"src/default",
								"mirror/default",
								"src/default",
								"mirror/default",
							],
						},
						{
							name: "default() fires on declared name only",
							arg: {
								props: { bar: { default: () => 42 } },
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
								actions: el => (el.base = 2),
								only: ["derived"],
							},
							expect: ["derived/default", "derived/default"],
						},
						{
							name: "Mount and update both fan out across plain, get, and default() props",
							description: "Computed-backed source stays at construction-time on update.",
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
								actions: el => (el.plain = 5),
							},
							expect: [
								"plain/default",
								"computed/get",
								"fnDefault/default",
								"plain/default",
								"computed/get",
								"fnDefault/default",
							],
						},
						{
							name: "Assigning current default-resolved value is a no-op",
							arg: {
								props: { v: { type: Number, default: 0 } },
								actions: el => (el.v = 0),
							},
							expect: ["v/default"],
						},
						{
							name: "Sync writes to a plain Signal coalesce to a single event with the settled value",
							arg: {
								props: { v: { type: Number } },
								actions: [
									el => {
										el.v = 1;
										el.v = 3;
										el.v = 42;
									},
								],
								only: ["v"],
							},
							// No mount event: plain Signal initial undefined ≡ oldInternalValue.
							expect: ["v/property"],
						},
						{
							name: "Round-trip back to the initial value on a plain Signal fires no event",
							async run ({ props, actions }) {
								let el = new (FakeElement.with(props))();
								let count = 0;
								el.addEventListener("propchange", () => count++);
								el.mount();
								await apply(el, actions);
								return count;
							},
							arg: {
								props: { v: { type: Number } },
								actions: [
									el => {
										el.v = 5;
										el.v = undefined;
									},
								],
							},
							expect: 0,
						},
					],
				},
				{
					name: "Handler observes post-cascade values for sibling Computeds",
					async run () {
						let el = new (FakeElement.with({
							a: { type: Number, default: 0 },
							b: {
								type: Number,
								get () {
									return this.a + 1;
								},
							},
							c: {
								type: Number,
								get () {
									return this.a * 2;
								},
							},
						}))();
						el.mount();

						// Listener attached after mount, so mount events stay out.
						let snapshots = [];
						el.addEventListener("propchange", e =>
							snapshots.push({ name: e.name, b: el.b, c: el.c }));

						await apply(el, el => (el.a = 5));
						return snapshots;
					},
					expect: [
						{ name: "a", b: 6, c: 10 },
						{ name: "b", b: 6, c: 10 },
						{ name: "c", b: 6, c: 10 },
					],
				},
				{
					name: "Attribute reflection deferral — write log",
					async run ({ props, actions = [] }) {
						let el = new (FakeElement.with(props))();

						let writes = [];
						let original = el.setAttribute.bind(el);
						el.setAttribute = (name, value) => {
							writes.push([name, value]);
							return original(name, value);
						};

						el.mount();
						await apply(el, actions);
						return writes;
					},
					tests: [
						{
							name: "Sync writes produce a single attribute write of the settled value",
							arg: {
								props: { v: { type: Number, reflect: true } },
								actions: [
									el => {
										el.v = 1;
										el.v = 3;
										el.v = 42;
									},
								],
							},
							// One write of the settled value; intermediates are coalesced away.
							expect: [["v", "42"]],
						},
						{
							name: "Reflection writes go to reflect.to alias, not the prop name",
							arg: {
								props: {
									v: {
										type: Number,
										default: 7,
										reflect: { to: "data-v" },
									},
								},
								actions: el => (el.v = 42),
							},
							// Mount + update both write to data-v; "v" is never touched.
							expect: [
								["data-v", "7"],
								["data-v", "42"],
							],
						},
					],
				},
				{
					name: "Attribute reflection deferral — settled state",
					async run ({ props, actions, attr }) {
						let el = new (FakeElement.with(props))();
						el.mount();
						await apply(el, actions);

						return [el.v, el.getAttribute(attr)];
					},
					tests: [
						{
							name: "External setAttribute wins over pending reflection",
							arg: {
								props: { v: { type: Number, reflect: true, default: 0 } },
								actions: [
									el => {
										el.v = 5;
										el.setAttribute("v", "99");
									},
								],
								attr: "v",
							},
							expect: [99, "99"],
						},
						{
							name: "Property write after setAttribute drains the latest property value",
							arg: {
								props: { v: { type: Number, reflect: true, default: 0 } },
								actions: [
									el => {
										el.setAttribute("v", "99");
										el.v = 5;
									},
								],
								attr: "v",
							},
							expect: [5, "5"],
						},
					],
				},
				{
					name: "updated() bulk semantics",
					async run ({ props, actions = [] }) {
						let Class = FakeElement.with(props);

						let calls = [];
						Class.prototype.updated = function (changedProperties) {
							calls.push(
								[...changedProperties].map(([name, payload]) => ({
									name,
									old: payload.detail?.oldInternalValue,
									value: this[name],
								})),
							);
						};

						let el = new Class();
						el.mount();
						await apply(el, actions);
						return calls;
					},
					tests: [
						{
							name: "Multi-prop cascade fires one call with all settled changes",
							arg: {
								props: {
									a: { type: Number, default: 0 },
									b: {
										type: Number,
										get () {
											return this.a + 1;
										},
									},
									c: {
										type: Number,
										get () {
											return this.a * 2;
										},
									},
								},
								actions: el => (el.a = 5),
							},
							// First call: mount settle. Second: el.a = 5 cascade.
							expect: [
								[
									{ name: "a", old: undefined, value: 0 },
									{ name: "b", old: undefined, value: 1 },
									{ name: "c", old: undefined, value: 0 },
								],
								[
									{ name: "a", old: 0, value: 5 },
									{ name: "b", old: 1, value: 6 },
									{ name: "c", old: 0, value: 10 },
								],
							],
						},
						{
							name: "Coalesced sync writes on a Computed-backed prop produce one call with first→last delta",
							arg: {
								props: { v: { type: Number, default: 0 } },
								actions: [
									el => {
										el.v = 1;
										el.v = 3;
										el.v = 42;
									},
								],
							},
							expect: [
								[{ name: "v", old: undefined, value: 0 }],
								[{ name: "v", old: 0, value: 42 }],
							],
						},
						{
							name: "Coalesced sync writes on a plain Signal preserve the first-write old value",
							// Plain-Signal path: no default, no convert, no get.
							// oldInternalValue flows through Prop.set, not the Computed subscriber.
							arg: {
								props: { v: { type: Number } },
								actions: [
									el => {
										el.v = 1;
										el.v = 50;
										el.v = 99;
									},
								],
							},
							// No mount call: plain Signal initial undefined ≡ post-mount value.
							expect: [
								[{ name: "v", old: undefined, value: 99 }],
							],
						},
					],
				},
				{
					name: "Shortcut event names dispatch alongside propchange from the same payload",
					async run () {
						let Class = FakeElement.with({ v: { type: Number, default: 0 } });
						// Simulate a propchange shortcut (propchange.js#first_constructor_static).
						Class.props.get("v").eventNames = ["change"];

						let calls = [];
						Class.prototype.updated = function (changedProperties) {
							calls.push(
								[...changedProperties].map(([name, payload]) => ({
									name,
									old: payload.detail?.oldInternalValue,
								})),
							);
						};

						let el = new Class();
						let events = [];
						for (let name of ["propchange", "change"]) {
							el.addEventListener(name, e =>
								events.push(`${name}/${e.detail.parsedValue}`));
						}

						el.mount();
						await apply(el, el => (el.v = 42));

						return { events, calls };
					},
					expect: {
						// Mount fires both names; update fires both names. Same payload each time.
						events: [
							"propchange/0",
							"change/0",
							"propchange/42",
							"change/42",
						],
						// updated(): one entry per prop per drain, regardless of how
						// many shortcut event names fired.
						calls: [
							[{ name: "v", old: undefined }],
							[{ name: "v", old: 0 }],
						],
					},
				},
				{
					name: "propChangedCallback auto-wires as a per-prop propchange listener",
					async run () {
						let Class = FakeElement.with({
							a: { type: Number, default: 0 },
							b: { type: Number, default: 0 },
						});
						let calls = [];
						Class.prototype.propChangedCallback = function (event) {
							calls.push(`${event.name}/${event.detail.parsedValue}`);
						};

						let el = new Class();
						el.mount();
						await apply(el, el => {
							el.a = 5;
							el.b = 7;
						});
						return calls;
					},
					// One call per dispatched propchange event: mount × 2, update × 2.
					expect: ["a/0", "b/0", "a/5", "b/7"],
				},
				{
					name: "propsupdate fires after every propchange in the same drain",
					async run () {
						let Class = FakeElement.with({
							a: { type: Number, default: 0 },
							b: { type: Number, default: 0 },
						});
						let order = [];
						let el = new Class();
						el.addEventListener("propchange", e => order.push(`propchange/${e.name}`));
						el.addEventListener("propsupdate", () => order.push("propsupdate"));

						el.mount();
						await apply(el, el => {
							el.a = 5;
							el.b = 7;
						});
						return order;
					},
					expect: [
						// Mount drain.
						"propchange/a",
						"propchange/b",
						"propsupdate",
						// Update drain.
						"propchange/a",
						"propchange/b",
						"propsupdate",
					],
				},
				{
					name: "Throw in one element's drain doesn't strand siblings in the same microtask",
					async run () {
						let Class = FakeElement.with({ v: { type: Number, default: 0 } });

						let a = new Class();
						a.mount();
						let b = new Class();
						b.mount();
						await flush();

						// Patch a.dispatchEvent to throw on its first call inside the
						// microtask drain. b's drainFor runs in the same #drain loop;
						// the try/finally in #drain must re-queue it so it eventually
						// dispatches its own propchange.
						let aOriginalDispatch = a.dispatchEvent.bind(a);
						let aThrew = false;
						a.dispatchEvent = function (event) {
							if (!aThrew) {
								aThrew = true;
								throw new Error("boom");
							}
							return aOriginalDispatch(event);
						};

						let bSeen = false;
						b.addEventListener("propchange", () => (bSeen = true));

						// Suppress the queueMicrotask rethrow.
						let prev = process.listeners("uncaughtException");
						process.removeAllListeners("uncaughtException");
						process.on("uncaughtException", () => {});
						try {
							a.v = 5;
							b.v = 6;
							await flush(2);
						}
						finally {
							process.removeAllListeners("uncaughtException");
							for (let h of prev) {
								process.on("uncaughtException", h);
							}
						}
						return { aThrew, bSeen };
					},
					expect: { aThrew: true, bSeen: true },
				},
				{
					name: "Final value",
					async run ({ props, actions = [], read }) {
						let el = new (FakeElement.with(props))();
						el.mount();
						await apply(el, actions);
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
								actions: el => (el.v = null),
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
								actions: el => (el.base = 5),
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
								actions: el => (el.base = 42.05),
								read: "derived",
							},
							expect: 42,
						},
					],
				},
				{
					name: "Attribute reflection",
					async run ({ props, actions = [], attr }) {
						let el = new (FakeElement.with(props))();
						el.mount();
						await apply(el, actions);
						return el.getAttribute(attr);
					},
					tests: [
						{
							name: "Prop write reflects to attribute",
							arg: {
								props: { v: { type: Number, reflect: true } },
								actions: el => (el.v = 42),
								attr: "v",
							},
							expect: "42",
						},
						{
							name: "Default + reflect reflects on mount (plain)",
							arg: {
								props: { plain: { type: Number, default: 7, reflect: true } },
								attr: "plain",
							},
							expect: "7",
						},
						{
							name: "Default + convert + reflect reflects on mount",
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
							expect: "10",
						},
					],
				},
			],
		},
	],
};
