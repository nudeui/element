import PropType from "../util/PropType.js";

export default PropType.register({
	is: Boolean,
	parse (value) {
		// An absent attribute arrives as null; a property write of false is a real false
		return value !== null && value !== false;
	},
	stringify (value) {
		return value ? "" : null;
	},
});
