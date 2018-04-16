import { OAuth2Client } from 'google-auth-library';
import {google} from 'googleapis'
import {Blogger} from 'googleapis/build/src/apis/blogger/v3'
import {setAuthenticatedClient, ISecurityFactory} from './security';
import opn = require('opn');
import * as fsextra from 'fs-extra'
import defaultConditionFailMessages from './conditionFailMessages'

const blogger=google.blogger<Blogger>('v3');

import {BloggerPost,Post,PostResourceBase,IBloggerPostManager,IResourceProvider, ConditionFailMessages,BloggerPoster} from './apiTypes'


interface PostResource extends PostResourceBase{
    content:string,
}
interface PostParams{
    blogId:string,
    auth:OAuth2Client
}

interface PostParamsBase{
    fields?:string
}
interface PostAwareParams extends PostParamsBase{
    postId:string
}
type DeletePostParams=PostAwareParams
//optional publishDate ....
interface PublishPostParams extends PostAwareParams{}
interface PostResult{
    id:string,
    url:string
}
interface PublishPostResult extends PostResult{}
interface RevertPostResult extends PostResult{}
type RevertPostParams=PostAwareParams



interface ResourcePostParams{
    resource:PostResource,
    fetchBody:false
}
interface InsertPostParams extends PostParamsBase,ResourcePostParams{
    isDraft:boolean
}
interface InsertPostResult extends PostResult{}

interface UpdatePostParams extends PostAwareParams,ResourcePostParams{
    publish?:boolean,
    revert?:boolean
}
interface UpdatePostResult extends PostResult{}

//#endregion
interface ConditionResult{
    pass:boolean,
    failMessage:string
}
type conditionFn=(post:Post)=>ConditionResult
//will change interfaces so TParams extends ....
type getParamsFn<TParams,T extends BloggerPost>=(bloggerPost:T)=>Promise<TParams>
export interface AxiosResponse<T = any>  {
    data: T;
  }
export interface AxiosPromise<T = any> extends Promise<AxiosResponse<T>> {
}
type updateBlog<TParams,TResult>=(params:TParams&PostParams)=>AxiosPromise<TResult>
type updatePost<TResult>=(post:Post,result:TResult)=>boolean
//#endregion

enum UpdateType{Update,UpdatePublish,UpdateRevert};


export function createAPI<T extends BloggerPost>(bloggerPostManager:IBloggerPostManager<T>,securityFactory:ISecurityFactory<T>,resourceProvider:IResourceProvider<T>,conditionFailMessages:ConditionFailMessages=defaultConditionFailMessages){
    class BloggerCreator{
        private static getInsertUpdateResource(bloggerPost:T):Promise<PostResource>{
            return resourceProvider.getResource(bloggerPost).then(content=>{
                const postResource:PostResource=(({ title,titleLink,customMetadata,labels }) => ({ title,titleLink,customMetadata,labels,content:""}))(bloggerPost);
                postResource.content=content;
                return postResource as PostResource;
            })
        }
        private static createInsertOperation<T>(isDraft:boolean){
            return BloggerCreator.createOperation<InsertPostParams,InsertPostResult>(
                (p)=>{
                    return {pass:p.id===undefined,failMessage:conditionFailMessages.postAlreadyInserted}
                },(bp)=>{
                    return BloggerCreator.getInsertUpdateResource(bp).then(resource=>{
                        const params:InsertPostParams= {
                            isDraft:isDraft,
                            resource:resource,
                            fetchBody:false,
                            fields:"id,url"
                        }
                        return params;
                    });;
                },(parameters=>blogger.posts.insert(parameters)),
                ((p,r)=>{
                    p.id=r.id;
                    p.url=r.url;
                    p.isDraft=isDraft;
                    return true;
                })
                );
            
        }
        private static createUpdateOperation(updateType:UpdateType){
            return BloggerCreator.createOperation<UpdatePostParams,UpdatePostResult>((p)=>{
                let failMessage="";
                    let pass=true;
                    if(p.id===undefined){
                        failMessage=conditionFailMessages.noPostToUpdate;
                        pass=false;
                    }else {
                        switch(updateType){
                            case UpdateType.UpdatePublish:
                                if(!p.isDraft){
                                    failMessage=conditionFailMessages.postAlreadyPublished;
                                    pass=false;
                                }
                                break;
                            case UpdateType.UpdateRevert:
                                if(p.isDraft){
                                    failMessage=conditionFailMessages.postAlreadyDraft;
                                    pass=false;
                                }
                                break;
                        }
                    }
                    return {pass:pass,failMessage:failMessage}
            },(bp)=>{
                return BloggerCreator.getInsertUpdateResource(bp).then(resource=>{
                    const params:UpdatePostParams= {
                        resource:resource,
                        fetchBody:false,
                        fields:"id,url",
                        postId:bp.id as string
                    }
                    if(updateType===UpdateType.UpdatePublish){
                        params.publish=true;
                    }else if(updateType===UpdateType.UpdateRevert){
                        params.revert=true;
                    }
                    return params;
                });
            },
            params=>blogger.posts.update(params),
            (p,r)=>{
                let updated=false;
                switch(updateType){
                    case UpdateType.UpdatePublish:
                        p.isDraft=false;
                        p.url=r.url;
                        updated=true;
                        break;
                    case UpdateType.UpdateRevert:
                        p.isDraft=true;
                        p.url=r.url;
                        updated=true;
                        break;
                }
                return updated;
            })
        }
        private static createOpenOperation(operation:()=>Promise<BloggerPost>){
             function openOperation(){
                return operation().then((bloggerPost)=>{
                    if(bloggerPost.isDraft){
                        console.log("Cannot open as post is draft");
                    }else if(bloggerPost.url){
                        opn(bloggerPost.url);
                    }
                    
                })
            };
            return BloggerCreator.createHandledOperation(openOperation);
        }
        static create():BloggerPoster{
            const bloggerPoster={} as any;
            const insertOperation=BloggerCreator.createInsertOperation(false);
            const insertDraftOperation=BloggerCreator.createInsertOperation(true);
            bloggerPoster.insert=BloggerCreator.createHandledOperation(insertOperation);
            bloggerPoster.insertAsDraft=BloggerCreator.createHandledOperation(insertDraftOperation);
            bloggerPoster.insertAndView=BloggerCreator.createOpenOperation(insertOperation);
    
            const updateOperation=BloggerCreator.createUpdateOperation(UpdateType.Update);
            const updatePublishOperation=BloggerCreator.createUpdateOperation(UpdateType.UpdatePublish);
            const updateRevertOperation=BloggerCreator.createUpdateOperation(UpdateType.UpdateRevert);
            bloggerPoster.update=BloggerCreator.createHandledOperation(updateOperation);
            bloggerPoster.updateRevert=BloggerCreator.createHandledOperation(updateRevertOperation);
            bloggerPoster.updatePublish=BloggerCreator.createHandledOperation(updatePublishOperation);
            bloggerPoster.updateAndView=BloggerCreator.createOpenOperation(updateOperation);
            bloggerPoster.updatePublishAndView=BloggerCreator.createOpenOperation(updatePublishOperation);
            
            
    
            const deleteOperation=BloggerCreator.createOperation<DeletePostParams>(
                (p)=>{
                    return {pass:!!p.id,failMessage:conditionFailMessages.noPostToDelete}
                },(p)=>{
                    return Promise.resolve({postId:p.id as string});
                },(parameters=>blogger.posts.delete(parameters)),
                ((p)=>{
                    delete p.id;
                    delete p.url;
                    delete p.isDraft;
                    return true;
                    }
                )
            );
            bloggerPoster.delete=BloggerCreator.createHandledOperation(deleteOperation);
    
            const publishOperation=BloggerCreator.createOperation<PublishPostParams,PublishPostResult>(
                (p)=>{
                    let failMessage="";
                    let pass=true;
                    if(p.id===undefined){
                        failMessage=conditionFailMessages.noPostToPublish;
                        pass=false;
                    }else if(!p.isDraft){
                        failMessage=conditionFailMessages.postAlreadyPublished;
                        pass=false;
                    }
                    return {pass:pass,failMessage:failMessage}
                },(p)=>{
                    return Promise.resolve({postId:p.id as string,fields:"id,url"});
                },(parameters=>blogger.posts.publish(parameters)),
                ((p,r)=>{
                    p.isDraft=false;
                    p.url=r.url;
                    return true;
                }
                )
            );
            bloggerPoster.publish=BloggerCreator.createHandledOperation(publishOperation);
            bloggerPoster.publishAndView=BloggerCreator.createOpenOperation(publishOperation);
    
            const revertOperation=BloggerCreator.createOperation<RevertPostParams,RevertPostResult>(
                (p)=>{
                    let failMessage="";
                    let pass=true;
                    if(p.id===undefined){
                        failMessage=conditionFailMessages.noPostToRevert;
                        pass=false;
                    }else if(p.isDraft){
                        failMessage=conditionFailMessages.postAlreadyDraft;
                        pass=false;
                    }
                    return {pass:pass,failMessage:failMessage}
                },(p)=>{
                    return Promise.resolve({postId:p.id as string,fields:"id,url"});
                },(parameters=>blogger.posts.revert(parameters)),
                ((p,r)=>{
                    p.isDraft=true;
                    p.url=r.url;
                    return true;
                }
                )
            )
            bloggerPoster.publish=BloggerCreator.createHandledOperation(revertOperation);
            return bloggerPoster as BloggerPoster;
        }
        private static createHandledOperation(operation:()=>Promise<any>){
            return async function handledOperation(){
                try{
                    await operation();
                    console.log("Successful post operation !");
                }catch(e){
                    const errorPrefix="Error performing post operation";
                    console.error(e&&e.message?`${errorPrefix}: ${e.message}`:errorPrefix);
                }
            }
        }
        private static createOperation<TParams,TResult=any>(condition:conditionFn,getParams:getParamsFn<TParams,T>,updateBlog:updateBlog<TParams,TResult>,updatePost:updatePost<TResult>){
            return async function doOperation(){
                function checkConditions(bloggerPost:BloggerPost){
                    if(bloggerPost===undefined){
                        throw new Error("package.json does not contain bloggerPost key");
                    }else if(bloggerPost.blogId===undefined){
                        throw new Error("No blogId provided");
                    }
    
                    const conditionResult=condition(bloggerPost);
                    if(!conditionResult.pass){
                        throw new Error(conditionResult.failMessage)
                    }
                }
                const bloggerPost=await bloggerPostManager.get();
                checkConditions(bloggerPost)
                
                const auth=await setAuthenticatedClient<BloggerPost>(bloggerPost,securityFactory,['https://www.googleapis.com/auth/plus.me','https://www.googleapis.com/auth/blogger']);
                const params=await getParams(bloggerPost);
                const blogAuthParams=Object.assign({},params,{blogId:bloggerPost.blogId},{auth});
                const res=await updateBlog(blogAuthParams);
                const updatedBloggerPost=updatePost(bloggerPost,res.data);
                if(updatedBloggerPost){
                    await bloggerPostManager.update(bloggerPost);
                }
                return bloggerPost;
                
            }
        }
    }
    
    const bloggerPoster:BloggerPoster=BloggerCreator.create();
    return bloggerPoster;
}
