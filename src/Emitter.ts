type EventListener = (data?) => void;

export class Emitter {
    private listeners: Map<string, Set<EventListener>>;

    constructor() {
        this.listeners = new Map();
    }

    on(type: string, callback: (data: any) => void) {
        if (this.listeners.has(type) == false) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(callback);
    }

    off(type: string, callback: (data: any) => void) {
        if (this.listeners.has(type) == false) {
            return;
        }
        this.listeners.get(type).delete(callback);
    }

    emit(type: string, data?) {
        if (this.listeners.has(type) == false) {
            return;
        }
        this.listeners.get(type).forEach(cb => cb(data));
    }
}