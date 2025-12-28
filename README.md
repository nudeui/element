<header>

# Nude Element

Composable web component helpers
for creating reactive web components that behave just like native HTML elements.

</header>

The functionality you need, without any complexity you don’t need.

> [!NOTE]
> This is a work in progress, developed in the open.
> Try it and please report issues and provide feedback!

1. [Features](#features)
2. [Architecture](#architecture)
3. [Usage](#usage)
	1. [Using the default base class](#using-the-default-base-class)
	2. [Creating a custom base class](#creating-a-custom-base-class)
	3. [Using Nude Element plugins on your own base class](#using-nude-element-plugins-on-your-own-base-class)
	4. [Customizing which plugins are included](#customizing-which-plugins-are-included)
	5. [Writing your own plugins](#writing-your-own-plugins)
	6. [Plugin docs](#plugin-docs)


## Features

- **Extremely lightweight**: Nude Element’s core extensibility infrastructure is only ~1KB minzipped
- Use the provided `NudeElement` class, generate a custom base class, or even add plugins to your own base class (with a little manual plumbing)
- Easy **reactive attribute-property reflection** (_props_)
  - Automatic dependency tracking (+ manual overrides)
  - Reactive dynamic default values, just like native HTML elements (e.g. having `value` default to `(this.min + this.max) / 2` in a slider)
  - A wide variety of types with automatic reflection
- **Events** that properly create `oneventname` attributes and props, just like native HTML elements
- Accessible, **form associated elements** with a single line of code
- And a host of other useful functionality, all optional!
- No build process required, just import and use

## Architecture

Nude Element is basically a collection of plugins, each implementing a specific feature.
Plugins can depend on other plugins, and the extensibility functionality itself is also built as a plugin.
A plugin installed on a parent class will be inherited by all subclasses, and plugins are written with that in mind.

Plugins depend on certain conventions to work.
For convenience, two base classes are provided that implement these conventions: one with no plugins, and one with all common plugins included.
There is also a factory function that can be used to create a custom base class with a custom parent class and set of plugins.

However, any base class can be used with Nude Element plugins,
with a little manual plumbing.

## Usage

### Using the default base class

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

	static formBehavior = {
		like: el => el._el.slider,
		role: "slider",
		valueProp: "value",
		changeEvent: "valuechange",
	};
}
```

### Creating a custom base class

Suppose you have an existing base class you want to use, e.g. `LitElement`, and/or you want to use a different set of plugins.
No problemo!

```js
import { ElementFactory, formBehavior, toggleState, events } from "nude-element";
import LitElement from "lit-element";

const MyElement = ElementFactory(LitElement, [props, events, formBehavior]);

class MySlider extends MyElement {
	// ...
}
```

### Using Nude Element plugins on your own base class

If Nude Element taking over your parent class seems too intrusive,
or if you already have a base class you want to extend,
you can still use Nude Element,
at the cost of potentially handling some of the plumbing yourself.

Mainly, to call the base lifecycle hooks at the right times.
You can see what these are in the [members plugin](src/element/members.js).
In fact, you can even include it directly as a plugin, which is how the default base class is implemented too:

```js
import { base, elementMembers, addPlugins, events } from "nude-element";

export default class MyElement extends HTMLElement {
	constructor () {
		super();
		this.constructed(); // added by elementMembers plugin
	}

	static {
		addPlugins(this, base, elementMembers);
	}
}

// You can now include any plugins you want
class MySlider extends MyElement {
	// ...

	static {
		addPlugins(this, events);
		this.setup(); // added by base plugin
	}

	// Automatically read by the events plugin
	static events = {
		// ...
	};
}
```

#### Known Hooks

These hooks are automatically managed when you use the `NudeElement` class or the `elementMembers` plugin.
If you choose to import plugins directly, you need to manage when to call them yourself.

- `setup`: Runs once per class, including each subclass.
- `constructor`: Runs on element constructor, before any subclasses are constructed.
- `constructed`: Runs after element constructor is done, including any subclasses (async). Same as `connected` if the element is already connected.
- `connected`: Runs when element is connected to the DOM
- `disconnected`: Runs when element is disconnected

Note that plugins can (and do) add their own hooks, so you may need to check the plugin docs for more information.

### Customizing which plugins are included

You can always include additional plugins by calling `addPlugin(ElementClass, plugin)` or `addPlugins(ElementClass, plugins)`.
To make this a little nicer, you can use the `pluginsProperty` plugin, which adds static `Element.addPlugin(plugin)` or `Element.addPlugins(plugins)` properties.
To include *fewer* plugins, you can use the `NudeElement` export (or the default export from `nude-element/fn`) which includes no plugins by default,
and only add the plugins you need.

```js
import { NudeElement, addPlugins, props, events } from "nude-element";

class MyElement extends NudeElement {
	// ...

	static {
		addPlugins(this, props, events);
		this.setup();
	}
}
```

### Writing your own plugins

Once a class is extensible, you’re not just restricted to Nude Element plugins, you can use the same architecture for your own codebase too!

Each plugin is basically an object with some or all of the following properties:
- `dependencies`: An array of plugins that this plugin depends on, automatically installed before it (in order), if not already installed on the class
- `provides`: Properties and methods to add to the class prototype
- `providesStatic`: Properties and methods to add to the class itself
- `hooks`: Hooks to add to the class, run at specific times during the element lifecycle

You can study the code of existing plugins to see how to write your own.

### Plugin docs

- [Props](src/props/): Property-attribute reflection
- [Events](src/events/): Event management
- [Slots](src/slots/): Helpers for working with slots
- [Elements](src/elements/): Helpers for element references
- [States](src/states/): Helpers for working with states
- [Styles](src/styles/): Helpers for adopting styles into the component's shadow root or its light DOM
- [CSS states](src/states/): Helpers for working with CSS states or automatically applying certain states
- [Form behavior](src/form-behavior/): Helpers for effortless form associated behavior
- [Internals](src/internals/): Helpers for `ElementInternals`. Mostly a dependency of other plugins.
- [Shadow](src/shadow/): Helper for accessing the component's shadow root (even when it's closed) and creating it lazily. Mostly a dependency of other plugins.
- [`plugins` property](src/declarative/): Automatically install plugins via a `plugins` static property.
- [`super` property](src/super/): Add a `super` property that works like `super`, but is dynamically bound and can be used from plugins.

<!--
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
-->
