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

	constructor (name, spec, props) {
		if (spec instanceof Prop && name === spec.name) {
			return spec;
		}

		this.name = name;
		this.spec = spec;
		this.props = props;

		this.type = types.resolve(spec.type);

		this.default = spec.default;

		if (typeof spec.default === "function" && this.props) {
			// Create a computed prop so signals can auto-track dependencies at runtime
			let defaultProp = "default" + name.replace(/^\w/, c => c.toUpperCase());
			this.props.add(defaultProp, {
				get: spec.default,
			});
			this.default = this.props.get(defaultProp);
		}

		if (spec.defaultProp) {
			Object.defineProperty(this, "default", {
				get: () => this.props.get(spec.defaultProp),
				configurable: true,
				enumerable: true,
			});
		}

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

	get defaultProp () {
		return this.default instanceof Prop ? this.default : null;
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
	 * Get or lazily create the Signal for this prop on a given element.
	 * Non-computed props get a plain Signal; computed props (with spec.get)
	 * get a Computed signal that auto-tracks dependencies.
	 * @param {HTMLElement} element
	 * @returns {Signal}
	 */
	getSignal (element) {
		let signal = this.#signals.get(element);

		if (!signal) {
			if (this.spec.get) {
				signal = new Computed(() => this.spec.get.call(element));

				// Computed props recompute via the signal chain, not via set(),
				// so they need a subscriber to fire propchange events
				signal.subscribe((newValue, oldValue) => {
					element.props[this.name] = newValue;
					this.changed(element, {
						element,
						source: "get",
						parsedValue: newValue,
						oldInternalValue: oldValue,
					});
				});
			}
			else {
				signal = new Signal(undefined);
			}

			// Delegate equality to the prop's type-aware equality
			signal.equals = (a, b) => this.equals(a, b);

			this.#signals.set(element, signal);
		}

		return signal;
	}

	initializeFor (element) {
		// Ensure signal exists for this element
		this.getSignal(element);

		// Handle any properties already set before initialization
		let name = this.name;

		if (Object.hasOwn(element, name)) {
			// A local data property will shadow the accessor that is defined on the prototype
			// See https://github.com/nudeui/element/issues/14
			let value = element[name];
			delete element[name]; // Deleting the data property will uncover the accessor
			element[name] = value; // Invoking the accessor means the value doesn't skip parsing
		}
		else if (element.props[name] === undefined && !this.defaultProp) {
			// Is not set and its default is not another prop
			this.changed(element, { source: "default", element });
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
		let value = signal.value;

		if (value === undefined || value === null) {
			if (this.default !== undefined) {
				if (this.defaultProp) {
					value = this.defaultProp.get(element);
				}
				else {
					value = resolveValue(this.default, [element, element]);
				}

				try {
					return this.parse(value);
				}
				catch (e) {
					console.warn(
						"Failed to parse default value",
						value,
						`for prop ${this.name}. Original error was: `,
						e,
					);
					return null;
				}
			}
		}

		return value;
	}

	set (element, value, { source, name, oldValue } = {}) {
		let signal = this.getSignal(element);
		let oldInternalValue = signal.value;

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

		if (this.spec.convert) {
			parsedValue = this.spec.convert.call(element, parsedValue);
		}

		if (this.equals(parsedValue, oldInternalValue)) {
			return;
		}

		// Update both signal and element.props
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
			// Reflect to attribute?
			if (this.toAttribute) {
				let attributeName = this.toAttribute;
				let attributeValue = this.stringify(parsedValue);
				let oldAttributeValue = element.getAttribute(attributeName);

				if (oldAttributeValue !== attributeValue) {
					// TODO what if another prop is reflected *from* this attribute?
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

		// Set signal value (will notify computed dependents automatically)
		// We set this after change handling above so reflection happens before propagation
		signal.value = parsedValue;

		// Fire propchange events (but not for computed props — those fire via signal subscriber)
		if (!this.spec.get) {
			this.changed(element, change);
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
