import express from 'express';
import catchAsync from '../../utils/catchAsync';
import Notification from '../../models/notificationModel';
const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res, next) => {
    const searchObj = {
      userTo: req.session.user._id,
      notificationType: { $ne: 'newMessage' },
    };

    if (req.query.unreadOnly !== undefined && req.query.unreadOnly === true) {
      searchObj.opened = false;
    }

    const results = await Notification.find(searchObj)
      .populate('userTo')
      .populate('userFrom')
      .sort({ createdAt: -1 });
    res.status(200).send(results);
  }),
);
router.get(
  '/latest',
  catchAsync(async (req, res, next) => {
    const results = await Notification.findOne({ userTo: req.session.user._id })
      .populate('userTo')
      .populate('userFrom')
      .sort({ createdAt: -1 });
    res.status(200).send(results);
  }),
);

router.put(
  '/:id/markAsOpened',
  catchAsync(async (req, res, next) => {
    await Notification.findByIdAndUpdate(req.params.id, { opened: true });
    res.sendStatus(204);
  }),
);
router.put(
  '/markAsOpened',
  catchAsync(async (req, res, next) => {
    await Notification.updateMany(
      { userTo: req.session.user._id },
      { opened: true },
    );
    res.sendStatus(204);
  }),
);

export default router;
