let typing = false;
let lastTypingTime;

$(document).ready(() => {
  socket.emit('join room', chatId);
  socket.on('typing', () => $('.typingDots').show());
  socket.on('stop typing', () => $('.typingDots').hide());

  $.get(`/api/chats/${chatId}`, data => $('#chatName').text(getChatName(data)));
  $.get(`/api/chats/${chatId}/messages`, data => {
    let messages = [];
    let lastSenderId = '';
    data.forEach((message, index) => {
      const html = createMessageHtml(message, data[index + 1], lastSenderId);
      messages.push(html);
      lastSenderId = message.sender._id;
    });
    const messagesHtml = messages.join('');
    addMessagesHtmlToPage(messagesHtml);
    scrollToBottom(false);
    $('.loadingSpinnerContainer').remove();
    $('.chatContainer').css('visibility', 'visible');
  });
});

$('#chatNameButton').click(() => {
  const chatNameValue = $('#chatNameTextBox').val().trim();
  $.ajax({
    url: '/api/chats/' + chatId,
    method: 'PUT',
    data: { chatName: chatNameValue },
    success: (data, status, xhr) => {
      if (xhr.status !== 204) {
        alert('could not update');
      } else {
        location.reload();
      }
    },
  });
});

$('.sendMessageButton').click(() => {
  messageSubmitted();
});

$('.inputTextBox').keydown(event => {
  updateTyping();
  if (event.which === 13 && !event.shiftKey) {
    messageSubmitted();
    return false;
  }
});

const updateTyping = () => {
  if (!connected) return;
  if (!typing) {
    typing = true;
    socket.emit('typing', chatId);
  }

  lastTypingTime = new Date().getTime();
  const timerLength = 3000;

  setTimeout(() => {
    let timeNow = new Date().getTime();
    let timeDiff = timeNow - lastTypingTime;

    if (timeDiff >= timerLength && typing) {
      socket.emit('stop typing', chatId);
      typing = false;
    }
  }, timerLength);
};

const messageSubmitted = () => {
  const content = $('.inputTextBox').val().trim();
  if (content !== '') {
    sendMessage(content);
    $('.inputTextBox').val('');
    socket.emit('stop typing', chatId);
    typing = false;
  }
};

const sendMessage = content => {
  $.post('/api/messages/', { content, chatId: chatId }, (data, status, xhr) => {
    if (xhr.status !== 201) {
      alert('Could not send message');
      $('.inputTextBox').val(content);
      return;
    }
    addChatMessageHtml(data);
    if (connected) {
      socket.emit('new message', data);
    }
  });
};

const addMessagesHtmlToPage = html => {
  $('.chatMessages').append(html);
};

const addChatMessageHtml = message => {
  if (!message || !message._id) {
    alert('Message is not valid');
    return;
  }
  const messageDiv = createMessageHtml(message, null, '');
  addMessagesHtmlToPage(messageDiv);
  scrollToBottom(true);
};

const createMessageHtml = (message, nextMessage, lastSenderId) => {
  const sender = message.sender;
  const senderName = sender.firstname + ' ' + sender.lastname;

  const currentSenderId = sender._id;
  const nextSenderId =
    nextMessage !== null && nextMessage !== undefined
      ? nextMessage.sender._id
      : '';

  const isFirst = lastSenderId !== currentSenderId;
  const isLast = nextSenderId !== currentSenderId;

  const isMine = message.sender._id === userLoggedIn._id;
  let liClassName = isMine ? 'mine' : 'theirs';
  let nameElement = '';
  let profileImage = '';
  let imageContainer = '';

  if (isFirst) {
    liClassName += ' first';
    if (!isMine) {
      nameElement = `<span class="senderName">${senderName}</span>`;
    }
  }

  if (isLast) {
    liClassName += ' last';
    profileImage = `<img src="http://localhost:5000/${sender.profilepic}" />`;
  }

  if (!isMine) {
    imageContainer = `
                         <div class="imageContainer">
                             ${profileImage}
                         </div>
      `;
  }

  return `
            <li class="message ${liClassName}">
            ${imageContainer}
               <div class="messageContainer">
               ${nameElement}
                   <span class="messageBody">
                      ${message.content}
                   </span>
               </div>
            </li>
  `;
};

const scrollToBottom = animated => {
  const container = $('.chatMessages');
  const scrollHeight = container[0].scrollHeight;
  if (animated) {
    container.animate({ scrollTop: scrollHeight }, 'slow');
  } else {
    container.scrollTop(scrollHeight);
  }
};
