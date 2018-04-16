import { Credentials } from 'google-auth-library/build/src/auth/credentials';
import {OAuth2Client} from 'google-auth-library/build/src/auth/oauth2client'
import { getAuthenticatedClient, ClientIdAndSecret } from './authenticatedClient';
export {ClientIdAndSecret} from './authenticatedClient';
export {Credentials} from 'google-auth-library/build/src/auth/credentials';

export interface ICredentialsManager{
    setCredentials(credentials:Credentials):Promise<void>
    getCredentials():Promise<Credentials|undefined>
}

export interface IClientStore{
    getClientIdAndSecret():Promise<ClientIdAndSecret>
}
export interface ISecurity{
    getCredentialsManager():ICredentialsManager
    getClientStore():IClientStore
}
export interface ISecurityFactory<T>{
    getSecurity(arg:T):ISecurity

}
export async function setAuthenticatedClient<T>(securityFactoryOptions:T,securityFactory:ISecurityFactory<T>,scope:string|string[]){
                
    const security=securityFactory.getSecurity(securityFactoryOptions);
    const credentialsManager=security.getCredentialsManager();
    const clientStore=security.getClientStore();
    return Promise.all([credentialsManager.getCredentials(),clientStore.getClientIdAndSecret()]).then(([credentials,clientIdAndSecret])=>{
        return getAuthenticatedClient(credentials,clientIdAndSecret,(creds)=>{
            let eventReason="First access";
            if(credentials){
                eventReason="Refresh"
                creds.refresh_token=credentials.refresh_token;
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
            
            credentialsManager.setCredentials(creds);
        },scope);
    })
}