/// task controller
const Task = require("../../models/Task");
const Spaces = require('../../models/Space');
const SubTask = require('../../models/SubTask');
const User = require("../../models/User");
const Tag = require('../../models/Tag');
const moment = require('moment');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { io } = require('../../../app');
moment.locale('th');

const extractTaskParameters = async (tasks) => {
    const taskNames = tasks.map(task => task.taskName);
    const taskDetail = tasks.map(task => task.detail);
    const taskStatus = tasks.map(task => task.taskStatus);
    const taskTypes = tasks.map(task => task.taskType);
    const taskPriority = tasks.map(task => task.taskPriority);
    const taskTag = tasks.map(task => task.taskTag);

    const dueDate = tasks.map(task => {
        const date = new Date(task.dueDate);
        const options = { day: 'numeric', month: 'long', year: 'numeric', locale: 'th-TH' };
        return date.toLocaleDateString(undefined, options);
    });

    const dueTime = tasks.map(task => task.dueTime); // Extract dueTime from the task

    const createdAt = tasks.map(task => {
        const date = new Date(task.createdAt);
        const options = { day: 'numeric', month: 'long', year: 'numeric', locale: 'th-TH' };
        return date.toLocaleDateString(undefined, options);
    });

    return { taskNames, taskDetail, taskStatus, taskTypes, dueDate, dueTime, createdAt, taskPriority, taskTag };
};
const formatDateToThai = (dueDate) => {
    if (!(dueDate instanceof Date)) {
        dueDate = new Date(dueDate);
    }
    if (isNaN(dueDate)) return 'ไม่ทราบ';

    // Set the Thai locale
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    // Get the date components
    const day = dueDate.getDate();
    const month = dueDate.getMonth(); // 0-based index, no need to subtract 1
    const year = dueDate.getFullYear() + 543; // Add 543 for the Buddhist year

    // Format the date into the Thai format
    const formattedDate = `${day} ${thaiMonths[month]} ${year}`;
    return formattedDate;
};
function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.random() * 10; // Saturation between 70-80
    const lightness = 85 + Math.random() * 10; // Lightness between 85-95
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

exports.detailPageRender = async (req, res) => {
    try {
        const taskId = mongoose.Types.ObjectId(req.params.id); 
        const spaceId = ObjectId(req.query.spaceId);
        const loggedInUserId = req.user._id.toString();

        if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(spaceId)) {
            return res.status(400).send("Invalid task or space ID.");
        }
        
        const task = await Task.findById(taskId)
            .populate('assignedUsers', 'profileImage firstName lastName googleEmail')
            .populate({
                path: 'activityLogs.createdBy',
                select: 'profileImage firstName lastName',
            })
            .populate({
                path: 'activityLogs.userId',
                select: 'profileImage firstName lastName',
            })
            .populate({
                path: 'taskTags._id', 
                select: 'tagName color',
            })
            .lean();

        const space = await Spaces.findById(spaceId)
            .populate('collaborators.user', 'profileImage firstName lastName googleEmail')
            .lean();

        const subtasks = await SubTask.find({ task: taskId })
            .populate('assignee', 'profileImage firstName lastName googleEmail')
            .sort({ createdAt: -1 })
            .lean();
        const inProgressSubtasks = await SubTask.find({ task: taskId, subTask_status: 'กำลังทำ' })
            .sort({ createdAt: -1 })
            .lean();

        const spaceUsers = (space.collaborators || [])
        .map(collab => ({
            ...collab.user,
            username: collab.user._id.toString() === loggedInUserId
                ? 'ฉัน'
                : `${collab.user.firstName} ${collab.user.lastName}`,
            }))
        .sort((a, b) => {
            if (a._id.toString() === loggedInUserId) return -1;
            if (b._id.toString() === loggedInUserId) return 1;
            return 0;
        });

        const { taskNames, dueDate, dueTime, taskStatus, taskDetail, taskPriority } =
            await extractTaskParameters([task]);

        const thaiCreatedAt = task.createdAt.toLocaleDateString('th-TH', {
            month: 'long',
            day: 'numeric',
        });

        const formattedSubtasks = subtasks.map(subtask => ({
            ...subtask,
            subTask_dueDate: subtask.subTask_dueDate
                ? formatDateToThai(subtask.subTask_dueDate) 
                : 'N/A',
        }));

        const assignedUsers = (task.assignedUsers || []).map(user => ({
            ...user,
            username: `${user.firstName} ${user.lastName}`,
            profileImage: user.profileImage.startsWith('/api')
                ? user.profileImage
                : user.profileImage || '/public/img/profileImage/userDefault.jpg',
        }));

        const statusMapping = {
            toDo: 'ยังไม่ได้ทำ',
            inProgress: 'กำลังทำ',
            fix: 'แก้ไข',
            finished: 'เสร็จสิ้น',
        };

        const priorityMapping = {
            urgent: { color: '#DE350B', icon: 'fa-angles-up', text: 'ด่วน', textColor: '#DE350B' },
            normal: { color: '#FFAB00', icon: 'fa-grip-lines', text: 'ปกติ', textColor: '#FFAB00' },
            low: { color: '#4C9AFF', icon: 'fa-angle-down', text: 'ต่ำ', textColor: '#4C9AFF' },
        };

        const activityLogsWithFormattedDates = task.activityLogs.map(log => {
            if (log.details && log.details.fieldChanged === 'dueDate') {
                log.details.oldValue = formatDateToThai(log.details.oldValue);
                log.details.newValue = formatDateToThai(log.details.newValue);
            }
            return log;
        });

        const taskTags = (task.taskTags || []).map(tag => ({
            tagName: tag._id?.tagName || tag.tagName,
            color: tag._id?.color || tag.color,
        }));
        const allTags = await Tag.find({ user: req.user._id }).lean(); 
        const taskTagsIds = task.taskTags.map(tag => tag._id.toString());
        const availableTags = allTags.filter(tag => !taskTagsIds.includes(tag._id.toString()));

        res.render("task/task-ItemDetail", {
            user: req.user,
            currentUserId: req.user._id.toString(),
            taskId: task._id.toString(),
            task,
            attachments: task.attachments || [],
            subtasks: formattedSubtasks,
            inProgressSubtasks,
            tasks: [task],
            taskNames,
            dueDate,
            dueTime: dueTime[0],
            taskDetail,
            taskStatus,
            createdAt: thaiCreatedAt,
            taskPriority,
            taskTags,
            allTags,
            availableTags,
            spaces: space, 
            spaceId,
            assignedUsers,
            spaceUsers,
            statusMapping,
            priorityMapping,
            activityLogs: activityLogsWithFormattedDates, 
            userName: req.user.username,
            userImage: req.user.profileImage,
            layout: '../views/layouts/Detail',
            mainTaskDueDate: new Date(dueDate),
        });
    } catch (error) {
        console.error('Error fetching task details:', error);
        res.status(500).send("Internal Server Error");
    }
};

// Update assignUser
exports.assignUserToTask = async (req, res) => {
    try {
        const { taskId, userId } = req.body; 
        const currentUserName = `${req.user.firstName} ${req.user.lastName}`;

        if (!taskId || !userId) {
            return res.status(400).json({ error: "Task ID and User ID are required." });
        }

        const task = await Task.findById(taskId).
            populate('assignedUsers', 'firstName lastName'); 

        if (!task) {
            return res.status(404).json({ error: "Task not found." });
        }

        if (task.assignedUsers.some(user => user._id.toString() === userId)) {
            return res.status(400).json({ error: "User is already assigned to this task." });
        }
        task.assignedUsers.push(userId);

        // Fetch details of the added user
        const addedUser = await User.findById(userId).select('firstName lastName profileImage googleEmail');
        const addedUserName = `${addedUser.firstName} ${addedUser.lastName}`;

        task.activityLogs.push({
            text: null,
            type: 'action',
            details: {
                fieldChanged: 'assignedUsers',
                oldValue: null,
                newValue: addedUserName,
                whoChange: currentUserName,
            },
            createdBy: req.user._id,
            userId: addedUser._id,   
            createdAt: new Date(),
        });
        await task.save();

        return res.status(200).json({ message: "User successfully assigned to the task." });
    } catch (error) {
        console.error("Error assigning user to task:", error);
        return res.status(500).json({ error: "Internal Server Error." });
    }
};
exports.removeUserFromTask = async (req, res) => {
    try {
        const { taskId, userId } = req.body;
        const userName = req.user.firstName;

        if (!taskId || !userId) {
            return res.status(400).json({ error: "Task ID and User ID are required." });
        }

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ error: "Task not found." });
        }

        const userIndex = task.assignedUsers.indexOf(userId);
        if (userIndex === -1) {
            return res.status(400).json({ error: "User is not assigned to this task." });
        }

        const removedUser = await User.findById(userId).select('firstName lastName');
        const removedUserName = `${removedUser.firstName} ${removedUser.lastName}`;

        // Remove user from the task
        task.assignedUsers.splice(userIndex, 1);

        // Add activity log
        task.activityLogs.push({
            text: null,
            type: 'action',
            details: {
                fieldChanged: 'removeAssignedUsers',
                oldValue: removedUserName,
                newValue: null,
                whoChange: userName,
            },
            createdBy: req.user._id,
            createdAt: new Date(),
        });

        await task.save();

        return res.status(200).json({ message: "User successfully removed from the task." });
    } catch (error) {
        console.error("Error removing user from task:", error);
        return res.status(500).json({ error: "Internal Server Error." });
    }
};


// update task name ✅
exports.updateTaskName = async (req, res) => {
    try {
        const { taskId, taskName } = req.body; 
        const userId = req.user._id; 
        const userName = `${req.user.firstName} ${req.user.lastName}`; 

        if (!taskName || !/^[a-zA-Z0-9ก-๙\s]+$/.test(taskName)) {
            return res.status(400).send('Invalid task name. Please avoid special characters or empty values.');
        }
        
        const currentTask = await Task.findById(taskId);
        if (!currentTask) {
            return res.status(404).send('Task not found.');
        }

        const previousTaskName = currentTask.taskName;

        currentTask.taskName = taskName;
        currentTask.activityLogs.push({
            type: 'action',
            details: {
                fieldChanged: 'taskName',
                oldValue: previousTaskName,
                newValue: taskName,
                whoChange: userName, 
            },
            createdBy: userId,
            createdAt: new Date(),
        });
        await currentTask.save();
        res.status(200).send('Task name updated successfully.');
    } catch (error) {
        console.error('Error updating task name:', error);
        res.status(500).send('An error occurred while updating the task.');
    }
};

// update Task Status ✅
exports.updateTaskStatus = async (req, res) => {
    try {
        const { taskId, newStatus } = req.body;
        const userName = `${req.user.firstName} ${req.user.lastName}`; 

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            console.error('Invalid Task ID:', taskId);
            return res.status(400).json({ success: false, message: 'Invalid Task ID' });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            console.error('Task not found for ID:', taskId);
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const previousStatus = task.taskStatus;
        task.taskStatus = newStatus;

        task.activityLogs.push({
            text: null,
            type: 'action',
            details: {
                fieldChanged: 'status',
                oldValue: previousStatus,
                newValue: newStatus,
                whoChange: userName, 
            },
            createdBy: req.user._id,
            createdAt: new Date(),
        });

        await task.save();
        res.status(200).json({ success: true, message: 'Task updated successfully', task });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// update Task Priority ✅
exports.updateTaskPriority = async (req, res) => {
    const { taskId, taskPriority } = req.body;
    const userName = `${req.user.firstName} ${req.user.lastName}`; 

    try {
        const task = await Task.findById(taskId);
        if (!task) {
            console.log('Task not found:', taskId); 
            return res.status(404).json({ message: 'Task not found' });
        }

        const previousPriority = task.taskPriority;

        task.taskPriority = taskPriority; 
        task.activityLogs.push({
            text: null,
            type: 'action',
            details: {
                fieldChanged: 'priority',
                oldValue: previousPriority,
                newValue: taskPriority,  
                whoChange: userName,
            },
            createdBy: req.user._id,
            createdAt: new Date(),
        });

        await task.save();
        res.status(200).json({ success: true, message: 'Task priority updated successfully' });
    } catch (error) {
        console.error('Error in updateTaskPriority:', error); // Log error
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// update Due Date ✅
exports.updateDueDate = async (req, res) => {
    const { taskId, dueDate } = req.body;
    const userName = `${req.user.firstName} ${req.user.lastName}`; 

    try {
        // Find the task by ID
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const previousDueDate = task.dueDate;
        task.dueDate = new Date(dueDate).setHours(0, 0, 0, 0);

        task.activityLogs.push({
            text: null, 
            type: 'action',
            details: {
                fieldChanged: 'dueDate',
                oldValue: previousDueDate ? previousDueDate.toLocaleDateString('th-TH') : 'N/A',
                newValue: new Date(dueDate).toLocaleDateString('th-TH'), 
                whoChange: userName, 
            },
            createdBy: req.user._id,
            createdAt: new Date(), 
        });

        // Save the updated task
        await task.save();

        // Respond with success
        res.status(200).json({ message: 'Due date updated successfully' }); // Include the updated task
    } catch (error) {
        console.error('Error updating due date:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// update Due Time ✅
exports.updateDueTime = async (req, res) => {
    const { taskId, dueTime } = req.body;
    const userId = req.user._id; 
    const userName = `${req.user.firstName} ${req.user.lastName}`; 

    try {
        // Find the task by ID
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const oldDueTime = task.dueTime || 'ตลอดทั้งวัน';
        const newDueTime = dueTime || 'ตลอดทั้งวัน';

        task.dueTime = dueTime || null;
        task.activityLogs.push({
            text: null,
            type: 'action',
            details: {
                fieldChanged: 'dueTime',
                oldValue: oldDueTime,
                newValue: newDueTime,
                whoChange: userName, 
            },
            createdBy: userId,
        });

        // Save the updated task
        await task.save();

        res.json({ success: true, message: 'Due time updated successfully', task });
    } catch (error) {
        console.error('Error updating due time:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// add Tags ✅
exports.addTagsToTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { tags } = req.body;
        const userId = req.user._id;
        const userName = `${req.user.firstName} ${req.user.lastName}`;

        console.log("Received tags to add:", tags, taskId);

        // Find the task and update its tags
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).send('Task not found');
        }

        for (let tag of tags) {
            let tagID = tag._id;
            let existingTag;

            // Check if the tag is new or existing
            if (!tagID) {
                // Create a new tag if it doesn't exist in the database
                existingTag = new Tag({
                    name: tag.tagName,
                    color: tag.color,
                    user: req.user._id, // Set the user field here
                });
                await existingTag.save();
                tagID = existingTag._id;
            } else {
                // Find the existing tag in the database
                existingTag = await Tag.findById(tagID);
                if (!existingTag) {
                    console.log("Tag not found in the database:", tag.tagName);
                    continue;
                }
            }

            // Check if the tag already exists in the task
            const tagExistsInTask = task.taskTags.some(existingTagInTask => existingTagInTask._id.toString() === tagID.toString());
            if (!tagExistsInTask) {
                task.taskTags.push({
                    _id: existingTag._id,
                    tagName: existingTag.name,
                    color: existingTag.color,
                });

                // Add activity log for the added tag
                task.activityLogs.push({
                    text: null,
                    type: 'action',
                    details: {
                        fieldChanged: 'taskTags',
                        oldValue: null,
                        newValue: existingTag.name,
                        whoChange: userName,
                    },
                    createdBy: userId,
                });
            } else {
                console.log(`Tag '${existingTag.name}' already exists in the task.`);
            }
        }

        // Save the updated task
        await task.save();

        // Emit the event to update the frontend
        if (io) {
            io.emit('tagUpdate', {
                action: 'add',
                taskId,
                tags: task.taskTags,
                activityLogs: task.activityLogs,
            });
        } else {
            console.error("Socket.IO is not initialized");
        }

        // Return success response
        res.status(200).json({ message: 'Tags added successfully', task });
    } catch (error) {
        console.error("Error adding tags:", error);
        res.status(500).send('Server error');
    }
};
exports.createTag = async (req, res) => {
    try {
        const { name, color } = req.body;
        const userId = req.user._id; 
        const userName = `${req.user.firstName} ${req.user.lastName}`;  

        // Validate input
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        // Check if a tag with the same name already exists for the user
        const existingTag = await Tag.findOne({ name: name.trim(), user: req.user._id });
        if (existingTag) {
            return res.status(409).json({ message: "Tag with the same name already exists" });
        }

        // Assign a random pastel color if color is not provided
        const tagColor = color || getRandomPastelColor();

        // Create a new tag
        const newTag = new Tag({
            name: name.trim(),
            color: tagColor,
            user: req.user._id,
        });

        // Save the tag to the database
        await newTag.save();

        const activityLog = {
            text: null,
            type: 'action',
            details: {
                fieldChanged: 'tags',
                oldValue: null,
                newValue: newTag.name,
                whoChange: userName,
            },
            createdBy: userId,
        };
        console.log("Activity Log:", activityLog); 
        res.status(201).json({ message: "Tag created successfully", tag: newTag });
    } catch (error) {
        console.error("Error creating tag:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.removeTagFromTask = async (req, res) => {
    try {
        const { taskId } = req.params; 
        const { tagId } = req.body;  
        const userId = req.user._id;
        const userName = `${req.user.firstName} ${req.user.lastName}`; 

        console.log("Received tag ID to remove:", tagId, "from task ID:", taskId);

        if (!taskId || !tagId) {
            return res.status(400).json({ error: 'Task ID and Tag ID are required.' });
        }

        // Find the task by taskId
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }

        // Remove the tag from the task's taskTags array
        const tagToRemove = task.taskTags.find(tag => tag._id.toString() === tagId);
        if (!tagToRemove) {
            return res.status(404).json({ error: 'Tag not found in this task.' });
        }
        task.taskTags = task.taskTags.filter(tag => tag._id.toString() !== tagId);

        task.activityLogs.push({
            text: null,
            type: 'action',
            details: {
                fieldChanged: 'tagsRemove',
                oldValue: tagToRemove.tagName,
                newValue: null,
                whoChange: userName, 
            },
            createdBy: userId,
        });

        // Save the updated task
        await task.save();

        console.log("Updated task tags after removal:", task.taskTags);

        res.status(200).json({ message: 'Tag removed successfully', task });
    } catch (error) {
        console.error("Error removing tag:", error);
        res.status(500).send('Server error');
    }
};
exports.findTagByName = async (req, res) => {
    try {
        const { name } = req.body; 
        
        const tag = await Tag.findOne({ name });

        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }

        // If the tag is found, return the tag data
        return res.status(200).json(tag);
    } catch (error) {
        console.error("Error finding tag:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateTask = async (req, res, next) => {
    try {
        const { taskId, updateData } = req.body;

        // Update the task in the database
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        // Create a new activity log
        const newLog = {
            details: {
                fieldChanged: updateData.fieldChanged,
                oldValue: updateData.oldValue,
                newValue: updateData.newValue,
                whoChange: updateData.whoChange,
            },
            createdAt: new Date(),
        };

        task.activityLogs.push(newLog); // Add log to the activity logs
        await task.save(); // Save changes to the database

        const io = req.app.get("socketio"); // Retrieve Socket.IO instance from app
        io.emit("activityLogUpdate", { taskId, log: newLog });
        console.log('Emitted activityLogUpdate event:', { taskId, log: newLog });

        res.status(200).json({ success: true, task });
    } catch (error) {
        console.error("Error updating task:", error);
        next(error);
    }
};

// exports.updateTask = async (req, res) => {
//     try {
//         const { taskId, taskName, taskStatuses, taskPriority, taskDetail } = req.body;

//         // Validate input
//         if (!taskId) {
//             return res.status(400).json({ message: 'Task ID is required' });
//         }

//         if (taskName && !/^[a-zA-Z0-9ก-๙\s]+$/.test(taskName)) {
//             return res.status(400).json({ message: 'Invalid task name' });
//         }

//         // Find task by ID
//         const task = await Task.findById(taskId);
//         if (!task) {
//             return res.status(404).json({ message: 'Task not found' });
//         }

//         let activityLogs = [];

//         // Handle task name update
//         if (taskName && taskName !== task.taskName) {
//             activityLogs.push({
//                 text: `ชื่อของงานถูกเปลี่ยนเป็น "${taskName}" เมื่อ ${new Date().toLocaleString()}`,
//                 type: 'normal',
//             });
//             task.taskName = taskName;
//         }

//         // Handle task detail update
//         if (taskDetail && taskDetail !== task.detail) {
//             activityLogs.push({
//                 text: `รายละเอียดของงานถูกอัพเดตเมื่อ ${new Date().toLocaleString()}`,
//                 type: 'normal',
//             });
//             task.detail = taskDetail;
//         }

//         // Handle task status update
//         if (taskStatuses && taskStatuses !== task.taskStatuses) {
//             activityLogs.push({
//                 text: `สถานะของงานถูกเปลี่ยนเป็น "${taskStatuses}" เมื่อ ${new Date().toLocaleString()}`,
//                 type: 'normal',
//             });
//             task.taskStatuses = taskStatuses;
//         }

//         // Handle task priority update
//         if (taskPriority && taskPriority !== task.taskPriority) {
//             activityLogs.push({
//                 text: `ความสำคัญของงานถูกเปลี่ยนเป็น "${taskPriority}" เมื่อ ${new Date().toLocaleString()}`,
//                 type: 'normal',
//             });
//             task.taskPriority = taskPriority;
//         }

//         // Append activity logs
//         task.activityLogs = task.activityLogs.concat(activityLogs);

//         // Save the updated task
//         await task.save();

//         res.status(200).json({ message: 'Task updated successfully', task });
//     } catch (error) {
//         console.error('Error updating task:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };


exports.uploadDocument = async (req, res) => {
    try {
        const taskId = req.params.id;
        const spaceId = req.query.spaceId;
        const uploadedFiles = req.files;

        // Store original filename and path (with Thai characters)
        const attachments = uploadedFiles.map(file => ({
            path: `/docUploads/${file.filename}`, // Use relative path for serving files
            originalName: file.originalname // Preserve original name with Thai characters
        }));

        // Update the task with new attachments
        await Task.findByIdAndUpdate(
            taskId,
            { $push: { attachments: { $each: attachments } } },
            { new: true, runValidators: true }
        );

        res.redirect(`/task/${taskId}/detail?spaceId=${spaceId}`);
    } catch (error) {
        console.error('Error uploading documents:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Clear Log ✅
exports.clearLogs = async (req, res) => {
    try {
        const taskId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).send('Invalid Task ID');
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).send('Task not found.');
        }

        task.activityLogs = task.activityLogs.map(log => ({
            ...log,
            deleted: true, 
        }));

        await task.save();
        res.status(200).send('Activity logs cleared successfully.');
    } catch (error) {
        console.error('Error clearing activity logs:', error);
        res.status(500).send('An error occurred while clearing activity logs.');
    }
};

exports.updatePendingStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        if (!['inProgress', 'pending', 'fix', 'finished'].includes(status)) {
            return res.status(400).send({ message: 'Invalid status' });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).send({ message: 'Task not found' });
        }

        task.taskStatus = status;
        await task.save();

        res.status(200).send({ message: 'Task status updated successfully', task });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};