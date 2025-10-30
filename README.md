<header>

# Nude Element

Composable web component helpers
for creating reactive web components that behave just like native HTML elements.

</header>

Elements can extend `Element` to get the nicest, most declarative syntax,
or import individual mixins and use them with any `HTMLElement` subclass.

> [!NOTE]
> This is a work in progress, developed in the open.
> Try it and please report issues and provide feedback!

## Features

- Easy reactive attribute-property reflection (_props_)
- Automatic dependency tracking (+ manual overrides)
- Reactive dynamic default values, just like native HTML elements (e.g. having `value` default to `(this.min + this.max) / 2` in a slider)
- Events that properly create `oneventname` attributes and props, just like native HTML elements
- Accessible, form associated elements with a single line of code
- No build process required, just import and use

## Usage

### No hassle, less control: the `Element` class

Defining your element as a subclass of `Element` gives you the nicest, most declarative syntax.
This includes all commonly used mixins automatically, though they are only activated when their relevant properties are used in your element subclass.

```js
import Element from "nude-element";

class MySlider extends Element {
	constructor () {
		// ...
	}

	// Automatically activates the props mixin
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

	// Automatically activates the events mixin
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

	// Automatically activates the formAssociated mixin
	static formAssociated = {
		like: el => el._el.slider,
		role: "slider",
		valueProp: "value",
		changeEvent: "valuechange",
	};
}
```

### A little hassle, a little more control: The `NudeElement` class

`Element` inherits from `NudeElement`, which is nearly identical with one exception:
Instead of including all commonly used mixins automatically,
it includes no mixins at all.
To add mixins, you extend it and add a `mixins` static property.

This can be useful when you’re trying to keep bundle size to a minimum, since even if mixins are only activated when your subclass uses them,
they will won't be tree-shaken away, since bundlers don’t understand how this works.

```js
import { NudeElement, Props, Events, FormAssociated } from "nude-element";

class MySlider extends NudeElement {
	static mixins = [Props, Events, FormAssociated];

	// ...
}
```

### With custom base class: Subclass factories

If you need to use a custom base class (e.g. `LitElement`), rather than `HTMLElement`, all Nude mixins are also available as subclass factories,
include `Element` and `NudeElement`:

```js
import { ElementMixin } from "nude-element";
import { LitElement } from "lit";

class MySlider extends ElementMixin(LitElement) {
	// ...
}
```

Individual mixins are also available as subclass factories:

```js
import { Props, Events, FormAssociated } from "nude-element/mixins";
import { LitElement } from "lit";

class MySlider extends Props(Events(FormAssociated(LitElement))) {
	// ...
}
```

Some mixins even have a second argument for parameters that you can customize.
For example, by default they assume your `ElementInternals` instance (if you have one) is stored in a `_internals` property,
but you can change that to whatever you want by passing a second argument to the mixin:

```js
import { FormAssociated } from "nude-element/mixins";

const internals = Symbol("internals");
class MySlider extends FormAssociated(LitElement, { internalsProp: internals }) {
	constructor () {
		super();

		this[internals] = this.attachInternals?.();
	}
}
```

### More hassle, more control: Composable mixins

If Nude Element taking over your parent class seems too intrusive,
you can pull in mixins and apply them to any base class you want in-place without affecting the inheritance chain,
at the cost of handling some of the plumbing yourself.

There are three parts:
1. Apply `applyMixins` to your class to apply the mixins to it
2. Make sure to call `this.init()` in your constructor, since `applyMixins` cannot modify your constructor, so that’s the only way to run initialization logic

```js
import { Props, Events, FormAssociated, applyMixins } from "nude-element";

class MySlider extends HTMLElement {
	constructor () {
		super();

		// Your own init logic here...

		this.init?.();
	}

	static {
		applyMixins(this, [Props, Events, FormAssociated]);
	}
}
```

Individual mixin docs:
- [Using Props](src/props/)
- [Events](src/events/)
- [Slots](src/slots/)

