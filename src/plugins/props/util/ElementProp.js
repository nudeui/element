import { resolveValue } from "../util.js";

export default class ElementProp {
	/**
	 * Internal value
	 */
	value;

	/**
	 *
	 * @param {HTMLElement} element
	 * @param {Prop} spec
	 */
	constructor (element, spec) {
		this.element = element;
		this.spec = spec;

		let name = this.spec.name;
		if (Object.hasOwn(element, name)) {
			// A local data property will shadow the accessor that is defined on the prototype
			// See https://github.com/nudeui/element/issues/14
			let value = element[name];
			delete element[name]; // Deleting the data property will uncover the accessor
			element[name] = value; // Invoking the accessor means the value doesn't skip parsing
		}
		// TODO this needs editing
		else if (element.props[name] === undefined && !this.spec.defaultProp) {
			// Is not set and its default is not another prop
			this.changed(element, { source: "default", element });
		}
	}

	get name () {
		return this.spec.name;
	}

	get type () {
		return this.spec.type;
	}

	/**
	 * Read this prop's current value for an element, falling back to its default.
	 * @param {HTMLElement} element
	 */
	get () {
		let element = this.element;
		let value = this.value;

		if (value === undefined) {
			this.update(element);
			value = this.value;
		}

		if (value === undefined) {
			if (this.defaultProp) {
				value = this.defaultProp.get(element);
			}
			else if (this.default !== undefined) {
				value = resolveValue(this.default, [element, element]);

				try {
					value = this.parse(value);
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

				if (this.spec.convert) {
					value = this.spec.convert.call(element, value);
				}
			}
		}

		return value;
	}

	/**
	 * Write a value to an element: parse, convert, store, and reflect to attribute when applicable.
	 * @param {HTMLElement} element
	 * @param {*} value Raw value (string from an attribute, or any from a property write).
	 * @param {{source?: string, name?: string, oldAttributeValue?: string | null}} [options]
	 */
	set (element, value, { source, name, oldAttributeValue } = {}) {
		let oldValue = element.props[this.name];

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

		// removeAttribute() arrives as null; collapse to undefined so the prop
		// reverts to its natural empty state. Property writes of null remain a
		// legitimate user value.
		if (source === "attribute" && parsedValue === null) {
			parsedValue = undefined;
		}

		if (this.spec.convert) {
			parsedValue = this.spec.convert.call(element, parsedValue);
		}

		if (this.equals(parsedValue, oldValue)) {
			return;
		}

		element.props[this.name] = parsedValue;

		let change = {
			element,
			source,
			value: parsedValue,
			oldValue,
		};

		if (source === "property") {
			// Reflect to attribute?
			if (this.spec.reflect.to) {
				let attributeName = this.spec.reflect.to;
				let attributeValue = this.stringify(parsedValue);
				let oldAttributeValue = element.getAttribute(attributeName);

				if (oldAttributeValue !== attributeValue) {
					// TODO what if another prop is reflected *from* this attribute?
					element.ignoredAttributes.add(attributeName);

					Object.assign(change, { attributeName, attributeValue, oldAttributeValue });
					this.applyChange(element, { ...change, source: "attribute" });

					element.ignoredAttributes.delete(attributeName);
				}
			}
		}
		else if (source === "attribute") {
			Object.assign(change, {
				attributeName: name,
				attributeValue: value,
				oldAttributeValue,
			});
		}

		this.changed(element, change);
	}

	/**
	 * Apply a change descriptor to an element by writing through the matching attribute or property.
	 * @param {HTMLElement} element
	 * @param {Object} change
	 */
	applyChange (element, change) {
		if (change.source === "attribute") {
			if (element.setAttribute) {
				let attributeName = change.attributeName ?? this.spec.reflect.to;
				let attributeValue =
					change.attributeValue !== undefined
						? change.attributeValue
						: change.element.getAttribute(attributeName);

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

	/**
	 * Invoke the spec's `changed` hook and cascade to {@link Props#propChanged}.
	 * @param {HTMLElement} element
	 * @param {Object} change
	 */
	async changed (element, change) {
		this.spec.changed?.call(element, change);
		this.props.propChanged(element, this, change);
	}

	/**
	 * Recalculate this prop's value (for computed props or `convert`) and store it.
	 * @param {HTMLElement} element
	 * @param {Prop} [dependency] The dependency whose change triggered this update.
	 */
	update (dependency) {
		let element = this.element;
		let oldValue = element.props[this.name];

		if (dependency === this.defaultProp) {
			// We have no way of checking if the default prop has changed
			// and there’s nothing to set, so let’s just called changed directly
			this.changed(element, { element, source: "default" });
			return;
		}

		if (this.spec.get) {
			let value = this.spec.get.call(element);
			this.set(element, value, { source: "get", oldValue });
		}

		if (this.spec.convert && oldValue !== undefined) {
			let value = this.spec.convert.call(element, oldValue);
			this.set(element, value, { source: "convert", oldValue });
		}
	}
}
