import { ILink } from "./Link"

export class Notify {
    private _link: ILink
    private _data: Buffer

    constructor(link: ILink, data: Buffer) {
        this._link = link
        this._data = data
    }

    data() {
        return this._data.toString()
    }
}