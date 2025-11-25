export function getOptions (defaults, ...options) {
	let ret = Object.create(defaults ?? {});

	for (let o of options) {
		if (typeof o === "object" && o !== null) {
			Object.defineProperties(ret, Object.getOwnPropertyDescriptors(o));
		}
	}

	return ret;
}
