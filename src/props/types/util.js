export * from "../../util/resolve-value.js";

export const defaultPairs = {
	nest: {
		"(": ")",
		"[": "]",
		"{": "}",
	},
	ignore: {
		'"': '"',
		// "'": "'",
		// "`": "`",
	},
};

export function regexEscape (string) {
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

/**
 * Split a value by a separator, respecting pairs (parens, strings, etc.) but failling back gracefully for malformed input
 * @param {string} value
 * @param {object} options
 * @returns
 */
export function split (value, { separator = ",", pairs = defaultPairs } = {}) {
	value = value.trim();

	// Make whitespace optional and flexible, unless the separator consists entirely of whitespace
	separator = separator.trim();
	let isSeparatorWhitespace = !separator;
	let separatorRegex = isSeparatorWhitespace
		? /\s+/g
		: RegExp(regexEscape(separator).replace(/^\s*|\s*$/g, "\\s*"), "g");

	let pairStrings = new Set([
		...Object.keys(pairs.nest),
		...Object.values(pairs.nest),
		...Object.keys(pairs.ignore),
		...Object.values(pairs.ignore),
	]);
	let pairRegex = RegExp([...pairStrings].map(regexEscape).join("|"), "g");

	if (!pairRegex.test(value)) {
		// value contains no pairs, just split
		return value.trim().split(separatorRegex);
	}

	let invertedNestPairs = Object.fromEntries(
		Object.entries(pairs.nest).map(([start, end]) => [end, start]),
	);
	let splitter = RegExp([separatorRegex.source, pairRegex.source].join("|"), "g");
	let stack = [];
	let items = [];
	let item = "";
	let matches = [...value.matchAll(splitter)];
	let lastIndex = 0;
	let ignoreUntil;

	for (let i = 0; i < matches.length; i++) {
		let match = matches[i];
		let index = match.index;
		let matched = match[0];
		let part = value.slice(lastIndex, index);

		if (ignoreUntil) {
			if (ignoreUntil === matched) {
				// TODO escape?
				ignoreUntil = null;
			}
		}
		else if (matched.trim() === separator) {
			if (stack.length === 0) {
				// No open pairs, add to items
				items.push(part.trim());
				lastIndex = index + matched.length;
			}
		}
		else if (pairs.ignore[matched]) {
			// Opening ignored (verbatim) pair
			let closingPair = pairs.ignore[matched];

			// Do we have its closing pair in the string?
			if (matches.slice(i + 1).find(m => m[0] === closingPair)) {
				ignoreUntil = closingPair;
			}
		}
		else if (pairs.nest[matched]) {
			// Opening nested pair
			let closingPair = pairs.nest[matched];

			// Do we have its closing pair in the string?
			if (matches.slice(i + 1).find(m => m[0] === closingPair)) {
				stack.push(matched);
			}
		}
		else if (invertedNestPairs[matched]) {
			// Closing nested pair
			// Why not just check and pop? We want malformed (interleaved) pairs to work too
			let startIndex = stack.findLastIndex(start => start === invertedNestPairs[matched]);

			if (startIndex > -1) {
				stack.splice(startIndex, 1);
			}
		}
	}

	if (stack.length > 0 || ignoreUntil) {
		// Malformed pairs, just split
	}

	if (lastIndex < value.length || item.length > 0) {
		item += value.slice(lastIndex);
		items.push(item.trim());
	}

	return items;
}
