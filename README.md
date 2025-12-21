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

### Using the default export

Defining your element as a subclass of the default export gives you the nicest, most declarative syntax and automatically includes common plugins.

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

This makes it trivial to generate documentation for the element, or even to build generic tooling around it.

You _can_ still use Nude Element plugins without defining such static properties,
but you may need to do some manual plumbing to get the plugins to work.

### Known symbols

To import any of the known symbols, use the `symbols` export, and then destructure `symbols.known`:

```js
import { symbols } from "nude-element";
// or
// import symbols from "nude-element/symbols";

const { props, events, slots, internals } = symbols.known;
```

Note that any symbols you destructure that have not already been defined, will be created on the fly.
This ensures that this is not affected by timing effects: you can get these symbols before any plugins get them and they'd still be the correct symbols.

### Customizing which plugins are included

You can always include additional plugins by calling `Element.addPlugin(plugin)` or `Element.addPlugins(plugins)`.
To include *fewer* plugins, you can use the `NudeElement` export (or the default export from `nude-element/fn`) which includes no plugins by default:

```js
import { NudeElement, props, events } from "nude-element";

class MyElement extends NudeElement {
	// ...

	static plugins = [props, events];

	static {
		this.setup();
	}
}
```

## Using Nude Element plugins on your own base class

If Nude Element taking over your parent class seems too intrusive,
or if you already have a base class you want to extend,
you can still use Nude Element,
at the cost of potentially handling some of the plumbing yourself.

### Using the mixin class

If all you need is a different superclass (e.g. `LitElement`), you can use `NudeElement` as a mixin, by importing `getElement` and calling it with your desired superclass and plugins:

```js
import { getElement, commonPlugins } from "nude-element";
import LitElement from "lit-element";

export default getElement(LitElement, commonPlugins);
```

### Making any base class extensible

```js
import { makeExtensible } from "nude-element";

class MyElement extends HTMLElement {
	static {
		makeExtensible(this);
	}
}
```

Note that this will not call the right hooks at the right times (`constructed`, `connected`, etc.) so it is not enough to make plugins work.
Either you need to call them yourself,
or install the `elementMembers` too:


```js
import { makeExtensible, elementMembers, addPlugin } from "nude-element";

class MyElement extends HTMLElement {
	static {
		makeExtensible(this);
		addPlugin(this, elementMembers);
	}
}
```

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
