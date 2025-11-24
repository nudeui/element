import { extendClass } from "./util/extend-class.js";
import { satisfiedBy, mixinsApplied, onApply, conflictPolicy } from "./util/symbols.js";
import lifecycleHooks, { staticLifecycleHooks } from "./lifecycle.js";
import { ConflictPolicy } from "./util/conflict-policy.js";

export function satisfies (Class, requirement) {
	if (!requirement) {
		// No reqs
		return true;
	}

	switch (typeof requirement) {
		case "function":
			return requirement(Class);
		case "string":
		case "symbol":
			return Class[requirement] !== undefined;
	}

	if (Array.isArray(requirement)) {
		// Array of potential fields (OR)
		return requirement.some(req => satisfies(Class, req));
	}

	if (requirement.prototype) {
		return satisfies(Class.prototype, requirement.or);
	}

	if (requirement.and) {
		return requirement.and.every(req => satisfies(Class, req));
	}

	return false;
}

const defaultConflictPolicy = new ConflictPolicy({
	throw: true,
	merge: lifecycleHooks,
});

const defaultStaticConflictPolicy = new ConflictPolicy({
	throw: true,
	merge: staticLifecycleHooks,
});

/**
 * Apply a bunch of mixins to a class iff it satisfies their protocols
 * @param { FunctionConstructor } Class
 * @param { Array<FunctionConstructor> } [mixins = Class.mixins]
 * @void
 */
export function applyMixins (Class = this, mixins = Class.mixins) {
	if (!mixins?.length) {
		return;
	}

	if (!Object.hasOwn(Class, mixinsApplied)) {
		Class[mixinsApplied] = [...(Object.getPrototypeOf(Class)[mixinsApplied] || [])];
	}

	const mixinsToApply = mixins.filter(Mixin => !Class[mixinsApplied].includes(Mixin) && satisfies(Class, Mixin[satisfiedBy]));

	if (mixinsToApply.length === 0) {
		return false;
	}

	for (const Mixin of mixinsToApply) {
		extendClass(Class, Mixin, {
			skippedProperties: [satisfiedBy, onApply],
			conflictPolicy: ConflictPolicy.combine(defaultConflictPolicy, Mixin.prototype[conflictPolicy]),
			conflictPolicyStatic: ConflictPolicy.combine(defaultStaticConflictPolicy, Mixin[conflictPolicy]),
		});
		Class[mixinsApplied].push(Mixin);

		if (Mixin[onApply]) {
			Mixin[onApply].call(Class);
		}
	}

	return true;
}

export function applyMixin (Class, Mixin) {
	return applyMixins(Class, [Mixin]);
}

