import { EventEmitter } from "events"
import { Socket } from "net"
import { Pipe } from "./Pipe"
import { Packer } from "./Packer"
import { IPush, newPush } from "./Notify"
import { News } from "./News"

class Client {
    private static uqid = 0

    private _id: number
    private _pipe: Pipe
    private _event = new EventEmitter()

    get id() { return this._id }

    constructor(pipe: Pipe) {
        this._id = ++Client.uqid
        this._pipe = pipe
        this._pipe.onNews((news: News) => { this.onNews(news) })
    }

    async connect(port: number) {
        await this._pipe.connect(port)
        this._pipe.bind()
    }

    async disconnect() {
        await this._pipe.disconnect()
    }

    notify(data: Buffer) {
        this._pipe.notify(data)
    }

    async request(data: Buffer) {
        return await this._pipe.request(data)
    }

    onPush(listener: (push: IPush) => void) {
        this._event.on("push", listener)
    }

    private onNews(news: News) {
        this._event.emit("push", newPush(this.id, news))
    }
}

export type IClient = Client

export function newClient() {
    const packer = new Packer()
    const socket = new Socket()
    const pipe = new Pipe(packer, socket)
    return new Client(pipe)
}