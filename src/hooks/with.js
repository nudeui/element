import Hooks from "./hooks.js";

export function appliesTo (Class) {
	return "hooks" in Class;
}

export const Mixin = (Super = HTMLElement) => class WithHooks extends Super {
	static hooks = new Hooks(super.hooks || {});

	constructor () {
		super();

		this.init?.();
	}

	init () {
		super.init?.();

		const Self = this.constructor;

		if (Self.hooks && !(Self.hooks instanceof Hooks)) {
			Self.hooks = new Hooks(Self.hooks);
		}
	}

	static appliesTo = appliesTo;
};

Mixin.appliesTo = appliesTo;
export default Mixin();
