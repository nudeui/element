<header>

# Nude Element

Composable web component helpers
for creating reactive web components that behave just like native HTML elements.

</header>

Elements can extend `NudeElement` with their desired set of plugins to get exactly the functionality they need,
without any complexity they don’t need.
It is also possible to import individual plugins and connect them to an existing class, for transparent extension, but that is a little more involved.

**Note:** This is a work in progress, developed in the open.
Try it and please report issues and provide feedback!

## Features

- Easy reactive attribute-property reflection (_props_)
- Automatic dependency tracking (+ manual overrides)
- Reactive dynamic default values, just like native HTML elements (e.g. having `value` default to `(this.min + this.max) / 2` in a slider)
- Events that properly create `oneventname` attributes and props, just like native HTML elements
- Accessible, form associated elements with a single line of code
- No build process required, just import and use

## Architecture

Nude Element consists of two parts:
- The `NudeElement` class
- Plugins

While it is *technically* possible to use the plugins directly on any base class, it would involve a lot of manual plumbing.
You can take a look at the [`NudeElement` class](src/Element.js) to see how it works.

A plugin installed on a parent class will be inherited by all subclasses,
but subclasses can also define a static `plugins` property to add additional plugins.

Plugins also include other plugins as dependencies.

## Usage

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

### Defining your element

As a design principle, Nude elements have everything out in the open: their public API is largely self-documenting and allows programmatic introspection.
There are certain static properties that relevant plugins expect on the element class to work their magic:

| Property | Description |
|----------|-------------|
| `props` | Attributes and properties that the element supports |
| `events` | Events emitted by the element |
| `slots` | Slots that the element supports |
| `styles` | Styles that the element imports |
| `cssStates` | States that the element supports (TODO) |
| `cssParts` | Parts that the element supports (TODO) |
| `cssProperties` | Custom properties that the element reads or exposes (TODO) |
| `formBehavior` | Parameters for form associated behavior |

These can be either regular properties (e.g. `MyElement.props`) or known symbols for when that is not an option.
This makes it trivial to generate documentation for the element, or even to build generic tooling around it.

### Known symbols

To import any of the known symbols, use the `symbols` export, and then destructure `symbols.known`:

```js
import { symbols } from "nude-element";
// or
// import symbols from "nude-element/symbols";

const { props, events, slots, internals } = symbols.known;
```

Note that any symbols you destructure that have not already been defined, will be created on the fly.

## Using Nude Element plugins on your own base class

If Nude Element taking over your parent class seems too intrusive,
you can implement the same API via one-off composable plugins,
at the cost of handling some of the plumbing yourself.

To use the plugins directly on your own base class you need to:
- Include a static `hooks` instance and run its hooks at the appropriate times
- Use `addPlugin()` to install the plugins


### Known Hooks

These hooks are automatically managed when you use the `NudeElement` class.
If you choose to import plugins directly, you need to manage when to call them yourself.

- `prepare`: Runs once per class, as soon as a plugin is added
- `constructor-static`: Runs once per class, before any element is fully constructed
- `constructor`: Runs on `NudeElement` element constructor
- `constructed`: Runs after element constructor is done, including any subclasses (async)
- `connected`: Runs when element is connected to the DOM
- `disconnected`: Runs when element is disconnected

### Read more

- [Props](src/props/)
- [Events](src/events/)
- [Form-associated elements](src/form-behavior/)
