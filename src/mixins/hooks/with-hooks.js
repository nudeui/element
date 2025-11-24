import Hooks from "./hooks.js";
import { satisfiedBy } from "../../util/symbols.js";

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

	static [satisfiedBy] = "hooks";
};

export default Mixin();
