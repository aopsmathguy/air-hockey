var ControlsDelayer = class {
    listeners
    constructor() {
        this.listeners = {}
    }
    addEventListener(type, f) {
        if (!this.listeners[type]) {
            this.listeners[type] = []
        }
        this.listeners[type].push(f)
    }
    handleEvent(type, e) {
        var listeners = this.listeners[type]
        if (listeners) {
            for (var i = 0; i < listeners.length; i++) {
                listeners[i](e);
            }
        }
    }
    handleEventDelay(type, e, delay) {
        setTimeout(this.handleEvent.bind(this, type, e), delay)
    }
}