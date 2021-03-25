import express from 'express';
import path from 'path';
const bodyParser = require('body-parser');
import mongoose from 'mongoose';
const session = require('express-session');
import BusinessError from './exceptions/BusinessError';
import globalErrorHandler from './exceptions/errorHandler';
import db from './database';
//middlewares
import { requireLogin } from './middlewares/authMiddlewares';
//page routes
import loginRouter from './routes/loginRoutes';
import registerRouter from './routes/registerRoutes';
import logoutRouter from './routes/logoutRoutes';
import postRouter from './routes/postRoutes';
import profileRouter from './routes/profileRoutes';
import uploadsRouter from './routes/uploadRoutes';
import searchRouter from './routes/searchRoutes';
import messageRouter from './routes/messageRoutes';
import notificationsRouter from './routes/notificationsRoutes';
//api routes
import postsApiRouter from './routes/api/posts';
import usersApiRouter from './routes/api/users';
import chatsApiRouter from './routes/api/chats';
import messagesApiRouter from './routes/api/messages';
import notificationsApiRouter from './routes/api/notifications';

const app = express();

app.set('view engine', 'pug');
app.set('views', 'src/views');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: 'bbq chips',
    resave: true,
    saveUninitialized: false,
  }),
);

app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/logout', logoutRouter);
app.use('/posts', requireLogin, postRouter);
app.use('/profile', requireLogin, profileRouter);
app.use('/uploads', uploadsRouter);
app.use('/search', requireLogin, searchRouter);
app.use('/messages', requireLogin, messageRouter);
app.use('/notifications', requireLogin, notificationsRouter);

app.use('/api/posts', postsApiRouter);
app.use('/api/users', usersApiRouter);
app.use('/api/chats', chatsApiRouter);
app.use('/api/messages', messagesApiRouter);
app.use('/api/notifications', notificationsApiRouter);
app.get('/', requireLogin, (req, res, next) => {
  var payload = {
    pageTitle: 'Home',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };

  res.status(200).render('home', payload);
});

app.all('*', (req, res, next) => {
  next(new BusinessError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

const port = process.env.PORT || 5000;

const server = app.listen(port, () =>
  console.log('app is listening on port ' + port),
);

const io = require('socket.io')(server);

io.on('connection', socket => {
  socket.on('setup', userData => {
    socket.join(userData._id);
    socket.emit('connected');
  });
  socket.on('join room', room => socket.join(room));
  socket.on('typing', room => {
    socket.in(room).emit('typing');
  });
  socket.on('stop typing', room => {
    socket.in(room).emit('stop typing');
  });
  socket.on('notification recieved', room => {
    socket.in(room).emit('notification recieved');
  });
  socket.on('new message', newMessage => {
    const chat = newMessage.chat;
    if (!chat.users) return console.log('Chat.Users not defined');
    chat.users.forEach(user => {
      if (user._id === newMessage.sender._id) return;
      socket.in(user._id).emit('message recieved', newMessage);
    });
  });
});
