import ListType from "../util/ListType.js";

export const ArrayType = ListType.register({
	is: Array,
	equals (a, b) {
		if (a.length !== b.length) {
			return false;
		}

		let { values } = this;
		return a.every((item, i) => (values ? values.equals(item, b[i]) : item === b[i]));
	},
	parse (value) {
		return this.parseItems(value);
	},
	stringify (value) {
		return this.joinItems(value);
	},
});

export const SetType = ListType.register({
	is: Set,
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
		if (value instanceof Set) {
			let { values } = this;
			if (values) {
				// Parse values in place
				for (let item of value) {
					let parsed = values.parse(item);
					if (parsed !== item) {
						value.delete(item);
						value.add(parsed);
					}
				}
			}

			return value;
		}

		return new Set(this.parseItems(value));
	},
	stringify (value) {
		return this.joinItems([...value]);
	},
});
