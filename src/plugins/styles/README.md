# Component styles

Levels of visibility:

- `shadow` (default): Add to the component’s shadow DOM
- `light`: Add to the component’s closest root node
- `root`: Add to the document root
- `global`: Add to the component’s parent shadow root and every root node all the way up to the document.

| Level of visibility | Component shadow root | Parent shadow root | Other shadow roots | Document root |
| ------------------- | --------------------- | ------------------ | ------------------ | ------------- |
| `shadow`            | ✅                    | ❌                 | ❌                 | ❌            |
| `light`             | ❌                    | ✅                 | ❌                 | ❌            |
| `document`          | ❌                    | ❌                 | ❌                 | ✅            |
| `global`            | ❌                    | ✅                 | ✅                 | ✅            |
