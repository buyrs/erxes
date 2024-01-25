import { ICommentParams, IPostParams } from './types';
import { debugError } from './debuggers';
import { getFileUploadConfigs, sendInboxMessage } from './messageBroker';
import {
  getFacebookUser,
  getFacebookUserProfilePic,
  getPostLink,
  uploadMedia,
} from './utils';
import { IModels } from './connectionResolver';
import { INTEGRATION_KINDS } from './constants';
import { ICustomerDocument } from './models/definitions/customers';
import { IIntegrationDocument } from './models/Integrations';
import { putCreateLog } from './logUtils';
import graphqlPubsub from '@erxes/api-utils/src/graphqlPubsub';

interface IDoc {
  postId?: string;
  commentId?: string;
  recipientId: string;
  customerId?: string;
  senderId: string;
  content: string;
  parentId?: string;
  attachments?: string[];
  timestamp?: string | number;
  permalink_url?: '';
}

export const generatePostDoc = async (
  postParams: IPostParams,
  pageId: string,
  userId: string,
  subdomain: string,
) => {
  const {
    post_id,
    id,
    link,
    photos,
    created_time,
    message,
    photo_id,
    video_id,
  } = postParams;
  let generatedMediaUrls: any[] = [];

  const { UPLOAD_SERVICE_TYPE } = await getFileUploadConfigs(subdomain);

  const mediaUrls = postParams.photos || [];
  const mediaLink = postParams.link || '';

  if (UPLOAD_SERVICE_TYPE === 'AWS') {
    if (mediaLink) {
      if (video_id) {
        generatedMediaUrls = (await uploadMedia(
          subdomain,
          mediaLink,
          true,
        )) as any;
      }

      if (photo_id) {
        generatedMediaUrls = (await uploadMedia(
          subdomain,
          mediaLink,
          false,
        )) as any;
      }
    }

    if (mediaUrls.length > 0) {
      generatedMediaUrls = await Promise.all(
        mediaUrls.map((url) => uploadMedia(subdomain, url, false)),
      );
    }
  }

  const doc: IDoc = {
    postId: post_id || id,
    content: message || '...',
    recipientId: pageId,
    senderId: userId,
    permalink_url: '',
  };

  if (link) {
    doc.attachments = generatedMediaUrls;
  }

  // Posted multiple image
  if (photos) {
    if (UPLOAD_SERVICE_TYPE === 'AWS') {
      doc.attachments = generatedMediaUrls;
    }
    if (UPLOAD_SERVICE_TYPE === 'local') {
      doc.attachments = photos;
    }
  }

  if (created_time) {
    doc.timestamp = created_time;
  }

  return doc;
};

const generateCommentDoc = (
  commentParams: ICommentParams,
  pageId: string,
  userId: string,
  customerId?: string,
) => {
  const {
    photo,
    video,
    post_id,
    parent_id,
    comment_id,
    created_time,
    message,
    restoredCommentCreatedAt,
    post,
  } = commentParams;

  const doc: IDoc = {
    postId: post_id,
    commentId: comment_id,
    recipientId: pageId,
    senderId: userId,
    content: message || '...',
    permalink_url: '',
    customerId,
  };

  if (post_id !== parent_id) {
    doc.parentId = parent_id;
  }

  if (photo) {
    doc.attachments = [photo];
  }

  if (video) {
    doc.attachments = [video];
  }

  if (created_time) {
    doc.timestamp = (created_time * 1000).toString();
  }

  if (restoredCommentCreatedAt) {
    doc.timestamp = restoredCommentCreatedAt;
  }

  if (post && post.permalink_url) {
    doc.permalink_url = post.permalink_url;
  }

  return doc;
};

export const getOrCreatePostConversation = async (
  models: IModels,
  subdomain: string,
  postId: string,
  integration: IIntegrationDocument,
  customer: ICustomerDocument,
  params: ICommentParams,
) => {
  let postConversation = await models.PostConversations.findOne({
    postId,
  });
  if (!postConversation) {
    throw new Error('Post not founds');
  }

  return postConversation;
};

export const getOrCreatePost = async (
  models: IModels,
  subdomain: string,
  postParams: IPostParams,
  pageId: string,
  userId: string,
) => {
  const { post_id } = postParams;

  if (!post_id) {
    throw new Error('post_id is required');
  }

  let post = await models.PostConversations.findOne({
    postId: postParams.post_id,
  });

  if (post) {
    return post;
  }

  const integration = await models.Integrations.getIntegration({
    $and: [
      { facebookPageIds: { $in: pageId } },
      { kind: INTEGRATION_KINDS.POST },
    ],
  });

  const { facebookPageTokensMap = {} } = integration;

  const postUrl = await getPostLink(
    pageId,
    facebookPageTokensMap,
    postParams.post_id || '',
  );

  const doc = await generatePostDoc(postParams, pageId, userId, subdomain);

  if (!doc.attachments && doc.content === '...') {
    throw new Error();
  }

  doc.permalink_url = postUrl;
  post = await models.PostConversations.create(doc);

  return post;
};

export const getOrCreateComment = async (
  models: IModels,
  subdomain: string,
  postConversation: any,
  commentParams: ICommentParams,
  pageId: string,
  userId: string,
  verb: string,
  integration: IIntegrationDocument,
  customer: ICustomerDocument,
) => {
  const commentConversations = await models.CommentConversation.find({
    comment_id: commentParams.parent_id,
  });
  const commentConversation = commentConversations[0];
  let comment;
  const _id: string[] = [];
  const post = await models.PostConversations.findOne({
    postId: commentParams.post_id,
  });

  let attachment;
  if (commentParams.photo) {
    attachment = [
      {
        name: 'Photo', // You can set a name for the attachment
        url: commentParams.photo,
        type: 'image', // You can set the type based on your requirements
        // You may want to include other properties like size, duration if applicable
      },
    ];
  } else {
    attachment = [];
  }

  if (commentConversations.length > 0 && post) {
    if (commentConversation.erxesApiId) {
      _id.push(commentConversation.erxesApiId);
    }

    comment = await models.CommentConversationReply.create({
      attachments: attachment,
      customerId: customer.erxesApiId,
      recipientId: pageId,
      senderId: userId,
      createdAt: commentParams.post.updated_time,
      comment_id: commentParams.comment_id,
      content: commentParams.message,
      parent_id: commentParams.parent_id,
    });
  } else {
    if (postConversation.erxesApiId) {
      _id.push(postConversation.erxesApiId);
    }

    if (post) {
      comment = await models.CommentConversation.create({
        attachments: attachment,
        recipientId: pageId,
        senderId: userId,
        createdAt: commentParams.post.updated_time,
        postId: commentParams.post_id,
        comment_id: commentParams.comment_id,
        content: commentParams.message,
        customerId: customer.erxesApiId,
        parentId: commentParams.parent_id,
      });
    }
  }

  const resultString = _id[0];
  try {
    const apiConversationResponse = await sendInboxMessage({
      subdomain,
      action: 'integrations.receive',
      data: {
        action: 'create-or-update-conversation',
        payload: JSON.stringify({
          customerId: customer.erxesApiId,
          integrationId: integration.erxesApiId,
          content: commentParams.message,
          attachments: attachment,
          conversationId: resultString,
        }),
      },
      isRPC: true,
    });

    const erxesApiId = (postConversation.erxesApiId =
      apiConversationResponse._id);
    let comment_conversations = await models.CommentConversation.findOne({
      comment_id: commentParams.comment_id,
    });
    let comment_conversations_reply =
      await models.CommentConversationReply.findOne({
        comment_id: commentParams.comment_id,
      });

    if (comment_conversations || comment_conversations_reply) {
      if (comment_conversations) {
        await models.CommentConversation.updateOne(
          { comment_id: comment_conversations.comment_id },
          { $set: { erxesApiId: erxesApiId } },
        );
      }
      if (comment_conversations_reply) {
        await models.CommentConversationReply.updateOne(
          { comment_id: comment_conversations_reply.comment_id },
          { $set: { erxesApiId: erxesApiId } },
        );
      }
      try {
        if (erxesApiId) {
          const inboxIntegration = await sendInboxMessage({
            subdomain,
            action: 'conversationClientMessageInserted',
            data: {
              integrationId: integration.erxesApiId,
              conversationId: erxesApiId,
            },
          });
          graphqlPubsub.publish(`conversationMessageInserted:${erxesApiId}`, {
            conversationMessageInserted: {
              _id: comment._id,
              content: commentParams.message,
              createdAt: new Date(),
              customerId: customer.erxesApiId,
              conversationId: erxesApiId,
            },
            comment,
            integration: inboxIntegration,
          });
        } else {
          console.log('Warning: The comment is undefined.');
        }
      } catch (e) {
        throw new Error(
          e.message.includes('duplicate')
            ? 'Concurrent request: conversation message duplication'
            : e,
        );
      }
    } else {
      console.log('No matching documents found.');
    }
  } catch (e) {
    await models.CommentConversation.deleteOne({
      _id: commentConversation,
    });
    throw new Error(e);
  }
};

export const getOrCreateCustomer = async (
  models: IModels,
  subdomain: string,
  pageId: string,
  userId: string,
  kind: string,
) => {
  const integration = await models.Integrations.getIntegration({
    $and: [{ facebookPageIds: { $in: pageId } }, { kind }],
  });

  const { facebookPageTokensMap = {} } = integration;

  let customer = await models.Customers.findOne({ userId });

  if (customer) {
    return customer;
  }

  // create customer
  let fbUser = {} as any;

  try {
    fbUser =
      (await getFacebookUser(models, pageId, facebookPageTokensMap, userId)) ||
      {};
  } catch (e) {
    debugError(`Error during get customer info: ${e.message}`);
  }

  const fbUserProfilePic = await getFacebookUserProfilePic(
    pageId,
    facebookPageTokensMap,
    userId,
    subdomain,
  );

  // save on integrations db
  try {
    customer = await models.Customers.create({
      userId,
      firstName: fbUser.first_name || fbUser.name,
      lastName: fbUser.last_name,
      integrationId: integration.erxesApiId,
      profilePic: fbUserProfilePic,
    });
  } catch (e) {
    throw new Error(
      e.message.includes('duplicate')
        ? 'Concurrent request: customer duplication'
        : e,
    );
  }

  // save on api
  try {
    const apiCustomerResponse = await sendInboxMessage({
      subdomain,
      action: 'integrations.receive',
      data: {
        action: 'get-create-update-customer',
        payload: JSON.stringify({
          integrationId: integration.erxesApiId,
          firstName: fbUser.first_name || fbUser.name,
          lastName: fbUser.last_name,
          avatar: fbUserProfilePic,
          isUser: true,
        }),
      },
      isRPC: true,
    });

    customer.erxesApiId = apiCustomerResponse._id;
    await customer.save();
  } catch (e) {
    await models.Customers.deleteOne({ _id: customer._id });
    throw new Error(e);
  }

  return customer;
};
