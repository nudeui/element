export default class PropChangeEvent extends CustomEvent {
	constructor (type, { name, prop, ...options } = {}) {
		super(type, options);

		this.name = name;
		this.prop = prop;
	}

	/**
	 * Replay this change on a different element. Used to mirror a prop's
	 * value onto a sub-element from a `propchange` listener.
	 * @param {Element} target Element to apply the change to.
	 */
	applyTo (target) {
		let { source, attributeName, attributeValue, value } = this.detail;

		if (source === "attribute") {
			if (attributeValue === null) {
				target.removeAttribute(attributeName);
			}
			else {
				target.setAttribute(attributeName, attributeValue);
			}
		}
		else if (source === "property") {
			target[this.name] = value;
		}
	}
}
