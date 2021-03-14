let cropper;
let timer;
const selectedUsers = [];

$(document).ready(() => {
  refreshMessageBadge();
  refreshNotificationsBadge();
});

$('#userSearchTextBox').keydown(event => {
  clearTimeout(timer);
  const textBox = $(event.target);
  let value = textBox.val();
  if (value === '' && event.which === 8) {
    selectedUsers.pop();
    updateSelectedUsersHtml();
    if (selectedUsers.length === 0) {
      $('#createChatButton').prop('disabled', true);
    }
    $('.resultsContainer').html('');
    return;
  }
  timer = setTimeout(() => {
    value = textBox.val().trim();
    searchUsers(value);
  }, 1000);
});

$('#postTextArea, #replyTextArea').keyup(event => {
  const textBox = $(event.target);

  const value = textBox.val().trim();
  const isModal = textBox.parents('.modal').length === 1;
  const submitButton = isModal
    ? $('#submitReplyButton')
    : $('#submitPostButton');

  if (submitButton.length == 0) return;

  if (value === '') {
    submitButton.prop('disabled', true);
    return;
  }
  submitButton.prop('disabled', false);
});

$('#submitPostButton,#submitReplyButton').click(event => {
  const button = $(event.target);
  const isModal = button.parents('.modal').length === 1;
  const textbox = isModal ? $('#replyTextArea') : $('#postTextArea');
  const data = {
    content: textbox.val(),
  };

  if (isModal) {
    const id = button.data().id;
    if (id === null) return alert('Button id is null');
    data.replyTo = id;
  }

  $.post('/api/posts', data, postData => {
    if (postData.replyTo) {
      emitNotification(postData.replyTo.postedBy);
      location.reload();
    } else {
      const html = createPostHtml(postData);

      $('.postsContainer').prepend(html);

      textbox.val('');
      button.prop('disabled', true);
    }
  });
});

$('#deletePostButton').click(event => {
  const postId = $(event.target).data('id');

  $.ajax({
    url: `/api/posts/${postId}`,
    type: 'DELETE',
    success: (data, status, xhr) => {
      if (xhr.status !== 204) {
        alert('Post not deleted , something went wrong try again');
        return;
      }
      location.reload();
    },
  });
});

$('#createChatButton').click(event => {
  const data = JSON.stringify(selectedUsers);
  $.post('/api/chats', { users: data }, chat => {
    if (!chat || !chat._id) return alert('Invalid response from server');
    window.location.href = `/messages/${chat._id}`;
  });
});

$('#pinPostButton').click(event => {
  const postId = $(event.target).data('id');

  $.ajax({
    url: `/api/posts/${postId}`,
    type: 'PUT',
    data: { pinned: true },
    success: (data, status, xhr) => {
      if (xhr.status !== 204) {
        alert('Post not pinned, something went wrong try again');
        return;
      }
      location.reload();
    },
  });
});
$('#unpinPostButton').click(event => {
  const postId = $(event.target).data('id');

  $.ajax({
    url: `/api/posts/${postId}`,
    type: 'PUT',
    data: { pinned: false },
    success: (data, status, xhr) => {
      if (xhr.status !== 204) {
        alert('Post not pinned, something went wrong try again');
        return;
      }
      location.reload();
    },
  });
});

$(document).on('click', '.likeButton', event => {
  const button = $(event.target);

  const postId = getPostIdFromElement(button);
  if (postId === undefined) {
    return;
  }
  $.ajax({
    url: `/api/posts/${postId}/like`,
    type: 'PUT',
    success: postData => {
      button.find('span').text(postData.likes.length || '');
      if (postData.likes.includes(userLoggedIn._id)) {
        button.addClass('active');
        emitNotification(postData.postedBy);
      } else {
        button.removeClass('active');
      }
    },
  });
});

$(document).on('click', '.retweetButton', event => {
  const button = $(event.target);

  const postId = getPostIdFromElement(button);
  if (postId === undefined) {
    return;
  }
  $.ajax({
    url: `/api/posts/${postId}/retweet`,
    type: 'POST',
    success: postData => {
      button.find('span').text(postData.retweetUsers.length || '');
      if (postData.retweetUsers.includes(userLoggedIn._id)) {
        button.addClass('active');
        emitNotification(postData.postedBy);
      } else {
        button.removeClass('active');
      }
    },
  });
});

$(document).on('click', '.post', event => {
  const element = $(event.target);
  const postId = getPostIdFromElement(element);
  if (postId !== undefined && !element.is('button') && !element.is('a')) {
    window.location.href = '/posts/' + postId;
  }
});

$(document).on('click', '.followButton', event => {
  const button = $(event.target);
  const userId = button.data().user;

  $.ajax({
    url: `/api/users/${userId}/follow`,
    type: 'PUT',
    success: (data, status, xhr) => {
      if (xhr.status === 404) {
        alert('User not found');
        return;
      }

      let difference = 1;

      if (data.following && data.following.includes(userId)) {
        button.addClass('following');
        button.text('following');
        emitNotification(userId);
      } else {
        button.removeClass('following');
        button.text('follow');
        difference = -1;
      }

      const followersLabel = $('#followersValue');
      console.log('Followers Label', followersLabel);
      if (followersLabel.length !== 0) {
        let followersText = parseInt(followersLabel.text());
        followersText = followersText + difference;
        followersLabel.text(followersText);
      }
    },
  });
});

$(document).on('click', '.notification.active', e => {
  const container = $(e.target);
  const notificationId = container.data().id;
  const href = container.attr('href');
  e.preventDefault();
  const callback = () => (window.location = href);
  markNotificationAsOpened(notificationId, callback);
});

$('#markNotificationsAsRead').click(() => markNotificationAsOpened());

$('#filePhoto').change(event => {
  const input = $(event.target)[0];
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const image = document.getElementById('imagePreview');
      image.src = e.target.result;
      image.alt = 'Image preview ';
      if (cropper !== undefined) {
        cropper.destroy();
      }
      cropper = new Cropper(image, {
        aspectRatio: 1 / 1,
        background: false,
      });
    };
    reader.readAsDataURL(input.files[0]);
  }
});

$('#coverPhoto').change(event => {
  const input = $(event.target)[0];

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const image = document.getElementById('coverPreview');
      image.src = e.target.result;
      image.alt = 'Cover photo preview ';
      if (cropper !== undefined) {
        cropper.destroy();
      }
      cropper = new Cropper(image, {
        aspectRatio: 16 / 9,
        background: false,
      });
    };
    reader.readAsDataURL(input.files[0]);
  }
});

$('#imageUploadButton').click(() => {
  const canvas = cropper.getCroppedCanvas();
  if (canvas === null) {
    alert('Could not upload image.Make sure it is an image file');
    return;
  }
  canvas.toBlob(blob => {
    const formData = new FormData();
    formData.append('croppedImage', blob);
    $.ajax({
      url: '/api/users/profilePicture',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: () => location.reload(),
    });
  });
});
$('#coverPhotoUploadButton').click(() => {
  const canvas = cropper.getCroppedCanvas();
  if (canvas === null) {
    alert('Could not upload image.Make sure it is an image file');
    return;
  }
  canvas.toBlob(blob => {
    const formData = new FormData();
    formData.append('croppedImage', blob);
    $.ajax({
      url: '/api/users/coverPhoto',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: () => location.reload(),
    });
  });
});

$('#replyModal').on('show.bs.modal', event => {
  const button = $(event.relatedTarget);
  const postId = getPostIdFromElement(button);
  $('#submitReplyButton').data('id', postId);
  $.get(`/api/posts/${postId}`, results => {
    outputPosts(results.postData, $('#originalPostContainer'));
  });
});
$('#deletePostModal').on('show.bs.modal', event => {
  const button = $(event.relatedTarget);
  const postId = getPostIdFromElement(button);
  $('#deletePostButton').data('id', postId);
});
$('#confirmPinModal').on('show.bs.modal', event => {
  const button = $(event.relatedTarget);
  const postId = getPostIdFromElement(button);
  $('#pinPostButton').data('id', postId);
});
$('#unpinModal').on('show.bs.modal', event => {
  const button = $(event.relatedTarget);
  const postId = getPostIdFromElement(button);
  $('#unpinPostButton').data('id', postId);
});

$('#replyModal').on('hidden.bs.modal', () =>
  $('#originalPostContainer').html(''),
);

function getPostIdFromElement(element) {
  const isRoot = element.hasClass('post');
  const rootElement = isRoot ? element : element.closest('.post');
  const postId = rootElement.data().id;
  return postId;
}

const createPostHtml = (postData, largeFont = false) => {
  const isRetweet = postData && postData.retweetData !== undefined;
  const retweetedBy = isRetweet ? postData && postData.postedBy.username : null;
  postData = isRetweet ? postData && postData.retweetData : postData;

  const postedBy = postData && postData.postedBy;

  const displayName = postedBy && postedBy.firstname + postedBy.lastname;
  const timestamp = timeDifference(new Date(), new Date(postData.createdAt));
  const likeButtonActiveClass = postData.likes.includes(userLoggedIn._id)
    ? 'active'
    : '';
  const retweetButtonActiveClass = postData.retweetUsers.includes(
    userLoggedIn._id,
  )
    ? 'active'
    : '';
  let retweetText = '';
  if (isRetweet) {
    retweetText = `<span> <i class="fas fa-retweet"></i>Retweeted by <a href="/profile/${retweetedBy}">${retweetedBy}</a></span>`;
  }

  let replyFlag = '';

  if (postData.replyTo && postData.replyTo._id) {
    if (!postData.replyTo._id) {
      alert('replyTo field is not populated');
    } else if (!postData.replyTo.postedBy._id) {
      alert('postedby is not populated');
    }
    const replyToUsername = postData.replyTo.postedBy.username;
    replyFlag = `<div class="replyFlag">
                         Replying to <a href="/profile/${replyToUsername}">@${replyToUsername}</a>
                     </div>`;
  }

  const largeFontClass = largeFont ? 'largeFont' : '';

  let buttons = '';
  let pinnedPostText = '';
  let pinDataTarget = '#confirmPinModal';

  if (postData.postedBy._id === userLoggedIn._id) {
    let pinnedClass = '';

    if (postData.pinned === true) {
      pinDataTarget = '#unpinModal';
      pinnedClass = 'active';
      pinnedPostText = `<i class="fas fa-thumbtack"></i> <span>Pinned post</span>`;
    }

    buttons = `
    <button class="pinButton ${pinnedClass}" data-id="${postData._id}" data-toggle="modal" data-target="${pinDataTarget}"><i class="fas fa-thumbtack"></i></button>
    <button data-id="${postData._id}" data-toggle="modal" data-target="#deletePostModal"><i class="fas fa-times"></i></button>`;
  }

  return `
      <div class="post ${largeFontClass}" data-id=${postData._id}>
      <div class="postActionContainer">${retweetText}</div>
          <div class="mainContentContainer">
               <div class="userImageContainer">
                   <img src=${postedBy.profilepic} alt="users profile pic"/>
               </div>
               <div class="postContentContainer">
               <div class="pinnedPostText">${pinnedPostText}</div>
                   <div class="header">
                       <a href="/profile/${
                         postedBy.username
                       }" class="displayName">${displayName}</a>
                       <span class="username">@${postedBy.username}</span>
                       <span class="date">${timestamp}</span>
                       ${buttons}
                   </div>
                   ${replyFlag}
                   <div class="postBody">
                   ${postData.content}
                   </div>
                   <div class="postFooter">
                      <div class="postButtonContainer">
                         <button data-toggle="modal" data-target="#replyModal">
                            <i class="far fa-comment"></i>
                         </button>
                      </div>
                      <div class="postButtonContainer green">
                         <button class="retweetButton ${retweetButtonActiveClass}">
                            <i class="fas fa-retweet"></i>
                             <span>${postData.retweetUsers.length || ''}</span>
                         </button>
                      </div>
                      <div class="postButtonContainer red">
                         <button class="likeButton ${likeButtonActiveClass}">
                            <i class="far fa-heart"></i>
                            <span>${postData.likes.length || ''}</span>
                         </button>
                      </div>
                   </div>
               </div>
          </div>
      </div>
  `;
};

function timeDifference(current, previous) {
  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;

  if (elapsed < msPerMinute) {
    if (elapsed / 1000 < 30) {
      return 'just now';
    }
    return Math.round(elapsed / 1000) + ' seconds ago';
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + ' minutes ago';
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + ' hours ago';
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + ' days ago';
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + ' months ago';
  } else {
    return Math.round(elapsed / msPerYear) + ' years ago';
  }
}

function outputPosts(results, container) {
  container.html('');

  if (!Array.isArray(results)) {
    results = [results];
  }

  results.forEach(result => {
    const html = createPostHtml(result);
    container.append(html);
  });

  if (results.length === 0) {
    container.append(`<span class="noResults">Nothing to show</span>`);
  }
}

const outputPostsWithReplies = (results, container) => {
  container.html('');

  if (results.replyTo !== undefined && results.replyTo._id !== undefined) {
    const html = createPostHtml(results.replyTo);
    container.append(html);
  }

  const mainPostHtml = createPostHtml(results.postData, true);
  container.append(mainPostHtml);
  results.replies.forEach(result => {
    const html = createPostHtml(result);
    container.append(html);
  });
};

const outputUsers = (results, container) => {
  container.html('');
  results.forEach(result => {
    const html = createUsersHtml(result, true);
    container.append(html);
  });
  if (results.length === 0) {
    container.append('<span class="noResults">No Results Found</span>');
  }
};

const createUsersHtml = (userData, showFollowButton) => {
  const name = userData.firstname + ' ' + userData.lastname;
  const isFollowing =
    userLoggedIn.following && userLoggedIn.following.includes(userData._id);
  const text = isFollowing ? 'Following' : 'Follow';
  const buttonClass = isFollowing ? `followButton following` : 'followButton';

  let followButton = '';
  if (showFollowButton && userLoggedIn._id !== userData._id) {
    followButton = `<div class='followButtonContainer'>
                        <button class="${buttonClass}" data-user=${userData._id}>${text}</button>
                     </div>
    `;
  }
  return `
              <div class="user">
                  <div class="userImageContainer">
                    <img src="http://localhost:5000/${userData.profilepic}" alt="Users profile photo"/>
                  </div>
                  <div class="userDetailsContainer">
                  <div class="header">
                    <a href="/profile/${userData.username}">${name}</a>
                    <span class="username">@${userData.username}</span>
                  </div>
                  </div>
                  ${followButton}
              </div>

       `;
};

const searchUsers = searchTerm => {
  $.get('/api/users', { search: searchTerm }, results => {
    outputSelectableUsers(results, $('.resultsContainer'));
  });
};

const outputSelectableUsers = (results, container) => {
  container.html('');
  results.forEach(result => {
    if (
      result._id === userLoggedIn._id ||
      selectedUsers.some(u => u._id === result._id)
    ) {
      return;
    }
    const html = createUsersHtml(result, false);
    const element = $(html);
    element.click(() => userSelected(result));
    container.append(element);
  });
  if (results.length === 0) {
    container.append('<span class="noResults">No Results Found</span>');
  }
};

const userSelected = user => {
  selectedUsers.push(user);
  updateSelectedUsersHtml();
  $('#userSearchTextBox').val('').focus();
  $('.resultsContainer').html('');
  $('#createChatButton').prop('disabled', false);
};

const updateSelectedUsersHtml = () => {
  const elements = [];
  selectedUsers.forEach(user => {
    const name = user.firstname + ' ' + user.lastname;
    const userElement = `<span class="selectedUser">${name}</span>`;
    elements.push(userElement);
  });
  $('.selectedUser').remove();
  $('#selectedUsers').prepend(elements);
};

const getChatName = chatData => {
  let chatName = chatData.chatName;

  if (!chatName) {
    const otherChatUsers = getOtherChatUsers(chatData.users);

    const namesArray = otherChatUsers.map(
      user => user.firstname + ' ' + user.lastname,
    );
    chatName = namesArray.join(', ');
  }
  return chatName;
};

const getOtherChatUsers = users => {
  if (users.length === 1) return users;
  return users.filter(user => user._id !== userLoggedIn._id);
};

const messageRecieved = newMessage => {
  if ($('.chatContainer').length === 0) {
    // Not on chat page , show popup notification
  } else {
    addChatMessageHtml(newMessage);
  }
  refreshMessageBadge();
};

const markNotificationAsOpened = (notificationId = null, callback = null) => {
  if (callback === null) callback = () => location.reload();
  const url =
    notificationId !== null
      ? `/api/notifications/${notificationId}/markAsOpened`
      : `/api/notifications/markAsOpened`;
  $.ajax({
    url: url,
    type: 'PUT',
    success: callback,
  });
};

const refreshMessageBadge = () => {
  $.get('/api/chats', { unreadOnly: true }, data => {
    const numResults = data.length;
    if (numResults > 0) {
      $('#messagesBadge').text(numResults).addClass('active');
    } else {
      $('#messagesBadge').text('').removeClass('active');
    }
  });
};
const refreshNotificationsBadge = () => {
  $.get('/api/notifications', { unreadOnly: true }, data => {
    const numResults = data.length;
    if (numResults > 0) {
      $('#notificationsBadge').text(numResults).addClass('active');
    } else {
      $('#notificationsBadge').text('').removeClass('active');
    }
  });
};

const outputNotificationsList = (notifications, container) => {
  notifications.forEach(notification => {
    const html = createNotificationHtml(notification);
    container.append(html);
  });

  if (notifications.length === 0) {
    return `<span class="noResults">Nothing to show</span>`;
  }
};

const createNotificationHtml = notification => {
  const userFrom = notification.userFrom;
  const text = getNotificationText(notification);
  const href = getNotificationUrl(notification);
  const className = notification.opened ? '' : 'active';

  return `
    
    <a href="${href}" class="resultListItem notification ${className}" data-id="${notification._id}" >
          <div class="resultsImageContainer">
              <img src="/${userFrom.profilepic}" alt="Other Users Profile pic"/>
          </div>
        <div class="resultsDetailsContainer ellipsis">
            ${text}
        </div>
    </a>
    
    
    `;
};

const getNotificationText = notification => {
  const userFrom = notification.userFrom;

  if (!userFrom.firstname || !userFrom.lastname) {
    return alert('User from data not populated');
  }

  const userFromName = `${userFrom.firstname} ${userFrom.lastname}`;

  let text;

  if (notification.notificationType === 'retweet') {
    text = `${userFromName} retweeted one of your posts`;
  }
  if (notification.notificationType === 'postLike') {
    text = `${userFromName} liked one of your posts`;
  }
  if (notification.notificationType === 'reply') {
    text = `${userFromName} replied to one of your posts`;
  }
  if (notification.notificationType === 'follow') {
    text = `${userFromName} followed you`;
  }
  return `<span class="ellipsis">${text}</span>`;
};

const getNotificationUrl = notification => {
  let url = '#';

  if (
    notification.notificationType === 'retweet' ||
    notification.notificationType === 'postLike' ||
    notification.notificationType === 'reply'
  ) {
    url = `/posts/${notification.entityId}`;
  }

  if (notification.notificationType === 'follow') {
    url = `/profile/${notification.entityId}`;
  }
  return url;
};

const showNotificationPopup = data => {
  const html = createNotificationHtml(data);
  const element = $(html);
  element.prependTo($('#notificationList'));
  setTimeout(() => element.fadeOut(400), 5000);
};
