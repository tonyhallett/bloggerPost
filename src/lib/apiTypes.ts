export {ClientIdAndSecret,Credentials,IClientStore,ICredentialsManager,ISecurity,ISecurityFactory} from './security'
export interface PostResourceBase{
    
    title:string,
    titleLink?:string,
    //https://developers.google.com/blogger/docs/3.0/reference/posts#resource
    //additional to look at later
    //author object - not sure if can supply an author, without it uses the authorized user
    //location object, images[] - think that you can also set the published, updated..
    
    labels?:string[],
    customMetadata?:string
}
export interface Post extends PostResourceBase{
    contentFilePath:string,
    id?:string,
    url?:string,
    isDraft?:boolean
}
export interface BloggerPost extends Post{
    blogId:string
    
    
}
export interface IBloggerPostManager<T extends BloggerPost>{
    get():Promise<T>,
    update(bloggerPost:T):Promise<void>
}
export interface IResourceProvider<T extends BloggerPost>{
    getResource(bloggerPost:T):Promise<string>
}
export interface BloggerPoster{
     update():Promise<void>
     updateAndView():Promise<void>//only if not in draft
     updateRevert():Promise<void>
     updatePublish():Promise<void>
     updatePublishAndView():Promise<void>
     
     insert():Promise<void>
     insertAndView():Promise<void>
     insertAsDraft():Promise<void>
     delete():Promise<void>
     revert():Promise<void>
     publish():Promise<void>
     publishAndView():Promise<void>
}
export interface ConditionFailMessages{
    noPostToUpdate:string,
    noPostToDelete:string,
    noPostToPublish:string,
    noPostToRevert:string,
    postAlreadyPublished:string,
    postAlreadyDraft:string,
    postAlreadyInserted:string
}