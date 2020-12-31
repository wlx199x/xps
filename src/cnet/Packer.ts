import { EventEmitter } from "events"
import { Socket } from "net"
import { Writable } from "stream"
import { Transform } from "stream"

export class Packer extends EventEmitter {
    private _sender: Sender
    private _receiver: Receiver

    constructor() {
        super()
        this._sender = new Sender()
        this._receiver = new Receiver()
        this._receiver.on("news", (buff: Buffer) => { this.emit("news", buff) })
    }

    bind(socket: Socket) {
        this._sender.pipe(socket).pipe(this._receiver)
    }

    send(buff: Buffer) {
        this._sender.send(buff)
    }
}

class Receiver extends Writable {
    private _hsize = 2
    private _rsize = 0
    private _bsize = 0
    private _buffs: Buffer[] = []


    _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        this._buffs.push(chunk)
        this._rsize += chunk.length

        if (!this._bsize && this._rsize >= this._hsize) {
            this._buffs = [Buffer.concat(this._buffs, this._rsize)]
            this.bsizeRead()
        }

        if (this._rsize != this._buffs[0].length) {
            this._buffs = [Buffer.concat(this._buffs, this._rsize)]
        }

        let end = this._hsize + this._bsize
        if (this._rsize < end) {
            callback()
            return
        }

        if (this._rsize == end) {
            const buff = this._buffs[0].slice(this._hsize)
            this.emit("news", buff)
            this._rsize = 0
            this._bsize = 0
            this._buffs = []
            callback()
            return
        }

        do {
            const buff = this._buffs[0].slice(this._hsize, end)
            this.emit("news", buff)
            this._buffs[0] = this._buffs[0].slice(end)
            this._rsize = this._buffs[0].length
            this._bsize = 0
            if (this._rsize >= this._hsize) {
                this.bsizeRead()
                end = this._hsize + this._bsize
            } else {
                break
            }
        } while (this._rsize >= end)
        callback()
    }

    private bsizeRead() {
        if (this._hsize == 2) {
            this._bsize = this._buffs[0].readUInt16BE()
        }
    }
}

class Sender extends Transform {
    private _hsize = 2

    _transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void) {
        const buff = Buffer.concat([this.head(chunk.length), chunk])
        this.push(buff)
        callback()
    }

    send(buff: Buffer) {
        this.write(buff)
    }

    private head(bsize: number) {
        const buff = Buffer.allocUnsafe(this._hsize)
        if (this._hsize == 2) {
            buff.writeUInt16BE(bsize)
        }
        return buff
    }
}