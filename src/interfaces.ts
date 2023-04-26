interface RunesData {
    [key:string]:RuneObj[]
}
interface RuneObj {
    selectedPerkIds:number[];
    primaryStyleId:number;
    subStyleId:number;
    name:string;
    current:boolean;
    rate?:number
}

interface Subscribers {
    [key:string]: Function[]
}

interface matchDataObj {
    puuids:string[];
    matchIds:string[];
    collectedMatchIds: string[];
    runes:RunesData;
}

interface _champions {
    [name:string]:number
}

interface ChampionPopularityInterface {
    matchIds:string[],
    usedMatchIds:string[],
    champions:_champions,
    puuid:string,
    bannedChampions:_champions
}



interface LockfileData {
    wsAddr:string
    address:string
    port:string
    password:string
    username:string
    method:string
    pid:string
    token:string
    fetchUrl:string
}


interface actionData {
    actorCellId:number;
    championId: number;
    completed:boolean;
    id: number;
    isAllyAction:boolean;
    isInProgress:boolean;
    type: string
}
interface RequestOpts {
    url:string;
    method:string;
    body?:any
}

interface lcuSettings {
    autoAccept:boolean;
    autoBan:number[];
    autoHover:number[];
    autoPick:number[];
    autoRunes:boolean;
}


export {lcuSettings,LockfileData,RunesData,RuneObj,matchDataObj,RequestOpts,Subscribers,ChampionPopularityInterface,actionData}