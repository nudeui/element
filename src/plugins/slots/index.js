import slots from "./base.js";
import manualNamedSlots from "./named-manual.js";
import HasSlotted from "./has-slotted.js";
import AutoAssign from "./auto-assign.js";
import DynamicSlots from "./dynamic-slots.js";

export {
	slots,
	manualNamedSlots,
	HasSlotted,
	AutoAssign,
	DynamicSlots,
};

export default {
	dependencies: [
		slots,
	],
};
