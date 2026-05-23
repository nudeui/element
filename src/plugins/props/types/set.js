import PropType from "../util/PropType.js";
import Iterable from "./iterable.js";

export default PropType.register({
	is: Set,
	extends: Iterable,
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
		return new Set(Iterable.spec.parse.call(this, value));
	},
});
