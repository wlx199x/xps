import { EventEmitter } from "events"
import * as net from "net"
import { newLink, ILink } from "./Link"
import { IRequest } from "./Request"
import { INotify } from "./Notify"

export class Server {
    private _net = new net.Server()
    private _event = new EventEmitter()
    private _links = new Map<number, ILink>()

    constructor() {
        this._net.on("connection", (socket: net.Socket) => { this.onConnection(socket) })
    }

    async boot(port: number) {
        return new Promise<void>((resolve, reject) => {
            this._net.on("listening", resolve)
            this._net.listen(port)
        })
    }

    broadcast(data: Buffer) {
        for (const link of this._links.values()) {
            link.push(data)
        }
    }

    onRequest(listener: (req: IRequest) => void) {
        this._event.on("request", listener)
    }

    onNotify(listener: (nty: INotify) => void) {
        this._event.on("notify", listener)
    }

    private onConnection(socket: net.Socket) {
        const link = newLink(socket)
        link.onRequest((req: IRequest) => { this._event.emit("request", req) })
        link.onNotify((nty: INotify) => { this._event.emit("notify", nty) })
        link.bind()
        this._links.set(link.id, link)
    }
}