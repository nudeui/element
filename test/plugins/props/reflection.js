export default {
	name: "Reflection",

	tests: [
		{
			name: "Post-mount setAttribute updates the property",
			run () {
				this.data.element.setAttribute("prop", "100");
				return this.data.element.prop;
			},
			arg: { prop: { type: Number, reflect: true } },
			expect: 100,
		},
		{
			name: "Property assignment reflects to the attribute",
			run () {
				this.data.element.foo = "bar";
				return this.data.element.getAttribute("foo");
			},
			arg: { foo: { reflect: true } },
			expect: "bar",
		},
	],
};
