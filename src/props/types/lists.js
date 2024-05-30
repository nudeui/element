function parseList (value, { itemType, separator = ",", splitter } = {}) {
	if (Array.isArray(value)) {
		return value;
	}

	if (!splitter) {
		// Make whitespace optional and flexible, unless the separator consists entirely of whitespace
		let isSeparatorWhitespace = !separator.trim();
		splitter = isSeparatorWhitespace ? /\s+/ : new RegExp(separator.replace(/\s+/g, "\\s*"));
	}


	value = typeof value === "string" ? value.trim().split(splitter) : [value];

	if (itemType) {
		value = value.map(item => parse(item, itemType));
	}
}

export const Array = {
	equals (a, b, { itemType } = {}) {
		if (a.length !== b.length) {
			return false;
		}

		return a.every((item, i) => equals(item, b[i], itemType));
	},
	parse: parseList,
	stringify: (value, { itemType, separator = ",", joiner } = {}) => {
		if (itemType) {
			value = value.map(item => stringify(item, itemType));
		}

		if (!joiner) {
			let trimmedSeparator = separator.trim();
			joiner = (!trimmedSeparator || trimmedSeparator === "," ? "" : " ") + separator + " ";
		}

		return value.join(joiner);
	},
};

export const Set = {
	equals (a, b, { itemType } = {}) {
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
			if (itemType) {
				for (let item of value) {
					let parsed = parse(item, itemType);
					if (parsed !== item) {
						value.delete(item);
						value.add(parsed);
					}
				}
			}

			return value;
		}

		let items = parseList(value, options);
		return new Set(items);
	},
	stringify: (value, { itemType, separator = ",", joiner } = {}) => {
		if (itemType) {
			value = value.map(item => stringify(item, itemType));
		}

		if (!joiner) {
			let trimmedSeparator = separator.trim();
			joiner = (!trimmedSeparator || trimmedSeparator === "," ? "" : " ") + separator + " ";
		}

		return value.join(joiner);
	},
};