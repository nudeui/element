export function delegate (target, {source, properties, enumerable = true, writable = false, configurable = true}) {
	for (let prop of properties) {
		let descriptor = {
			get () {
				let sourceObj = typeof source === "function" ? source.call(this) : source;
				return sourceObj[prop];
			},
			enumerable,
			configurable,
		};
		if (writable) {
			descriptor.set = function (value) {
				let sourceObj = typeof source === "function" ? source.call(this) : source;
				sourceObj[prop] = value;
			};
		}
		Object.defineProperty(target, prop, descriptor);
	}
}
