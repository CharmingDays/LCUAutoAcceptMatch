import { ClientSocket } from "./socketClient";
import { ChampionSelectSession } from "./sessionData";
import { Subscribers, actionData } from "./interfaces";
import {watchFile} from "fs";
import { setTimeout as sleep } from "timers/promises";
import { ChampionSession } from "./champSessionAPI";


const lolSocket:ClientSocket = new ClientSocket()
const champSession:ChampionSelectSession = new ChampionSelectSession({})
let localSettings = {}

async function autoAcceptMatch(data:any) {
    if (data == null) return
    if (data.state === 'InProgress') {
        if (data.playerResponse === 'None'){
            await lolSocket.request({url:'/lol-matchmaking/v1/ready-check/accept',method:'POST'})
        }
    }
}

    async function AutoBanChampion(data:any) {
        /**
         * PLANNING
         * BAN_PICK (BAN)
         * BAN_PICK(PICK)
         * FINALIZATION
         * GAME_STARTING
         */
        await sleep(1000)
        champSession.updateSessionData(data)
        const disabledChamps = await(await lolSocket.request({url:'/lol-champ-select/v1/disabled-champions',method:"GET"})).json()
        const banList:number[] = [103,53,99]
        const banningChamp = await champSession.isBannable(banList,disabledChamps.championIds)
        const actionData:actionData = await champSession.banActionData()
        if (actionData === undefined) return;
        console.log('ActionData',actionData);
        actionData.championId = Number(banningChamp)
        let url  = `/lol-champ-select/v1/session/actions/${actionData.id}`
        const hoverResponse = await lolSocket.request({url,method:"PATCH",body:actionData})
        await sleep(2000)
        if (hoverResponse.ok){
            await lolSocket.request({url:`${url}/complete`,method:"POST"})
        }

    }

async function autoHover(data:any) {
    const hoveringChampion:number = 67;
    champSession.updateSessionData(data)
    const actionData = await champSession.pickActionData()
    if (!actionData) return
    if (champSession.data.myTeam[champSession.localPlayerCellId].championPickIntent === 0 && (actionData.type === "pick")) {
        let url = `/lol-champ-select/v1/session/actions/${actionData.id}`
        actionData.championId = hoveringChampion
        console.log(actionData);
        const response = await lolSocket.request({url,method:"PATCH",body:actionData})
        const text = await response.text()
        console.log(text);
        
    }
}


async function autoPickChamp(data:any) {
    const pickableChamps = await (await lolSocket.request({url:'/lol-champ-select/v1/pickable-champions',method:"GET"})).json()
    const actionData:actionData = await champSession.pickActionData();
    if (!actionData.isInProgress) return // not player turn to pick yet
    for (const champId of pickingChamps) {
        if (pickableChamps.championIds.includes(champId)) {
            actionData.championId = champId
            break;
        }
    }
    let url = `/lol-champ-select/v1/session/actions/${actionData.id}`
    const hoverResponse = await lolSocket.request({url,method:"PATCH",body:actionData})
    if (hoverResponse.ok) {
        await lolSocket.request({url:`${url}/complete`,method:"POST"})
    }
}



async function actions(data:any) {
    console.log(data);
}



const uris = {
    // '/lol-champ-select/v1/session': [AutoBanChampion,autoHover,autoPickChamp],
    '/lol-matchmaking/v1/ready-check':[autoAcceptMatch]

}

async function lcuSettingsWatcher() {
    watchFile(`${lolSocket.riotGamesPath}/locker.txt`,(curr,prev) =>{
        if (curr.size != prev.size) {

        }
    })
}


async function addListeners(subs:Subscribers) {
    for (const [uri,funcs] of Object.entries(subs)) {
        for (const func of funcs) {
            await lolSocket.addSub(uri,func)
        }
    }
}

async function initSocket() {
    // await lcuSettingsWatcher()
    await addListeners(uris)
    await lolSocket.initWatchers()
}


const pickingChamps = [67,222,145]
initSocket()