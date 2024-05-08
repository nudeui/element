<header>

# Nude Element

A collection of modular, incrementally adoptable, dependency-free helpers
for creating web platform compatible reactive web components that behave just like native HTML elements.

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
		getSource: el => el._el.slider,
		role: "slider",
		valueProp: "value",
		changeEvent: "valuechange",
	};
}
```

### Composable helper functions

If that seems too intrusive,
you can implement the same API via one-off composable helper functions:

```js
class MySlider extends HTMLElement {
	constructor () {
		// ...
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

defineEvents(MySlider, {
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

defineFormAssociated(MySlider, {
	getSource: el => el._el.slider,
	role: "slider",
	valueProp: "value",
	changeEvent: "valuechange",
});
```