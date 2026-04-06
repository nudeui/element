/**
 * Minimal signals implementation with auto-tracking.
 * Provides reactive primitives for the props system.
 */

/** @type {{ track: Function } | null} Currently tracking context */
let tracking = null;

/** @type {Set<Computed>} Computeds marked dirty, awaiting recomputation */
let dirtyComputeds = new Set();
let flushScheduled = false;

/**
 * Schedule a microtask to recompute all dirty Computeds.
 * Uses a while-loop to handle cascades (computing B may dirty D).
 */
function scheduleDirtyFlush () {
	if (!flushScheduled) {
		flushScheduled = true;
		queueMicrotask(flushDirty);
	}
}

const MAX_FLUSH_ITERATIONS = 100;

function flushDirty () {
	flushScheduled = false;
	let iterations = 0;
	while (dirtyComputeds.size > 0) {
		if (++iterations > MAX_FLUSH_ITERATIONS) {
			console.warn("Signals: possible circular dependency detected, aborting flush after", MAX_FLUSH_ITERATIONS, "iterations");
			dirtyComputeds.clear();
			break;
		}
		let batch = [...dirtyComputeds];
		dirtyComputeds.clear();
		for (let computed of batch) {
			computed.recomputeIfDirty();
		}
	}
}

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

	/**
	 * Recompute if dirty. Called by the batch flush scheduler
	 * and also available for eager evaluation.
	 */
	recomputeIfDirty () {
		if (this.#dirty) {
			this.#compute();
		}
	}

	#compute () {
		// Remove from dirty set (handles eager reads before flush)
		dirtyComputeds.delete(this);

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

		// Subscribe to all discovered deps — mark dirty and schedule,
		// don't recompute immediately (avoids glitches in diamond deps)
		for (let dep of this.#deps) {
			this.#unsubs.push(dep.subscribe(() => {
				this.#dirty = true;
				dirtyComputeds.add(this);
				scheduleDirtyFlush();
			}));
		}

		// Check if value actually changed, and if so, notify subscribers.
		// Temporarily suspend tracking so the internal read doesn't
		// register this Computed as a dependency of an outer Computed.
		let prev2 = tracking;
		tracking = null;
		let old = super.value;
		tracking = prev2;

		if (!this.equals(value, old)) {
			// Use Signal.prototype.value setter directly (bypasses no-op Computed setter)
			Object.getOwnPropertyDescriptor(Signal.prototype, "value").set.call(this, value);
		}
	}
}
