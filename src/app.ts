import { ClientSocket } from "./socketClient";
import { Subscribers} from "./interfaces";

const lolSocket:ClientSocket = new ClientSocket()

async function autoAcceptMatch(data:any) {
    if (data == null) return
    if (data.state === 'InProgress') {
        if (data.playerResponse === 'None'){
            await lolSocket.request({url:'/lol-matchmaking/v1/ready-check/accept',method:'POST'})
        }
    }
}


const uris = {
    '/lol-matchmaking/v1/ready-check':[autoAcceptMatch]

}

async function addListeners(subs:Subscribers) {
    for (const [uri,funcs] of Object.entries(subs)) {
        for (const func of funcs) {
            await lolSocket.addSub(uri,func)
        }
    }
}

async function initSocket() {
    await addListeners(uris)
    await lolSocket.initWatchers()
}

initSocket()
