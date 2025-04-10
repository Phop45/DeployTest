// project Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const collaboratorSchema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { 
        type: String, 
        enum: ['owner', 'reporter', 'member', 'guest'], 
        default: 'member'
    },
    joinDate: { type: Date, default: Date.now }
});

const spaceSchema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    projectName: {
        type: String,
        required: true
    },
    projectDetail: {
        type: String
    },
    projectDueDate: {
        type: Date,
        default: null
    },
    collaborators: [collaboratorSchema],
    deleted: { 
        type: Boolean, 
        default: false 
    },
    deletedAt: { 
        type: Date, 
        default: null 
    },
    projectCover: {
        type: String,
        default: "https://res.cloudinary.com/dibbpr0zu/image/upload/v1743406589/defultBackground_vjda8s.jpg"
    },
}, {
    timestamps: true 
});

const Spaces = mongoose.model('Spaces', spaceSchema);
module.exports = Spaces;