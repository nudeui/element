export default {
	name: "Computed properties",

	tests: [
		{
			name: "get() updates when its dependency changes",
			run () {
				let { element } = this.data;
				let before = element.derived;
				element.base = 5;
				return [before, element.derived];
			},
			arg: {
				props: {
					base: { type: Number, default: 1 },
					derived: {
						get () {
							return this.base * 2;
						},
					},
				},
			},
			expect: [2, 10],
		},
		{
			name: "spec.equals: a tolerated dependency change leaves the cached value",
			run () {
				let { element } = this.data;
				let before = element.derived;
				element.base = 42.05;
				return [before, element.derived];
			},
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
			},
			expect: [42, 42],
		},
	],
};
