import PropType from "../util/PropType.js";
import Iterable from "./iterable.js";

export default PropType.register({
	is: Array,
	extends: Iterable,
	parse (value) {
		return [...Iterable.spec.parse.call(this, value)];
	},
});
