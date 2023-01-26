import { Emitter } from "./Emitter";

const host = 'ws://localhost:5000';


let ws: WebSocket = null;

export class Connection extends Emitter {
    private _nickname: string;
    private readyPromise: Promise<void>;
    private resovleReady: () => void;
    private rejectReady: (error?) => void;

    constructor(nickname: string) {
        super();

        this._nickname = nickname;

        this.readyPromise = new Promise((resolve, reject) => {
            this.resovleReady = resolve;
            this.rejectReady = reject;
        });
    }

    get nickname() {
        return this._nickname;
    }

    get waitForConnection() {
        return this.readyPromise;
    }

    private init() {
        ws = new WebSocket(host);

        ws.addEventListener('message', this.onMessage.bind(this));

        ws.addEventListener('open', () => {
            console.log('Identifying with the server');
            this.send('identity', this.nickname);
        });

        ws.addEventListener('error', (error) => {
            console.error('Error connecting');
            this.rejectReady(error);
        });
    }

    private onMessage(message: MessageEvent) {
        const { type, data } = JSON.parse(message.data);
        if (type == 'identity') {
            if (data == true) {
                console.log('Success');
                this.resovleReady();
            } else {
                console.error('Error identifying');
                ws.close();
                this.rejectReady('Error identifying');
            }
        } else {
            this.emit(type, data);
        }
    }

    open(): Promise<void> {
        if (ws == null || ws.readyState == ws.CLOSED && ws.readyState != ws.CLOSING) {
            console.log('Connecting');
            this.init();
        } else {
            console.log('Reusing connection');
            this.resovleReady();
        }

        return this.readyPromise;
    }

    send(type, data?) {
        ws.send(JSON.stringify({ type, data }));
    }

    disconnect() {
        this.send('disconnect');
        ws.close();
    }
}