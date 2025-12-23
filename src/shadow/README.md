# Shadow DOM

- Symbol to access shadow roots even when closed
- Automatically create shadow root lazily when accessed (set `shadowRootOptions` on the element class for params)
- No errors thrown for subsequent calls, just returns the existing shadow root

## Hooks

- `shadow-attached`: Runs when the shadow root is attached to the element
