/**
 * Minimal signals implementation with auto-tracking.
 * Provides reactive primitives for the props system.
 */

/** @type {{ track: Function } | null} Currently tracking context */
let tracking = null;

/**
 * Reactive value container. Reading `.value` inside a Computed's
 * function automatically registers this signal as a dependency.
 */
export class Signal extends EventTarget {
	#value;
	#subscribers = new Set();

	constructor (value) {
		super();
		this.#value = value;
	}

	get value () {
		tracking?.track(this);
		return this.#value;
	}

	set value (v) {
		if (this.equals(v, this.#value)) {
			return;
		}

		let old = this.#value;
		this.#value = v;
		this.#notify(old);
	}

	/**
	 * Overridable equality check. Defaults to `===`.
	 */
	equals (a, b) {
		return a === b;
	}

	/**
	 * Subscribe to value changes. Returns an unsubscribe function.
	 * @param {Function} fn - Called with (newValue, oldValue) on change
	 * @returns {Function} Unsubscribe function
	 */
	subscribe (fn) {
		this.#subscribers.add(fn);
		return () => this.#subscribers.delete(fn);
	}

	#notify (old) {
		for (let fn of this.#subscribers) {
			fn(this.#value, old);
		}

		this.dispatchEvent(new Event("change"));
	}
}

/**
 * A computed signal that auto-tracks dependencies by intercepting
 * `.value` reads during its compute function. Re-tracks on each
 * recomputation, so dynamic/conditional dependencies work.
 */
export class Computed extends Signal {
	#fn;
	#deps = new Set();
	#unsubs = [];
	#dirty = true;

	/**
	 * @param {Function} fn - Compute function. All Signal `.value` reads
	 *   inside this function are auto-tracked as dependencies.
	 */
	constructor (fn) {
		super(undefined);
		this.#fn = fn;
	}

	get value () {
		if (this.#dirty) {
			this.#compute();
		}

		// Still register with parent tracking context
		tracking?.track(this);
		return super.value;
	}

	set value (_v) {
		// Computed signals are read-only; writes are ignored
	}

	#compute () {
		// Tear down old subscriptions
		for (let unsub of this.#unsubs) {
			unsub();
		}

		let deps = new Set();
		this.#unsubs.length = 0;

		// Track dependencies by intercepting Signal.value reads
		let prev = tracking;
		tracking = {
			track: (signal) => deps.add(signal),
		};

		let value;
		try {
			value = this.#fn();
		}
		finally {
			tracking = prev;
		}

		this.#deps = deps;
		this.#dirty = false;

		// Subscribe to all discovered deps
		for (let dep of this.#deps) {
			this.#unsubs.push(dep.subscribe(() => {
				this.#dirty = true;
				// Re-compute immediately and propagate
				this.#compute();
			}));
		}

		// Check if value actually changed, and if so, notify subscribers
		// We need to bypass the Computed no-op setter
		let old = super.value;
		if (!this.equals(value, old)) {
			// Use Signal.prototype.value setter directly
			Object.getOwnPropertyDescriptor(Signal.prototype, "value").set.call(this, value);
		}
	}
}
