export default {
	name: "Boolean props",

	tests: [
		{
			name: "A property write of false is a real false",
			description:
				"parse() runs on property writes too, where false is a value rather than " +
				"the absence an attribute-less null signals.",
			run () {
				let { element } = this.data;
				element.flag = false;
				return element.flag;
			},
			arg: { props: { flag: { type: Boolean, default: true } } },
			expect: false,
		},
		{
			name: "Writing false removes the reflected attribute",
			run () {
				let { element } = this.data;
				element.flag = false;
				return element.getAttribute("flag");
			},
			arg: {
				props: { flag: { type: Boolean, reflect: true } },
				attributes: { flag: "" },
			},
			expect: null,
		},
		{
			name: "A reactive default recovers once ownership is given up",
			description:
				"false is a write, undefined is an absence: only the latter re-resolves default().",
			run () {
				let { element } = this.data;
				element.flag = false;
				let written = element.flag;
				element.flag = undefined;
				return [written, element.flag];
			},
			arg: {
				props: {
					kind: { default: "static" },
					flag: {
						type: Boolean,
						default () {
							return this.kind === "static";
						},
					},
				},
			},
			expect: [false, true],
		},
		{
			name: "Attribute presence is truth, whatever the value says",
			run () {
				return this.data.element.flag;
			},
			expect: true,

			tests: [
				{
					name: `flag="false"`,
					arg: { props: { flag: { type: Boolean } }, attributes: { flag: "false" } },
				},
				{
					name: `flag=""`,
					arg: { props: { flag: { type: Boolean } }, attributes: { flag: "" } },
				},
			],
		},
	],
};
