import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/chatModel';
import User from '../models/userModel';

const router = express.Router();

router.get('/', (req, res, next) => {
  const payload = {
    pageTitle: 'Inbox',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };
  res.status(200).render('inboxPage', payload);
});

router.get('/new', (req, res, next) => {
  const payload = {
    pageTitle: 'New messages',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };
  res.status(200).render('newMessage', payload);
});

router.get('/:chatId', async (req, res, next) => {
  const chatId = req.params.chatId;
  const userId = req.session.user._id;
  const isValidId = mongoose.isValidObjectId(chatId);

  const payload = {
    pageTitle: 'Chat',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };

  if (!isValidId) {
    payload.errorMessage =
      'Chat does not exist or you do not have permission to view it';
    return res.status(200).render('chatPage', payload);
  }

  let chat = await Chat.findOne({
    _id: chatId,
    users: { $elemMatch: { $eq: userId } },
  }).populate('users');

  if (chat === null) {
    const userFound = await User.findById(chatId);
    if (userFound !== null) {
      chat = await getChatByUserId(userId, userFound._id);
    }
  }

  if (chat === null) {
    payload.errorMessage =
      'Chat does not exist or you do not have permission to view it';
  } else {
    payload.chat = chat;
  }

  res.status(200).render('chatPage', payload);
});

const getChatByUserId = async (userLoggedInId, otherUserId) => {
  return await Chat.findOneAndUpdate(
    {
      isGroupChat: false,
      users: {
        $size: 2,
        $all: [
          { $elemMatch: { $eq: mongoose.Types.ObjectId(userLoggedInId) } },
          { $elemMatch: { $eq: mongoose.Types.ObjectId(otherUserId) } },
        ],
      },
    },
    {
      $setOnInsert: {
        users: [userLoggedInId, otherUserId],
      },
    },
    {
      new: true,
      upsert: true,
    },
  ).populate('users');
};

export default router;
