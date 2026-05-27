import PropType from "../util/PropType.js";

export default PropType.register({
	is: Boolean,
	parse (value) {
		return value !== null;
	},
	stringify (value) {
		return value ? "" : null;
	},
});
