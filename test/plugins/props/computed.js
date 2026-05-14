export default {
	name: "Computed properties",

	run ({ actions = [], read }) {
		for (let action of actions) {
			action(this.data.element);
		}

		return this.data.element[read];
	},

	tests: [
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
			name: "spec.equals: a tolerated dependency change leaves the cached value",
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
	],
};
