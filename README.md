<header>

# Nude Element

Composable web component helpers
for creating reactive web components that behave just like native HTML elements.

</header>

Elements can extend `NudeElement` to get the nicest, most declarative syntax,
or import individual helper functions and use them with any `HTMLElement` subclass.

**Note:** This is a work in progress, developed in the open.
Try it and please report issues and provide feedback!

## Features

- Easy reactive attribute-property reflection (_props_) with automatic dependency tracking
- Reactive dynamic default values, just like native HTML elements (e.g. having `value` default to `(this.min + this.max) / 2` in a slider)
- Events that can properly create `oneventname` attributes, just like native HTML elements
- Accessible, form associated elements with a sigle line of code

## Usage

### `NudeElement` class

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

### Composable helper functions

If taking over your parent class seems too intrusive,
you can implement the same API via one-off composable helper functions,
but you may need to do more plumbing work yourself:

```js
import {
	Props,
	defineEvents,
	defineFormAssociated,
} from "nude-element";

class MySlider extends HTMLElement {
	constructor () {
		// ...

		initEvents.call(this);
		initFormAssociated.call(this);
		this._initializeProps();
	}
}

Props.create(MySlider, {
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

let initEvents = defineEvents(MySlider, {
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

let initFormAssociated = defineFormAssociated(MySlider, {
	like: el => el._el.slider,
	role: "slider",
	valueProp: "value",
	changeEvent: "valuechange",
});
```