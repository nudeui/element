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

### More hassle, more control: Subclass factories

To reduce bundle size even further, you can import individual mixins as subclass factories and apply them to your element subclass yourself.


```js

import { Props, Events, FormAssociated } from "nude-element";

class MySlider extends HTMLElement {
	static mixins = [Props, Events, FormAssociated];

	// ...
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


## Known Hooks

These hooks are automatically managed when you use the `NudeElement` class.
If you choose to import mixins directly, you need to manage when to call them yourself.

- `prepare`: Runs once per class, as soon as a mixin is added
- `setup`: Runs once per class, before any element is fully constructed
- `start`: Runs on element constructor
- `constructed`: Runs after element constructor (async)
- `init`: Runs when element is connected for the first time
- `disconnected`: Runs when element is disconnected
