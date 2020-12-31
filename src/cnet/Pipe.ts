import { EventEmitter } from "events"
import { Socket } from "net"
import { EPKind } from "./Define"
import { Packer } from "./Packer"
import { News } from "./News"

export class Pipe extends EventEmitter {
    private _uuid!: string
    private _packer: Packer
    private _socket!: Socket

    private _pcbs = new Map<string, any>()
    private _pter = new Map<string, any>()
    private _event = new EventEmitter()

    get uuid() { return this._uuid }

    constructor(packer: Packer, socket: Socket) {
        super()
        this._packer = packer
        this._socket = socket

        this._packer.on("news", (buff: Buffer) => { this.onNews(buff) })

        this._event.on(`${EPKind.Request}#news`, (news: News) => { this.onRequest(news) })
        this._event.on(`${EPKind.Respond}#news`, (news: News) => { this.onRespond(news) })

        this._event.on(`${EPKind.Notify}#news`, (news: News) => { this.onNotify(news) })
        this._event.on(`${EPKind.Ack}#news`, (news: News) => { this.onAck(news) })

        this._event.on(`${EPKind.Ping}#news`, (news: News) => { this.onPing(news) })
        this._event.on(`${EPKind.Pong}#news`, (news: News) => { this.onPong(news) })
    }

    bind() {
        this._packer.bind(this._socket)
        this._uuid = `${this._socket.remoteAddress}#${this._socket.remotePort}`
    }

    async connect(port: number) {
        return new Promise<void>((resolve, reject) => {
            this._socket.once("connect", resolve)
            this._socket.connect(port)
        })
    }

    async disconnect() {
        return new Promise<void>((resolve, reject) => {
            this._socket.once("close", (had_error: boolean) => { resolve() })
            this._socket.destroy()
        })
    }

    async kick() {
        return new Promise<void>((resolve, reject) => {
            this._socket.once("close", (had_error: boolean) => { resolve() })
            this._socket.destroy()
        })
    }

    private onNews(buff: Buffer) {
        const news = News.decode(buff)
        this._event.emit(`${news.kind}#news`, news)
    }

    request(data: Buffer) {
        return new Promise<Buffer>((resolve, reject) => {
            const req = new News(News.newId(), EPKind.Request, data)
            const key = `${req.id}#${req.kind}`

            const pcb = (data: Buffer) => { resolve(data) }
            this._pcbs.set(key, pcb)
            this._packer.send(req.encode())
            const ter = setTimeout(() => {
                this._pcbs.delete(key)
                this._pter.delete(key)
                reject(`request timeout`)
            }, 5000)
            this._pter.set(key, ter)
        })
    }

    respond(id: number, data: Buffer) {
        const resp = new News(id, EPKind.Respond, data)
        this._packer.send(resp.encode())
    }

    private onRequest(news: News) {
        this.emit("request", news.id, news.data)
    }

    private onRespond(news: News) {
        const key = `${news.id}#${EPKind.Request}`
        const ter = this._pter.get(key)
        if (ter) {
            clearTimeout(ter)
            this._pter.delete(key)
        }

        const pcb = this._pcbs.get(key)
        if (pcb) {
            this._pcbs.delete(key)
            pcb(news.data)
        }
    }

    notify(data: Buffer) {
        new Promise<void>((resolve, reject) => {
            const nty = new News(News.newId(), EPKind.Notify, data)
            const key = `${nty.id}#${nty.kind}`

            const pcb = () => { resolve() }
            this._pcbs.set(key, pcb)
            this._packer.send(nty.encode())
            const ter = setTimeout(() => {
                this._pcbs.delete(key)
                this._pter.delete(key)
                reject(`notify timeout`)
            }, 5000)
            this._pter.set(key, ter)
        })
    }

    private onNotify(news: News) {
        const ack = new News(news.id, EPKind.Ack)
        this._packer.send(ack.encode())
        this.emit("notify", news.data)
    }

    private onAck(news: News) {
        const key = `${news.id}#${EPKind.Notify}`
        const ter = this._pter.get(key)
        if (ter) {
            clearTimeout(ter)
            this._pter.delete(key)
        }

        const pcb = this._pcbs.get(key)
        if (pcb) {
            this._pcbs.delete(key)
            pcb()
        }
    }

    private ping() {
        new Promise<void>((resolve, reject) => {
            const pin = new News(News.newId(), EPKind.Ping)
            const key = `${pin.id}#${pin.kind}`

            const pcb = () => { resolve() }
            this._pcbs.set(key, pcb)
            this._packer.send(pin.encode())
            const ter = setTimeout(() => {
                this._pcbs.delete(key)
                this._pter.delete(key)
                reject(`ping timeout`)
            }, 5000)
            this._pter.set(key, ter)
        })
    }

    private onPing(news: News) {
        const pong = new News(news.id, EPKind.Pong)
        this._packer.send(pong.encode())
    }

    private onPong(news: News) {
        const key = `${news.id}#${EPKind.Ping}`
        const ter = this._pter.get(key)
        if (ter) {
            clearTimeout(ter)
            this._pter.delete(key)
        }

        const pcb = this._pcbs.get(key)
        if (pcb) {
            this._pcbs.delete(key)
            pcb()
        }
    }
}