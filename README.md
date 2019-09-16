# BloggerPost

## Description

BloggerPost is a node command line interface as well as an api for authenticating and making authenticated post operations to a Blogger blog.  It ensures that only applicable post operations are passed to the server.

**You provide the clientId and clientSecret of your own application.**

## Installation

command line :

npm install -g blogger-post

**Alternatively there is a [yeoman generator](https://www.npmjs.com/package/generator-bloggerpost)**

api :

npm install --save blogger-post

The API has been written in typescript, the definition files are alongside the javascript.

## Usage

### Command line

The package adds the following commands to the command line, those that end ..AndView will open the browser at the post url :

bloggerPost-update\
bloggerPost-updateAndView\
bloggerPost-updateRevert\
bloggerPost-updatePublish\
bloggerPost-updatePublishAndView\
bloggerPost-insert\
bloggerPost-insertAndView\
bloggerPost-insertAsDraft\
bloggerPost-delete\
bloggerPost-revert\
bloggerPost-publish\
bloggerPost-publishAndView

#### Requirements

The command line is a default version of the api.  Default values have been provided to the createAPI function.

```typescript
export declare function createAPI<T extends BloggerPost>(bloggerPostManager: IBloggerPostManager<T>, securityFactory: ISecurityFactory<T>, resourceProvider: IResourceProvider<T>, conditionFailMessages?: ConditionFailMessages): BloggerPoster;
```

To use the command line we need to specify some options through the **bloggerPost** key of package.json.
This object has required properties :

blogId e.g "2172843962033951716"\
contentFilePath - path ( which can be relative to package.json ) to the html of the post\
storePath - path ( which can be relative to package.json ) where access tokens for blogs are stored\

Optional properties :

indent - to be applied to any file writing of json objects ( third argument to JSON.stringify ) such as package.json

##### clientId and clientSecret

These need to be specified and there a couple of ways to do this :

a) Use the clientPath property - path ( which can be relative to package.json ) to a json file with structure :

```typescript
{
    clientId:string,
    clientSecret:string
}
```

b) Store them in the store specified by the storePath. Ensure this file exists and is a json file with structure as above.

c) Provide through environment variables.  The names default to bloggerPostClientId and bloggerPostClientSecret and can be changed with the properties clientIdEnv and clientSecretEnv.

##### specification of post parameters

In addition to the contentFilePath there are further properties of the bloggerPost key of the package.json that are necessary for the operations performed.

When inserting or updating we can specify the following properties :

title

titleLink\
labels\
customMetadata

For operations that require the existence of a post ( all other than insert ):

id - the post id e.g "123456789"

**if the post was added using the api then this would have been added to the package.json automatically.**

##### additional automatically added bloggerPost package.json properties

url - this allows the ..AndView commands to work.\
isDraft - facilitates unnecessary operations.

### API

The api is simple:

```typescript
export declare function createAPI<T extends BloggerPost>(bloggerPostManager: IBloggerPostManager<T>, securityFactory: ISecurityFactory<T>, resourceProvider: IResourceProvider<T>, conditionFailMessages?: ConditionFailMessages): BloggerPoster;

export interface BloggerPoster{
     update():Promise<void>
     updateAndView():Promise<void>
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
```

#### ConditionFailMessages

```typescript
export interface ConditionFailMessages{
    noPostToUpdate:string,
    noPostToDelete:string,
    noPostToPublish:string,
    noPostToRevert:string,
    postAlreadyPublished:string,
    postAlreadyDraft:string,
    postAlreadyInserted:string
}
```

The conditionFailMessages argument is optional and defaults to:

```typescript
const noPostTo="There is no post to ";
const postAlready="The post is already ";
const conditionFailMessages:ConditionFailMessages={
    noPostToUpdate:noPostTo + "update",
    noPostToDelete:noPostTo + "delete",
    noPostToPublish:noPostTo + "publish",
    noPostToRevert:noPostTo + "revert",
    postAlreadyPublished:postAlready + "published",
    postAlreadyDraft:postAlready + "in the draft state",
    postAlreadyInserted:"The post has been inserted, did you mean update?"
}
```

The messages are written to the console when a BloggerPoster method is called unnecessarily.

#### IBloggerPostManager / BloggerPost

The BloggerPost interface ensures we identify the blog and is a place for storing information pertaining to the Post as well as the parameters necessary for posting.

```typescript
export interface PostResourceBase{
    title:string,
    titleLink?:string,
    labels?:string[],
    customMetadata?:string
}
export interface Post extends PostResourceBase{
    id?:string,
    url?:string,
    isDraft?:boolean
}
export interface BloggerPost extends Post{
    blogId:string
}
```

The IBloggerPostManager finds the BloggerPost and updates when necessary.\
The default uses package.json.

```typescript
export interface IBloggerPostManager<T extends BloggerPost>{
    get():Promise<T>,
    update(bloggerPost:T):Promise<void>
}
```

#### BloggerPost derivation

Your derivation, returned from the IBloggerPostManager, provides what is necessary for the securityFactory and resourceProvider arguments to function properly :

The IResourceProvider provides the string of html that is required for inserts and updates.\
The default reads the contents of the file specified by the contentFilePath.

```typescript
export interface IResourceProvider<T extends BloggerPost>{
    getResource(bloggerPost:T):Promise<string>
}
```

The ISecurityFactory provides the types that deal with the different security responsibilities.  IClientStore for clientId and clientSecret and ICredentialsManager for getting and setting the access tokens for the blogId in question.\
The default stores credentials using the storePath key and allows clientId and clientSecret to come from the storePath, the clientPath or through environment variables as specified using the keys clientIdEnv and clientSecretEnv or with names bloggerPostClientId and bloggerPostClientSecret respectively.

```typescript
export interface Credentials {
    refresh_token?: string | null;
    expiry_date?: number | null;
    access_token?: string | null;
    token_type?: string | null;
    id_token?: string | null;
    lastRefreshMs?:string
}

export interface ClientIdAndSecret{
    clientId:string,
    clientSecret:string

}

export interface ICredentialsManager{
    setCredentials(credentials:Credentials):Promise<void>
    getCredentials():Promise<Credentials|undefined>
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
```