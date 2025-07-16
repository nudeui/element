<header>

# Nude Element

Composable web component helpers
for creating reactive web components that behave just like native HTML elements.

</header>

Elements can extend `NudeElement` to get the nicest, most declarative syntax,
or import individual mixins as helper functions and use them with any `HTMLElement` subclass.

**Note:** This is a work in progress, developed in the open.
Try it and please report issues and provide feedback!

## Features

- Easy reactive attribute-property reflection (_props_)
- Automatic dependency tracking (+ manual overrides)
- Reactive dynamic default values, just like native HTML elements (e.g. having `value` default to `(this.min + this.max) / 2` in a slider)
- Events that properly create `oneventname` attributes and props, just like native HTML elements
- Accessible, form associated elements with a single line of code
- No build process required, just import and use

## Usage

### No hassle, less control: the `NudeElement` class

Defining your element as a subclass of `NudeElement` gives you the nicest, most declarative syntax.

```js
import NudeElement from "nude-element";

class MySlider extends NudeElement {
	constructor () {
		// ...
	}

	static props = {
		min: {
			type: Number,
			default: 0,
		},
		max: {
			type: Number,
			default: 1,
		},
		step: {
			type: Number,
			default () {
				return Math.abs((this.max - this.min) / 100);
			},
		},
		defaultValue: {
			type: Number,
			default () {
				return (this.min + this.max) / 2;
			},
			reflect: {
				from: "value",
			},
		},
		value: {
			type: Number,
			defaultProp: "defaultValue",
			reflect: false,
		},
	};

	static events = {
		// Propagate event from shadow DOM element
		change: {
			from () {
				return this._el.slider;
			}
		},

		// Fire event when specific prop changes (even programmatically)
		valuechange: {
			propchange: "value",
		},
	};

	static formAssociated = {
		like: el => el._el.slider,
		role: "slider",
		valueProp: "value",
		changeEvent: "valuechange",
	};
}
```

### More hassle, more control: Composable mixins

If Nude Element taking over your parent class seems too intrusive,
you can implement the same API via one-off composable helper functions aka mixins,
at the cost of handling some of the plumbing yourself.

Each mixin modifies the base class in a certain way (e.g. adds properties & methods) and returns an init function,
to be called once for each element,
either at the end of its constructor or when it’s first connected.
This is what the example above would look like:

```js
import {
	defineProps,
	defineEvents,
	defineFormAssociated,
} from "nude-element";

class MySlider extends HTMLElement {
	constructor () {
		// ...

		eventHooks.init.call(this);
		formAssociatedHooks.init.call(this);
		propHooks.init.call(this);
	}
}

let propHooks = defineProps(MySlider, {
	min: {
		type: Number,
		default: 0,
	},
	max: {
		type: Number,
		default: 1,
	},
	step: {
		type: Number,
		default () {
			return Math.abs((this.max - this.min) / 100);
		},
	},
	defaultValue: {
		type: Number,
		default () {
			return (this.min + this.max) / 2;
		},
		reflect: {
			from: "value",
		},
	},
	value: {
		type: Number,
		defaultProp: "defaultValue",
		reflect: false,
	},
});

let eventHooks = defineEvents(MySlider, {
	// Propagate event from shadow DOM element
	change: {
		from () {
			return this._el.slider;
		}
	},

	// Fire event when specific prop changes (even programmatically)
	valuechange: {
		propchange: "value",
	},
});

let formAssociatedHooks = defineFormAssociated(MySlider, {
	like: el => el._el.slider,
	role: "slider",
	valueProp: "value",
	changeEvent: "valuechange",
});
```

Each mixin will also look for a static `hooks` property on the element class and add its lifecycle hooks to it if it exists,
so you can make things a little easier by defining such a property:

```js
import { defineProps } from "nude-element";
import Hooks from "nude-element/hooks";

class MyElement extends HTMLElement {
	// Caution: if MyElement has subclasses, this will be shared among them!
	static hooks = new Hooks();

	constructor () {
		super();

		// Then you can call the hooks at the appropriate times:
		this.constructor.hooks.run("init", this);
	}
}

defineProps(MyElement, {
	// Props…
});
```

Read more:
- [Using Props](src/props/)
- [Events](src/events/)
- [Form-associated elements](src/formAssociated/)
- [Mixins](src/mixins/)


## NudeElement Hooks

- `setup`: Runs once per class, before any element is constructed
- `start`: Runs on element constructor
- `init`: Runs when element is connected for the first time
- `constructed`: Runs after element constructor
- `disconnected`: Runs when element is disconnected
