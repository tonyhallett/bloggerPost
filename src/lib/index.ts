/// <reference types="node"/>

import {createAPI} from './api'
export {createAPI} from './api'
import {DefaultBloggerPostManager,DefaultResourceProvider,DefaultSecurityFactory} from './apiDefaults'
import {BloggerPoster} from './apiTypes';
export const bloggerPoster=createAPI(new DefaultBloggerPostManager(),new DefaultSecurityFactory(),new DefaultResourceProvider())
