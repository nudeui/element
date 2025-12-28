import slots from "./base.js";
import manualNamedSlots from "./named-manual.js";

export {
	slots,
	manualNamedSlots,
};

export default {
	dependencies: [
		slots,
		manualNamedSlots,
	],
};
