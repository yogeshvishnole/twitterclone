let connected = false;

const socket = io('http://localhost:5000');
socket.emit('setup', userLoggedIn);

socket.on('connected', () => (connected = true));
socket.on('message recieved', newMessage => {
  messageRecieved(newMessage);
});

socket.on('notification recieved', () => {
  $.get('/api/notifications/latest', notificationData => {
    showNotificationPopup(notificationData);
    refreshNotificationsBadge();
  });
});

const emitNotification = userId => {
  if (userId === userLoggedIn._id) return;
  socket.emit('notification recieved', userId);
};
