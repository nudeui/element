const own = Symbol("own");

/**
 * Define static properties that do not inherit (every subclass has its own value)
 * @overload
 * @param {object} obj
 * @param {PropertyKey} name
 * @param {function} init
 * @param {object} options
 *
 * @overload
 * @param {object} obj
 * @param {PropertyKey} name
 * @param {object} options
 */
export function defineOwnProperty (obj, name, init, options = {}) {
	let existingDescriptor = Object.getOwnPropertyDescriptor(obj, name);

	if (existingDescriptor?.get?.[own]) {
		// Already defined
		return;
	}

	if (typeof init === "object") {
		options = init;
		init = options.init;
	}

	let _name = options.internal ?? Symbol(name);

	if (existingDescriptor && !Object.hasOwn(obj, _name)) {
		Object.defineProperty(obj, _name, existingDescriptor);
	}

	function get () {
		if (!Object.hasOwn(this, _name)) {
			this[_name] = init.call(this);
		}

		let value = this[_name];

		if (options.get) {
			value = options.get.call(this, value);
		}

		return value;
	}

	function set (value) {
		if (options.set) {
			value = options.set.call(this, value);
		}

		if (options.writable === false && Object.hasOwn(this, _name) && this[_name] !== value) {
			throw new Error(`Cannot set read-only property ${name}`);
		}

		this[_name] = value;
	}

	get[own] = true;

	let { enumerable = true, configurable = true } = options;
	Object.defineProperty(obj, name, { get, set, configurable, enumerable });
}

export function defineOwnProperties (obj, properties) {
	for (let name in properties) {
		defineOwnProperty(obj, name, properties[name]);
	}
}
