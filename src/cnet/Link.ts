import { Socket } from "net"
import { Pipe } from "./Pipe"
import { Packer } from "./Packer"
import { IRequest, newRequest } from "./Request"
import { EventEmitter } from "events"
import { INotify, newNotify } from "./Notify"
import { News } from "./News"
import { EPKind } from "./Define"

class Link {
    private static uqid = 0

    private _id: number
    private _pipe: Pipe
    private _event = new EventEmitter()

    get id() { return this._id }

    constructor(pipe: Pipe) {
        this._id = ++Link.uqid
        this._pipe = pipe
        this._pipe.onNews((news: News) => { this.onNews(news) })
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

    onRequest(listener: (req: IRequest) => void) {
        this._event.on("request", listener)
    }

    onNotify(listener: (nty: INotify) => void) {
        this._event.on("notify", listener)
    }

    private onNews(news: News) {
        if (news.kind == EPKind.Request) {
            this._event.emit("request", newRequest(this, news))
        }
        if (news.kind == EPKind.Notify) {
            this._event.emit("notify", newNotify(this.id, news))
        }
    }
}

export type ILink = Link
export function newLink(socket: Socket) {
    const packer = new Packer()
    const pipe = new Pipe(packer, socket)
    return new Link(pipe)
}