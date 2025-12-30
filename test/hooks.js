import base, { addPlugin } from "../src/extensible.js";

export default {
	name: "hooks",
	run ({ hook, classes, create }) {
		let ret = [];

		for (let name of classes) {
			let Class = this.data[name];
			Class.hooks.add(hook, function () {
				let isStatic = typeof this === "function";
				let suffix = isStatic ? ":" + this.name : "";
				ret.push(name + suffix);
			});
		}

		create = Array.isArray(create) ? create : [create];
		for (let name of create) {
			new this.data[name]();
		}

		return ret;
	},
	beforeEach () {
		class A {}
		class B extends A {
			constructor () {
				super();
				this.constructor.$hook("constructor-static");
				this.$hook("constructor");
			}
		}
		class C extends B {}
		class D extends C {}
		addPlugin(B, base);

		Object.assign(this.data, { A, B, C, D });
	},
	tests: [
		{
			name: "Simple",
			arg: {
				hook: "constructor",
				classes: ["D"],
				create: "D",
			},
			expect: ["D"],
		},
		{
			name: "first_ prefix",
			arg: {
				hook: "first_constructor",
				classes: ["D"],
				create: ["D", "D", "D"],
			},
			expect: ["D"],
		},
		{
			name: "Inheritance (static)",
			arg: {
				hook: "first_constructor_static",
				classes: ["B", "C", "D"],
				create: "D",
			},
			// previous output:
			// expect: ["B:D", "C:D", "D:D"],
			expect: ["B:B", "B:C", "B:D", "C:C", "C:D", "D:D"],
		},
		{
			name: "Inheritance (instance)",
			arg: {
				hook: "constructor",
				classes: ["B", "C", "D"],
				create: "D",
			},
			expect: ["B", "C", "D"],
		},
	],
};
