export default {
	name: "Reflection",

	tests: [
		{
			name: "Property assignment reflects to the attribute",
			run () {
				this.data.element.foo = "bar";
				return this.data.element.getAttribute("foo");
			},
			arg: { props: { foo: { reflect: true } }, attributes: { foo: "initial" } },
			expect: "bar",
		},
		{
			name: "Pre-set attribute coerces into the typed property on mount",
			run () {
				return this.data.element.bar;
			},
			arg: {
				props: { bar: { type: Number, reflect: true } },
				attributes: { bar: "42" },
			},
			expect: 42,
		},
		{
			name: "Post-mount setAttribute updates the property (issue #98)",
			run () {
				this.data.element.setAttribute("prop", "100");
				return this.data.element.prop;
			},
			arg: { props: { prop: { type: Number, reflect: true } }, attributes: { prop: "42" } },
			expect: 100,
		},
		{
			name: "Clearing a reflected prop removes the attribute",
			getName () {
				return this.arg.value + "";
			},
			run ({ value }) {
				let { element } = this.data;
				element.foo = value;
				return element.getAttribute("foo");
			},
			expect: null,
			tests: [
				{
					arg: {
						props: { foo: { reflect: true } },
						attributes: { foo: "bar" },
						value: undefined,
					},
				},
				{
					arg: {
						props: { foo: { reflect: true } },
						attributes: { foo: "bar" },
						value: null,
					},
				},
			],
		},
	],
};
