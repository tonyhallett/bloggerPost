const os = require('os');
const portfinder = require('portfinder');
interface NetworkAddress{
    address:string,
    netmask:string,
    family:string,
    mac:string,
    internal:boolean,
    scopeid:number,
    cidr:string
}
export async function getRedirectUrlAndPort(preferIPv4=true){
    function getLoopbackAddress(preferIPv4=true){
        var ifaces = os.networkInterfaces();
        const internalNetworkAddresses:NetworkAddress[]=[];
        Object.keys(ifaces).forEach(ifaceName=>{
            const networkAddresses:NetworkAddress[]=ifaces[ifaceName];
            networkAddresses.forEach(networkAddress=>{
                if(networkAddress.internal){
                    internalNetworkAddresses.push(networkAddress);
                }
            })
        })
        if(internalNetworkAddresses.length===0){
            throw new Error("No loopback address");
        }
        let matchedNetworkAddress:NetworkAddress|undefined;
        for(var i=0;i<internalNetworkAddresses.length;i++){
            const networkAddress=internalNetworkAddresses[i];
            if(preferIPv4){
                if(networkAddress.family==="IPv4"){
                    matchedNetworkAddress=networkAddress;
                    break;
                }
            }else{
                matchedNetworkAddress=networkAddress;
                break;
            }
        }
        if(!matchedNetworkAddress){
            matchedNetworkAddress=internalNetworkAddresses[0];
        }
        if(matchedNetworkAddress.family==="IPv4"){
            return "http://" + matchedNetworkAddress.address;
        }else{
            return "http://[::1]";
        }
    }
    const loopbackAddress=getLoopbackAddress(preferIPv4);
    const freePort:number=await portfinder.getPortPromise();
    const redirectUrl=loopbackAddress+":"+freePort;
    return{
        redirectUrl,
        freePort
    }
}