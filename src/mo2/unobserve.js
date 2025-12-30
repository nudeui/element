import base from "./base.js";

const dependencies = [base];

/**
 * Implement https://github.com/whatwg/dom/issues/126
 */
const provides = {
	unobserve (target) {
		let env = { target };

		this.$hook("unobserve", env);

		// Disconnect the observer from the target and re-add all other observations
		this.disconnect();

		this.observations.delete(target);

		for (let [mutationTarget, options] of this.observations.entries()) {
			this.observe(mutationTarget, options);
		}
	},
};

export default { dependencies, provides };
