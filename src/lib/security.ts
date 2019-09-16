import { Credentials } from 'google-auth-library/build/src/auth/credentials';
import {OAuth2Client} from 'google-auth-library/build/src/auth/oauth2client'
import { getAuthenticatedClient, ClientIdAndSecret } from './authenticatedClient';
import { BloggerPost } from './apiTypes';
export {ClientIdAndSecret} from './authenticatedClient';
export {Credentials} from 'google-auth-library/build/src/auth/credentials';

export type ExtendedCredentials = Credentials&{
    lastRefresh: Date
}

export interface ICredentialsManager{
    setCredentials(credentials:ExtendedCredentials):Promise<void>
    getCredentials():Promise<ExtendedCredentials|undefined>
}

export interface IClientStore{
    getClientIdAndSecret():Promise<ClientIdAndSecret>
}
export interface ISecurity{
    credentialsManager:ICredentialsManager
    clientStore:IClientStore
}
export interface ISecurityFactory<T extends BloggerPost>{
    getSecurity(arg:T):ISecurity
}
export async function setAuthenticatedClient<T extends BloggerPost>(securityFactoryOptions:T,securityFactory:ISecurityFactory<T>,scope:string|string[]){
                
    const security=securityFactory.getSecurity(securityFactoryOptions);
    const credentialsManager=security.credentialsManager;
    const clientStore=security.clientStore;
    return Promise.all([credentialsManager.getCredentials(),clientStore.getClientIdAndSecret()]).then(([credentials,clientIdAndSecret])=>{
        let forceAuthentication=false;
        if(credentials){
            const now = new Date();
            const timeDiff  = (now as any) - (credentials.lastRefresh as any);
            const days  = timeDiff / (1000 * 60 * 60 * 24);
            console.log("days since last access token refresh");
            if(days>88){
                forceAuthentication = true;
            }
        }
        return getAuthenticatedClient(credentials,clientIdAndSecret,forceAuthentication,(creds)=>{
            let eventReason="First access";
            if(credentials){
                eventReason="Refresh"
            }
            
            console.group("on tokens event: " + eventReason);
                console.log("access token: " + creds.access_token);
                if(creds.expiry_date){
                    const expiryDate=new Date();
                    expiryDate.setTime(creds.expiry_date);
                    console.log("expiry date: " + expiryDate);
                }
                
                console.log("refresh token: " + creds.refresh_token);
            console.groupEnd();
            
            credentialsManager.setCredentials({
                access_token:creds.access_token,
                token_type: creds.token_type,
                id_token:creds.id_token,
                expiry_date:creds.expiry_date,
                lastRefresh:new Date(),
                refresh_token:creds.refresh_token
            });
        },scope);
    })
}