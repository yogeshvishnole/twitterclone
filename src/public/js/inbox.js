$(document).ready(() => {
  $.get('/api/chats', (data, status, xhr) => {
    if (xhr.status === 400) {
      alert('Do not get chat list');
      return;
    } else {
      outputChatList(data, $('.resultsContainer'));
    }
  });
});

const outputChatList = (chatList, container) => {
  container.html('');
  chatList.forEach(chat => {
    const html = createChatHtml(chat);
    container.append(html);
  });
  if (chatList.length === 0) {
    container.append(`<span class="noResults">Nothing to show.</span>`);
  }
};

const createChatHtml = chatData => {
  const chatName = getChatName(chatData);
  const image = getChatImageElements(chatData);
  const latestMessage = getLatestMessage(chatData.latestMessage);

  return `<a href="/messages/${chatData._id}" class="resultListItem">
  ${image}
     <div class="resultsDetailsContainer ellipsis">
             <span class="heading ellipsis">${chatName}</span>
             <span class="subtext ellipsis">${latestMessage}</span>
     </div>
  </a>`;
};

const getLatestMessage = latestMessage => {
  if (latestMessage !== undefined) {
    const sender = latestMessage.sender;
    return `${sender.firstname} ${sender.lastname}: ${latestMessage.content}`;
  }
  return 'new chat';
};

const getChatImageElements = chatData => {
  const otherChatUsers = getOtherChatUsers(chatData.users);
  let groupChatClass = '';
  let chatImage = getUserChatImageElement(otherChatUsers[0]);
  if (otherChatUsers.length > 1) {
    groupChatClass = 'groupChatImage';
    chatImage += getUserChatImageElement(otherChatUsers[1]);
  }
  return `<div class="resultsImageContainer ${groupChatClass}">${chatImage}</div>`;
};

const getUserChatImageElement = user => {
  if (!user || !user.profilepic) {
    return alert('User passed into the function is invalid ');
  }
  return `<img src="${user.profilepic}" alt="Users profile pic" />`;
};
