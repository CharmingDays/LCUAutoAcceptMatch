import WebSocket from "ws";
import { RequestOpts, Subscribers,LockfileData } from "./interfaces";
import { readFile, watch } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { setTimeout } from "timers/promises";
import { Agent } from "https";
import { resolve } from "path";
import fetch from "node-fetch";

class ClientSocket{
    socket:any;
    subscribers:Subscribers;
    lockfile:LockfileData;
    riotGamesPath:string;
    headers:any ={'Content-Type':'application/json'}
    agent:any;
    constructor(riotGamesPath?:string) {
        this.subscribers = {}
        this.lockfile = {
            wsAddr:"test",
            address:"",
            port:"",
            password:"string",
            username:"string",
            pid:"",
            token:"",
            method:"",
            fetchUrl:""
        }
        if (riotGamesPath === undefined) this.riotGamesPath = "C:/Riot Games/League of Legends"
        else this.riotGamesPath = riotGamesPath;
    }

    async request(data:RequestOpts) {
        let url = `${this.lockfile.fetchUrl}${data.url}`
        const response = await fetch(url,{method:data.method,headers:this.headers,agent:this.agent,body:JSON.stringify(data.body)})
        return response
    }


    async setupLockfile() {
        const file = await readFile(`${this.riotGamesPath}/lockfile`,'utf-8')
        let lockfile = file.split(":")
        this.lockfile.username = lockfile[0]
        this.lockfile.pid = lockfile[1]
        this.lockfile.port = lockfile[2]
        this.lockfile.password = lockfile[3]
        this.lockfile.method = lockfile[4]
        this.lockfile.address = "127.0.0.1"
        this.lockfile.fetchUrl = `${this.lockfile.method}://${this.lockfile.address}:${this.lockfile.port}`;
        this.lockfile.wsAddr = `wss://riot:${this.lockfile.password}@${this.lockfile.address}:${this.lockfile.port}/`
        this.lockfile.token = Buffer.from(`riot:${this.lockfile.password}`).toString('base64');
        this.headers.Authorization = `Basic ${this.lockfile.token}`
        this.agent = new Agent({rejectUnauthorized:false})
    }

    async waitForLockFile() {
        const lockfileWatcher = watch('C:/Riot Games/League of Legends')
        if (existsSync(`${this.riotGamesPath}/lockfile`)) {
            await this.setupLockfile()
            console.log("Waiting for socket server to start")
            await setTimeout(7000) //Make delay to allow client to start socket server
            await this.startSocket()
        }
        try {
            
            for await (const event of lockfileWatcher) {
                if (event.filename === 'lockfile' && event.eventType === 'rename' && existsSync(`${this.riotGamesPath}/lockfile`)){
                    await this.setupLockfile()
                    console.log("Waiting for socket server to start")
                    await setTimeout(7000) //Make delay to allow client to start socket server
                    await this.startSocket()
                }
                if (event.filename == 'lockfile') {
                    // client closed
                    await setTimeout(3000)
                    if (!existsSync(`${this.riotGamesPath}/lockfile`)) console.log("Waiting for client to re-open");
                    
                }
            }
        }
        catch (err) {
            console.log('watcher error:',err);
        }
    }

    async addSub(uri:string,func:Function){
        if (this.subscribers?.[uri] === undefined) {
            this.subscribers[uri] = [func]
        }
        else {
            this.subscribers[uri].push(func)
        }
        console.log(uri,func.name);
        
    }


    async initWatchers() {
        await this.waitForLockFile();
    }

    async startSocket() {
        console.log(this.lockfile.wsAddr);
        this.socket = new WebSocket(this.lockfile.wsAddr,{rejectUnauthorized:false})
        console.log('Starting socket...');
        this.socket.on('open',()=>{
            this.socket.send(JSON.stringify([5,'OnJsonApiEvent']))
            console.log('Message sent to server...')
            const checkConnection = async() =>{
                await setTimeout(3000)
                const summoner =await this.request({url:'/lol-summoner/v1/current-summoner',method:'GET'})
                if (summoner.ok) {
                    const summonerJson = await summoner.json()
                    console.log(`Summoner: ${summonerJson.displayName}\nLevel: ${summonerJson.summonerLevel}`);
                }
            }
            checkConnection()
        })
        this.socket.on('message',(rawData:any)=>{
            if (rawData == "" || rawData == "[]") return //Bad data or no data
            let data = JSON.parse(rawData)[2]
            if (data.data === false || JSON.stringify(data.data) === "[]" || data.data === '') {
                return
            }   
            if (this.subscribers?.[data.uri] != undefined) {
                const runSubFuncs = async() =>{
                    for (const uriFunc of this.subscribers[data.uri]) {
                        await uriFunc(data.data)
                    }
                }
                runSubFuncs()
            }
        })
    }
}





export {ClientSocket}
