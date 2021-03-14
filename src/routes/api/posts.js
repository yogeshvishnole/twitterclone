import express from 'express';
import Post from '../../models/postModel';
import User from '../../models/userModel';
import Notification from '../../models/notificationModel';
import catchAsync from '../../utils/catchAsync';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res, next) => {
    const searchObj = req.query;

    if (searchObj.isReply !== undefined) {
      const isReply = searchObj.isReply === 'true';
      searchObj.replyTo = { $exists: isReply };
      delete searchObj.isReply;
    }

    if (searchObj.search !== undefined) {
      searchObj.content = { $regex: searchObj.search, $options: 'i' };
      delete searchObj.search;
    }

    if (searchObj.followingOnly !== undefined) {
      const followingOnly = searchObj.followingOnly === 'true';

      if (followingOnly) {
        const objectIds = [];
        req.session.user.following.forEach(_id => {
          objectIds.push(_id);
        });

        objectIds.push(req.session.user._id);

        searchObj.postedBy = { $in: objectIds };
      }
      delete searchObj.followingOnly;
    }

    const posts = await getPosts(searchObj);
    return res.status(200).send(posts);
  }),
);

router.get(
  '/:id',
  catchAsync(async (req, res, next) => {
    const postId = req.params.id;
    const filter = { _id: postId };
    let postData = await getPosts(filter);
    postData = postData[0];
    const results = {
      postData,
    };
    if (postData.replyTo !== undefined) {
      results.replyTo = postData.replyTo;
    }
    results.replies = await getPosts({ replyTo: postId });

    return res.status(200).send(results);
  }),
);

router.post(
  '/',
  catchAsync(async (req, res, next) => {
    if (!req.body.content) {
      return res.sendStatus(400);
    }

    const postData = {
      content: req.body.content,
      postedBy: req.session.user,
    };

    if (req.body.replyTo) {
      postData.replyTo = req.body.replyTo;
    }

    let newPost = await Post.create(postData);

    newPost = await User.populate(newPost, { path: 'postedBy' });
    newPost = await Post.populate(newPost, { path: 'replyTo' });

    if (newPost.replyTo !== undefined) {
      await Notification.insertNotification(
        newPost.replyTo.postedBy,
        req.session.user._id,
        reply,
        newPost._id,
      );
    }

    return res.status(201).send(newPost);
  }),
);

router.put(
  '/:id/like',
  catchAsync(async (req, res, next) => {
    const postId = req.params.id;
    const userId = req.session.user._id;

    const isLiked =
      req.session.user.likes && req.session.user.likes.includes(postId);
    const option = isLiked ? '$pull' : '$addToSet';

    // Insert user like
    req.session.user = await User.findByIdAndUpdate(
      userId,
      { [option]: { likes: postId } },
      { new: true },
    );
    // Insert post like
    const post = await Post.findByIdAndUpdate(
      postId,
      { [option]: { likes: userId } },
      { new: true },
    );

    if (!isLiked) {
      await Notification.insertNotification(
        post.postedBY,
        userId,
        'postLike',
        post._id,
      );
    }

    return res.status(200).send(post);
  }),
);

router.post(
  '/:id/retweet',
  catchAsync(async (req, res, next) => {
    const postId = req.params.id;
    const userId = req.session.user._id;

    const deletePost = await Post.findOneAndDelete({
      postedBy: userId,
      retweetData: postId,
    });
    const option = deletePost != null ? '$pull' : '$addToSet';
    let repost = deletePost;
    if (repost === null) {
      repost = await Post.create({ postedBy: userId, retweetData: postId });
    }

    req.session.user = await User.findByIdAndUpdate(
      userId,
      { [option]: { retweets: repost._id } },
      { new: true },
    );

    const post = await Post.findByIdAndUpdate(
      postId,
      { [option]: { retweetUsers: userId } },
      { new: true },
    );
    if (!deletePost) {
      await Notification.insertNotification(
        post.postedBy,
        userId,
        'retweet',
        post._id,
      );
    }

    return res.status(200).send(post);
  }),
);

router.delete(
  '/:id',
  catchAsync(async (req, res, next) => {
    await Post.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  }),
);

router.put(
  '/:id',
  catchAsync(async (req, res, next) => {
    if (req.body.pinned !== undefined) {
      await Post.updateMany(
        { postedBy: req.session.user._id },
        { pinned: false },
      );
    }

    await Post.findByIdAndUpdate(req.params.id, req.body);

    res.sendStatus(204);
  }),
);

const getPosts = async filter => {
  let posts = await Post.find(filter)
    .populate('postedBy')
    .populate('retweetData')
    .populate('replyTo')
    .sort({ createdAt: -1 });

  posts = await User.populate(posts, { path: 'replyTo.postedBy' });
  return await User.populate(posts, { path: 'retweetData.postedBy' });
};

export default router;
