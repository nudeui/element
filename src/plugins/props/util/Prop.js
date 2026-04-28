import { resolveValue } from "../util.js";
import * as types from "./types.js";
import { Signal, Computed } from "../../../signals.js";

let Self = class Prop {
	/**
	 * @type {Props} props - The props object this prop belongs to
	 */
	props;

	#initialized = false;

	/**
	 * Per-element signal storage. Keys are elements, values are Signal instances.
	 * @type {WeakMap<HTMLElement, Signal>}
	 */
	#signals = new WeakMap();

	/**
	 * Backing store for the user-supplied value, kept separate from the
	 * Computed so writes can sever the convert/default fallthrough and a
	 * write of `undefined` can re-engage it.
	 * @type {WeakMap<HTMLElement, Signal>}
	 */
	#rawSignals = new WeakMap();

	constructor (name, spec, props) {
		if (spec instanceof Prop && name === spec.name) {
			return spec;
		}

		// Sugar `defaultProp` into a function default so it reuses the
		// auto-tracked default-fallthrough path. Explicit `default` wins.
		if (spec.defaultProp && spec.default === undefined) {
			let defaultPropName = spec.defaultProp;
			spec = {
				...spec,
				default () {
					return this[defaultPropName];
				},
			};
		}

		this.name = name;
		this.spec = spec;
		this.props = props;

		this.type = types.resolve(spec.type);

		this.default = spec.default;

		// Computed properties are not reflected by default
		this.reflect = spec.reflect ?? !this.spec.get;
	}

	get fromAttribute () {
		let reflectFrom = typeof this.reflect === "object" ? this.reflect.from : this.reflect;
		return reflectFrom === true
			? this.name
			: typeof reflectFrom === "string"
				? reflectFrom
				: null;
	}

	get toAttribute () {
		let reflectTo = typeof this.reflect === "object" ? this.reflect.to : this.reflect;
		return reflectTo === true ? this.name : typeof reflectTo === "string" ? reflectTo : null;
	}

	// Just calls equals() by default but can be overridden
	equals (a, b) {
		if (this.spec.equals) {
			return this.spec.equals(a, b);
		}

		return types.equals(a, b, this.type);
	}

	// To attribute
	stringify (value) {
		if (this.spec.stringify) {
			return this.spec.stringify(value);
		}

		return types.stringify(value, this.type);
	}

	// Parse value into the correct type
	// This could be coming from an attribute (string)
	// Or directly setting the property (which could be a variety of types)
	parse (value) {
		if (this.spec.parse) {
			return this.spec.parse(value);
		}

		return types.parse(value, this.type);
	}

	/**
	 * Subscriber for Computed signals (spec.get, spec.convert, spec.default).
	 * Updates element.props cache, reflects to attributes if opted in,
	 * and fires propchange events.
	 */
	#onComputedChange (element, source, newValue, oldValue) {
		element.props[this.name] = newValue;

		// Reflect to attribute if this prop opts in
		if (this.toAttribute) {
			let attributeValue = this.stringify(newValue);
			let oldAttributeValue = element.getAttribute(this.toAttribute);
			if (oldAttributeValue !== attributeValue) {
				element.ignoredAttributes.add(this.toAttribute);
				if (attributeValue === null) {
					element.removeAttribute(this.toAttribute);
				}
				else {
					element.setAttribute(this.toAttribute, attributeValue);
				}
				element.ignoredAttributes.delete(this.toAttribute);
			}
		}

		this.changed(element, {
			element,
			source,
			parsedValue: newValue,
			oldInternalValue: oldValue,
		});
	}

	/**
	 * Get or lazily create the Signal for this prop on a given element.
	 * - Computed props (spec.get): Computed that auto-tracks dependencies
	 * - Props with default or convert: raw Signal + Computed wrapper,
	 *   so the default / convert re-runs when its deps change and writes
	 *   can sever / restore the fallthrough
	 * - Plain props (no default, no convert, no get): plain Signal
	 * @param {HTMLElement} element
	 * @returns {Signal}
	 */
	getSignal (element) {
		let signal = this.#signals.get(element);

		if (!signal) {
			// Delegate equality to the prop's type-aware equality.
			let options = { equals: (a, b) => this.equals(a, b) };

			if (this.spec.get) {
				signal = new Computed(() => this.spec.get.call(element), options);
				signal.subscribe((newValue, oldValue) => {
					this.#onComputedChange(element, "get", newValue, oldValue);
				});
			}
			else if (this.spec.convert || this.spec.default !== undefined) {
				// Raw Signal holds the user-set value; Computed wraps it to apply
				// convert and/or fall through to the default. Auto-tracks deps.
				let rawSignal = new Signal(undefined, options);
				this.#rawSignals.set(element, rawSignal);

				let source = this.spec.convert ? "convert" : "default";
				signal = new Computed(() => {
					let value = rawSignal.value;
					if (value === undefined && this.spec.default !== undefined) {
						value = resolveValue(this.spec.default, [element, element]);
						if (value != undefined) {
							try {
								value = this.parse(value);
							}
							catch (e) {
								console.warn(
									`Failed to parse default value ${value} for prop ${this.name}. Original error was:`,
									e,
								);
								return null;
							}
						}
					}
					if (value != undefined && this.spec.convert) {
						value = this.spec.convert.call(element, value);
					}
					return value;
				}, options);
				signal.subscribe((newValue, oldValue) => {
					this.#onComputedChange(element, source, newValue, oldValue);
				});
			}
			else {
				signal = new Signal(undefined, options);
			}

			this.#signals.set(element, signal);
		}

		return signal;
	}

	initializeFor (element) {
		let name = this.name;

		if (Object.hasOwn(element, name)) {
			// A local data property will shadow the accessor that is defined on the prototype
			// See https://github.com/nudeui/element/issues/14
			let value = element[name];
			delete element[name]; // Deleting the data property will uncover the accessor
			element[name] = value; // Invoking the accessor means the value doesn't skip parsing
		}
		else if (element.props[name] === undefined) {
			let signal = this.getSignal(element);
			if (signal instanceof Computed) {
				// Force first compute so the subscriber emits the initial propchange
				signal.value;
			}
			else {
				this.changed(element, { source: "default", element });
			}
		}

		this.#initialized = true;
	}

	// Define the necessary getters and setters
	getDescriptor ({ enumerable = true } = this.spec) {
		let me = this;
		let descriptor = {
			get () {
				return me.get(this);
			},
			enumerable,
			configurable: true,
		};

		if (!this.spec.get || this.spec.set === true) {
			descriptor.set = function (value) {
				me.set(this, value, { source: "property" });
			};
		}
		else if (this.spec.set) {
			descriptor.set = function (value) {
				me.spec.set.call(this, value);
			};
		}

		return descriptor;
	}

	get (element) {
		let signal = this.getSignal(element);
		// Reading signal.value auto-tracks if called from within a Computed
		return signal.value;
	}

	set (element, value, { source, name, oldValue } = {}) {
		let signal = this.getSignal(element);
		let rawSignal = this.#rawSignals.get(element);

		// For Computed-backed props, compare against the raw user-set value
		let oldInternalValue = (rawSignal ?? signal).value;

		let attributeName = name;
		let parsedValue;

		try {
			parsedValue = this.parse(value);
		}
		catch (e) {
			// Abort mission
			console.warn(
				`Failed to parse value ${value} for prop ${this.name}. Original error was:`,
				e,
			);
			return;
		}

		if (this.equals(parsedValue, oldInternalValue)) {
			return;
		}

		if (rawSignal) {
			// Computed-backed: write to the raw signal. The Computed recomputes,
			// and its subscriber (#onComputedChange) handles element.props,
			// reflection, and events.
			rawSignal.value = parsedValue;
		}
		else {
			// For plain props: update signal, element.props, reflect, and fire events
			signal.value = parsedValue;
			element.props[this.name] = parsedValue;

			let change = {
				element,
				source,
				value,
				parsedValue,
				oldInternalValue,
				attributeName: name,
			};

			if (source === "property") {
				if (this.toAttribute) {
					let attributeName = this.toAttribute;
					let attributeValue = this.stringify(parsedValue);
					let oldAttributeValue = element.getAttribute(attributeName);

					if (oldAttributeValue !== attributeValue) {
						element.ignoredAttributes.add(this.toAttribute);

						Object.assign(change, { attributeName, attributeValue, oldAttributeValue });
						this.applyChange(element, { ...change, source: "attribute" });

						element.ignoredAttributes.delete(attributeName);
					}
				}
			}
			else if (source === "attribute") {
				Object.assign(change, {
					attributeName,
					attributeValue: value,
					oldAttributeValue: oldValue,
				});
			}

			if (!this.spec.get) {
				this.changed(element, change);
			}
		}
	}

	applyChange (element, change) {
		if (change.source === "attribute") {
			if (element.setAttribute) {
				let attributeName = change.attributeName ?? this.toAttribute;
				let attributeValue =
					change.attributeValue ?? change.element.getAttribute(attributeName);

				if (attributeValue === null) {
					element.removeAttribute(attributeName);
				}
				else {
					element.setAttribute(attributeName, attributeValue);
				}
			}
		}
		else if (change.source === "property") {
			element[this.name] = change.value;
		}
		else if (change.source === "default") {
			// Value will be undefined here
			if (change.element !== element) {
				element[this.name] = change.element[this.name];
			}
		}
		else {
			// Mixed
			this.applyChange(element, { ...change, source: "attribute" });
			this.applyChange(element, { ...change, source: "property" });
		}
	}

	async changed (element, change) {
		this.spec.changed?.call(element, change);
		this.props.propChanged(element, this, change);
	}

	get initialized () {
		return this.#initialized;
	}
};

export default Self;
