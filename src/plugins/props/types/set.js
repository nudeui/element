import PropType from "../util/PropType.js";
import IterableType from "./iterable.js";

export default PropType.register({
	is: Set,
	extends: IterableType,
	equals (a, b) {
		if (a.size !== b.size) {
			return false;
		}

		for (let item of a) {
			if (!b.has(item)) {
				return false;
			}
		}

		return true;
	},
	parse (value) {
		return new Set(IterableType.spec.parse.call(this, value));
	},
});
