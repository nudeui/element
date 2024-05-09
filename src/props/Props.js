import {
	sortObject,
} from "../util.js";
import Prop from "./Prop.js";

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
		return [...this.values()].map(spec => spec.fromAttribute).filter(Boolean);
	}

	add (props) {
		if (arguments.length === 2) {
			let [name, spec] = arguments;
			return this.add({[name]: spec});
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
				if (keyIndices[name] < keyIndices[prop.name]) {
					// Swap the order of the props
					[keyIndices[name], keyIndices[prop.name]] = [keyIndices[prop.name], keyIndices[name]];
					sort = true;
				}
			}
		}

		if (sort) {
			// Sort dependency graph using the new order in keyIndices
			// TODO put props with no dependencies first
			// TODO do we need a topological sort?
			this.dependents = sortObject(dependents, ([a], [b]) => {
				return keyIndices[a] - keyIndices[b];
			});
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
			prop.set(element, element.getAttribute(name), {source: "attribute", name, oldValue});
		}
	}

	initializeFor (element) {
		// Update all reflected props from attributes at once
		for (let name of this.observedAttributes) {
			// Only process elements that have this attribute, or used to
			if (element.hasAttribute(name)) {
				this.attributeChanged(element, name);
			}
		}

		// Fire propchange events for any props not already handled
		for (let prop of this.values()) {
			prop.initializeFor(element);
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

