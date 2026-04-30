export default class PropsUpdateEvent extends CustomEvent {
	constructor (changedProps, options) {
		super("propsupdate", { ...options, detail: changedProps });

		this.changedProps = changedProps;
	}
}
