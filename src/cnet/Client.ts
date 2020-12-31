import { EventEmitter } from "events"
import { Socket } from "net"
import { Pipe } from "./Pipe"
import { Packer } from "./Packer"
import { Push } from "./Push"

class Clinet extends EventEmitter {
    private _pipe: Pipe

    get uuid() { return this._pipe.uuid }

    constructor(pipe: Pipe) {
        super()
        this._pipe = pipe
        this._pipe.on("notify", (data: Buffer) => { this.onNotify(data) })
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

    private onNotify(data: Buffer) {
        const push = new Push(data)
        this.emit("push", push)
    }
}

export function newClient() {
    const packer = new Packer()
    const socket = new Socket()
    const pipe = new Pipe(packer, socket)
    return new Clinet(pipe)
}