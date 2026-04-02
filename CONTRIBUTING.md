# Contributing

Do not define loose functions that you then add to a `provides` object. Their names will be mangled by minification and Nude Element relies on correct names for certain things to work.

I.e. don't do this:

```js
function foo () {}

const provides = {
	foo,
};
```

Instead, do this:

```js
const provides = {
	foo () {
		return "foo";
	},
};
```
