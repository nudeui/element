# Nude mixins

This mixin is at the core of all other Nude mixins.
It provides a way to define composable hooks that are executed at various points in the element lifecycle.

## Usage

If you are inheriting from `NudeElement`, there is little to do besides specifying what code you need to run:

```js
defineMixin(MyElement, {
	start () {
		console.log("The first instance of", this, "was just created");
	},
	init () {
		console.log(this, "was just connected for the first time");
	},
})
```

If you are not inheriting from `NudeElement`, you will need to do the plumbing yourself.
Basically two things:
1. Create a `Class.hooks` object.
2. Call `run()` on it at the appropriate times.

It looks like this:

```js
import Hooks from "nude-element/mixins/hooks.js";

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
			this.constructor.hooks.run("init", this);
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

		// Caution: do *not* just use a static class field
		// It will be shared between all classes that inherit from this one!
		this.hooks = new Hooks(this.hooks);

		this.hooks.run("start", this);

		this.initialized = true;
	}
}
```


## Hooks

| Hook | `this` | Description |
|------|--------|-------------|
| `start` | Class | Called when the first instance of the class is created. |
| `init` | Instance | Called when the element is first connected to the DOM (once per instance). This is the most common hook used. |
| `constructed` | Instance | Called once per instance |
| `connected` | Instance | Called when the element is connected to the DOM |
| `disconnected` | Instance | Called when the element is disconnected from the DOM |