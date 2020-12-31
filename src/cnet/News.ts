import { EPKind } from "./Define"

export class News {
    private static SN = 0
    private static hsize = 5

    private readonly _id: number
    private readonly _kind: EPKind
    private readonly _data?: Buffer

    get id() { return this._id }
    get kind() { return this._kind }
    get data() { return this._data }

    constructor(id: number, kind: EPKind, data?: Buffer) {
        this._id = id
        this._kind = kind
        this._data = data
    }

    static newId() {
        const id = ++News.SN
        if (News.SN >= 4294967295) {
            News.SN = 0
        }
        return id
    }

    static decode(news: Buffer) {
        const id = news.readUInt32BE()
        const kind = news.readUInt8(News.hsize - 1)
        if (news.length == News.hsize) {
            return new News(id, kind)
        }
        const data = news.slice(this.hsize)
        return new News(id, kind, data)
    }

    encode() {
        const head = Buffer.allocUnsafe(News.hsize)
        head.writeUInt32BE(this._id)
        head.writeUInt8(this._kind, News.hsize - 1)
        if (!this._data) {
            return head
        }
        return Buffer.concat([head, this._data], News.hsize + this._data.length)
    }
}