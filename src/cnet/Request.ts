import { ILink } from "./Link";
import { News } from "./News";

class Request {
    private _link: ILink
    private _news: News

    constructor(link: ILink, news: News) {
        this._link = link
        this._news = news
    }

    data() {
        return this._news.data as Buffer
    }

    reply(data: Buffer) {
        this._link.respond(this._news.id, data)
    }
}

export type IRequest = Request
export function newRequest(link: ILink, news: News) {
    return new Request(link, news)
}