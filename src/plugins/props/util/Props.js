import { sortObject } from "../util.js";
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
	 * @param {Object} [props] The props to define as an object with the prop name as the key and the prop spec as the value.
	 */
	constructor (Class, props) {
		super();

		this.Class = Class;

		// Define getters and setters for each prop
		if (props) {
			this.add(props);
		}
	}

	/**
	 * @returns {string[]} Unique attribute names that any reflected prop reads from.
	 */
	get observedAttributes () {
		let attributes = [...this.values()].map(spec => spec.fromAttribute).filter(Boolean);
		return [...new Set(attributes)];
	}

	/**
	 * Define one or more props on the class.
	 * @param {string | Object<string, Object>} nameOrProps Prop name, or map of name → spec.
	 * @param {Object} [spec] Prop spec, when the first argument is a name.
	 */
	add (props) {
		if (arguments.length === 2) {
			let [name, spec] = arguments;
			return this.add({ [name]: spec });
		}

		for (let [name, spec] of Object.entries(props)) {
			this.createProp(name, spec);
		}

		this.updateDependents();
	}

	createProp (name, spec) {
		let prop = new Prop(name, spec, this);
		this.set(name, prop);
		Object.defineProperty(this.Class.prototype, name, prop.getDescriptor());
		return prop;
	}

	/**
	 * Rebuild the dependency graph and reorder props so dependents come after their dependencies.
	 */
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

	/**
	 * Propagate an observed attribute change to every prop reflected from it.
	 * @param {HTMLElement} element
	 * @param {string} name Attribute name.
	 * @param {string | null} [oldValue]
	 */
	attributeChanged (element, name, oldValue) {
		if (!element.isConnected || element.ignoredAttributes.has(name)) {
			// We process attributes all at once when the element is connected
			return;
		}

		// Find relevant props
		let propsFromAttribute = [...this.values()].filter(spec => spec.fromAttribute === name);

		for (let prop of propsFromAttribute) {
			prop.set(element, element.getAttribute(name), {
				source: "attribute",
				name,
				oldAttributeValue: oldValue,
			});
		}
	}

	/**
	 * Elements currently holding propchange event dispatch.
	 * @type {WeakSet<HTMLElement>}
	 */
	#paused = new WeakSet();

	/**
	 * Per-element queue of propchange events awaiting dispatch while paused or before init.
	 * @type {WeakMap<HTMLElement, PropChangeEvent[]>}
	 */
	eventDispatchQueue = new WeakMap();

	/**
	 * Fire propchange events for `prop` and cascade updates to any dependents.
	 * @param {HTMLElement} element
	 * @param {Prop} prop The prop that changed.
	 * @param {Object} change Change descriptor (see {@link Prop#set}).
	 */
	propChanged (element, prop, change) {
		// Source-first: fire before cascading so listeners hear the written prop first.
		let eventNames = ["propchange", ...(prop.eventNames ?? [])];
		for (let eventName of eventNames) {
			this.firePropChangeEvent(element, eventName, {
				name: prop.name,
				prop,
				detail: change,
			});
		}

		// Update all props that have this prop as a dependency
		let dependents = this.dependents[prop.name] ?? new Set();

		for (let dependent of dependents) {
			if (dependent.dependsOn(prop, element)) {
				dependent.update(element, prop);
			}
		}
	}

	/**
	 * Dispatch (or queue, if paused or not yet initialized) a propchange-style event.
	 * @param {HTMLElement} element
	 * @param {string} eventName
	 * @param {{name: string, prop: Prop, detail: Object}} eventProps
	 */
	firePropChangeEvent (element, eventName, eventProps) {
		let event = new PropChangeEvent(eventName, eventProps);

		if (!this.#paused.has(element) && eventProps.prop.initialized) {
			element.dispatchEvent?.(event);
		}
		else {
			let queue = this.eventDispatchQueue.get(element) ?? [];
			queue.push(event);
			this.eventDispatchQueue.set(element, queue);
		}
	}

	/**
	 * Initialize all props for an element: read reflected attributes, apply defaults,
	 * and flush any queued events.
	 * @param {HTMLElement} element
	 */
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

		this.resumeEvents(element);
	}

	/**
	 * Hold propchange event dispatch for an element; events are queued and flushed on resume.
	 * @param {HTMLElement} element
	 */
	pauseEvents (element) {
		this.#paused.add(element);
	}

	/**
	 * Resume propchange event dispatch for an element and flush any queued events.
	 * @param {HTMLElement} element
	 */
	resumeEvents (element) {
		this.#paused.delete(element);

		let queue = this.eventDispatchQueue.get(element);
		if (!queue) {
			return;
		}

		for (let event of queue) {
			element.dispatchEvent?.(event);
		}

		this.eventDispatchQueue.delete(element);
	}
}
