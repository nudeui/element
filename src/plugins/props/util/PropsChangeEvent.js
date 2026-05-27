/**
 * Event fired after a burst of {@link PropChangeEvent}s settles within a microtask.
 * Carries the net first→last delta as a `changed` Map of `name → oldValue`.
 * Current values are read via `this[name]` inside the handler.
 *
 * `oldValue` is the stored internal value (parsed + converted) before the
 * first change in the burst, mirroring `propchange`'s `e.oldValue`.
 */
export default class PropsChangeEvent extends Event {
	/**
	 * Net change map: prop name → the value before the first change in the burst.
	 * Round-trips (current value equals the recorded old value) are filtered out.
	 * @type {Map<string, *>}
	 */
	changed;

	constructor (type, { changed, ...options } = {}) {
		super(type, options);
		this.changed = changed;
	}
}
