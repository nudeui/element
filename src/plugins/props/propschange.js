/**
 * Implement `propschange`: a coalesced, microtask-deferred event that fires
 * once per burst of `propchange` events, carrying the net first→last delta
 * per prop in a `Map<name, oldValue>`. Round-trips (value returns to the
 * burst-start) drop out.
 *
 * Subclasses that define an `updated(event)` method are auto-wired to
 * `propschange`, mirroring Lit's `updated(changedProperties)`.
 */

import propsPlugin from "./index.js";

const dependencies = [propsPlugin];

/**
 * Event fired after a burst of `propchange` events settles within a microtask.
 * `e.changed` is a `Map<name, oldValue>` carrying the net first→last delta;
 * `oldValue` is the stored internal value (parsed + converted) before the
 * first change in the burst, mirroring `propchange`'s `e.oldValue`. Current
 * values are read via `this[name]` inside the handler.
 */
export class PropsChangeEvent extends Event {
	/**
	 * @param {string} type
	 * @param {EventInit & {changed: Map<string, *>}} options
	 */
	constructor (type, { changed, ...options } = {}) {
		super(type, options);
		this.changed = changed;
	}
}

const hooks = {
	constructor () {
		// Per-prop burst tracking: first oldValue (sticky) + latest value + spec.
		let entries = new Map();
		let scheduled = false;

		// Attaching in the `constructor` hook means the listener catches
		// mount-time propchanges (which fire before `connectedCallback`).
		this.addEventListener("propchange", event => {
			let entry = entries.get(event.name);
			if (entry) {
				entry.value = event.value;
				return;
			}

			if (!scheduled) {
				scheduled = true;
				queueMicrotask(() => {
					scheduled = false;
					let changed = new Map();
					for (let [name, { firstOldValue, value, spec }] of entries) {
						if (!spec.equals(firstOldValue, value)) {
							changed.set(name, firstOldValue);
						}
					}
					entries.clear();

					if (changed.size > 0) {
						this.dispatchEvent(new PropsChangeEvent("propschange", { changed }));
					}
				});
			}

			entries.set(event.name, {
				firstOldValue: event.oldValue,
				value: event.value,
				spec: event.prop.spec,
			});
		});

		if (this.updated) {
			this.addEventListener("propschange", this.updated);
		}
	},
};

export default { dependencies, hooks };
