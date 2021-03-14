import express from 'express';
import path from 'path';
const router = express.Router();

router.get('/images/:path', (req, res, next) => {
  res.sendFile(path.join(__dirname, '../../uploads/images/' + req.params.path));
});

export default router;
