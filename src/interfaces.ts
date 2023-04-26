
interface Subscribers {
    [key:string]: Function[]
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



interface RequestOpts {
    url:string;
    method:string;
    body?:any
}



export {LockfileData,RequestOpts,Subscribers}
