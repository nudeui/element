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
		return Object.fromEntries(this.parsedEntries(value));
	},
	stringify (value) {
		let { separator = ", " } = this;
		let parts = [];
		for (let [k, v] of Object.entries(value)) {
			parts.push(`${this.keys.stringify(k)}: ${this.values.stringify(v)}`);
		}
		return parts.join(separator);
	},
});
