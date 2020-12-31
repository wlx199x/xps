import { EventEmitter } from "events"
import * as net from "net"
import { newLink, ILink } from "./Link"
import { Request } from "./Request"
import { Notify } from "./Notify"

export class Server extends EventEmitter {
    private _net = new net.Server()
    private _links = new Map<string, ILink>()

    constructor() {
        super()
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

    private onConnection(socket: net.Socket) {
        const link = newLink(socket)
        link.on("request", (req: Request) => { this.emit("request", req) })
        link.on("notify", (nty: Notify) => { this.emit("notify", nty) })
        link.bind()
        this._links.set(link.uuid, link)
        this.emit("client", link)
    }
}