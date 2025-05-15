// Task Models
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attachmentSchema = new Schema({
    path: { type: String, required: true }, // File storage path (Local/GridFS/S3)
    originalName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }, // Upload timestamp
    fileSize: { type: Number, required: true }, // File size in bytes
    fileType: { type: String, required: true }, // File MIME type (e.g., "application/pdf", "image/png")
    previewPath: { type: String },
    uploadedBy: { type: Schema.ObjectId, ref: 'User', required: true }, 
    taskId: { type: Schema.ObjectId, ref: 'Tasks' },
    subtaskId: { type: Schema.ObjectId, ref: 'SubTask' },
    
    attachmentType: { 
        type: String, 
        enum: ['taskAttachment', 'userSubmission', 'commentAttachment'], 
        required: true 
    }
});

const commentSchema = new Schema({
    text: { type: String },
    createdBy: { type: Schema.ObjectId, ref: 'User', required: true },
    parentComment: { type: Schema.ObjectId, ref: 'Comment' },
    replies: [{ type: Schema.ObjectId, ref: 'Comment' }],
    attachments: [attachmentSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    deleted: { type: Boolean, default: false }
});

const activityLogSchema = new Schema({
    text: { type: String },
    type: { type: String, enum: ['action'], default: 'action' },
    details: {
        fieldChanged: { type: String },
        oldValue: { type: Schema.Types.Mixed }, 
        newValue: { type: Schema.Types.Mixed },
        whoChange: { type: String },
    },
    createdBy: { type: Schema.ObjectId, ref: 'User' },
    userId: { type: Schema.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false },
});

const taskSchema = new Schema({
    user: { type: Schema.ObjectId, ref: 'User', required: true },
    project: { type: Schema.ObjectId, ref: 'Spaces', required: true },
    taskName: {
        type: String,
        required: true,
    },
    taskDetail: {
        type: String,
        default: "",
    },
    startDate: {
        type: Date,
        default: null
    },
    dueDate: {
        type: Date,
        default: null
    },
    dueTime: {
        type: String,
        validate: {
            validator: function (v) {
                return v === null || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
            },
            message: props => `${props.value} is not a valid time! Expected format is HH:mm.`
        }
    },
    taskStatus: {
        type: String,
        enum: ['inProgress', 'pending', 'fix', 'finished'],
        default: 'inProgress',
        required: true,
    },      
    taskPriority: {
        type: String,
        enum: ['urgent', 'normal', 'low'],
        default: 'normal'
    },
    taskTags: [{
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tag' },
        tagName: { type: String },
        color: { type: String }
    }],
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: {
        type: Date,
        default: null,
      },      
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubTask' }],

    activityLogs: [activityLogSchema],
    attachments: [attachmentSchema],
    comment:[commentSchema],
    deleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

const Task = mongoose.model('Tasks', taskSchema);
module.exports = Task;