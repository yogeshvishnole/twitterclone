$('document').ready(() => {
  if (selectedTab === 'followers') {
    loadFollowers();
  } else {
    loadFollowing();
  }
});

const loadFollowers = () => {
  $.get(`/api/users/${profileUserId}/followers`, results => {
    outputUsers(results.followers, $('.resultsContainer'));
  });
};
const loadFollowing = () => {
  $.get(`/api/users/${profileUserId}/following`, results => {
    outputUsers(results.following, $('.resultsContainer'));
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
                    <img src=${userData.profilepic} alt="Users profile photo"/>
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
