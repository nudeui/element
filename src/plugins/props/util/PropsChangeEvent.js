export default class PropsChangeEvent extends CustomEvent {
	constructor (type, { changedProps, ...options } = {}) {
		super(type, options);

		this.changedProps = changedProps;
	}
}
