import { sortObject, capitalize, inferDependencies } from "../util.js";
import Prop from "./Prop.js";

/**
 * Class-level collection of {@link Prop} specs for a custom element class.
 * Per-element state lives in {@link ElementProps}.
 */
export default class Props extends Map {
	/**
	 * Dependency graph.
	 * Key is the name of the prop; value is the set of {@link Prop}s that depend on it.
	 * @type {Object<string, Set<Prop>>}
	 */
	dependents = {};

	/**
	 * @param {Function} Class The class to define props for.
	 * @param {Object} [props] Props to define, as a map of name → spec.
	 */
	constructor (Class, props) {
		super();

		this.Class = Class;

		if (props) {
			this.add(props);
		}
	}

	/**
	 * @returns {string[]} Unique attribute names that any reflected prop reads from.
	 */
	get observedAttributes () {
		let attributes = [...this.values()].map(prop => prop.reflect.from).filter(Boolean);
		return [...new Set(attributes)];
	}

	/**
	 * Define one or more props on the class.
	 * @param {string | Object<string, Object>} nameOrProps Prop name, or map of name → spec.
	 * @param {Object} [spec] Prop spec, when the first argument is a name.
	 * @returns {Prop | Prop[]} The created prop, or array of created props.
	 */
	add (nameOrProps, spec) {
		if (typeof nameOrProps === "string") {
			let prop = this.createProp(nameOrProps, spec);
			this.updateDependents();
			return prop;
		}

		let created = [];
		for (let [name, spec] of Object.entries(nameOrProps)) {
			created.push(this.createProp(name, spec));
		}

		this.updateDependents();
		return created;
	}

	/**
	 * Low-level: create a single prop and install its accessor on the class prototype.
	 * Does not call {@link updateDependents}; callers should batch and call it once.
	 * Clones `spec` before any normalization so the user's object is not mutated.
	 * @param {string} name
	 * @param {Object} spec
	 * @returns {Prop}
	 */
	createProp (name, spec) {
		spec = { ...spec };

		// Promote `default () { ... }` to a synthetic computed prop so its
		// dependencies are tracked and changes are propagated. A function default
		// with no `this.X` references behaves like a constant and stays as the
		// plain default (this also covers arrow functions, which we can't
		// reliably tell apart from regular ones).
		if (typeof spec.default === "function" && !spec.defaultProp) {
			let defaultDependencies = spec.defaultDependencies ?? inferDependencies(spec.default);
			if (defaultDependencies.length > 0) {
				let defaultFn = spec.default;
				delete spec.default;
				spec.defaultProp = this.createProp("default" + capitalize(name), {
					get: defaultFn,
					dependencies: defaultDependencies,
				});
			}
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
