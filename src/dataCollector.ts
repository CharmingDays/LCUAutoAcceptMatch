import {RuneObj,matchDataObj,ChampionPopularityInterface} from "./interfaces";
import { RateLimiterRequester } from "./utilClasses";
import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";
import { existsSync} from "fs";
import { log } from "console";


class RuneCollector extends RateLimiterRequester{
    matchData:any;
    data:matchDataObj;
    puuid:string;
    initPuuids:Set<string>;
    constructor(puuid:string){
        super()
        this.initPuuids = new Set()
        this.puuid = puuid
        this.data = {
            puuids:[],
            matchIds: [],
            runes: {},
            collectedMatchIds:[]
        }
    }
    async autoCollectRunes(matchCount:number) {
        if (matchCount > 100) {
            let start=0;
            for (let count = matchCount; count >= 100; count-= 100) {
                await this.collectMatchIds(100,start)
                if (count - 100 <= 0 && count-100 >= -100) {
                    // predict next loop and end early to prevent miscounting
                    await this.collectMatchIds(Math.abs(count-100),start+(Math.abs(count)))
                    break
                }
                start+=100                
            }
        }
        else {
            await this.collectMatchIds(matchCount)
        }
        console.log('Match Size',this.data.matchIds.length);
        
        let size:number = this.data.matchIds.length;
        for (let i=0; i < size; i ++) {
            // set rate limits for the requests
            await this.getMatchData()
            await this.collectRunes()
            await this.collectSummoners()
        }
        await this.saveData()
    }
 
    async clearData() {
        // Erase the data and start over
        this.data.matchIds = []
        this.data.collectedMatchIds = []
        this.data.runes = {}
        for (let i=0; i < this.data.puuids.length; i ++) {
            if (this.initPuuids.has(this.data.puuids[i])) {
                this.data.puuids.splice(i)
            }
        }
    }

    async initCollector():Promise<Function|undefined> {
        console.log('Current PUUID',this.puuid);
        await this.collectMatchIds(100)
        let size:number = this.data.matchIds.length;
        console.log('Collecting data');
        for (let i =0; i < size; i ++) {
            await this.getMatchData()
            await this.collectRunes()
            await this.collectSummoners()
        }
        console.log('Saving data');
        await this.saveData()
        for (const puuid of this.data.puuids) {
            if (!this.initPuuids.has(puuid)) {
                this.initPuuids.add(puuid)
                this.puuid = puuid
                this.clearData()
                break;
            }
        }
        return await this.initCollector()
    }


    async mergeRunes(oldRune:any,newRune:any) {
        // merge two runes together into one rune page
        for (const key of Object.keys(newRune)) {
            for (const rune of newRune[key]) {
                if (oldRune?.[key] === undefined) {
                    oldRune[key] = [rune]
                }
                else {
                    oldRune[key].push(rune)
                }
            }
        }
        console.log('Updated Runes');
        
        return oldRune
    }


    async saveData(path?:string){
        // let copyData = {
        //     puuids:Array.from(this.data.puuids),
        //     matchIds:this.data.matchIds,
        //     runes:this.data.runes,
        //     collectedMatchIds: Array.from(this.data.collectedMatchIds)
        // }
        console.log(this.data);
        if (path === undefined) {
            path = resolve(__dirname,'minedData.json')
            if (!existsSync(path)) {
                return await writeFile(path,JSON.stringify(this.data))
            }
        }
        if (existsSync(path) || path === undefined && existsSync(resolve(__dirname,'minedData.json'))) {
            // ensures that it checks for files existing in the dir so it doesn't 
            // overwrite existing one even if path not provided
            let file = JSON.parse(await readFile(path,'utf-8'))
            this.data.runes = await this.mergeRunes(file.runes,this.data.runes)
            if (file.length === 0) {
                console.log('File is empty, overwriting it');
                return await writeFile(path,JSON.stringify(this.data))
            }
            // merge/combine data from new collected data with old one
            for (const matchId of this.data.collectedMatchIds) {
                if (!file.collectedMatchIds.includes(matchId)) {
                    file.collectedMatchIds.push(matchId)
                }
            }
            for (const puuid of this.data.puuids) {
                if (!file.puuids.includes(puuid)) {
                    file.puuids.push(puuid)
                }
            }
            console.log('Updated puuids,matchId');
            
            return await writeFile(path,JSON.stringify(file))
        }
    }


    async collectMatchIds(count=100,start=0,queue=420,type='ranked') {
        // get the match ids from puuid of summoner
        let url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${this.puuid}/ids?start=${start}&count=${count}&type=${type}&queue=${queue}`
        let matchIds = await this.request({url,method:"GET"})
        for (const matchId of matchIds) {
            if (!this.data.matchIds.includes(matchId)) {
                this.data.matchIds.push(matchId)
            }
        }
    }

    async getMatchData() {
        // get the match data from the match list 
        let matchId:any = this.data.matchIds.pop()
        let url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`
        let response = await this.request({url:url,method:'GET'})
        this.matchData = response;
        if (!this.data.collectedMatchIds.includes(matchId)) {
            this.data.collectedMatchIds.push(matchId)
        }
    }

    async collectSummoners() {
        // get the puuids of the matchData
        for (let puuid of this.matchData.metadata.participants) {
            if (!this.data.puuids.includes(puuid)) {}
            this.data.puuids.push(puuid)
        }
    }
    async sortPerks(participant:any){
        /**
         * Sort the perks from matchData into usable rune page
         */
        let perks = participant.perks
        let participantPerks:RuneObj = {primaryStyleId:0,subStyleId:0,selectedPerkIds:[],name:'',current:true};
        for (const selections of perks.styles) {
            for (const perk of selections.selections) {
                participantPerks.selectedPerkIds.push(perk.perk)
            }
        }
        for (let perk of Object.keys(perks.statPerks).reverse()) {
            participantPerks.selectedPerkIds.push(perks.statPerks[perk])
        }
        participantPerks.primaryStyleId = perks.styles[0].style
        participantPerks.subStyleId = perks.styles[1].style
        participantPerks.name = participant.championName
        return participantPerks
    }
    async collectRunes(){
        /**
         * Collect the runes of a match
         */
        for (const participant of this.matchData.info.participants) {
            if (this.data.runes?.[participant.championId] === undefined) {
                this.data.runes[participant.championId.toString()] = [await this.sortPerks(participant)]
            }
            else {
                this.data.runes[participant.championId.toString()].push(await this.sortPerks(participant))
            }
        }
  
    }
}


class ChampionPopularity extends RateLimiterRequester{
    matchData:any;
    data:ChampionPopularityInterface;
    loops:number;
    constructor(puuid:string){
        super()
        this.loops=0;
        this.data = {
            matchIds:[],
            usedMatchIds:[],
            champions:{},
            puuid:puuid,
            bannedChampions:{}
        }

    }
    
    async initMiner():Promise<Function> {
        if(this.loops == 10){ 
            return this.saveData
        }
        if (this.data.matchIds.length ==0){
            await this.collectMatchIds()
        }
        await this.getMatchData()
        await this.winnerChampions()
        await this.nextMatchId()
        this.loops++
        return await this.initMiner()
    }

    async collectMatchIds(count=100,start=0,queue=420,type='ranked') {
        // get the match ids from puuid of summoner
        let url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${this.data.puuid}/ids?start=${start}&count=${count}&type=${type}&queue=${queue}`
        let matchIds = await this.request({url,method:"GET"})
        for (const matchId of matchIds) {
            if (!this.data.matchIds.includes(matchId)) {
                this.data.matchIds.push(matchId)
            }
        }
    }
    async nextMatchId():Promise<string>{
        let matchId:string|any = this.data.matchIds.pop()
        if (this.data.matchIds.length !== 0 &&this.data.usedMatchIds.includes(matchId)){
            return this.nextMatchId()
        }
        this.data.usedMatchIds.push(matchId)
        return matchId;
    }    

    async getMatchData() {
        // get the match data from the match list 
        let matchId:string = await this.nextMatchId()
        let url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`
        let response = await this.request({url:url,method:'GET'})
        this.matchData = response;
    }

    async bannedChampions() {
        // get the champions that were banned in the match
        for (const teamInfo of this.matchData.info.teams) {
            for (const bans of teamInfo.bans) {
                if (this.data.bannedChampions?.[bans.championId] !== undefined) {
                    this.data.bannedChampions[bans.championId]+=1
                }
                else {this.data.bannedChampions[bans.championId]=1}
            }
        }
    }

    async saveData(path?:string){
        // TODO: COMPLETE DATA SAVER FOR THE CHAMPIONS
        const defaultPath = resolve(__dirname,'popularChampions.json')
        log(this.data)
        let data:any;
        if (path === undefined) {
            if (existsSync(defaultPath)) {
                // data = readFileSync(defaultPath,'utf-8')
            }
        }
    }

    async winnerChampions() {
        // collection the champions that won the game
        for (const participant of this.matchData.info.participants) {
            if (participant.win) {
                if (this.data.champions?.[participant.championId] !== undefined) {
                    this.data.champions[participant.championId]+=1
                }
                else {this.data.champions[participant.championId]=1}
            }
        }
    }
}


const puuid = 'BGHrKYLisDbTLLSFIBe3NcfMCuZvO28pwO5noctxRGPx6uOwuJiK6QoRsRsi8uF_6BPWBb_TqBKouw'
const collect = async() =>{
}

