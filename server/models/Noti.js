// notification model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  userGroup: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
      status: {
        type: String,
        enum: ['unread', 'read', 'pending', 'accepted', 'declined'],
        default: 'unread'
      },
      readAt: { type: Date, default: null }
    }
  ],
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who caused this
  message: { type: String, required: true },
  type: { type: String, required: true }, // no enum for max flexibility
  relatedEntityType: { type: String }, // e.g. 'task', 'subTask', etc.
  relatedEntityId: { type: mongoose.Schema.Types.ObjectId }, // universal linking
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
  isActionable: { type: Boolean, default: false },
  dueDate: Date,
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;