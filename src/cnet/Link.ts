import { Socket } from "net"
import { Pipe } from "./Pipe"
import { Packer } from "./Packer"
import { Request } from "./Request"
import { EventEmitter } from "events"
import { Notify } from "./Notify"

class Link extends EventEmitter {
    private _pipe: Pipe

    get uuid() { return this._pipe.uuid }

    constructor(pipe: Pipe) {
        super()
        this._pipe = pipe
        this._pipe.on("request", (id: number, data: Buffer) => { this.onRequest(id, data) })
        this._pipe.on("notify", (data: Buffer) => { this.onNotify(data) })
    }

    bind() {
        this._pipe.bind()
    }

    async kick() {
        await this._pipe.kick()
    }

    push(data: Buffer) {
        this._pipe.notify(data)
    }

    respond(id: number, data: Buffer) {
        this._pipe.respond(id, data)
    }

    private onRequest(id: number, data: Buffer) {
        const req = new Request(this, id, data)
        this.emit("request", req)
    }

    private onNotify(data: Buffer) {
        const nty = new Notify(this, data)
        this.emit("notify", nty)
    }
}

export type ILink = Link

export function newLink(socket: Socket) {
    const packer = new Packer()
    const pipe = new Pipe(packer, socket)
    return new Link(pipe)
}