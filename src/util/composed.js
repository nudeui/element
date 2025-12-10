import { newKnownSymbols } from "./symbols.js";

let { composed, constituents } = newKnownSymbols;

export default function (value) {
	if (!value || typeof value !== "object" && typeof value !== "function") {
		return value;
	}

	value[composed] = true;
	return value;
}


export function compose (...values) {
	// Base values are last one wins
	let baseValue = values.filter(v => !v[composed]).at(-1);
	baseValue[constituents] ??= [];
	baseValue[constituents].push(...values.filter(v => v[composed]));


}
