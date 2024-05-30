# Nude Props

A way to define reactive properties on a custom element that optionally reflect to/from attributes.

## Features

- Easy reactive attribute-property reflection
- Automatic dependency tracking (+ manual overrides)
- Automatic type casting (+ custom conveters)
- Reactive dynamic default values, just like native HTML elements (e.g. having `value` default to `(this.min + this.max) / 2` in a slider)
- Cached getters for computed properties

## Usage

With Nude Element:

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
}
```

With `defineProps()` mixin:

```js
import {
	defineProps,
	defineEvents,
	defineFormAssociated,
} from "nude-element";

class MySlider extends HTMLElement {
	constructor () {
		// ...
		initProps.call(this);
	}
}

let initProps = defineProps(MySlider, {
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
```

## Prop definition

Each prop is defined by an object with the following properties:

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `type` | `Function` | undefined | The type of the property, to determine conversions when stored internally. If not provided, no conversion will happen. |
| `typeOptions` | `object` | undefined | Additional, type-specific constraints. |
| `default` | Any | undefined | The default value of the property. If a function, it will be called with the element as `this`. |
| `defaultProp` | `string` | undefined | The name of another prop to use as the default value. |
| `reflect` | `boolean` or `string` or `object` | `true` | Whether to reflect the property to/from an attribute. See below for description on values. |
| `get` | `Function` | undefined | A getter function for the property, to create computed properties with automatic dependency tracking. If provided, the property will be read-only, unless `set()` is also provided. |
| `set` | `Function` | undefined | A setter function for the property, to be called when setting the prop programmatically. |
| `convert` | `Function` | undefined | A function to convert the provided value to the internally stored value. This does not override the conversion performed due to `type` but runs *after* it. |
| `dependencies` | `string[]` | undefined | Override the auto-detected dependencies with these prop names. Useful when the dependencies are not immediately obvious from the function body |
| `equals` | `Function` | undefined | A function to compare two values for equality. If not provided the default equality check depends on the `type` of the value. |
| `parse` | `Function` | undefined | A function to parse the value from an attribute. If not provided, the value will be parsed based on the `type`. |
| `stringify` | `Function` | undefined | A function to stringify the value to an attribute. If not provided, the value will be stringified based on the `type`. |

### Types

The `type` property takes a constructor function,
which could be a built-in class such as `String`, `Number`, `Boolean`,
or a custom class (e.g. `Color`).
If provided, any value provided via attributes or properties will be converted to this type before being stored internally,
and the equality check that checks if a prop has changed will be specific to that type.
If no type is provided, no conversion will happen and values will be stored untouched.

### Type options

Some types take additional optional options, which can be provided via `typeOptions`.
All type options are optional.

#### Lists: `Array` and `Set`

| Property | Type | Description |
| -------- | ---- | ----------- |
| `itemType` | `Function` | The type of the items in the list. |

#### Functions

| Property | Type | Description |
| -------- | ---- | ----------- |
| `arguments` | `string[]` | The names of the arguments of the function. Default: `[]` (no arguments) |

#### Dictionaries: `Object` and `Map`

| Property | Type | Description |
| -------- | ---- | ----------- |
| `valueType` | `Function` | The type of the values in the dictionary. |
| `keyType` | `Function` | The type of the keys in the dictionary (only applies to `Map`). Default: `String` |
| `defaultKey` | `Function` | Default key for entries with no label. |
| `defaultValue` | (any) | Default value for entries with no label. Default: `true` |

`defaultKey` and `defaultValue` control what happens when parsing singular entries, i.e. entries with no colon (e.g. `foo: 1, bar: 2, baz` or `1: foo, 2: bar, baz`).
If `defaultKey` is provided, these entries are considered values, and `defaultKey` is used to generate the keys.
The `defaultKey` function is called with the value and the index as the key,
which means `(v, i) => v` can be used to make the keys default to being the same as values,
and `(v, i) => i` to make them default to numerical indices.
While `defaultKey` *can* be a non-function, this is almost never what you want, since that would create collisions.
If `defaultValue` is provided, singular entries are considered keys, and `defaultValue` is used to generate the values.
It can be either a constant (e.g. `true`) or a function, in which case it’s passed the key and the index as arguments.

### Attribute-property reflection

The `reflect` property takes the following values:

- `true`: Reflect to/from an attribute with the same name.
- `false`: Do not reflect to/from an attribute.
- `string`: Reflect to/from an attribute with the given name.
- `object`: Separate to/from settings (both defaulting to `false`):
	- `from`: If `true`, reflect from the attribute with the same name as the prop. If a string, reflect from the attribute with the given name.
	- `to`: If `true`, reflect to the attribute with the same name as the prop. If a string, reflect to the attribute with the given name.

By default, `reflect` is `true` **unless** `get` is also specified, in which case it defaults to `false`.