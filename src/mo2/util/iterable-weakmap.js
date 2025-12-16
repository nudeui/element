/**
 * Simple class for managing an iterable map that still holds keys weakly
 * For a more robust implementation, see https://www.npmjs.com/package/weak-iterables
 */

/**
 * Uniquely map objects to weak refs so they can be used
 * to have weak data structures that are iterable.
 * @type {WeakMap<object, WeakRef<object>>}
 */
const weakRefs = new WeakMap();
weakRefs.add = function (key) {
	if (this.has(key)) {
		return this.get(key);
	}

	let ref = new WeakRef(key);
	this.set(key, ref);
	return ref;
};

export default class IterableWeakMap extends Map {
	set (key, value) {
		let ref = weakRefs.add(key);
		return super.set(ref, value);
	}

	has (key) {
		let ref = weakRefs.get(key);
		return ref ? super.has(ref) : false;
	}

	get (key) {
		let ref = weakRefs.get(key);
		return ref ? super.get(ref) : undefined;
	}

	delete (key) {
		let ref = weakRefs.get(key);
		return ref ? super.delete(ref) : false;
	}

	*keys () {
		const deadRefs = new Set();
		for (const ref of super.keys()) {
			let key = ref.deref();

			if (key) {
				yield key;
			}
			else {
				// Garbage collected
				deadRefs.add(ref);
			}
		}

		for (const key of deadRefs) {
			super.delete(key);
			weakRefs.delete(key);
		}
	}

	*entries() {
		for (const key of this.keys()) {
			let value = this.get(key);
			yield [key, value];
		}
	}

	[Symbol.iterator] () {
		return this.entries();
	}
}
