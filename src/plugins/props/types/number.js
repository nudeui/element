import PropType from "../util/PropType.js";

export default PropType.register({
	is: Number,
	equals (a, b) {
		// All other cases are handled by the basic equality check in Prop.equals
		return Number.isNaN(a) && Number.isNaN(b);
	},
});
