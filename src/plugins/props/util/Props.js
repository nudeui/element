import { sortObject, isRegularFunction, capitalize } from "../util.js";
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
		let attributes = [...this.values()].map(spec => spec.reflect.from).filter(Boolean);
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

	/**
	 * Low level method to create one prop. Does not call updateDependents()
	 * @param {string} name
	 * @param {Object} spec
	 * @returns
	 */
	createProp (name, spec) {
		if (isRegularFunction(spec.default) && !("defaultProp" in spec)) {
			// Create a prop for the default value so that dependencies are tracked and change events are fired for it
			delete spec.default;
			spec.defaultProp = this.createProp("default" + capitalize(name), {
				get: spec.default,
			});
			// No need to call updateDependents() here, it will be called anyway at the end of this
		}

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
}
