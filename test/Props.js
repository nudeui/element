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
					],
				},
			],
		},
	],
};
