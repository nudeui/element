/**
 * Minimal signals implementation with auto-tracking.
 * Provides reactive primitives for the props system.
 */

/** @type {{ track: Function } | null} Currently tracking context */
let tracking = null;

/** @type {Set<Computed>} Computeds marked dirty, awaiting recomputation */
let dirtyComputeds = new Set();

/** Re-entrancy guard for `flushDirty`. Nested calls are absorbed by the outer one. */
let flushing = false;

const MAX_FLUSH_ITERATIONS = 100;

/**
 * Synchronously recompute all dirty Computeds in topological order.
 * The outermost call drains any Computeds newly dirtied during the flush —
 * nested calls (from Signal writes inside a subscriber) are no-ops.
 */
function flushDirty () {
	if (flushing) {
		return;
	}

	flushing = true;
	try {
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
	finally {
		flushing = false;
	}
}

/**
 * Reactive value container. Reading `.value` inside a Computed's
 * function automatically registers this signal as a dependency.
 */
export class Signal extends EventTarget {
	#value;
	#subscribers = new Set();

	/**
	 * @param {*} value - Initial value.
	 * @param {object} [options]
	 * @param {(a: *, b: *) => boolean} [options.equals] - Custom equality
	 *   check. Set as an instance override of the default `===` method.
	 */
	constructor (value, { equals } = {}) {
		super();
		this.#value = value;
		if (equals) {
			this.equals = equals;
		}
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
		// Drain any Computeds the notify just marked dirty. Sync flush keeps
		// reads, propchange dispatch, and dependent recomputation all on the
		// same tick as the originating write.
		flushDirty();
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
	 * @param {object} [options] - Forwarded to `Signal` (e.g. `equals`).
	 */
	constructor (fn, options) {
		super(undefined, options);
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
	 * Recompute if dirty. Called from the topological flush loop and also
	 * available for eager evaluation when a reader reaches a dirty Computed.
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

		// Subscribe to all discovered deps. The subscriber just marks dirty
		// and joins the flush set — the outer `flushDirty` (running because
		// it was kicked off by the originating `Signal.value` write) sees
		// the new entry on its next iteration and recomputes in order.
		for (let dep of this.#deps) {
			this.#unsubs.push(dep.subscribe(() => {
				this.#dirty = true;
				dirtyComputeds.add(this);
			}));
		}

		super.value = value;
	}
}
