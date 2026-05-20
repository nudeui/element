import { inferDependencies } from "../util.js";
import * as types from "./types.js";

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

		this.type = types.resolve(spec.type);

		for (let fnName of ["equals", "stringify", "parse"]) {
			this[fnName] =
				spec[fnName] ??
				function (...args) {
					return types[fnName](...args, this.type);
				};
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
	 * Captures the Prop directly so subclass accessors keep working even when
	 * the element's class-level {@link Props} doesn't include this prop
	 * (inheritance) — the descriptor asks {@link ElementProps#forSpec} for
	 * the matching wrapper without going through name lookup.
	 * @returns {PropertyDescriptor}
	 */
	getDescriptor () {
		let prop = this;
		let { name, get: computed, set: userSet } = this;
		let descriptor = {
			get () {
				// Pre-mount: this.props isn't set up yet, no data property
				// shadowing has been written either, so the prop genuinely has
				// no value to read.
				return this.props?.forSpec(prop).get();
			},
			enumerable: this.enumerable,
			configurable: true,
		};

		if (!computed || userSet === true) {
			descriptor.set = function (value) {
				// TODO throw if this is the constructor class
				if (this.props) {
					this.props.forSpec(prop).set(value, { source: "property" });
				}
				else {
					// Pre-mount write: install a shadowing data property. When
					// ElementProps is later constructed, ElementProp#initialize
					// will pick it up via shadow recovery (Object.hasOwn).
					Object.defineProperty(this, name, {
						value,
						writable: true,
						configurable: true,
						enumerable: true,
					});
				}
			};
		}
		else if (typeof userSet === "function") {
			descriptor.set = userSet;
		}

		return descriptor;
	}
};

export default Self;
