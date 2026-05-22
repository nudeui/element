import PropType from "../util/PropType.js";
import MapType from "./map.js";

export default PropType.register({
	is: Object,
	extends: MapType,
	equals (a, b) {
		let aKeys = Object.keys(a);
		let bKeys = Object.keys(b);

		if (aKeys.length !== bKeys.length) {
			return false;
		}

		return aKeys.every(key => this.values.equals(a[key], b[key]));
	},
	parse (value) {
		if (value && typeof value === "object" && !value[Symbol.iterator]) {
			value = Object.entries(value);
		}
		let result = {};
		for (let [k, v] of this.parseEntries(value)) {
			result[this.keys.parse(k)] = this.values.parse(v);
		}
		return result;
	},
	stringify (value) {
		return MapType.spec.stringify.call(this, Object.entries(value));
	},
});
