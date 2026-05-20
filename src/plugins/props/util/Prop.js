import { inferDependencies, resolveValue, capitalize, isArrowFunction } from "../util.js";
import * as types from "./types.js";

let Self = class Prop {
	/**
	 * @type {Props} props - The props object this prop belongs to
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
		this.spec = spec;
		this.props = props;

		this.default = spec.default;
		this.defaultProp = spec.defaultProp;

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

		// Normalize reflect config
		// Computed properties are not reflected by default
		this.reflect = spec.reflect ?? !this.spec.get;
		if (typeof this.reflect === "boolean") {
			this.reflect = { from: this.reflect, to: this.reflect };
		}
		this.reflect.from = this.reflect.from === true ? this.name : this.reflect.from || undefined;
		this.reflect.to = this.reflect.to === true ? this.name : this.reflect.to || undefined;

		this.type = types.resolve(spec.type);

		for (let fnName of ["equals", "stringify", "parse"]) {
			this[fnName] =
				this.spec[fnName] ??
				function (...args) {
					return types[fnName](...args, this.type);
				};
		}

		if (this.spec.convert) {
			this.convert = this.spec.convert;
		}
	}

	/**
	 * Build the prototype accessor descriptor for this prop.
	 * @param {{enumerable?: boolean}} [options]
	 * @returns {PropertyDescriptor}
	 */
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

	/**
	 * Whether this prop currently depends on `prop`'s value for the given element.
	 * Includes the default-prop link only while this prop has no explicit value.
	 * @param {Prop} prop
	 * @param {HTMLElement} element
	 * @returns {boolean}
	 */
	dependsOn (prop, element) {
		if (!prop) {
			return false;
		}

		if (prop === this) {
			return true;
		}

		return (
			this.dependencies.has(prop.name) ||
			(this.defaultProp === prop && element.props[this.name] === undefined)
		);
	}
};

export default Self;
