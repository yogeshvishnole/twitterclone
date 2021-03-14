import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    userTo: { type: Schema.Types.ObjectId, ref: 'User' },
    userFrom: { type: Schema.Types.ObjectId, ref: 'User' },
    notificationType: String,
    opened: { type: Boolean, default: false },
    entityId: Schema.Types.ObjectId,
  },
  {
    timestamps: true,
  },
);

notificationSchema.statics.insertNotification = async (
  userTo,
  userFrom,
  notificationType,
  entityId,
) => {
  const data = { userTo, userFrom, notificationType, entityId };
  await Notification.deleteOne(data);
  await Notification.create(data);
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
