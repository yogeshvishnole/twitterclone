import express from 'express';
import Post from '../models/postModel';
import User from '../models/userModel';
import catchAsync from '../utils/catchAsync';

const router = express.Router();

router.get('/', (req, res, next) => {
  const payload = {
    pageTitle: req.session.user.username,
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
    profileUser: req.session.user,
  };

  return res.status(200).render('profilePage', payload);
});

router.get(
  '/:username',
  catchAsync(async (req, res, next) => {
    const payload = await getPayload(req.params.username, req.session.user);
    res.status(200).render('profilePage', payload);
  }),
);

router.get(
  '/:username/replies',
  catchAsync(async (req, res, next) => {
    const payload = await getPayload(req.params.username, req.session.user);
    payload.selectedTab = 'replies';
    res.status(200).render('profilePage', payload);
  }),
);

router.get(
  '/:username/following',
  catchAsync(async (req, res, next) => {
    const payload = await getPayload(req.params.username, req.session.user);
    payload.selectedTab = 'following';
    res.status(200).render('followersAndFollowingPage', payload);
  }),
);

router.get(
  '/:username/followers',
  catchAsync(async (req, res, next) => {
    const payload = await getPayload(req.params.username, req.session.user);
    payload.selectedTab = 'followers';
    res.status(200).render('followersAndFollowingPage', payload);
  }),
);

const getPayload = async (username, userLoggedIn) => {
  const user = await User.findOne({ username: username });

  if (user === null) {
    const userById = await User.findById(username);
    if (userById === null) {
      return {
        pageTitle: 'User not found',
        userLoggedIn: userLoggedIn,
        userLoggedInJs: JSON.stringify(userLoggedIn),
      };
    } else {
      return {
        pageTitle: userById.username,
        userLoggedIn: userLoggedIn,
        userLoggedInJs: JSON.stringify(userLoggedIn),
        profileUser: userById,
      };
    }
  }
  return {
    pageTitle: user.username,
    userLoggedIn: userLoggedIn,
    userLoggedInJs: JSON.stringify(userLoggedIn),
    profileUser: user,
  };
};

export default router;
