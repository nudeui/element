import { composeFunction } from "./compose-function.js";

export function mergeValues (targetValue, sourceValue) {
	if (!targetValue || !sourceValue) {
		return targetValue || sourceValue;
	}

	let mergeType = getMergeType(targetValue, sourceValue);

	switch (mergeType) {
		case "function":
			return composeFunction(targetValue, sourceValue);
		case "array":
			return [...targetValue, ...sourceValue];
		case "set":
			return new Set([...targetValue, ...sourceValue]);
		case "map":
			return new Map([...targetValue, ...sourceValue]);
		case "object":
			return deepMerge(targetValue, sourceValue);
	}

	throw new Error(`Cannot merge values`, { cause: { targetValue, sourceValue } });
}

export function deepMerge (target, source) {
	if (typeof target !== "object" || target === null || typeof source !== "object" || source === null) {
		return source ?? target;
	}

	let ret = Object.create(target);

	for (let [key, value] of Object.entries(source)) {
		ret[key] = deepMerge(ret[key], value);
	}

	return ret;
}

export function canMerge (target, source) {
	return !!getMergeType(target, source);
}

export function getMergeType (target, source) {
	if (typeof target === "function" && typeof source === "function") {
		return "function";
	}

	if (Array.isArray(target) && Array.isArray(source)) {
		return "array";
	}

	if (target instanceof Set && source instanceof Set) {
		return "set";
	}

	if (target instanceof Map && source instanceof Map) {
		return "map";
	}

	if (typeof target === "object" && typeof source === "object") {
		return "object";
	}
}
