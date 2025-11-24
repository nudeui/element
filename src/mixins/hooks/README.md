# Hooks mixin

Hooks provide a more composable alternative to hard-coded lifecycle methods.
This mixin provides a way to define composable hooks that are executed at various points in the element lifecycle.

## Usage

Basically two things:
1. Create a `Class.hooks` object.
2. Call `run()` on it at the appropriate times.

It looks like this:

```js
import Hooks from "nude-element/hooks/with.js";

const Self = class MyElement extends HTMLElement {
	constructor () {
		super();
		this.constructor.init();

		// Constructor stuff…

		this.constructor.hooks.run("constructed", this);
	}

	connectedCallback () {
		if (!this.initialized) {
			// Stuff that runs once per element
			this.constructor.hooks.run("firstConnected", this);
			this.initialized = true;
		}

		this.constructor.hooks.run("connected", this);
	}

	disconnectedCallback () {
		this.constructor.hooks.run("disconnected", this);
	}

	static init () {
		// Stuff that runs once per class
		if (this.initialized) {
			return;
		}

		this.hooks.run("start", this);

		this.initialized = true;
	}
}

function ElementTrait (Class) {
	Class.hooks.add({
		firstConnected () {
			console.log("The first instance of", this, "was just connected to the DOM");
		},
		connected () {
			console.log(this, "was just connected to the DOM");
		},
		disconnected () {
			console.log(this, "was just disconnected from the DOM");
		},
	})
}
```
