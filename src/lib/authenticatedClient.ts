import {authenticateClient} from './oauthAuthenticateClient'
import {getRedirectUrlAndPort} from './networkLoopback'
import { Credentials } from 'google-auth-library/build/src/auth/credentials';
import { OAuth2Client } from 'google-auth-library';
import {google} from 'googleapis';
export interface ClientIdAndSecret{
    clientId:string,
    clientSecret:string

}
export async function getAuthenticatedClient(credentials:Credentials|undefined,clientIdAndSecret:ClientIdAndSecret,onTokens:(credentials:Credentials)=>any,scope:string|string[]){
                    
    let oauthClient:OAuth2Client;
        
    let authenticatedClient:Promise<void>;
    if(credentials){
        oauthClient=new google.auth.OAuth2(clientIdAndSecret);
        oauthClient.on("tokens",onTokens);
        console.log("setting credentials from before");
        oauthClient.setCredentials(credentials)
        authenticatedClient=Promise.resolve();
    }else{
        
        const redirection=await getRedirectUrlAndPort();
        oauthClient=new google.auth.OAuth2({clientId:clientIdAndSecret.clientId,clientSecret:clientIdAndSecret.clientSecret,redirectUri:redirection.redirectUrl});
        oauthClient.on("tokens",onTokens);
        
        authenticatedClient=authenticateClient(oauthClient,redirection.freePort,scope);
    }
    return authenticatedClient.then(()=>oauthClient);
}