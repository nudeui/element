export function isSubclassOf (Class, SuperClass) {
	if (typeof Class !== "function" || typeof SuperClass !== "function") {
		return false;
	}

	return Class === SuperClass || isSubclassOf(Object.getPrototypeOf(Class), SuperClass);
}
