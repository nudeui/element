export default {
	name: "Defaults",

	tests: [
		{
			name: "Plain literal default returns on read when nothing was written",
			run () {
				return this.data.element.v;
			},
			arg: { props: { v: { type: Number, default: 42 } } },
			expect: 42,
		},
		{
			name: "defaultProp severs on explicit write",
			run () {
				let { element } = this.data;
				let history = [element.mirror];
				element.mirror = "explicit";
				history.push(element.mirror);
				element.src = "after-sever";
				history.push(element.mirror);
				return history;
			},
			arg: {
				props: {
					src: { type: String, default: "initial" },
					mirror: { type: String, defaultProp: "src" },
				},
			},
			expect: ["initial", "explicit", "explicit"],
		},
		{
			name: "defaultProp restores on undefined",
			run () {
				let { element } = this.data;
				let history = [element.mirror];
				element.mirror = "explicit";
				history.push(element.mirror);
				element.src = "x";
				history.push(element.mirror);
				element.mirror = undefined;
				history.push(element.mirror);
				return history;
			},
			arg: {
				props: {
					src: { type: String, default: "initial" },
					mirror: { type: String, defaultProp: "src" },
				},
			},
			expect: ["initial", "explicit", "explicit", "x"],
		},
		{
			name: "default() return is coerced via parse",
			run () {
				return this.data.element.n;
			},
			arg: { props: { n: { type: Number, default: () => "42" } } },
			expect: 42,
		},
		{
			name: "Default passes through convert",
			run () {
				return this.data.element.n;
			},
			arg: {
				props: {
					n: {
						default: 5,
						convert (v) {
							return v * 2;
						},
					},
				},
			},
			expect: 10,
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
			name: "Undefined write re-resolves the default",
			run () {
				let { element } = this.data;
				let history = [element.v];
				element.v = 100;
				history.push(element.v);
				element.v = undefined;
				history.push(element.v);
				return history;
			},

			tests: [
				{
					name: "Plain literal default",
					arg: { props: { v: { type: Number, default: 42 } } },
					expect: [42, 100, 42],
				},
				{
					name: "Function default",
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
					},
					expect: [70, 100, 70],
				},
			],
		},
		{
			name: "null is preserved on a prop with a default",
			run () {
				let { element } = this.data;
				let before = element.v;
				element.v = null;
				return [before, element.v];
			},
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
			},
			expect: [70, null],
		},
	],
};
