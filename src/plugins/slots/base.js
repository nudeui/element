import symbols from "../../symbols.js";
import Slots from "./util/slots.js";
import SlotController from "./util/slot-controller.js";

export const { slots } = symbols.known;

const hooks = {
	constructed () {
		this[slots] = SlotController.create(this);
	},

	setup () {
		if (this.slots) {
			this.defineSlots();
		}
	},
};

const providesStatic = {
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
