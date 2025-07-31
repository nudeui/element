import { sortObject } from "./util.js";
import Prop from "./Prop.js";
import PropChangeEvent from "./PropChangeEvent.js";

export default class Props extends Map {
	/**
	 * Dependency graph
	 * @type {Object.<string, Set<string>>}
	 * Key is the name of the prop, value is a set of prop names that depend on it
	 */
	dependents = {};

	/**
	 *
	 * @param {HTMLElement} Class The class to define props for
	 * @param {Object} [props=Class.props] The props to define as an object with the prop name as the key and the prop spec as the value.
	 */
	constructor (Class, props = Class.props) {
		super(Object.entries(props));

		this.Class = Class;

		// Define getters and setters for each prop
		this.add(props);
	}

	get observedAttributes () {
		let attributes = [...this.values()].map(spec => spec.fromAttribute).filter(Boolean);
		return [...new Set(attributes)];
	}

	add (props) {
		if (arguments.length === 2) {
			let [name, spec] = arguments;
			return this.add({ [name]: spec });
		}

		for (let [name, spec] of Object.entries(props)) {
			let prop = new Prop(name, spec, this);
			this.set(name, prop);
			Object.defineProperty(this.Class.prototype, name, prop.getDescriptor());
		}

		this.updateDependents();
	}

	updateDependents () {
		// Rebuild dependency graph
		let dependents = {};

		for (let name of this.keys()) {
			dependents[name] = new Set();
		}

		let keyIndices = Object.fromEntries([...this.keys()].map((key, i) => [key, i]));
		let sort = false;
		let values = [...this.values()];

		if (!values.every(value => value instanceof Prop)) {
			// Not ready, still adding props
			return;
		}

		for (let prop of this.values()) {
			// Add dependencies
			let dependencies = [...prop.dependencies];

			if (prop.defaultProp) {
				dependencies.push(prop.defaultProp.name);
			}

			for (let name of dependencies) {
				// ${name} depends on ${prop.name}
				dependents[name]?.add(prop);

				// Dependent props should come after the prop they depend on
				if (keyIndices[name] > keyIndices[prop.name]) {
					// Swap the order of the props
					[keyIndices[name], keyIndices[prop.name]] = [
						keyIndices[prop.name],
						keyIndices[name],
					];
					sort = true;
				}
			}
		}

		if (!sort) {
			this.dependents = dependents;
		}
		else {
			// Sort dependency graph using the new order in keyIndices
			// TODO put props with no dependencies first
			// TODO do we need a topological sort?
			this.dependents = sortObject(dependents, ([a], [b]) => {
				return keyIndices[a] - keyIndices[b];
			});

			// Reorder the props according to their order in the dependency graph
			// so that every time we use this.values() or this.keys(), the result is in the correct order
			for (let propName of Object.keys(this.dependents)) {
				let prop = this.get(propName);
				this.delete(propName);
				this.set(propName, prop);
			}

			// Reorder dependents of every prop according to the dependency graph built
			for (let [name, dependents] of Object.entries(this.dependents)) {
				if (dependents.size < 2) {
					// Nothing to reorder
					continue;
				}

				let props = [...dependents]
					.map(prop => [prop, keyIndices[prop.name]])
					.sort((a, b) => a[1] - b[1])
					.map(([prop, i]) => prop);

				this.dependents[name] = new Set(props);
			}
		}
	}

	attributeChanged (element, name, oldValue) {
		if (!element.isConnected || element.ignoredAttributes.has(name)) {
			// We process attributes all at once when the element is connected
			return;
		}

		// Find relevant props
		let propsFromAttribute = [...this.values()].filter(spec => spec.fromAttribute === name);

		for (let prop of propsFromAttribute) {
			prop.set(element, element.getAttribute(name), { source: "attribute", name, oldValue });
		}
	}

	eventDispatchQueue = new WeakMap();

	propChanged (element, prop, change) {
		// Update all props that have this prop as a dependency
		let dependents = this.dependents[prop.name] ?? new Set();

		for (let dependent of dependents) {
			if (dependent.dependsOn(prop, element)) {
				dependent.update(element, prop);
			}
		}

		if (prop.rawProp && element.props[prop.name] !== undefined && element.props[prop.rawProp] !== undefined) {
			delete element.props[prop.rawProp];
			let rawProp = this.get(prop.rawProp);
			rawProp.defaultProp ??= prop;
			this.propChanged(element, rawProp, {source: "property", value: element.props[prop.rawProp]});
		}

		// Fire propchange event
		let eventNames = ["propchange", ...(prop.eventNames ?? [])];
		for (let eventName of eventNames) {
			this.firePropChangeEvent(element, eventName, {
				name: prop.name,
				prop,
				detail: change,
			});
		}
	}

	firePropChangeEvent (element, eventName, eventProps) {
		let event = new PropChangeEvent(eventName, eventProps);

		if (element.isConnected && eventProps.prop.initialized) {
			element.dispatchEvent?.(event);
		}
		else {
			let queue = this.eventDispatchQueue.get(element) ?? [];
			queue.push(event);
			this.eventDispatchQueue.set(element, queue);
		}
	}

	initializeFor (element) {
		if (element.hasAttribute) {
			// Update all reflected props from attributes at once
			for (let name of this.observedAttributes) {
				// Only process elements that have this attribute, or used to
				if (element.hasAttribute(name)) {
					this.attributeChanged(element, name);
				}
			}
		}

		// Fire propchange events for any props not already handled
		for (let prop of this.values()) {
			prop.initializeFor(element);
		}

		// Dispatch any events that were queued
		let queue = this.eventDispatchQueue.get(element);

		if (queue) {
			for (let event of queue) {
				element.dispatchEvent?.(event);
			}

			this.eventDispatchQueue.delete(element);
		}
	}

	/**
	 * Add a prop regardless of whether props have been processed or not yet
	 * @param {Function} Class
	 * @param {string} name
	 * @param {object} spec
	 */
	static add (Class, name, spec) {
		if (Class.props instanceof this) {
			Class.props.add(name, spec);
		}
		else {
			Class.props[name] = spec;
		}
	}
}
