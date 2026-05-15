import { getCollection, getRecord, pushRecord, removeRecord, toMillis, updateRecord } from './database.js';

const USERS_PATH = 'users';
const POSTS_PATH = 'marketplacePosts';
const COMMENTS_PATH = 'marketplaceComments';

function sortByCreatedAtDesc(left, right) {
  return toMillis(right.createdAt) - toMillis(left.createdAt);
}

function sortByCreatedAtAsc(left, right) {
  return toMillis(left.createdAt) - toMillis(right.createdAt);
}

async function loadUsersMap() {
  const users = await getCollection(USERS_PATH);
  return new Map(users.map((user) => [user.id, user]));
}

async function hydrateComments(postId, usersById) {
  const comments = await getCollection(`${COMMENTS_PATH}/${postId}`);
  return comments
    .map((comment) => {
      const commenter = usersById.get(comment.userId);
      if (!commenter) {
        return null;
      }

      return {
        ...comment,
        username: commenter.username,
        location: commenter.location ?? null
      };
    })
    .filter(Boolean)
    .sort(sortByCreatedAtAsc);
}

export async function getMarketplacePosts(status = 'active') {
  const [posts, usersById] = await Promise.all([
    getCollection(POSTS_PATH),
    loadUsersMap()
  ]);

  const matchingPosts = posts
    .filter((post) => (post.status ?? 'active') === status)
    .sort(sortByCreatedAtDesc);

  const enrichedPosts = await Promise.all(matchingPosts.map(async (post) => {
    const user = usersById.get(post.userId);
    if (!user) {
      return null;
    }

    const comments = await hydrateComments(post.id, usersById);

    return {
      ...post,
      username: user.username,
      email: user.email,
      userProfileLocation: user.location ?? null,
      commentCount: comments.length,
      comments
    };
  }));

  return enrichedPosts.filter(Boolean);
}

export async function createMarketplacePost(userId, postData) {
  const postId = await pushRecord(POSTS_PATH, {
    userId,
    type: postData.type,
    title: postData.title,
    description: postData.description,
    quantity: postData.quantity,
    price: postData.price,
    location: postData.location,
    category: postData.category,
    imageUrl: postData.imageUrl ?? null,
    status: 'active',
    createdAt: new Date().toISOString()
  });

  return postId;
}

export async function getMarketplacePostById(postId) {
  const [post, usersById] = await Promise.all([
    getRecord(`${POSTS_PATH}/${postId}`),
    loadUsersMap()
  ]);

  if (!post) {
    return null;
  }

  const user = usersById.get(post.userId);
  if (!user) {
    return null;
  }

  return {
    ...post,
    username: user.username,
    email: user.email
  };
}

export async function getPostComments(postId) {
  const usersById = await loadUsersMap();
  return hydrateComments(postId, usersById);
}


export async function addComment(postId, userId, comment) {
  const post = await getRecord(`${POSTS_PATH}/${postId}`);
  if (!post) {
    throw new Error('Post not found');
  }

  const commentId = await pushRecord(`${COMMENTS_PATH}/${postId}`, {
    postId,
    userId,
    comment,
    createdAt: new Date().toISOString()
  });

  return commentId;
}

export async function getUserPosts(userId) {
  const posts = await getCollection(POSTS_PATH);
  const userPosts = posts
    .filter((post) => post.userId === userId)
    .sort(sortByCreatedAtDesc);

  const postsWithCounts = await Promise.all(userPosts.map(async (post) => {
    const comments = await getCollection(`${COMMENTS_PATH}/${post.id}`);
    return {
      ...post,
      commentCount: comments.length
    };
  }));

  return postsWithCounts;
}

export async function deletePost(postId, userId) {
  const post = await getRecord(`${POSTS_PATH}/${postId}`);
  if (!post || post.userId !== userId) {
    return false;
  }

  await removeRecord(`${POSTS_PATH}/${postId}`);
  await removeRecord(`${COMMENTS_PATH}/${postId}`);
  return true;
}

export async function updateMarketplacePost(postId, userId, postData) {
  const post = await getRecord(`${POSTS_PATH}/${postId}`);
  if (!post || post.userId !== userId) {
    return false;
  }

  await updateRecord(`${POSTS_PATH}/${postId}`, {
    type: postData.type,
    title: postData.title,
    description: postData.description,
    quantity: postData.quantity,
    price: postData.price,
    location: postData.location,
    category: postData.category
  });

  return true;
}

export async function markPostAsCompleted(postId, userId) {
  const post = await getRecord(`${POSTS_PATH}/${postId}`);
  if (!post || post.userId !== userId) {
    return false;
  }

  await updateRecord(`${POSTS_PATH}/${postId}`, {
    status: 'completed'
  });

  return true;
}
