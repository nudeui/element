import {
	resolveValue,
} from "../util.js";
import {
	inferDependencies,
} from "./util.js";

import * as types from "./types.js";

let Self = class Prop {
	/**
	 * @type {Props} props - The props object this prop belongs to
	 */
	props;

	constructor (name, spec, props) {
		if (spec instanceof Prop && name === spec.name) {
			return spec;
		}

		this.name = name;
		this.spec = spec;
		this.props = props;

		this.type = types.resolve(spec.type);

		this.default = spec.default;

		if (typeof spec.default === "function") {
			let defaultDependencies = spec.defaultDependencies ?? inferDependencies(spec.default);
			if (defaultDependencies.length > 0) {
				let defaultProp = "default" + name.replace(/^\w/, c => c.toUpperCase());
				this.props.add(defaultProp, {
					get: spec.default,
					dependencies: defaultDependencies,
				});
				this.default = this.props.get(defaultProp);
			}
		}

		if (spec.defaultProp) {
			Object.defineProperty(this, "default", {
				get: () => this.props.get(spec.defaultProp),
				configurable: true,
				enumerable: true,
			});
		}

		if (spec.dependencies) {
			this.dependencies = new Set(spec.dependencies);
		}
		else {
			this.dependencies = new Set([
				...inferDependencies(spec.get),
				...inferDependencies(spec.convert),
				...(spec.additionalDependencies ?? []),
			]);
		}

		// Computed properties are not reflected by default
		this.reflect = spec.reflect ?? !this.spec.get;
	}

	get fromAttribute () {
		let reflectFrom = typeof this.reflect === "object" ? this.reflect.from : this.reflect;
		return reflectFrom === true ? this.name : typeof reflectFrom === "string" ? reflectFrom : null;
	}

	get toAttribute () {
		let reflectTo = typeof this.reflect === "object" ? this.reflect.to : this.reflect;
		return reflectTo === true ? this.name : typeof reflectTo === "string" ? reflectTo : null;
	}

	get defaultProp () {
		return this.default instanceof Prop ? this.default : null;
	}

	// Just calls equals() by default but can be overridden
	equals(a, b) {
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

	initializeFor (element) {
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
			this.changed(element, {source: "default", element});
		}
	}

	// Define the necessary getters and setters
	getDescriptor ({enumerable = true} = this.spec) {
		let me = this;
		let descriptor = {
			get () {
				return me.get(this);
			},
			enumerable,
		};

		if (!this.spec.get || this.spec.set === true) {
			descriptor.set = function (value) {
				me.set(this, value, {source: "property"});
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
		let value = element.props[this.name];

		if (value === undefined) {
			this.update(element);
			value = element.props[this.name];
		}

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
					console.warn("Failed to parse default value", value, `for prop ${this.name}. Original error was: `, e);
					return null;
				}
			}
		}

		return value;
	}

	set (element, value, {source, name, oldValue} = {}) {
		let oldInternalValue = element.props[this.name];

		let attributeName = name;
		let parsedValue;

		try {
			parsedValue = this.parse(value);
		}
		catch (e) {
			// Abort mission
			console.warn(`Failed to parse value ${value} for prop ${this.name}. Original error was:`, e);
			return;
		}

		if (this.spec.convert) {
			parsedValue = this.spec.convert.call(element, parsedValue);
		}

		if (this.equals(parsedValue, oldInternalValue)) {
			return;
		}

		element.props[this.name] = parsedValue;

		let change = {
			element, source,
			value, parsedValue, oldInternalValue,
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
					this.applyChange(element, {...change, source: "attribute"});

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

		this.changed(element, change);
	}

	applyChange (element, change) {
		if (change.source === "attribute") {
			let attributeName = change.attributeName ?? this.toAttribute;
			let attributeValue = change.attributeValue ?? change.element.getAttribute(attributeName);

			if (attributeValue === null) {
				element.removeAttribute(attributeName);
			}
			else {
				element.setAttribute(attributeName, attributeValue);
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
			this.applyChange(element, {...change, source: "attribute"});
			this.applyChange(element, {...change, source: "property"});
		}
	}

	async changed (element, change) {
		this.spec.changed?.call(element, change);
		this.props.propChanged(element, this, change);
	}

	/**
	 * Recalculate computed properties and cache the value
	 * @param {*} element
	 */
	update (element, dependency) {
		let oldValue = element.props[this.name];

		if (dependency === this.defaultProp) {
			// We have no way of checking if the default prop has changed
			// and there’s nothing to set, so let’s just called changed directly
			this.changed(element, {element, source: "default"});
			return;
		}

		if (this.spec.get) {
			let value = this.spec.get.call(element);
			this.set(element, value, {source: "get", oldValue});
		}

		if (this.spec.convert && oldValue !== undefined) {
			let value = this.spec.convert.call(element, oldValue);
			this.set(element, value, {source: "convert", oldValue});
		}
	}

	dependsOn (prop, element) {
		if (!prop) {
			return false;
		}

		if (prop === this) {
			return true;
		}

		return this.dependencies.has(prop.name)
		       || (this.defaultProp === prop && element.props[this.name] === undefined);
	}
}

export default Self;
