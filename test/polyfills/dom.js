import { parseFragment } from "parse5";

let doc;
let _upgrade = null;
let onConnect = () => {};
let onDisconnect = () => {};

class Node extends EventTarget {
	nodeType = 1;
	parentNode = null;
	_children = [];

	get childNodes () {
		return this._children;
	}

	get isConnected () {
		let n = this;
		while (n.parentNode) {
			n = n.parentNode;
		}
		return n === doc;
	}

	get firstChild () {
		return this._children[0] ?? null;
	}

	get nodeName () {
		return "";
	}

	get textContent () {
		return this._children.map(c => c.textContent).join("");
	}

	set textContent (val) {
		while (this._children.length) {
			this._children.at(-1).remove();
		}

		if (val !== "" && val != null) {
			this._children.push(new Text(val));
		}
	}

	appendChild (child) {
		this.append(child);
		return child;
	}

	append (...nodes) {
		for (let child of nodes) {
			if (typeof child === "string") {
				child = new Text(child);
			}

			if (child.parentNode) {
				let was = child.parentNode.isConnected ?? false;
				let arr = child.parentNode.childNodes;
				let i = arr.indexOf(child);
				if (i !== -1) {
					arr.splice(i, 1);
				}
				child.parentNode = null;
				if (was) {
					onDisconnect(child);
				}
			}

			child.parentNode = this;
			this._children.push(child);

			if (this.isConnected) {
				onConnect(child);
			}
		}
	}

	remove () {
		if (!this.parentNode) {
			return;
		}

		let was = this.isConnected;
		let arr = this.parentNode.childNodes;
		let i = arr.indexOf(this);
		if (i !== -1) {
			arr.splice(i, 1);
		}
		this.parentNode = null;

		if (was) {
			onDisconnect(this);
		}
	}
}

class Text {
	nodeType = 3;
	parentNode = null;

	constructor (data = "") {
		this.data = data;
	}

	get textContent () {
		return this.data;
	}

	set textContent (val) {
		this.data = val;
	}

	get nodeName () {
		return "#text";
	}

	remove () {
		if (!this.parentNode) {
			return;
		}

		let arr = this.parentNode.childNodes;
		let i = arr.indexOf(this);
		if (i !== -1) {
			arr.splice(i, 1);
		}
		this.parentNode = null;
	}
}

class Element extends Node {
	#attrs = new Map();
	#def = null;

	constructor (tag) {
		super();
		this.localName = tag;
	}

	get tagName () {
		return this.localName.toUpperCase();
	}

	get nodeName () {
		return this.tagName;
	}

	get id () {
		return this.getAttribute("id") ?? "";
	}

	set id (val) {
		this.setAttribute("id", val);
	}

	get className () {
		return this.getAttribute("class") ?? "";
	}

	set className (val) {
		this.setAttribute("class", val);
	}

	get slot () {
		return this.getAttribute("slot") ?? "";
	}

	set slot (val) {
		this.setAttribute("slot", val);
	}

	get attributes () {
		return [...this.#attrs.entries()].map(([name, value]) => ({ name, value }));
	}

	getAttribute (name) {
		return this.#attrs.get(name) ?? null;
	}

	setAttribute (name, val) {
		let old = this.#attrs.get(name) ?? null;
		this.#attrs.set(name, String(val));

		if (this.#def?.observedAttrs?.includes(name) && this.attributeChangedCallback) {
			this.attributeChangedCallback(name, old, String(val));
		}
	}

	removeAttribute (name) {
		let old = this.#attrs.get(name) ?? null;
		if (old === null) {
			return;
		}

		this.#attrs.delete(name);

		if (this.#def?.observedAttrs?.includes(name) && this.attributeChangedCallback) {
			this.attributeChangedCallback(name, old, null);
		}
	}

	hasAttribute (name) {
		return this.#attrs.has(name);
	}

	get children () {
		return this.childNodes.filter(c => c instanceof Element);
	}

	get firstElementChild () {
		return this.children[0] ?? null;
	}

	#classSet () {
		return new Set((this.className || "").split(/\s+/).filter(Boolean));
	}

	#setClasses (set) {
		this.className = [...set].join(" ");
	}

	get classList () {
		let el = this;
		return {
			add (cls) {
				let s = el.#classSet();
				s.add(cls);
				el.#setClasses(s);
			},
			remove (cls) {
				let s = el.#classSet();
				s.delete(cls);
				el.#setClasses(s);
			},
			toggle (cls) {
				let s = el.#classSet();
				if (s.has(cls)) {
					s.delete(cls);
				}
				else {
					s.add(cls);
				}
				el.#setClasses(s);
			},
			contains (cls) {
				return el.#classSet().has(cls);
			},
		};
	}

	matches (sel) {
		if (/^[a-z][\w-]*$/i.test(sel)) {
			return this.localName === sel.toLowerCase();
		}

		let m = sel.match(/^\[([^\]=]+)\]$/);
		if (m) {
			return this.hasAttribute(m[1]);
		}

		m = sel.match(/^\[([^\]=]+)="([^"]*)"\]$/);
		if (m) {
			return this.getAttribute(m[1]) === m[2];
		}

		throw new Error(`matches(): unsupported selector "${sel}"`);
	}

	// Verified in Chromium: new children connect first, old disconnect after
	set innerHTML (html) {
		let frag = parseFragment(html);
		let nodes = frag.childNodes.map(n => toNode(n));

		let old = [...this.childNodes];
		let connected = this.isConnected;

		for (let child of nodes) {
			child.parentNode = this;
			this.childNodes.push(child);
			if (connected) {
				onConnect(child);
			}
		}

		for (let child of old) {
			let i = this.childNodes.indexOf(child);
			if (i !== -1) {
				this.childNodes.splice(i, 1);
			}
			child.parentNode = null;
			if (connected) {
				onDisconnect(child);
			}
		}
	}

	static _setDef (el, def) {
		el.#def = def;
	}
}

class HTMLElement extends Element {
	static _tag = null;
	static _def = null;

	constructor (tag) {
		if (_upgrade) {
			super(_upgrade.localName);
			return _upgrade;
		}

		super(tag ?? HTMLElement._tag);

		if (HTMLElement._def) {
			Element._setDef(this, HTMLElement._def);
		}
	}

	attachShadow (opts = {}) {
		return { mode: opts.mode, adoptedStyleSheets: [] };
	}
}

class MutationObserver {
	constructor () {}
	observe () {}
	disconnect () {}
}

class CSSStyleSheet {
	replaceSync () {}
}

class CustomElementRegistry {
	#defs = new Map();
	#pending = new Map();

	define (name, Cls) {
		if (!name.includes("-")) {
			throw new DOMException(`"${name}" is not a valid custom element name`);
		}

		if (this.#defs.has(name)) {
			throw new DOMException(`"${name}" has already been defined`);
		}

		let def = {
			name,
			Cls,
			observedAttrs: Cls.observedAttributes ?? [],
		};

		this.#defs.set(name, def);

		if (doc?.body) {
			walk(doc.body, n => {
				if (n instanceof Element && n.localName === name && !(n instanceof Cls)) {
					upgrade(n, def);
				}
			});
		}

		if (this.#pending.has(name)) {
			for (let resolve of this.#pending.get(name)) {
				resolve(Cls);
			}
			this.#pending.delete(name);
		}
	}

	get (name) {
		return this.#defs.get(name)?.Cls;
	}

	getDef (name) {
		return this.#defs.get(name) ?? null;
	}

	whenDefined (name) {
		let d = this.#defs.get(name);
		if (d) {
			return Promise.resolve(d.Cls);
		}

		return new Promise(resolve => {
			if (!this.#pending.has(name)) {
				this.#pending.set(name, []);
			}
			this.#pending.get(name).push(resolve);
		});
	}
}

function walk (node, fn) {
	fn(node);
	if (node.childNodes) {
		for (let child of node.childNodes) {
			walk(child, fn);
		}
	}
}

function upgrade (el, def) {
	Object.setPrototypeOf(el, def.Cls.prototype);
	Element._setDef(el, def);

	let reactions = [];

	for (let attr of el.attributes) {
		if (def.observedAttrs.includes(attr.name)) {
			reactions.push(() => el.attributeChangedCallback?.(attr.name, null, attr.value));
		}
	}

	if (el.isConnected) {
		reactions.push(() => el.connectedCallback?.());
	}

	_upgrade = el;
	new def.Cls();
	_upgrade = null;

	for (let fn of reactions) {
		fn();
	}
}

let registry = new CustomElementRegistry();

doc = new (class Document extends Node {
	nodeType = 9;

	constructor () {
		super();
		this.body = new Element("body");
		this.body.parentNode = this;
	}

	get nodeName () {
		return "#document";
	}

	createElement (tag) {
		tag = tag.toLowerCase();
		let def = registry.getDef(tag);

		if (def) {
			HTMLElement._tag = tag;
			HTMLElement._def = def;
			let el = new def.Cls();
			HTMLElement._tag = null;
			HTMLElement._def = null;
			return el;
		}

		return new HTMLElement(tag);
	}

	createDocumentFragment () {
		let frag = new Node();
		frag.nodeType = 11;
		return frag;
	}
})();

onConnect = function (node) {
	walk(node, n => {
		if (n instanceof Element) {
			n.connectedCallback?.();
		}
	});
};

onDisconnect = function (node) {
	walk(node, n => {
		if (n instanceof Element) {
			n.disconnectedCallback?.();
		}
	});
};

function toNode (ast) {
	if (ast.nodeName === "#text") {
		return new Text(ast.value);
	}

	let el = doc.createElement(ast.tagName);

	for (let attr of ast.attrs ?? []) {
		el.setAttribute(attr.name, attr.value);
	}

	for (let child of ast.childNodes ?? []) {
		let node = toNode(child);
		node.parentNode = el;
		el.childNodes.push(node);
	}

	return el;
}

Object.assign(globalThis, {
	Node,
	Text,
	Element,
	HTMLElement,
	document: doc,
	customElements: registry,
	MutationObserver,
	CSSStyleSheet,
});
