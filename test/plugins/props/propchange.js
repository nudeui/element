export default {
	name: "propchange events",

	// `this.data.events` is the list of [name, value-at-event-time] tuples
	// recorded by the shared beforeEach (before connect, so mount-time events
	// are captured).
	run ({ actions = [], only }) {
		for (let action of actions) {
			action(this.data.element);
		}

		let stream = this.data.events;
		if (only) {
			stream = stream.filter(([name]) => only.includes(name));
		}

		return stream;
	},

	tests: [
		{
			name: "defaultProp re-fires when its source prop changes",
			arg: {
				props: {
					src: { type: String, default: "initial" },
					mirror: { type: String, defaultProp: "src" },
				},
				actions: [el => (el.src = "changed")],
			},
			expect: [
				["src", "initial"],
				["mirror", "initial"],
				["src", "changed"],
				["mirror", "changed"],
			],
		},
		{
			// `bar`'s default has a dependency, so a synthetic `defaultBar` prop is
			// created internally — it must not surface propchange events to consumers.
			name: "default() fires on declared name only",
			arg: {
				props: {
					base: { type: Number, default: 1 },
					bar: {
						default () {
							return this.base * 42;
						},
					},
				},
				only: ["bar", "defaultBar"],
			},
			expect: [["bar", 42]],
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
				only: ["derived"],
			},
			expect: [["derived", 8]],
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
			expect: [
				["derived", 10],
				["derived", 20],
			],
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
				["plain", 1],
				["computed", 11],
				["fnDefault", 100],

				// Update
				["plain", 5],
				["computed", 15],
				["fnDefault", 500],
			],
		},
		{
			name: "Assigning current default-resolved value is a no-op",
			arg: {
				props: { v: { type: Number, default: 42 } },
				actions: [el => (el.v = 42)],
			},
			expect: [["v", 42]],
		},
		{
			name: "Three writes fire three propchange events in order, synchronously",
			description:
				"Each assignment dispatches its propchange before the next statement runs, carrying the just-written value (issue #111)",
			run () {
				let { element } = this.data;
				let log = [];
				element.addEventListener("propchange", e =>
					log.push([e.name, e.detail.parsedValue]));

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
			name: "Writes that collapse to the same value after convert do not fire propchange",
			arg: {
				props: {
					v: {
						type: Number,
						convert (n) {
							return Math.floor(n);
						},
					},
				},
				actions: [el => (el.v = 5), el => (el.v = 5.4), el => (el.v = 5.9)],
				only: ["v"],
			},
			expect: [
				["v", undefined],
				["v", 5],
				// the 5.4 and 5.9 writes do not fire
			],
		},
	],
};
