import { getSuper } from "./super.js";
import { internals } from "./symbols.js";

export function attachInternals (thisArg = this) {
	let superInternals = getSuper(thisArg, "attachInternals");

	if (!superInternals) {
		// Method likely not supported
		return;
	}

	return thisArg[internals] ??= superInternals.call(thisArg);
}
