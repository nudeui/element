| Mixin | Hooks uses | Needs `super`? | Imports mixins |
|-------|-------------|-----------------|-----------------|
| mounted | 1) First `connectedCallback` for class; 2) First `connectedCallback` |  |  |
| shadowStyles | 1) First `connectedCallback` for class; 2) First `connectedCallback` | ✅ (for now, fakes it with `getSupers()`) | `mounted` |
| globalStyles | 1) First `connectedCallback` for class; 2) First `connectedCallback` | ✅ (for now, fakes it with `getSupers()`) | `mounted` |
| formAssociated | First `connectedCallback` |  | `mounted` |
| defineProps | First `connectedCallback` |  |  |
| defineEvents | 1) First `constructor` (once per class); 2) First `connectedCallback` |  |  |
| defineSlots | First `connectedCallback` |  |  |
