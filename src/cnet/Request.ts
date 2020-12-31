import { ILink } from "./Link";

export class Request {
    private _link: ILink
    private _id: number
    private _data: Buffer

    constructor(link: ILink, id: number, data: Buffer) {
        this._link = link
        this._id = id
        this._data = data
    }

    reply(data: Buffer) {
        this._link.respond(this._id, data)
    }

    data() {
        return this._data.toString()
    }
}