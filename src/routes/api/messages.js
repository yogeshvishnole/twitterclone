import express from 'express';
import catchAsync from '../../utils/catchAsync';
import Message from '../../models/messageModel';
import Chat from '../../models/chatModel';
import User from '../../models/userModel';
import Notification from '../../models/notificationModel';
const router = express.Router();

router.post(
  '/',
  catchAsync(async (req, res, next) => {
    if (!req.body.content || !req.body.chatId) {
      console.log('Invalid data is passed into the request');
      return res.sendStatus(400);
    }

    const newMessage = {
      sender: req.session.user._id,
      content: req.body.content,
      chat: req.body.chatId,
    };

    let message = await Message.create(newMessage);
    message = await message.populate('sender').execPopulate();
    message = await message.populate('chat').execPopulate();
    message = await User.populate(message, { path: 'chat.users' });

    const chat = await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message,
    });

    chat.users.forEach(userId => {
      console.log(userId, message.sender._id.toString());
      if (userId == message.sender._id.toString()) return;
      Notification.insertNotification(
        userId,
        message.sender._id,
        'newMessage',
        message.chat._id,
      );
    });
    return res.status(201).send(message);
  }),
);

export default router;
