/**
 * An observer for slot mutations (new slots, removed slots, renamed slots)
 */

export default class SlotObserver {
	mutationObserver = new MutationObserver(records => {
		this.handleMutation(records);
	});

	constructor (callback) {
		this.callback = callback;
	}

	handleMutation (mutationRecords) {
		let slots = new Map();

		// This batches changes together, so that if a slot is changed multiple times,
		// we only get one record
		for (let r of mutationRecords) {
			if (r.type === "attributes" && r.target.tagName === "SLOT") {
				slots.set(r.target, {type: "renamed", target: r.target, oldName: r.oldValue});
			}
			else {
				for (let node of r.addedNodes) {
					slots.set(node, {type: "added", target: node});
				}

				for (let node of r.removedNodes) {
					slots.set(node, {type: "removed", target: node});
				}
			}
		}

		let records = [...slots.values()];

		if (records.length > 0) {
			this.callback(records);
		}
	}

	observe (host, options = {existing: true, added: true, removed: true, renamed: true}) {
		if (!host.shadowRoot) {
			return;
		}

		this.constructor.mutationObserver.observe(host.shadowRoot, {
			childList: options.added || options.removed,
			subtree: true,
			attributes: options.renamed,
			attributeFilter: ["name"],
			attributeOldValue: options.renamed
		});

		// Fire callback for existing slots
		if (options.existing !== false) {
			let records = [...host.shadowRoot.querySelectorAll("slot")].map(slot => ({target: slot}));

			if (records.length > 0) {
				this.callback(records);
			}
		}
	}

	disconnect () {
		let records = this.constructor.mutationObserver.takeRecords();

		if (records.length > 0) {
			this.callback(records);
		}

		this.constructor.mutationObserver.disconnect();
	}
}
