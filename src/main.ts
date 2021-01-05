import { newClient } from "./cnet/Client"
import { INotify, IPush } from "./cnet/Notify";
import { IRequest } from "./cnet/Request";
import { Server } from "./cnet/Server"

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //不含最大值，含最小值
}

async function run() {
    const name = process.argv[2]
    if (name == "link") {
        const s = new Server()
        await s.boot(3000)
        console.log(`server done`)

        s.onRequest((req: IRequest) => {
            const data = req.data()
            const resp = `request#${data.toString()}`
            req.reply(Buffer.from(resp))
        })

        s.onNotify((nty: INotify) => {
            const data = nty.data()
            const broad = `broad#${data.toString()}`
            // s.broadcast(Buffer.from(broad))
        })
    }
    if (name == "client") {
        const c = newClient()
        await c.connect(3000)
        console.log(`client done`)
        c.onPush((push: IPush) => {
            console.log("push", push.data().toString())
        })
        for (let i = 0; i < 10; i++) {
            const r1 = getRandomInt(5, 100)
            const r2 = getRandomInt(1000, 10000000)
            const data = `${r1}#${r2}`
            if (getRandomInt(0, 2)) {
                console.log("req", data)
                const resp = await c.request(Buffer.from(data))
                console.log("resp", resp.toString())
            } else {
                console.log("nty", data)
                c.notify(Buffer.from(data))
            }
        }

    }
}

(async () => {
    await run()
})()