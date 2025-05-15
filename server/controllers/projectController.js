//project Controller
const Spaces = require('../models/Space');
const Space = require('../models/Space');
const User = require('../models/User');
const Status = require('../models/Status');
const Notification = require('../models/Noti');
const mongoose = require("mongoose");
const moment = require("moment");
const multer = require("multer");
const path = require("path");
const Task = require('../models/Task');
const { sendSpaceMemberAddedEmail }= require('../../emailService');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
moment.locale('th');

exports.allProjectPage = async (req, res) => {
    try {
        const userId = mongoose.Types.ObjectId(req.user.id);

        // Fetch spaces
        let spaces = await Spaces.find({
            $or: [
                { user: userId },
                { collaborators: { $elemMatch: { user: userId } } }
            ],
            deleted: false, 
        })
            .populate('user', 'firstName profileImage')
            .populate('collaborators.user', 'firstName profileImage')
            .sort({ createdAt: -1 })
            .lean();

        // Ensure each space has a valid project cover
        for (const space of spaces) {
            // Ensure each space has a valid project cover
            if (!space.projectCover || typeof space.projectCover !== "string") {
                space.projectCover = 'https://res.cloudinary.com/dibbpr0zu/image/upload/v1743406589/defultBackground_vjda8s.jpg';
            } else if (!space.projectCover.startsWith('http')) {
                space.projectCover = 'https://res.cloudinary.com/dibbpr0zu/image/upload/v1743406589/defultBackground_vjda8s.jpg';
            }

            // Task Count
            const taskCount = await Task.countDocuments({ project: space._id, deleteAt: null });
            space.taskCount = taskCount;

            // Assigned Users Task Count
            let assignedUserstaskCount = {};
            for (const collaborator of space.collaborators || []) {
                if (collaborator.user && collaborator.user._id) {
                    // Get all tasks assigned to each collaborator in the space
                    const taskCountForUser = await Task.countDocuments({
                        project: space._id,
                        assignedUsers: collaborator.user._id,
                        deleteAt: null
                    });
                    assignedUserstaskCount[collaborator.user._id] = taskCountForUser;
                }
            }
            space.assignedUserstaskCount = assignedUserstaskCount;
        }

        // Convert createdAt to ISO string
        spaces.forEach(space => {
            if (!space.createdAt) {
                console.warn(`Missing createdAt for space: ${space.projectName}`);
                space.createdAt = new Date(); // Default to the current date if missing
            } else if (typeof space.createdAt === 'string') {
                space.createdAt = new Date(space.createdAt); // Convert string to Date
            }

            // Ensure it's a valid Date object before calling toISOString
            if (space.createdAt instanceof Date && !isNaN(space.createdAt)) {
                space.createdAt = space.createdAt.toISOString();
            } else {
                space.createdAt = new Date().toISOString(); // Default to the current date if invalid
            }
        });

        console.log('Unread Count:', res.locals.unreadCount);
        
        // Fetch notifications with space populated
        const notifications = await Notification.find({ user: userId, status: 'unread' })
            .populate('user', 'username profileImage')
            .populate('space', 'projectName')
            .populate('leader', 'profileImage') // Populate the leader field
            .sort({ createdAt: -1 }) // Order by most recent
            .lean();
        const unreadCount = notifications.length;

        res.render("project/allProject", {
            spaces,
            user: req.user,
            notifications,
            unreadCount,
            layout: "../views/layouts/project"
        });
    } catch (error) {
        console.error("Error fetching spaces:", error);
        res.status(500).send("Internal Server Error");
    }
};

// create project controller
exports.createProject = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const userId = mongoose.Types.ObjectId(req.user.id);
            const spaces = await Spaces.find({
                $or: [
                    { user: userId },
                    { collaborators: { $elemMatch: { user: userId } } }
                ],
                deleted: false
            })
                .populate('user', 'firstName lastName profileImage')
                .populate('collaborators.user', 'firstName lastName profileImage')
                .lean();

            const notifications = await Notification.find({ user: userId, status: 'unread' })
                .populate('user', 'firstName lastName profileImage')
                .populate('space', 'projectName')
                .populate('leader', 'profileImage')
                .sort({ createdAt: -1 })
                .lean();
            const unreadCount = notifications.length;
            const errorMessage = req.flash('error');

            res.render("project/createProject", {
                spaces,
                user: req.user,
                layout: "../views/layouts/project",
                notifications,
                unreadCount,
                errorMessage: errorMessage.length > 0 ? errorMessage[0] : null,
            });
        } catch (error) {
            console.error("Error fetching spaces or notifications:", error);
            res.status(500).send("Internal Server Error");
        }
    } else if (req.method === 'POST') {
        try {
            const { projectName, projectDetail, members, dueDate } = req.body;

            // Fetch user details
            const userDetails = await User.findById(req.user.id).select('firstName lastName').lean();
            if (!userDetails) {
                req.flash('error', 'User details not found.');
                return res.redirect('/createProject');
            }

            const userId = mongoose.Types.ObjectId(req.user.id);

            // Check for existing project with the same name
            const existingProject = await Spaces.findOne({
                projectName: projectName.trim(),
                $or: [
                    { user: userId },
                    { collaborators: { $elemMatch: { user: userId } } }
                ],
                deleted: false,
            });
            if (existingProject) {
                req.flash("error", "A project with this name already exists.");
                return res.redirect("/createProject");
            }

            // Parse due date if provided
            let parsedDueDate = null;
            if (dueDate) {
                const tempDate = new Date(dueDate);
                if (!isNaN(tempDate.getTime())) {
                    parsedDueDate = tempDate;
                }
            }

            // Upload project cover or use default
            let projectCoverUrl = 'https://res.cloudinary.com/dibbpr0zu/image/upload/v1743406589/defultBackground_vjda8s.jpg';
            if (req.file) {
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'projectCovers',
                    transformation: [{ width: 800, height: 600, crop: 'limit' }]
                });
                projectCoverUrl = result.secure_url;
            }

            // Create the new project
            const newSpace = new Spaces({
                projectName,
                projectDetail: projectDetail?.trim() || "",
                projectDueDate: parsedDueDate,
                collaborators: [
                    {
                        user: req.user.id,
                        role: "owner",
                    },
                ],
                projectCover: projectCoverUrl,
            });

            // Add members and send notifications
            if (members) {
                const memberList = JSON.parse(members);
                const userGroup = [];

                for (const member of memberList) {
                    if (!newSpace.collaborators.some((collab) => collab.user.toString() === member.id)) {
                        newSpace.collaborators.push({
                            user: member.id,
                            role: "member",
                        });

                        userGroup.push({ user: member.id, status: "unread" });

                        // Send email notification
                        const userToNotify = await User.findById(member.id);
                        if (userToNotify) {
                            const spaceDetailLink = `https://deploytest-8mln.onrender.com/space/item/${newSpace._id}/dashboard?period=7day`;
                            const emailMessage = `คุณได้รับเชิญเข้าร่วมโปรเจกต์ "${projectName}" ในบทบาท "สมาชิก"`;
                            await sendSpaceMemberAddedEmail(userToNotify, newSpace, spaceDetailLink, emailMessage);
                        }
                    }
                }

                // Create notification for members
                const notificationMessage = `${userDetails.firstName}${userDetails.lastName} ได้เพิ่มคุณเข้าโปรเจกต์ ${projectName} แล้ว`;
                const notification = new Notification({
                    userGroup,
                    triggeredBy: req.user.id,
                    message: notificationMessage,
                    type: 'memberAdded',
                    relatedEntityType: 'space',
                    relatedEntityId: newSpace._id,
                    space: newSpace._id,
                });
                await notification.save();
            }

            await newSpace.save();

            // Insert default statuses
            const defaultStatuses = [
                { name: "ยังไม่ทำ", category: "toDo", space: newSpace._id },
                { name: "กำลังทำ", category: "inProgress", space: newSpace._id },
                { name: "แก้ไข", category: "fix", space: newSpace._id },
                { name: "เสร็จสิ้น", category: "finished", space: newSpace._id },
            ];
            await Status.insertMany(defaultStatuses);

            res.redirect("/project");
        } catch (error) {
            console.error("Error creating project:", error);
            req.flash('error', 'เกิดข้อผิดพลาดในการสร้างโปรเจกต์');
            res.redirect('/createProject');
        }
    }
};

exports.getUsers = async (req, res) => {
    const { search } = req.query;

    // Ensure the current user's ID is excluded
    const currentUserId = req.user ? req.user.userid : null;

    let filter = currentUserId ? { userid: { $ne: currentUserId } } : {};
    if (search) {
        const regex = new RegExp(search, 'i'); // Case-insensitive search
        filter = {
            $and: [
                { userid: { $ne: currentUserId } },
                {
                    $or: [
                        { firstName: regex },
                        { lastName: regex },
                        { googleEmail: regex },
                    ],
                },
            ],
        };
    }

    try {
        const users = await User.find(filter).select(
            'userid firstName lastName googleEmail profileImage lastActive isOnline'
        );
        res.status(200).json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Add the route to check if the project name already exists
exports.checkExistingProject = async (req, res) => {
    try {
        const { projectName } = req.body;
        const userId = mongoose.Types.ObjectId(req.user.id);

        // Check for existing project with the same name
        const existingProject = await Spaces.findOne({
            projectName: projectName.trim(),
            $or: [
                { user: userId },
                { collaborators: { $elemMatch: { user: userId } } }
            ],
            deleted: false,
        });

        if (existingProject) {
            return res.json({ exists: true });
        } else {
            return res.json({ exists: false });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

exports.searchMembers = async (req, res) => {
    try {
        const query = req.query.q;
        const currentUserId = req.user.id;
        if (!query) {
            return res.json([]);
        }

        const users = await User.find({
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { googleEmail: { $regex: query, $options: 'i' } },
                { userid: { $regex: query, $options: 'i' } },
            ],
            _id: { $ne: currentUserId }
        })
            .limit(10)
            .select('firstName lastName googleEmail userid profileImage');

        res.json(users);
    } catch (error) {
        console.error('Error searching members:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const spaceId = req.params.id;
        const userId = req.user.id;

        const space = await Spaces.findOne({
            _id: spaceId,
            $or: [{ user: userId }, { collaborators: { $elemMatch: { user: userId } } }],
        });

        if (!space) {
            return res.status(404).json({ success: false, error: "Space not found" });
        }

        // Soft delete by setting 'deleted' to true
        space.deleted = true;
        await space.save();

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

// Show subjects that can Recover
exports.ShowRecover = async (req, res) => {
    try {
        const userId = mongoose.Types.ObjectId(req.user.id);

        // Fetch spaces with deleted: true
        let spaces = await Spaces.find({
            $or: [
                { user: userId },
                { collaborators: { $elemMatch: { user: userId } } }
            ],
            deleted: true, 
        })
            .populate('user', 'firstName profileImage')
            .populate('collaborators.user', 'firstName profileImage')
            .sort({ createdAt: -1 })
            .lean();

        // Ensure each space has a valid project cover
        for (const space of spaces) {
            // Ensure each space has a valid project cover
            if (!space.projectCover || typeof space.projectCover !== "string") {
                space.projectCover = 'https://res.cloudinary.com/dibbpr0zu/image/upload/v1743406589/defultBackground_vjda8s.jpg';
            } else if (!space.projectCover.startsWith('http')) {
                space.projectCover = 'https://res.cloudinary.com/dibbpr0zu/image/upload/v1743406589/defultBackground_vjda8s.jpg';
            }

            // Task Count
            const taskCount = await Task.countDocuments({ project: space._id, deleteAt: null });
            space.taskCount = taskCount;

            // Assigned Users Task Count
            let assignedUserstaskCount = {};
            for (const collaborator of space.collaborators || []) {
                if (collaborator.user && collaborator.user._id) {
                    // Get all tasks assigned to each collaborator in the space
                    const taskCountForUser = await Task.countDocuments({
                        project: space._id,
                        assignedUsers: collaborator.user._id,
                        deleteAt: null
                    });
                    assignedUserstaskCount[collaborator.user._id] = taskCountForUser;
                }
            }
            space.assignedUserstaskCount = assignedUserstaskCount;
        }

        // Convert createdAt to ISO string
        spaces.forEach(space => {
            if (!space.createdAt) {
                console.warn(`Missing createdAt for space: ${space.projectName}`);
                space.createdAt = new Date(); // Default to the current date if missing
            } else if (typeof space.createdAt === 'string') {
                space.createdAt = new Date(space.createdAt); // Convert string to Date
            }

            // Ensure it's a valid Date object before calling toISOString
            if (space.createdAt instanceof Date && !isNaN(space.createdAt)) {
                space.createdAt = space.createdAt.toISOString();
            } else {
                space.createdAt = new Date().toISOString(); // Default to the current date if invalid
            }
        });

        // Fetch notifications with space populated
        const notifications = await Notification.find({ user: userId, status: 'unread' })
            .populate('user', 'username profileImage')
            .populate('space', 'projectName')
            .populate('leader', 'profileImage') // Populate the leader field
            .sort({ createdAt: -1 }) // Order by most recent
            .lean();
        const unreadCount = notifications.length;

        res.render("project/projectRecover", {
            spaces,
            user: req.user,
            notifications,
            unreadCount,
            layout: "../views/layouts/project"
        });
    } catch (error) {
        console.error("Error fetching spaces:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Recover space
exports.recoverSpace = async (req, res) => {
    try {
        const space = await Spaces.findByIdAndUpdate(
            req.params.id,
            { deleted: false, deletedAt: null }, // Ensure deletedAt is reset
            { new: true }
        );

        if (!space) {
            return res.status(404).json({ success: false, error: "Project not found" });
        }

        return res.json({ success: true, message: "Project restored successfully!" });
    } catch (error) {
        console.error("Error recovering project:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};


const storage = multer.diskStorage({
    destination: './public/projectCover/',
    filename: (req, file, cb) => {
        cb(null, `projectCover-${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/;
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = fileTypes.test(file.mimetype);

        if (extName && mimeType) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed!'));
    },
}).single('SpacePicture');

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|bmp|svg/; // เพิ่มประเภทที่อนุญาต
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb("Error: อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น!");
    }
}

module.exports.edit_Update_SpacePicture = async (req, res) => {
    try {
        const spaceId = req.params.id;
        const space = await Spaces.findById(spaceId);

        if (!space) {
            return res.status(404).send('Space not found.');
        }

        // Get the Cloudinary URL from the uploaded file
        const newCoverUrl = req.file.path;

        // Store the new cover URL in the database
        const oldCoverUrl = space.projectCover;
        space.projectCover = newCoverUrl;
        await space.save();

        // Optionally, delete the old cover from Cloudinary if it's not the default cover
        if (oldCoverUrl && !oldCoverUrl.includes('defultBackground.jpg')) {
            const publicId = oldCoverUrl.split('/').pop().split('.')[0]; // Extract public ID
            await cloudinary.uploader.destroy(`projectCovers/${publicId}`);
        }

        res.redirect('/project');
    } catch (error) {
        console.error('Error updating project cover:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.edit_Update_SpaceName = async (req, res) => {
    try {
        const space = await Spaces.findById(req.params.id);
        if (!space) {
            return res.status(404).json({ success: false, message: "Space not found" });
        }

        // Update project name
        space.projectName = req.body.SpaceName;
        await space.save();

        res.redirect('/project');
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};




exports.addStatus = async (req, res) => {
    try {
        const { statusName, category, spaceId } = req.body;

        if (!statusName || !category || !spaceId) {
            return res.status(400).send("All fields are required.");
        }

        const space = await Space.findById(spaceId);
        if (!space) {
            return res.status(404).send("Space not found.");
        }

        const newStatus = new Status({
            name: statusName,
            category: category,
            space: spaceId
        });

        await newStatus.save();

        res.redirect(`/space/item/${spaceId}/task_board`);
    } catch (error) {
        console.error('Error adding status:', error);
        res.status(500).send("Internal Server Error");
    }
};

exports.getSpaceStatuses = async (req, res) => {
    try {
        const { spaceId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(spaceId)) {
            return res.status(400).send("Invalid space ID.");
        }

        const statuses = await Status.find({ space: spaceId }).sort({ name: 1 });
        res.status(200).json(statuses);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};