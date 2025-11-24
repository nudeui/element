/**
 * All known lifecycle hooks
 * Mixins can import this set and add their own
 */
export default new Set([
	"init",
	"connectedCallback",
	"disconnectedCallback",
	"adoptedCallback",
	"connectedMoveCallback",
	"attributeChangedCallback",
]);

export const staticLifecycleHooks = new Set();
