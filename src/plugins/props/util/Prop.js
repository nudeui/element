import { inferDependencies } from "../util.js";
import { PropType } from "../types/index.js";

/**
 * Class-level metadata for a single prop.
 * Holds the normalized spec; per-element state and behavior live in {@link ElementProp}.
 */
let Self = class Prop {
	/**
	 * @type {Props} The owning {@link Props} collection.
	 */
	props;

	/**
	 * @param {string} name
	 * @param {Object | Prop} spec Prop spec. If a {@link Prop} with matching name is passed, it is returned as-is.
	 * @param {Props} props The owning {@link Props} collection.
	 */
	constructor (name, spec, props) {
		if (spec instanceof Prop && name === spec.name) {
			return spec;
		}

		this.spec = spec;
		this.name = name;
		this.props = props;

		// Direct pass-through hooks: ElementProp accesses these via the Prop, never via a raw spec.
		this.get = spec.get;
		this.set = spec.set;
		this.convert = spec.convert;
		this.changed = spec.changed;
		this.eventNames = spec.eventNames;
		this.enumerable = spec.enumerable ?? true;

		this.default = spec.default;

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

		// Normalize reflect config without mutating the user's spec.
		// Computed properties are not reflected by default.
		let reflect = spec.reflect ?? !spec.get;
		if (typeof reflect !== "object" || reflect === null) {
			reflect = { from: reflect, to: reflect };
		}
		this.reflect = {
			from: reflect.from === true ? name : reflect.from || undefined,
			to: reflect.to === true ? name : reflect.to || undefined,
		};

		this.type = PropType.for(spec.type);

		for (let fnName of ["equals", "stringify", "parse"]) {
			this[fnName] = spec[fnName] ?? this.type[fnName].bind(this.type);
		}
	}

	get defaultProp () {
		if (typeof this.spec.defaultProp === "string") {
			return this.props.get(this.spec.defaultProp);
		}

		return this.spec.defaultProp;
	}

	/**
	 * Build the prototype accessor descriptor for this prop.
	 * Looks up the per-element wrapper by name; {@link ElementProps#get} walks
	 * the class chain so accessors installed on a superclass prototype still
	 * resolve to the parent's Prop when the subclass's Props doesn't include
	 * the name (inheritance).
	 * @returns {PropertyDescriptor}
	 */
	getDescriptor () {
		let { name, get: computed, set: userSet } = this;
		let descriptor = {
			get () {
				// `this.props` lazily materializes via the plugin's `provides`
				// accessor on first access.
				return this.props.get(name)?.get();
			},
			enumerable: this.enumerable,
			configurable: true,
		};

		if (!computed || userSet === true) {
			descriptor.set = function (value) {
				this.props.get(name)?.set(value, { source: "property" });
			};
		}
		else if (typeof userSet === "function") {
			descriptor.set = userSet;
		}

		return descriptor;
	}
};

export default Self;
