export default new Proxy({}, {
	get (target, prop) {
		if (typeof prop === "string") {
			return Symbol(prop);
		}

		return target[prop];
	},
});
