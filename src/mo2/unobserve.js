import base from "./base.js";

export const dependencies = [base];

/**
 * Implement https://github.com/whatwg/dom/issues/126
 */
export const provides = {
	unobserve (target) {
		let env = { context: this, target };

		this.constructor.hooks.run("unobserve", env);

		// Disconnect the observer from the target and re-add all other observations
		this.disconnect();

		this.observations.delete(target);

		for (let [ref, options] of this.observations.entries()) {
			let mutationTarget = ref.deref();

			if (mutationTarget && options) {
				this.observe(mutationTarget, options);
			}
			else {
				// Possibly garbage collected
				this.observations.delete(ref);
			}
		}
	},
};

export default { dependencies, provides };
