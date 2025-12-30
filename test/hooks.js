import base, { addPlugin } from "../src/extensible.js";

export default {
	name: "hooks",
	run (hookName, classes) {
		let ret = [];

		for (let name of classes) {
			let Class = this.data[name];
			Class.hooks.add(hookName, function () {
				let isStatic = typeof this === "function";
				let suffix = isStatic ? ":" + this.name : "";
				ret.push(name + suffix);
			});
		}

		new this.data[classes.at(-1)]();

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
			args: ["first_constructor_static", ["B", "C", "D"]],
			expect: ["B:D", "C:D", "D:D"],
			// expect: ["B:B", "B:C", "B:D", "C:C", "C:D", "D:D"],
		},
		{
			args: ["constructor", ["B", "C", "D"]],
			expect: ["B", "C", "D"],
		},
	],
};
