export default {
	name: "Reflection",

	tests: [
		{
			name: "Property assignment is readable on the property synchronously",
			run () {
				this.data.element.foo = "bar";
				return this.data.element.foo === "bar";
			},
			arg: { props: { foo: { default: "foo" } } },
			expect: true,
		},
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
			name: "reflect: { from, to } honors asymmetric attribute names",
			description: "Reads via from on mount, writes reflect to to, from stays untouched",
			run () {
				let { element } = this.data;
				let initial = element.foo;
				element.foo = 99;

				return {
					initial,
					to: element.getAttribute("to"),
					from: element.getAttribute("from"),
				};
			},
			arg: {
				props: {
					foo: { type: Number, reflect: { from: "from", to: "to" } },
				},
				attributes: { from: "10" },
			},
			expect: { initial: 10, to: "99", from: "10" },
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
			name: "Default is not reflected to the attribute on mount",
			run () {
				return this.data.element.getAttribute("plain");
			},
			arg: { props: { plain: { type: Number, default: 7, reflect: true } } },
			expect: null,
		},
		{
			name: "Explicit write equal to the default still reflects to the attribute",
			description:
				"Mount must not reflect the default, but an explicit user write of the same value must (issue #105)",
			run () {
				let { element } = this.data;
				element.v = 7;
				return element.getAttribute("v");
			},
			arg: { props: { v: { type: Number, default: 7, reflect: true } } },
			expect: "7",
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
			name: "removeAttribute collapses a reflected prop to its default",
			run () {
				let { element } = this.data;
				element.setAttribute("v", "100");
				let before = element.v;
				element.removeAttribute("v");
				return [before, element.v];
			},
			arg: { props: { v: { type: Number, default: 42, reflect: true } } },
			expect: [100, 42],
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
