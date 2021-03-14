import express from 'express';
import Post from '../models/postModel';
import User from '../models/userModel';
import catchAsync from '../utils/catchAsync';

const router = express.Router();

router.get('/', (req, res, next) => {
  const payload = createPayload(req);
  return res.status(200).render('searchPage', payload);
});
router.get('/:selectedTab', (req, res, next) => {
  const payload = createPayload(req);
  payload.selectedTab = req.params.selectedTab;
  return res.status(200).render('searchPage', payload);
});

const createPayload = req => {
  return {
    pageTitle: 'Search',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };
};

export default router;
