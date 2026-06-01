export default {
	name: "propchange events",

	tests: [
		{
			name: "defaultProp re-fires when its source prop changes",
			run () {
				this.data.element.src = "changed";
				return this.data.events;
			},
			arg: {
				props: {
					src: { type: String, default: "initial" },
					mirror: { type: String, defaultProp: "src" },
				},
			},
			expect: [
				["src", "initial"],
				["mirror", "initial"],
				["src", "changed"],
				["mirror", "changed"],
			],
		},
		{
			name: "Mount-time event order",
			run () {
				return this.data.events;
			},

			tests: [
				{
					name: "default() with reactive deps: synthetic prop event fires before declared",
					description:
						"Synthetic default props are consumer-visible — analogous to native form-control .value/.defaultValue.",
					arg: {
						props: {
							base: { type: Number, default: 1 },
							bar: {
								default () {
									return this.base * 42;
								},
							},
						},
					},
					expect: [
						["base", 1],
						["defaultBar", 42],
						["bar", 42],
					],
				},
				{
					name: "No double-fire on mount for computed props",
					arg: {
						props: {
							base: { type: Number, default: 7 },
							derived: {
								get () {
									return this.base + 1;
								},
							},
						},
					},
					expect: [
						["base", 7],
						["derived", 8],
					],
				},
				{
					name: "default() that reads a non-prop receiver member still fires on mount",
					description:
						"`inferDependencies` promotes a `default() { return this.X }` to a synthetic " +
						"computed depending on `X` regardless of whether `X` is a declared prop. " +
						"When `X` isn't a prop (e.g. `textContent`, a mixin getter, an instance field), " +
						"no upstream cascade can reach the synthetic, so the mount event has to come " +
						"from the prop's own constructor.",
					arg: {
						mixin (Class) {
							Object.defineProperty(Class.prototype, "content", {
								get () {
									return "hi";
								},
							});
						},
						props: {
							value: {
								default () {
									return this.content;
								},
							},
						},
					},
					expect: [
						["defaultValue", "hi"],
						["value", "hi"],
					],
				},
			],
		},
		{
			name: "default() reactive on declared name",
			run () {
				this.data.element.base = 2;
				return this.data.events;
			},
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
			},
			expect: [
				["base", 1],
				["defaultDerived", 10],
				["derived", 10],
				["base", 2],
				["defaultDerived", 20],
				["derived", 20],
			],
		},
		{
			name: "Events fan out across plain, get, and default() props",
			run () {
				this.data.element.plain = 5;
				return this.data.events;
			},
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
			},
			expect: [
				// Mount
				["plain", 1],
				["computed", 11],
				["defaultFnDefault", 100],
				["fnDefault", 100],

				// Update
				["plain", 5],
				["computed", 15],
				["defaultFnDefault", 500],
				["fnDefault", 500],
			],
		},
		{
			name: "Assigning current default-resolved value is a no-op",
			run () {
				this.data.element.v = 42;
				return this.data.events;
			},
			arg: { props: { v: { type: Number, default: 42 } } },
			expect: [["v", 42]],
		},
		{
			name: "Three writes fire three propchange events in order, synchronously",
			description:
				"Each assignment dispatches its propchange before the next statement runs, carrying the just-written value (issue #111)",
			run () {
				let { element } = this.data;
				let log = [];
				element.addEventListener("propchange", e => log.push([e.name, e.value]));

				element.v = "foo";
				element.v = "bar";
				element.v = "baz";

				return log;
			},
			arg: { props: { v: {} } },
			expect: [
				["v", "foo"],
				["v", "bar"],
				["v", "baz"],
			],
		},
		{
			name: "Convert re-runs on the original input when a non-default dep changes",
			description:
				"A prop with a convert that reads another reactive prop must re-derive from the user's input, not from the previously converted value. Regression for the two-slot refactor: the old single-slot model re-ran convert on the already-converted value, which compounded for non-idempotent converts.",
			run () {
				let { element } = this.data;
				element.multiplier = 2;
				element.v = 5; // 5 * 2 = 10
				element.multiplier = 3; // should be 5 * 3 = 15, not 10 * 3 (or worse)
				return element.v;
			},
			arg: {
				props: {
					multiplier: { type: Number, default: 1 },
					v: {
						type: Number,
						convert (n) {
							return n * this.multiplier;
						},
					},
				},
			},
			expect: 15,
		},
		{
			name: "Writes that collapse to the same value after convert do not fire propchange",
			description:
				"v has no default — its mount-time state is genuinely undefined, so no mount propchange fires. Only the first write that produces a new floored value triggers an event.",
			run () {
				let { element } = this.data;
				element.v = 5;
				element.v = 5.4;
				element.v = 5.9;
				return this.data.events;
			},
			arg: {
				props: {
					v: {
						type: Number,
						convert (n) {
							return Math.floor(n);
						},
					},
				},
			},
			expect: [
				["v", 5],
				// the 5.4 and 5.9 writes do not fire
			],
		},
	],
};
