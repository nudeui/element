/**
 * Generate a bunch of accessors to proxy properties through a certain subobject
 * @param {Object} options
 * @param {Object} options.from - The object to define the delegated properties on
 * @param {string} options.to - The name of the subobject property to proxy through
 * @param {string[]} options.properties - Array of property names to delegate
 * @param {Object<string, PropertyDescriptor>} options.descriptors - Property descriptors for each property
 */
export function delegate ({from, to, properties, descriptors}) {
	for (let prop of properties) {
		let sourceDescriptor = descriptors[prop];
		let descriptor = {
			get () {
				return this[to][prop];
			},
			...sourceDescriptor,
			configurable: true,
		};

		if (sourceDescriptor.writable || sourceDescriptor.set) {
			delete descriptor.value;
			delete descriptor.writable;

			descriptor.set = function (value) {
				this[to][prop] = value;
			};
		}

		Object.defineProperty(from, prop, descriptor);
	}
}
