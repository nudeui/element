# Change Log

## 0.1.0 (2026-03-03)

### New plugin architecture

This release is a substantial overhaul of how Nude Element is structured internally, and how library authors build on top of it.

Previously, features like props, events, and slots were activated by calling imperative `defineXxx()` helper functions on your class after definition.
Starting with this release, **every feature is a plugin** — a plain object with `provides`, `providesStatic`, `hooks`, and `dependencies` fields — and the library is composed from these plugins rather than having them baked in.

This means you can now pick exactly the features you need:

```js
// Tree-shakeable: only include the plugins you use
import { ElementFactory } from "nude-element/fn";
import { props, events } from "nude-element/plugins";

const Base = ElementFactory(HTMLElement, [props, events]);
Base.setup();
```

Or use `commonPlugins` from `nude-element/fn` to get the full standard set.
The default `nude-element` import continues to work as before — it gives you a ready-to-use `NudeElement` base class with all standard plugins included.

This makes it straightforward to **write your own plugins** and compose them alongside (or instead of) the built-ins, without needing to reach into library internals. (by @LeaVerou in #66)

The refactor also fixed a pre-existing bug where `adoptedStyleSheets` was misspelled as `adoptedStylesheets` throughout the styles plugin, causing styles to be silently tracked and adopted through the wrong property. by @DmitrySharabin in #55

### New features

- **`states` plugin**: A `toggleState(state, force?)` method that drives [CSS custom states](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors/Selector_structure#custom_state_pseudo-class) via `ElementInternals`, so you can use `:state(foo)` in CSS just like native elements do. by @LeaVerou
- **`shadow` plugin**: Stores the shadow root under a symbol so it is accessible even when closed, and creates it lazily on first access so elements don't have to call `attachShadow()` explicitly. by @LeaVerou
- **`internals` plugin**: Parallel to the `shadow` plugin — lazily creates and exposes `ElementInternals` under a symbol, with no errors on repeated access. Depended on by `states` and `form-behavior`. by @LeaVerou
- **`elements` plugin**: Declarative access to shadow and light DOM elements; references are refreshed automatically whenever the element connects. by @LeaVerou

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.14...0.1.0

## 0.0.14 (2025-07-27)

### New features

- **`prepare` hook**: A new lifecycle hook that runs before a component is fully set up, giving plugins and subclasses a chance to do preparatory work before the rest of initialization proceeds. by @LeaVerou

### Bug fixes

- Styles were not correctly resolved up the superclass chain, so styles defined on parent classes could be missed or applied in the wrong order. by @LeaVerou

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.13...0.0.14

## 0.0.13 (2025-07-25)

### Improvements

- Global stylesheets are now preloaded with `<link rel="preload">` instead of injected via `@import`, which eliminates a render-blocking round-trip and noticeably reduces flash of unstyled content. by @DmitrySharabin in #44

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.12...0.0.13

## 0.0.12 (2024-10-30)

### Improvements

- Props are now initialized and updated in dependency order, derived from the dependency graph rather than declaration order. This prevents a prop from being computed before the props it depends on have their final values. by @DmitrySharabin in #42

### Bug fixes

- `propchange` events fired for props that were set programmatically before the element finished initializing were lost. They are now held and dispatched once initialization is complete. by @DmitrySharabin in #41

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.11...0.0.12

## 0.0.11 (2024-10-27)

### API changes

- `firePropChangedEvent()` has been renamed to `firePropChangeEvent()` to match the name of the event it fires. by @DmitrySharabin in #39

### New features

- **`changed()` in prop spec**: A prop can now declare a `changed()` function that is called before dependent props are updated, giving you a hook to react to a value change before its side effects propagate. by @DmitrySharabin

### Bug fixes

- Prop internals no longer throw when the element is not an `EventTarget` or not a full `Element`, making it possible to test prop logic in isolation without a real DOM. by @DmitrySharabin

### Tests

- Added test coverage for `Props.add()` and `observedAttributes` by @DmitrySharabin in #35, prop dependencies in #36, prop defaults in #37, `reflect` in #38, and `fromAttribute`/`toAttribute` in #40.

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.10...0.0.11

## 0.0.10 (2024-06-18)

### New features

- **Global stylesheets**: Elements can now declare global (document-level) stylesheets alongside their shadow styles, so styles that need to affect the light DOM don't require manual coordination. by @LeaVerou

### Bug fixes

- The resolved type was not being passed through to `parse()`, so type-specific parsing logic was never reached in the generic fallback path. by @DmitrySharabin in #31
- `init()` could be called twice on the same element under certain upgrade timing conditions. by @LeaVerou

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.9...0.0.10

## 0.0.9 (2024-06-11)

### New features

- **Additional prop dependencies**: A prop can now declare dependencies beyond those inferred from its `get` function, useful when a prop's value depends on something that isn't captured by static analysis. by @DmitrySharabin in #30

### Bug fixes

- The default set of ignored character pairs used when splitting list and dict type values was too broad, causing some valid values to be parsed incorrectly. by @DmitrySharabin

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.8...0.0.9

## 0.0.8 (2024-06-06)

### Bug fixes

- Type resolution was happening after `parse()` was called rather than before, so the generic `parse()` implementation never received the correct type information. This was breaking parsing for elements whose `type` was itself a reactive prop. by @DmitrySharabin in #26

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.7...0.0.8

## 0.0.7 (2024-06-03)

### New features

- **`Set` type**: Props can now be typed as `Set`, with automatic serialization to and from attribute strings. by @LeaVerou
- **Recursive type options**: List and dict types can now be parameterized with a nested type (e.g. a list of numbers), and type options compose recursively. by @LeaVerou in #21
- **Key-vs-value defaulting**: For `Map` and `Object` types, you can now control whether missing entries default the key or the value. by @LeaVerou

### Breaking changes

- `Object` and `Map` are now separate types. Previously, `Object` accepted a `useMap` option to switch between the two; that option has been removed. by @LeaVerou

### Improvements

- Type parse errors now include enough context to understand what value was being parsed and why it failed. by @LeaVerou

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.6...0.0.7

## 0.0.6 (2024-05-29)

### New features

- **Mixins**: Initial support for mixins — reusable behaviors that can be applied to element classes without inheritance. by @LeaVerou in #16
- `propchange` events are now queued while an element is disconnected from the DOM and dispatched in order once it reconnects, rather than being dropped. by @LeaVerou (closes #15)
- `parse()` errors are now caught and reported gracefully instead of propagating and breaking element initialization. by @LeaVerou

### Bug fixes

- `defaultProp` was not being parsed through the prop's type, so elements with a typed `defaultProp` would start with a raw string value rather than the correct type. by @LeaVerou (closes #19)
- User-defined `equals()`, `parse()`, and `stringify()` methods on a prop spec were being overwritten by the type's defaults. by @LeaVerou

### Improvements

- Console output now serializes values more meaningfully, so objects logged during prop changes are readable rather than `[object Object]`. by @LeaVerou

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.5...0.0.6

## 0.0.5 (2024-05-28)

### New features

- **`Object` type**: Initial support for typed `Object` props, with automatic serialization. by @LeaVerou in #17

### Bug fixes

- `queueInitFunction()` was being called with the instance as its first argument instead of the class, causing init functions to run against the wrong context. by @LeaVerou

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.4...0.0.5

## 0.0.4 (2024-05-22)

### Bug fixes

- Instance data properties could silently shadow prop accessors defined on the prototype, causing reads and writes to bypass the prop system entirely. by @LeaVerou (closes #14)

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.3...0.0.4

## 0.0.3 (2024-05-22)

### New features

- **Slots mixin**: Initial support for declarative slot management. by @LeaVerou
- **API docs**: TypeDoc integration for generating API documentation from JSDoc comments. by @DmitrySharabin in #11

### Bug fixes

- Default prop values were stored as-is, bypassing `parse()`, so a prop with `default: "1"` and `type: Number` would start as a string. by @DmitrySharabin in #9 (closes #7)
- Adding props was inadvertently deleting `Class.props`, which broke any code that read the props definition after the fact. The props are now stored internally under a symbol and the original property is preserved. by @DmitrySharabin in #8 (closes #6)
- `observedAttributes` could contain duplicate entries when the same attribute was reflected by multiple props. by @DmitrySharabin in #10 (closes #5)

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.2...0.0.3

## 0.0.2 (2024-05-15)

### New features

- Event definitions now accept an array for `from`, so a single event can be propagated from multiple source event types. by @LeaVerou
- Stylesheet requests now include a `crossorigin` attribute, allowing cached responses to be reused across origins. by @LeaVerou

### Improvements

- Internal state is now stored under `Symbol` properties instead of name-mangled or pseudo-private string keys, eliminating the risk of accidental collisions with user-defined properties. by @LeaVerou

**Full Changelog**: https://github.com/nudeui/element/compare/0.0.1...0.0.2

## 0.0.1 (2024-05-09)

Initial release.
