export function toArray (value) {
	return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

export * from "./util/fetch-css.js";
export * from "./util/adopt-css.js";
