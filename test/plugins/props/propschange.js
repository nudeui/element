/**
 * `propschange` is dispatched once per microtask after a burst of `propchange`
 * events settles. Tests await `Promise.resolve()` (or a microtask) to let the
 * drain run before asserting.
 */
import { default as propsPlugin } from "../../../src/plugins/props/base.js";
import { default as propschangePlugin } from "../../../src/plugins/props/propschange.js";
import { defineElement } from "../../util/dom.js";

const flush = () => Promise.resolve();

export default {
	name: "propschange plugin",

	beforeEach () {
		let { props, attributes, mixin } = this.arg;
		let tag = defineElement({ plugins: [propsPlugin, propschangePlugin], props, mixin });
		let element = document.createElement(tag);

		let events = [];
		element.addEventListener("propchange", e => events.push([e.name, e.target[e.name]]));

		let propsEvents = [];
		element.addEventListener("propschange", e => propsEvents.push([...e.changed]));

		for (let [name, value] of Object.entries(attributes ?? {})) {
			element.setAttribute(name, value);
		}

		document.body.append(element);

		Object.assign(this.data, { element, events, propsEvents });
	},

	afterEach () {
		this.data.element.remove();
	},

	tests: [
		{
			name: "Mount fires one propschange with every prop → undefined",
			async run () {
				await flush();
				return this.data.propsEvents;
			},
			arg: {
				props: {
					a: { type: Number, default: 1 },
					b: { type: String, default: "x" },
				},
			},
			expect: [
				[
					["a", undefined],
					["b", undefined],
				],
			],
		},
		{
			name: "Three writes to the same prop collapse to one propschange entry",
			description:
				"oldValue is the stored previous value (the cached resolved default 0 here), mirroring propchange's e.oldValue.",
			async run () {
				let { element } = this.data;
				await flush(); // drain mount-time propschange first
				let mountCount = this.data.propsEvents.length;

				element.v = 1;
				element.v = 2;
				element.v = 3;

				await flush();
				return this.data.propsEvents.slice(mountCount);
			},
			arg: { props: { v: { type: Number, default: 0 } } },
			expect: [[["v", 0]]],
		},
		{
			name: "Round-trip drops out: x=stored; x=stored fires propchange twice, no propschange",
			description:
				"Round-trip is detected against the stored previous value. With no explicit prior write, the stored old is undefined — so a write to a non-undefined value then back to undefined would be the round-trip, not back to the default.",
			async run () {
				let { element } = this.data;
				element.v = 1; // establish a stored value via property write
				await flush();
				let propchangeCountBefore = this.data.events.length;
				let propschangeCountBefore = this.data.propsEvents.length;

				element.v = 2;
				element.v = 1; // back to stored value

				await flush();
				return {
					propchangeAfter: this.data.events.length - propchangeCountBefore,
					propschangeAfter: this.data.propsEvents.length - propschangeCountBefore,
				};
			},
			arg: { props: { v: { type: Number, default: 0 } } },
			expect: { propchangeAfter: 2, propschangeAfter: 0 },
		},
		{
			name: "Round-trip on one prop drops it; genuinely changed prop stays",
			async run () {
				let { element } = this.data;
				await flush(); // drain mount-time propschange
				this.data.propsEvents.length = 0;

				element.a = 5;
				element.a = 0; // back to stored default
				element.b = "new";

				await flush();
				return this.data.propsEvents;
			},
			arg: {
				props: {
					a: { type: Number, default: 0 },
					b: { type: String, default: "old" },
				},
			},
			expect: [[["b", "old"]]],
		},
		{
			name: "Cascade: dependents land in the same propschange",
			description:
				"Both plain and computed cache their mount-time values, so oldValue is the resolved default for each.",
			async run () {
				let { element } = this.data;
				await flush();
				let mountCount = this.data.propsEvents.length;

				element.plain = 5;

				await flush();
				return this.data.propsEvents.slice(mountCount);
			},
			arg: {
				props: {
					plain: { type: Number, default: 1 },
					computed: {
						get () {
							return this.plain + 10;
						},
					},
				},
			},
			expect: [
				[
					["plain", 1],
					["computed", 11],
				],
			],
		},
		{
			name: "Re-entrant write from a propchange handler joins the same propschange",
			async run () {
				let { element } = this.data;
				await flush(); // drain mount-time propschange
				this.data.propsEvents.length = 0;

				element.addEventListener("propchange", e => {
					if (e.name === "a") {
						element.b = "from_listener";
					}
				});

				element.a = "new";
				await flush();
				return this.data.propsEvents;
			},
			arg: { props: { a: { default: "foo" }, b: { default: "bar" } } },
			expect: [
				[
					["a", "foo"],
					["b", "bar"],
				],
			],
		},
		{
			name: "Disconnect/reconnect: revert propchange dispatched, no propschange (dispatched round-trip)",
			description:
				"v=2 sync; disconnect; v=1 (the burst's stored old); reconnect → consumer hears the revert via propchange, but propschange's net effect is zero.",
			async run () {
				let { element } = this.data;
				element.v = 1; // establish a stored value
				await flush();
				let propchangeLog = [];
				element.addEventListener("propchange", e =>
					propchangeLog.push([e.name, e.oldValue, e.value]));
				let propschangeCountBefore = this.data.propsEvents.length;

				element.v = 2; // connected: dispatched immediately
				element.remove(); // pause
				element.v = 1; // back to stored old while paused
				document.body.append(element); // resume

				await flush();
				return {
					propchanges: propchangeLog,
					propschangesAfter: this.data.propsEvents.length - propschangeCountBefore,
				};
			},
			arg: { props: { v: { type: Number, default: 0 } } },
			expect: {
				propchanges: [
					["v", 1, 2],
					["v", 2, 1],
				],
				propschangesAfter: 0,
			},
		},
		{
			name: "Paused burst: A,A,A,B,B,A coalesces sequentially into three dispatches",
			description:
				"Consecutive runs for the same prop merge; B between A-runs splits them, so the consumer hears A then B then A again.",
			async run () {
				let { element } = this.data;
				element.a = 0; // establish stored values before the burst
				element.b = 0;
				await flush();
				let propchangeLog = [];
				element.addEventListener("propchange", e =>
					propchangeLog.push([e.name, e.oldValue, e.value]));
				let propschangeCountBefore = this.data.propsEvents.length;

				element.props.paused = true;
				element.a = 1;
				element.a = 2;
				element.a = 3;
				element.b = 10;
				element.b = 20;
				element.a = 7;
				element.props.paused = false;

				await flush();
				return {
					propchanges: propchangeLog,
					propschange: this.data.propsEvents.slice(propschangeCountBefore),
				};
			},
			arg: {
				props: {
					a: { type: Number, default: 0 },
					b: { type: Number, default: 0 },
				},
			},
			expect: {
				propchanges: [
					["a", 0, 3],
					["b", 0, 20],
					["a", 3, 7],
				],
				propschange: [
					[
						["a", 0],
						["b", 0],
					],
				],
			},
		},
		{
			name: "Paused burst: one rebased propchange + one propschange on resume",
			async run () {
				let { element } = this.data;
				element.v = 1; // establish a stored old value before the burst
				await flush();
				let propchangeLog = [];
				element.addEventListener("propchange", e =>
					propchangeLog.push([e.name, e.oldValue, e.value]));
				let propschangeCountBefore = this.data.propsEvents.length;

				element.props.paused = true;
				element.v = 2;
				element.v = 3;
				element.v = 4;
				element.props.paused = false;

				await flush();
				return {
					propchanges: propchangeLog,
					propschange: this.data.propsEvents.slice(propschangeCountBefore),
				};
			},
			arg: { props: { v: { type: Number, default: 0 } } },
			expect: {
				propchanges: [["v", 1, 4]],
				propschange: [[["v", 1]]],
			},
		},
		{
			name: "Paused burst: coalescing attribute→property does not leak attribute fields",
			description:
				"When an attribute write is followed by a property write on the same prop during a pause, the resumed propchange must reflect the latest write — no stale attributeName/attributeValue/oldAttributeValue from the prior attribute event.",
			async run () {
				let { element } = this.data;
				await flush();
				let propchangeLog = [];
				element.addEventListener("propchange", e =>
					propchangeLog.push({
						source: e.source,
						value: e.value,
						attributeName: e.attributeName,
						attributeValue: e.attributeValue,
						oldAttributeValue: e.oldAttributeValue,
					}));

				element.props.paused = true;
				element.setAttribute("foo", "1");
				element.foo = 2;
				element.props.paused = false;

				await flush();
				return propchangeLog;
			},
			arg: {
				props: {
					foo: { type: Number, reflect: { from: true, to: false } },
				},
			},
			expect: [
				{
					source: "property",
					value: 2,
					attributeName: undefined,
					attributeValue: undefined,
					oldAttributeValue: undefined,
				},
			],
		},
		{
			name: "updated() method auto-wires to propschange",
			async run () {
				await flush();
				let { element } = this.data;
				let updates = element.constructor.__updates;
				element.v = 5;
				await flush();
				return updates.map(changed => [...changed]);
			},
			arg: {
				props: { v: { type: Number, default: 0 } },
				mixin (Class) {
					Class.__updates = [];
					Class.prototype.updated = function (event) {
						this.constructor.__updates.push(event.changed);
					};
				},
			},
			expect: [[["v", undefined]], [["v", 0]]],
		},
	],
};
