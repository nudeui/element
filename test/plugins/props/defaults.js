export default {
	name: "Defaults",

	run ({ actions = [], read }) {
		for (let action of actions) {
			action(this.data.element);
		}

		return this.data.element[read];
	},

	tests: [
		{
			name: "defaultProp severs on explicit write",
			arg: {
				props: {
					src: { type: String, default: "initial" },
					mirror: { type: String, defaultProp: "src" },
				},
				actions: [el => (el.mirror = "explicit"), el => (el.src = "after-sever")],
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
			name: "Plain literal default restored via undefined write",
			arg: {
				props: { v: { type: Number, default: 42 } },
				actions: [el => (el.v = 100), el => (el.v = undefined)],
				read: "v",
			},
			expect: 42,
		},
		{
			name: "undefined write re-resolves a function default",
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
				actions: [el => (el.v = 100), el => (el.v = undefined)],
				read: "v",
			},
			expect: 70,
		},
		{
			name: "null is preserved on a prop with a default",
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
	],
};
