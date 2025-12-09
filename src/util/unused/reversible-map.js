export class ReversibleMap extends Map {
	getKey (value) {
		for (let [key, v] of this.entries()) {
			if (v === value) {
				return key;
			}
		}
	}
}

