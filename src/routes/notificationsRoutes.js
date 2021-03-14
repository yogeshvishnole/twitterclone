import express from 'express';

const router = express.Router();

router.get('/', (req, res, next) => {
  const payload = {
    pageTitle: 'Notifications',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };
  res.status(200).render('notificationsPage', payload);
});

export default router;
