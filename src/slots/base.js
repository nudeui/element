import symbols from "../util/symbols.js";
import Slots from "./slots.js";
import SlotController from "./slot-controller.js";

export const { slots } = symbols.known;

export const hooks = {
	constructed () {
		this[slots] = SlotController.create(this);
	},
};

export const providesStatic = {
	defineSlots (def = this[slots] ?? this.slots) {
		if (!(this[slots] instanceof Slots)) {
			this[slots] = new Slots(this, def);
		}
		else if (this[slots] === def) {
			// Nothing to do here
			return;
		}

		// New slots to add
		this[slots].define(def);

		this.hooks.run("define-slots", {context: this, slots: def});
	},
};

export default { hooks, providesStatic };
