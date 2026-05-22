import PropType from "../util/PropType.js";
import IterableType from "./iterable.js";

export default PropType.register({
	is: Array,
	extends: IterableType,
	parse (value) {
		return [...IterableType.spec.parse.call(this, value)];
	},
});
