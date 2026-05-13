import { default as Props } from "../src/plugins/props/util/Props.js";
import FakeElement, { flush } from "./util/FakeElement.js";

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
		{
			name: "Runtime behavior",
			tests: [
				{
					name: "Pre-set attributes parse on mount",
					async run ({ props, value }) {
						let el = new (FakeElement.with(props))();
						el.setAttribute("prop", value);
						el.mount();
						return el.prop;
					},
					tests: [
						{
							name: "Pre-set attribute coerces into the typed property",
							arg: {
								props: { prop: { type: Number, reflect: true } },
								value: "55",
							},
							expect: 55,
						},
						{
							name: "Post-mount setAttribute updates the property",
							async run () {
								let el = new (FakeElement.with({
									prop: { type: Number, reflect: true },
								}))();
								el.mount();
								el.setAttribute("prop", "100");
								return el.prop;
							},
							expect: 100,
						},
						{
							name: "Pre-upgrade prop value is readable on mount, both directly and via dependent Computeds",
							async run () {
								let Class = FakeElement.with({
									base: { type: Number, default: 1 },
									derived: {
										type: Number,
										get () {
											return this.base * 10;
										},
									},
								});
								let el = new Class();
								// Pre-upgrade: write `base` as a data property, shadowing
								// the (not-yet-installed) accessor. This is what a parser
								// or framework would do to an element instance whose
								// `customElements.define` hasn't run yet.
								Object.defineProperty(el, "base", {
									value: "5", // string — verifies parse(Number) still runs.
									writable: true,
									configurable: true,
									enumerable: true,
								});
								el.mount();
								return { base: el.base, derived: el.derived };
							},
							// derived reads via `this.base` during its first compute, which
							// goes through the accessor → Computed_base → rawSignal (=5).
							// No default-fallback because rawSignal is defined.
							expect: { base: 5, derived: 50 },
						},
						{
							name: "Property set before upgrade is preserved on mount",
							// Simulates writing to a custom element instance before its
							// `customElements.define` upgrade installs the prop accessors
							// on the prototype: the value lands as an own data property and
							// shadows the accessor. On mount, `Prop.initializeFor` notices
							// `Object.hasOwn`, extracts the value, deletes the data property
							// to expose the accessor, and re-assigns through the setter so
							// the value passes through type parsing.
							// See https://github.com/nudeui/element/issues/14
							async run () {
								let Class = FakeElement.with({
									v: { type: Number, default: 0 },
								});
								let el = new Class();
								Object.defineProperty(el, "v", {
									value: "42", // String — verifies that parse(Number) runs.
									writable: true,
									configurable: true,
									enumerable: true,
								});
								el.mount();
								return el.v;
							},
							expect: 42,
						},
					],
				},
				{
					name: "Disconnect / reconnect lifecycle",
					tests: [
						{
							name: "Queued propchange events drain on reconnect",
							async run () {
								let el = new (FakeElement.with({
									v: { type: Number, default: 0 },
								}))();
								el.mount();
								let names = [];
								el.addEventListener("propchange", e => names.push(e.name));

								el.isConnected = false;
								el.v = 5;
								// Flush the Computed microtask while disconnected so
								// the queueing branch runs.
								await flush();
								el.isConnected = true;

								return names;
							},
							expect: ["v"],
						},
						{
							name: "Reconnect drains queued events without replaying mount events",
							async run () {
								let el = new (FakeElement.with({
									v: { type: Number, default: 0 },
								}))();
								let events = [];
								el.addEventListener("propchange", e => events.push(e));
								el.mount();
								// Mount event for the default-resolved 0.
								let mountCount = events.length;

								el.isConnected = false;
								el.v = 5;
								await flush();
								let afterDisconnect = events.length;

								el.isConnected = true;
								await flush();
								let afterReconnect = events.length;

								return { mountCount, afterDisconnect, afterReconnect };
							},
							// Disconnected drain bails — payload waits in queue. Reconnect
							// dispatches the post-disconnect payload, NOT the already-fired mount.
							expect: { mountCount: 1, afterDisconnect: 1, afterReconnect: 2 },
						},
						{
							name: "Multiple writes while paused coalesce to one propchange per prop on resume",
							async run () {
								let el = new (FakeElement.with({
									v: { type: Number, default: 0 },
								}))();
								el.mount();
								let events = [];
								el.addEventListener("propchange", e =>
									events.push({ value: e.detail.value, oldValue: e.detail.oldValue }));

								el.isConnected = false;
								el.v = 5;
								el.v = 10;
								el.v = 15;
								await flush();
								el.isConnected = true;

								return events;
							},
							// Three writes while paused (disconnected) → one coalesced propchange
							// on resume. The per-write semantics that apply to active elements
							// (one event per write) are not useful while detached — there's no
							// observer in real time anyway, and the consumer gets the same view
							// either way (final value, pinned first-seen oldValue).
							expect: [{ value: 15, oldValue: 0 }],
						},
						{
							name: "Multiple writes while disconnected coalesce into one propschange on reconnect",
							async run () {
								let el = new (FakeElement.with({
									v: { type: Number, default: 0 },
								}))();
								el.mount();
								let calls = [];
								el.addEventListener("propschange", e =>
									calls.push([...e.changedProps]));

								el.isConnected = false;
								el.v = 5;
								el.v = 10;
								el.v = 15;
								await flush();
								el.isConnected = true;

								return calls;
							},
							// Listener attached after mount, so mount's propschange is not captured.
							// Three disconnected writes accumulate into one propschange on reconnect,
							// with `oldValue` pinned to the first-seen value (0) and current value 15.
							expect: [[["v", 0]]],
						},
						{
							name: "Manual pause()/resume() coalesces writes while the element stays connected",
							async run () {
								let Class = FakeElement.with({
									v: { type: Number, default: 0 },
								});
								let el = new Class();
								el.mount();
								let events = [];
								el.addEventListener("propchange", e =>
									events.push({ value: e.detail.value, oldValue: e.detail.oldValue }));

								Class.props.pause(el);
								el.v = 5;
								el.v = 10;
								el.v = 15;
								Class.props.resume(el);

								return events;
							},
							// `pause` / `resume` is the underlying mechanism the lifecycle
							// hooks use. Exposing it lets consumers batch a burst of writes
							// without going through disconnect/reconnect — useful inside
							// element methods that touch many props at once.
							expect: [{ value: 15, oldValue: 0 }],
						},
					],
				},
			],
		},
	],
};
