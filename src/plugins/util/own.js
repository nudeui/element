/**
 * Define static properties that do not inherit (every subclass has its own value)
 * @param {*} obj
 * @param {*} name
 * @param {*} options
 */
export function defineOwnProperty (obj, name, options = {}) {
	if (typeof options === "function") {
		options = { get: options };
	}

	let _name = options.internal ?? Symbol(name);
	let { enumerable = true, configurable = true } = options;

	let existingDescriptor = Object.getOwnPropertyDescriptor(obj, name);

	if (existingDescriptor && !Object.hasOwn(obj, _name)) {
		Object.defineProperty(obj, _name, existingDescriptor);
	}

	Object.defineProperty(obj, name, {
		get () {
			if (!Object.hasOwn(this, _name)) {
				this[_name] = options.get.call(this);
			}

			return this[_name];
		},
		set (value) {
			if (options.writable === false && Object.hasOwn(this, _name) && this[_name] !== value) {
				throw new Error(`Cannot set read-only property ${name}`);
			}

			this[_name] = value;
		},
		configurable,
		enumerable,
	});
}

export function defineOwnProperties (obj, properties) {
	for (let name in properties) {
		defineOwnProperty(obj, name, properties[name]);
	}
}
