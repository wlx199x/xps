import { EventEmitter } from "events"
import { Socket } from "net"
import { EPKind } from "./Define"
import { Packer } from "./Packer"
import { News } from "./News"

export class Pipe {
    private _uuid!: string
    private _packer: Packer
    private _socket!: Socket

    private _pcbs = new Map<string, (data: any) => void>()
    private _pter = new Map<string, any>()
    private _event = new EventEmitter()

    get uuid() { return this._uuid }

    constructor(packer: Packer, socket: Socket) {
        this._packer = packer
        this._socket = socket

        this._packer.on("pack", (buff: Buffer) => { this.onPack(buff) })
    }

    bind() {
        this._packer.bind(this._socket)
        this._uuid = `${this._socket.remoteAddress}#${this._socket.remotePort}`
        this._socket.on("close", (had_error: boolean) => { console.log(this.uuid, " close") })
        this._socket.on("error", (err: Error) => { this._socket.destroy() })
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

    respond(id: number, data: Buffer) {
        const news = new News(id, EPKind.Respond, data)
        this._packer.send(news.encode())
    }

    request(data: Buffer): Promise<Buffer> {
        const news = new News(News.newId(), EPKind.Request, data)
        return this.pcbNews<Buffer>(news)
    }

    notify(data: Buffer) {
        const news = new News(News.newId(), EPKind.Notify, data)
        this.pcbNews<undefined>(news)
    }

    onNews(listener: (news: News) => void) {
        this._event.on("news", listener)
    }

    private onPack(buff: Buffer) {
        const news = News.decode(buff)
        switch (news.kind) {
            case EPKind.Request:
                this._event.emit("news", news)
                break
            case EPKind.Notify:
                this._event.emit("news", news)
                const ack = new News(news.id, EPKind.Ack)
                this._packer.send(ack.encode())
                break
            case EPKind.Ping:
                const pong = new News(news.id, EPKind.Pong)
                this._packer.send(pong.encode())
                break
            case EPKind.Respond:
                this.onPcbNews(news, EPKind.Request)
                break
            case EPKind.Pong:
                this.onPcbNews(news, EPKind.Ping)
                break
            case EPKind.Ack:
                this.onPcbNews(news, EPKind.Notify)
                break
        }
    }

    private ping() {
        const news = new News(News.newId(), EPKind.Ping)
        this.pcbNews<undefined>(news)
    }

    private pcbNews<T>(news: News) {
        return new Promise<T>((resolve, reject) => {
            const key = `${news.id}#${news.kind}`
            const pcb = (data: T) => { resolve(data) }
            this._pcbs.set(key, pcb)
            this._packer.send(news.encode())
            const ter = setTimeout(() => {
                this._pcbs.delete(key)
                this._pter.delete(key)
                reject(`id(${news.id}) kind(${news.kind}) timeout`)
            }, 5000)
            this._pter.set(key, ter)
        })
    }

    private onPcbNews(news: News, kind: EPKind) {
        const key = `${news.id}#${kind}`
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
}