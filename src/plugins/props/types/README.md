# PropTypes — reference

The high-level "what's a PropType / how do I register one" walkthrough lives in [the props README](../README.md#custom-types). This document is the reference: built-in types, spec-key catalog, abstract internals, and the public API surface.

## Built-in types

| Type       | Spec keys (besides `is`)                                             | Notes                                                                      |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `Boolean`  | —                                                                    | Presence-based: `null` → `null`, any non-null → `true`.                    |
| `Number`   | —                                                                    | Parses via `Number(value)`. `equals` treats `NaN` as equal to `NaN`.       |
| `Function` | `arguments`                                                          | Parses to a `Function` constructed from the string body. Stringify throws. |
| `Array`    | `values`, `separator`, `joiner`, `pairs`                             | Splits on `,` (pair-aware: parens, brackets, braces, quotes).              |
| `Set`      | `values`, `separator`, `joiner`, `pairs`                             | Same parsing as `Array`, materialized into a `Set`.                        |
| `Map`      | `keys`, `values`, `separator`, `defaultKey`, `defaultValue`, `pairs` | Splits entries on `,` then each on `:`.                                    |
| `Object`   | same as `Map`                                                        | Same parsing pipeline, materialized into a plain object.                   |

All built-ins can be accessed via `PropType.for(name)` (see [props README](../README.md#custom-types) for usage).

## Spec keys

| Key                | Role                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `is`               | JS constructor this type produces. Doubles as registry key. Optional for abstracts.                                                                                                                                                                                                                                                                                |
| `extends`          | Explicit chain parent (a `PropType` instance, or a `name` string). Lets the parent differ from `registry.get(is)` — that's what decouples "what JS constructor does this produce" from "what behavior does this share."                                                                                                                                            |
| `name`             | Registry key for abstracts that have no `is`.                                                                                                                                                                                                                                                                                                                      |
| `subTypes`         | Spec keys whose values are themselves type specs (`["values"]` for Iterable, `["keys", "values"]` for Map). Resolved to `PropType` instances at construction; unspecified ones default to `PropType.any`. Declared by the abstract; descendants inherit it via the prototype chain, and a descendant that redeclares it replaces (not extends) the inherited list. |
| `equals(a, b)`     | Equality. Default short-circuits null and identity, then walks the chain.                                                                                                                                                                                                                                                                                          |
| `parse(value)`     | Parse a raw input. Default passes `null` through and walks the chain.                                                                                                                                                                                                                                                                                              |
| `stringify(value)` | Stringify (returns `null` for null/undefined to signal attribute removal).                                                                                                                                                                                                                                                                                         |
| any other method   | Auto-wrapped at construction into a super-walking dispatcher, callable as `this.x(…)` from anywhere in the chain.                                                                                                                                                                                                                                                  |

## Abstract helpers

| Method                 | Yields                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Iterable.parseItems`  | Raw items: strings split via the pair-aware splitter, iterables consumed verbatim, scalars wrapped. No `values.parse` applied.                                                     |
| `MapType.parseEntries` | Raw `[key, value]` tuples: built on `parseItems`, with `:`-splitting (escaped `\:` preserved) and shorthand-entry handling via `defaultKey` / `defaultValue` / `"false"`-coercion. |

Both are generators. Concrete types consume them with the appropriate terminal container (spread into an array, `new Set`, `new Map`, `Object.fromEntries`) so each input value flows through the chain exactly once — no intermediate arrays.

To call a parent's method from inside an override, use `this.super.method(…)`. The `super` proxy walks the chain looking for the next implementation while keeping `this` bound to the derivative, so your override still sees its own `this.values` / `this.separator`. It also goes through the same `get_` wrappers as a normal call (e.g. the null-handling in `get_parse`), unlike a direct `ParentType.spec.method.call(this, …args)`.

## A parametrized custom type

For something more involved than the simple [`Color` example](../README.md#custom-types), here's a `Length` type that accepts a `unit` option, demonstrating how a single registration becomes the basis for many derivatives:

```js
import { PropType } from "nude-element/props";

PropType.register({
    is: Length,
    parse (value) {
        let unit = this.unit ?? "px";
        return value instanceof Length ? value : new Length(value, unit);
    },
    stringify: value => value?.toString(),
});

const Pixels = PropType.for({ is: Length, unit: "px" });
const Rems   = PropType.for({ is: Length, unit: "rem" });

static props = {
    width:  { type: Pixels },
    margin: { type: Rems },
};
```

`Pixels` and `Rems` are distinct PropType instances sharing the same `parse` (inherited via the prototype chain from the registered `Length` singleton), but each reads its own `this.unit` (every spec key is lifted onto the instance by `init()`).

## Public API

| Method                              | Purpose                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `PropType.for(input, { fallback })` | Universal resolver: `PropType` instance, constructor, string, or spec object → `PropType`. |
| `PropType.register(spec)`           | Register a built-in or custom type. Returns the registered instance.                       |
| `instance.isA(otherType)`           | Walk the chain looking for `otherType`. Replaces `instanceof` for abstract-type checks.    |
| `PropType.any`                      | The generic fallback `PropType`. Used as the default for unspecified sub-types.            |

## Architecture in one paragraph

`PropType` is the sole class. Built-in types are registered singletons stored in a single map keyed on JS constructor (for concretes) or string `name` (for abstracts). Derivatives are `Object.create(parent)`, so option lookup walks the JS prototype chain — no spec merging, no copies. The dispatcher walks `obj.super` for each method (`equals` / `parse` / `stringify` plus any custom helpers), invoking the first `spec[method]` it finds with `this` bound to the original caller. Abstracts publish their helpers (`parseItems`, `parseEntries`) the same way, so descendants invoke them as plain `this.x(…)`.
