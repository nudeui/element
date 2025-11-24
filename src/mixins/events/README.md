# Events mixin

This mixin handles:
- Defining props and attributes for UI events on a component (just like native HTML elements)
- Automatically managing events that fire when a specific prop changes (`propchange` property)
- Automatically retargeting events from shadow DOM elements to the host (`from` property)

Eventually we should split this into three mixins.

## Usage

Through the `Element` base class:

```js
import Element from "nude-element";

class MyElement extends Element {
	static events = {
		// ...
	}
}
```

As traditional mixin:
```js
import { WithEvents } from "nude-element";

class MyElement extends WithEvents {
	static events = {
		// ...
	}
}
```

Or, with a custom base class (e.g. `LitElement`):
```js
import { WithEventsMixin } from "nude-element";
import LitElement from "lit";

class MyElement extends WithEventsMixin(LitElement) {
	static events = {
		// ...
	}
}
```

As composable mixin:
```js
import { WithEvents, applyMixins } from "nude-element";

class MyElement extends HTMLElement {
	constructor () {
		this.init();
	}

	static events = {
		// ...
	}

	static {
		applyMixins(this, WithEvents);
	}
}
```
