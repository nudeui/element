export default {
	name: "propchange events",

	// `this.data.events` is the list of propchange'd prop names recorded by the
	// shared beforeEach (before connect, so mount-time events are captured).
	run ({ actions = [], only }) {
		for (let action of actions) {
			action(this.data.element);
		}

		let stream = this.data.events;
		if (only) {
			stream = stream.filter(name => only.includes(name));
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
			expect: ["src", "mirror", "src", "mirror"],
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
			expect: ["bar"],
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
			expect: ["derived"],
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
			expect: ["derived", "derived"],
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
				"plain",
				"computed",
				"fnDefault",

				// Update
				"plain",
				"computed",
				"fnDefault",
			],
		},
		{
			name: "Assigning current default-resolved value is a no-op",
			arg: {
				props: { v: { type: Number, default: 42 } },
				actions: [el => (el.v = 42)],
			},
			expect: ["v"],
		},
	],
};
