export default {
	name: "Disconnect / reconnect lifecycle",

	tests: [
		{
			name: "Queued propchange events drain on reconnect",
			run () {
				let { element } = this.data;
				let names = [];
				element.addEventListener("propchange", e => names.push(e.name));

				element.v = 1; // connected: dispatched immediately
				element.remove();
				element.v = 2; // disconnected: queued, not dispatched
				let before = [...names];
				document.body.append(element); // reconnect drains the queue
				return { before, after: [...names] };
			},
			arg: { props: { v: { type: Number, default: 42 } } },
			expect: { before: ["v"], after: ["v", "v"] },
		},
	],
};
