import * as path from 'path'
export function ensureAbsoluteRelativeTo(relOrAbsolutePath:string,relativeToPath:string){
    if(!path.isAbsolute(relOrAbsolutePath)){
        relOrAbsolutePath=path.resolve(relativeToPath,relOrAbsolutePath);
    }
    return relOrAbsolutePath;
}