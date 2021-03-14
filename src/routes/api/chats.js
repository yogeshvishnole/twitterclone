import express from 'express';
import Chat from '../../models/chatModel';
import User from '../../models/userModel';
import Message from '../../models/messageModel';
import catchAsync from '../../utils/catchAsync';

const router = express.Router();

router.post(
  '/',
  catchAsync(async (req, res, next) => {
    if (!req.body.users) {
      console.log('Users param not sent with request');
      return res.sendStatus(400);
    }
    const users = JSON.parse(req.body.users);

    if (users.length === 0) {
      console('Users array is empty');
      return res.sendStatus(400);
    }

    users.push(req.session.user);

    const chatData = {
      users,
      isGroupChat: true,
    };

    const chats = await Chat.create(chatData);

    return res.status(200).send(chats);
  }),
);

router.get(
  '/',
  catchAsync(async (req, res, next) => {
    let results = await Chat.find({
      users: { $elemMatch: { $eq: req.session.user._id } },
    })
      .sort({ updatedAt: -1 })
      .populate('users')
      .populate('latestMessage');
    results = await User.populate(results, { path: 'latestMessage.sender' });
    if (req.query.unreadOnly !== undefined && req.query.unreadOnly === true) {
      results = results.filter(
        r => !r.latestMessage.readBy.includes(req.session.user._id),
      );
    }
    res.status(200).send(results);
  }),
);

router.get(
  '/:chatId',
  catchAsync(async (req, res, next) => {
    const results = await Chat.findOne({
      _id: req.params.chatId,
      users: { $elemMatch: { $eq: req.session.user._id } },
    }).populate('users');
    res.status(200).send(results);
  }),
);
router.get(
  '/:chatId/messages',
  catchAsync(async (req, res, next) => {
    const results = await Message.find({
      chat: req.params.chatId,
    }).populate('sender');
    res.status(200).send(results);
  }),
);

router.put(
  '/:chatId',
  catchAsync(async (req, res, next) => {
    const results = await Chat.findByIdAndUpdate(req.params.chatId, req.body);
    return res.sendStatus(204);
  }),
);

export default router;
