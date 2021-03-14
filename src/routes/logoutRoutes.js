import express from 'express';

const router = express.Router();

router.get('/', (req, res, next) => {
  if (req.session) {
    req.session.destroy(() => {
      return res.redirect('/login');
    });
  }
});

export default router;
