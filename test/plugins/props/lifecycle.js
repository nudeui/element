export default {
	name: "Disconnect / reconnect lifecycle",

	tests: [
		{
			name: "Queued propchange events drain on reconnect",
			run () {
				let { element } = this.data;
				let events = [];
				element.addEventListener("propchange", e =>
					events.push([e.name, e.target[e.name]]));

				element.v = 1; // connected: dispatched immediately
				element.remove();
				element.v = 2; // disconnected: queued, not dispatched
				let before = events.map(event => [...event]);
				document.body.append(element); // reconnect drains the queue
				return { before, after: events.map(event => [...event]) };
			},
			arg: { props: { v: { type: Number, default: 42 } } },
			expect: {
				before: [["v", 1]],
				after: [
					["v", 1],
					["v", 2],
				],
			},
		},
		{
			name: "pauseEvents holds dispatch until resumeEvents drains in order",
			run () {
				let { element } = this.data;
				let log = [];
				element.addEventListener("propchange", e => log.push([e.name, e.detail.value]));

				element.a = 1; // fires immediately
				let beforePause = log.length;

				element.props.pauseEvents();

				element.b = "x";
				element.a = 2;

				let duringPause = log.length - beforePause;
				element.props.resumeEvents();

				return { duringPause, afterResume: log };
			},
			arg: { props: { a: { type: Number, default: 42 }, b: {} } },
			expect: {
				duringPause: 0,
				afterResume: [
					["a", 1],
					["b", "x"],
					["a", 2],
				],
			},
		},
	],
};
