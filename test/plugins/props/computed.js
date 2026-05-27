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
		{
			name: "defaultProp invalidates cache (#125)",
			description:
				"The defaultProp early-return in update() must invalidate the cached value when the prop also has a getter.",
			run () {
				let { element } = this.data;
				let before = element.computed;
				element.source = "b";
				let after = element.computed;
				return [before, after];
			},
			arg: {
				props: {
					source: { default: "a" },
					computed: {
						get () {
							return this.source.toUpperCase();
						},
						defaultProp: "source",
					},
				},
			},
			expect: ["A", "B"],
		},
	],
};
