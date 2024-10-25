import { parse, stringify, equals } from "../types.js";
import { split } from "./util.js";

function parseList (value, { values, ...options } = {}) {
	if (typeof value === "string") {
		value = split(value, options);
	}
	else {
		value = Array.isArray(value) ? value : [value];
	}

	if (values) {
		value = value.map(item => parse(item, values));
	}

	return value;
}

export const array = {
	type: Array,
	equals (a, b, { values } = {}) {
		if (a.length !== b.length) {
			return false;
		}

		return a.every((item, i) => equals(item, b[i], values));
	},
	parse: parseList,
	stringify: (value, { values, separator = ",", joiner } = {}) => {
		if (values) {
			value = value.map(item => stringify(item, values));
		}

		if (!joiner) {
			let trimmedSeparator = separator.trim();
			joiner = (!trimmedSeparator || trimmedSeparator === "," ? "" : " ") + separator + " ";
		}

		return value.join(joiner);
	},
};

export const set = {
	type: Set,
	equals (a, b, { values } = {}) {
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
	parse (value, options) {
		if (value instanceof Set) {
			if (options) {
				let { values } = options;

				if (values) {
					// Parse values in place
					for (let item of value) {
						let parsed = parse(item, values);
						if (parsed !== item) {
							value.delete(item);
							value.add(parsed);
						}
					}
				}
			}

			return value;
		}

		let items = parseList(value, options);
		return new Set(items);
	},
	stringify: (value, { values, separator = ",", joiner } = {}) => {
		if (values) {
			value = value.map(item => stringify(item, values));
		}

		if (!joiner) {
			let trimmedSeparator = separator.trim();
			joiner = (!trimmedSeparator || trimmedSeparator === "," ? "" : " ") + separator + " ";
		}

		return value.join(joiner);
	},
};
