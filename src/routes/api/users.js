import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import Notification from '../../models/notificationModel';
import User from '../../models/userModel';
import catchAsync from '../../utils/catchAsync';

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res, next) => {
    let searchObj = req.query;

    if (req.query.search !== undefined) {
      searchObj = {
        $or: [
          { firstname: { $regex: req.query.search, $options: 'i' } },
          { lastname: { $regex: req.query.search, $options: 'i' } },
          { username: { $regex: req.query.search, $options: 'i' } },
        ],
      };
    }

    const results = await User.find(searchObj);
    res.status(200).send(results);
  }),
);

router.put(
  '/:userId/follow',
  catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (user === null) return res.sendStatus(404);

    const isFollowing =
      user.followers && user.followers.includes(req.session.user._id);

    const option = isFollowing ? '$pull' : '$addToSet';

    req.session.user = await User.findByIdAndUpdate(
      req.session.user._id,
      { [option]: { following: userId } },
      { new: true },
    );

    await User.findByIdAndUpdate(userId, {
      [option]: { followers: req.session.user._id },
    });

    if (!isFollowing) {
      await Notification.insertNotification(
        userId,
        req.session.user._id,
        'follow',
        req.session.user._id,
      );
    }

    return res.status(200).send(req.session.user);
  }),
);

router.get(
  '/:userId/following',
  catchAsync(async (req, res, next) => {
    const following = await User.findById(req.params.userId).populate(
      'following',
    );
    res.status(200).send(following);
  }),
);

router.get(
  '/:userId/followers',
  catchAsync(async (req, res, next) => {
    const followers = await User.findById(req.params.userId).populate(
      'followers',
    );
    res.status(200).send(followers);
  }),
);

router.post(
  '/profilePicture',
  upload.single('croppedImage'),
  (req, res, next) => {
    if (!req.file) {
      console.log('No file uploded with ajax request');
      return res.sendStatus(400);
    }
    const filePath = `uploads/images/${req.file.filename}.png`;
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, `../../../${filePath}`);
    fs.rename(tempPath, targetPath, async error => {
      if (error !== null) {
        console.log(error);
        return res.sendStatus(400);
      }

      req.session.user = await User.findByIdAndUpdate(
        req.session.user._id,
        { profilepic: filePath },
        { new: true },
      );

      res.sendStatus(204);
    });
  },
);
router.post('/coverPhoto', upload.single('croppedImage'), (req, res, next) => {
  if (!req.file) {
    console.log('No file uploded with ajax request');
    return res.sendStatus(400);
  }
  const filePath = `uploads/images/${req.file.filename}.png`;
  const tempPath = req.file.path;
  const targetPath = path.join(__dirname, `../../../${filePath}`);
  fs.rename(tempPath, targetPath, async error => {
    if (error !== null) {
      console.log(error);
      return res.sendStatus(400);
    }

    req.session.user = await User.findByIdAndUpdate(
      req.session.user._id,
      { coverPhoto: filePath },
      { new: true },
    );

    res.sendStatus(204);
  });
});

export default router;
