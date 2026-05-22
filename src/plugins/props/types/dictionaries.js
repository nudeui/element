import DictionaryType from "../util/DictionaryType.js";

export const ObjectType = DictionaryType.register({
	is: Object,
	equals (a, b) {
		let aKeys = Object.keys(a);
		let bKeys = Object.keys(b);

		if (aKeys.length !== bKeys.length) {
			return false;
		}

		let { values } = this;
		return aKeys.every(key => (values ? values.equals(a[key], b[key]) : a[key] === b[key]));
	},
	parse (value) {
		if (value instanceof Map) {
			value = value.entries();
		}
		else if (typeof value === "object") {
			let { values } = this;
			if (values) {
				for (let key in value) {
					value[key] = values.parse(value[key]);
				}
			}

			return value;
		}

		return Object.fromEntries(this.parseEntries(value));
	},
	stringify (value) {
		let { values } = this;
		let { separator = ", " } = this.spec;
		let entries = Object.entries(value);

		if (values) {
			entries = entries.map(([key, val]) => [key, values.stringify(val)]);
		}

		return entries.map(([key, val]) => `${key}: ${val}`).join(separator);
	},
});

export const MapType = DictionaryType.register({
	is: Map,
	equals (a, b) {
		if (a.size !== b.size) {
			return false;
		}

		let { values } = this;
		for (let [key, val] of a) {
			if (!b.has(key)) {
				return false;
			}

			let bVal = b.get(key);
			if (values ? !values.equals(val, bVal) : val !== bVal) {
				return false;
			}
		}

		return true;
	},
	parse (value) {
		if (value instanceof Map) {
			let { keys, values } = this;
			if (keys || values) {
				for (let [key, val] of value) {
					value.delete(key);
					value.set(keys?.parse(key) ?? key, values?.parse(val) ?? val);
				}
			}

			return value;
		}
		else if (typeof value === "object") {
			value = Object.entries(value);
		}

		let entries = this.parseEntries(value);
		return Array.isArray(entries) ? new Map(entries) : entries;
	},
	stringify (value) {
		let { keys, values } = this;
		let { separator = ", " } = this.spec;
		let entries = [...value.entries()];

		if (keys || values) {
			entries = entries.map(([key, val]) => [
				keys ? keys.stringify(key) : key,
				values ? values.stringify(val) : val,
			]);
		}

		return entries.map(([key, val]) => `${key}: ${val}`).join(separator);
	},
});
