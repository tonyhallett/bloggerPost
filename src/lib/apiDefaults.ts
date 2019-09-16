import * as fsextra from 'fs-extra'
import * as path from 'path';
import {ensureAbsoluteRelativeTo} from './fileHelpers';
import { IBloggerPostManager,IResourceProvider, BloggerPost, ISecurityFactory, ISecurity, ICredentialsManager, IClientStore, ClientIdAndSecret, Credentials } from "./apiTypes";
import { ExtendedCredentials } from './security';
export interface DefaultBloggerPost extends BloggerPost{
    storePath:string,
    clientPath?:string,
    clientIdEnv?:string,
    clientSecretEnv?:string,
    indent?:string|number,
    contentFilePath:string
}
interface BloggerPackageJson{
    bloggerPost:DefaultBloggerPost
}
const directory=process.cwd();
const packageJsonSearchPath=path.resolve(directory,"package.json");
const packageJsonPath=require.resolve(packageJsonSearchPath);
const packageJson:BloggerPackageJson = require(packageJsonSearchPath);

const defaultSpaceIndent=2;
function getIndent(bloggerPost:DefaultBloggerPost){
    let indent:number|string=defaultSpaceIndent;
    if(bloggerPost.indent){
        indent=bloggerPost.indent;
    }
    return indent;
}
function getPathRelativeToPackageJson(makeRelativePath:string){
    return ensureAbsoluteRelativeTo(makeRelativePath,packageJsonPath);
}
export class DefaultBloggerPostManager implements IBloggerPostManager<DefaultBloggerPost> {
    private bloggerPost:DefaultBloggerPost;
    constructor(){
        this.bloggerPost=packageJson.bloggerPost;
    }
    
    get(): Promise<DefaultBloggerPost> {
        return Promise.resolve(this.bloggerPost);
    }
    update(bloggerPost: DefaultBloggerPost): Promise<void> {
        packageJson.bloggerPost=bloggerPost;
        return fsextra.writeJSON(packageJsonPath,packageJson,{spaces:getIndent(bloggerPost)});
    }
}

interface IStoreManager{
    getStore():Promise<Store>,
    updateStore(store:Store):Promise<void>
}
class FileStoreManager implements IStoreManager {
    constructor(private storePath:string,private indent:string|number){}
    getStore(): Promise<Store> {
        return fsextra.pathExists(this.storePath).then(exists=>{
            if(exists){
                return fsextra.readJSON(this.storePath) as Promise<Store>;
            }else{
                return this.updateStore({}).then(()=>({}));
            }
            
        })
        
    }
    updateStore(store: Store): Promise<void> {
        return fsextra.writeJSON(this.storePath,store,{spaces:this.indent});
    }
}
interface BlogCredentials{
    [id:string]:ExtendedCredentials
}
interface Store{
    clientId?:string,
    clientSecret?:string,
    credentials?:BlogCredentials
}
//#endregion
class DefaultCredentialsManager implements ICredentialsManager{
    
    constructor(private storeManager:IStoreManager,private blogId:string){}
    setCredentials(credentials: ExtendedCredentials):Promise<void> {
        return this.storeManager.getStore().then(store=>{
            let storeCredentials:BlogCredentials
            if(store.credentials){
                storeCredentials=store.credentials
            }else{
                storeCredentials={
        
                }
                store.credentials=storeCredentials;
            }
            storeCredentials[this.blogId]=credentials;
            return this.storeManager.updateStore(store);
        })
        
    }
    
    getCredentials(): Promise<ExtendedCredentials|undefined> {
        return this.storeManager.getStore().then(store=>{
            if(store.credentials){
                return store.credentials[this.blogId];
            }
            return undefined;
        })
        
    }
}
class EnvironmentVariableClientStore{
    static getClientIdAndSecret(clientIdVarName:string,clientSecretVarName:string){
        return {
            clientId:process.env[clientIdVarName],
            clientSecret:process.env[clientSecretVarName]
        };
    }
}
class DefaultClientStore implements IClientStore {
    constructor(private storeManager:IStoreManager,private bloggerPost:DefaultBloggerPost){}
    private getEnvVarNames(){
        const bloggerPost=this.bloggerPost;
        return {
            clientIdVarName:bloggerPost.clientIdEnv?bloggerPost.clientIdEnv:"bloggerPostClientId",
            clientSecretVarName:bloggerPost.clientSecretEnv?bloggerPost.clientSecretEnv:"bloggerPostClientSecret",
        }
    }
    private check(clientIdAndSecret:{clientId:string|undefined,clientSecret:string|undefined}):ClientIdAndSecret{
        if(clientIdAndSecret.clientId&&clientIdAndSecret.clientSecret){
            return clientIdAndSecret as ClientIdAndSecret;
        }else{
            throw new Error("Both clientId and clientSecret are required");
        }
    }
    getClientIdAndSecret(): Promise<ClientIdAndSecret> {
        if(this.bloggerPost.clientPath){
            return (fsextra.readJSON(getPathRelativeToPackageJson(this.bloggerPost.clientPath)) as Promise<ClientIdAndSecret>).then(clientIdAndSecret=>this.check(clientIdAndSecret));
        }else{
            const {clientIdVarName,clientSecretVarName}=this.getEnvVarNames();
            const clientIdAndSecret=EnvironmentVariableClientStore.getClientIdAndSecret(clientIdVarName,clientSecretVarName);
            if(clientIdAndSecret.clientId&&clientIdAndSecret.clientSecret){
                return Promise.resolve(clientIdAndSecret);
            }else{
                return this.storeManager.getStore().then(store=>{
                    return this.check({clientId:store.clientId,clientSecret:store.clientSecret})
                })
            }
        }
    }
}
class DefaultSecurity implements ISecurity{
    credentialsManager: ICredentialsManager;
    clientStore: IClientStore;
    private storeManager:IStoreManager
    constructor(private bloggerPost:DefaultBloggerPost){ 
        this.storeManager=new FileStoreManager(getPathRelativeToPackageJson(bloggerPost.storePath),getIndent(bloggerPost));
        this.credentialsManager=new DefaultCredentialsManager(this.storeManager,this.bloggerPost.blogId);
        this.clientStore=new DefaultClientStore(this.storeManager,this.bloggerPost)
    }
}
export class DefaultSecurityFactory implements ISecurityFactory<DefaultBloggerPost>{
    getSecurity(bloggerPost:DefaultBloggerPost):ISecurity{
        
        return new DefaultSecurity(bloggerPost)
    }
}
export class DefaultResourceProvider implements IResourceProvider<DefaultBloggerPost> {
    getResource(bloggerPost: DefaultBloggerPost): Promise<string> {
        return fsextra.readFile(getPathRelativeToPackageJson(bloggerPost.contentFilePath),"utf8");
    }
}

