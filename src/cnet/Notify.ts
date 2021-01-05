import { News } from "./News"

class Notify {
    private _id: number
    private _news: News

    constructor(id: number, news: News) {
        this._id = id
        this._news = news
    }

    data() {
        return this._news.data as Buffer
    }
}

export type IPush = Notify
export type INotify = Notify
export function newNotify(id: number, news: News) {
    return new Notify(id, news) as INotify
}
export function newPush(id: number, news: News) {
    return new Notify(id, news) as IPush
}