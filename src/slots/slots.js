import SlotController from "./slot-controller.js";
import newSymbols from "../util/symbols.js";

const { slots } = newSymbols;

export const hooks = {
	constructor () {
		if (!this.constructor[slots]) {
			return;
		}

		this[slots] = new SlotController(this);
	},
	firstConnected () {
		if (!this.constructor[slots]) {
			return;
		}

		this[slots].init();
	},
};

export const membersStatic = {
	defineSlots (def = this[slots] ?? this.slots) {
		if (Array.isArray(def)) {
			// Just slot names, no options
			def = Object.fromEntries(def.map(name => [name, {}]));
		}

		this[slots] ??= {};
		Object.assign(this[slots], def);

		this.hooks.run("define-slots", {context: this, slots: def});
	},
};
