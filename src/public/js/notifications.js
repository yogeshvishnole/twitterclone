$(document).ready(() => {
  $.get('/api/notifications/', data =>
    outputNotificationsList(data, $('.resultsContainer')),
  );
});
