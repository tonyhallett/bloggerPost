import {ConditionFailMessages} from './apiTypes'
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
export default conditionFailMessages;