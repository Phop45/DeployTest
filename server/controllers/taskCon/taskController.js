/// task controller
const Task = require("../../models/Task");
const Spaces = require('../../models/Space');
const SubTask = require('../../models/SubTask');
const User = require("../../models/User");
const Status = require("../../models/Status");
const Notification = require('../../models/Noti'); 
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Tag = require('../../models/Tag');
const upload = require('../../middleware/upload'); 
const { console } = require("inspector");
const { sendTaskApprovalEmail, sendTaskStatusEmails } = require('../../../emailService');

moment.locale('th');

const extractTaskParameters = async (tasks) => {
  const taskNames = tasks.map(task => task.taskName);
  const taskDetail = tasks.map(task => task.taskDetail);
  const taskStatus = tasks.map(task => task.taskStatus);
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

  return { taskNames, taskDetail, taskStatus, dueDate, dueTime, createdAt, taskPriority, taskTag };
};
function getRandomPastelColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.random() * 10; // Saturation between 70-80
  const lightness = 85 + Math.random() * 10; // Lightness between 85-95
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
const formatDateToThai = (date) => {
  if (!date || isNaN(new Date(date).getTime())) {
    return 'ไม่มีวันครบกำหนด'; // Return the "no due date" message for invalid or null dates.
  }

  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/// create task controller
exports.createTask = async (req, res) => {
  try {
    const {
      taskName,
      dueDate,
      startDate,
      taskTag,
      taskDetail,
      taskType,
      spaceId,
      taskPriority = 'normal',
      statusId, 
      assignedUsers = []
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).send("Invalid space ID.");
    }
    const space = await Spaces.findById(spaceId);
    if (!space) {
      return res.status(404).send("Space not found.");
    }

    const userId = req.user && req.user.id; // Assuming `req.user` is populated with the authenticated user
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid user ID.");
    }

    let status;
    if (statusId && mongoose.Types.ObjectId.isValid(statusId)) {
      status = await Status.findOne({ _id: statusId, space: spaceId });
      if (!status) {
        return res.status(404).send("Status not found or does not belong to the specified space.");
      }
    } else {
      status = await Status.findOne({ category: 'inProgress', space: spaceId });
      if (!status) {
        return res.status(500).send("Default status 'toDo' not found in the space.");
      }
    }

    const validAssignedUsers = [];
    if (assignedUsers) {
      const userIds = assignedUsers.split(',');
      for (const userId of userIds) {
        if (!mongoose.Types.ObjectId.isValid(userId)) continue;
        validAssignedUsers.push(mongoose.Types.ObjectId(userId));
      }
    }

    const tags = taskTag ? JSON.parse(taskTag).map(tag => ({
        _id: tag._id ? mongoose.Types.ObjectId(tag._id) : undefined,
        tagName: tag.tagName,
        color: tag.color,
      })) : [];

    const userTags = [];
    for (const tag of tags) {
      let existingTag = await Tag.findOne({ name: tag.tagName, user: userId }); 
      if (!existingTag) {
        const pastelColor = getRandomPastelColor();
        existingTag = new Tag({ name: tag.tagName, user: userId, color: pastelColor }); 
        await existingTag.save();
      }
      userTags.push({
        _id: existingTag._id,
        tagName: existingTag.name,
        color: existingTag.color,
      });
    }

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    const newTask = new Task({
      taskName,
      dueDate: parsedDueDate,
      startDate: parsedStartDate,
      taskTags: userTags,
      taskDetail,
      taskType,
      taskPriority,
      taskStatus: status.category,
      project: mongoose.Types.ObjectId(spaceId),
      user: mongoose.Types.ObjectId(userId),
      assignedUsers: validAssignedUsers,
    });

    await newTask.save();

    // Create notification
    const notification = new Notification({
      userGroup: validAssignedUsers.map(userId => ({
        user: userId,
        status: 'unread',
      })),
      triggeredBy: mongoose.Types.ObjectId(userId),
      message: `คุณได้รับมอบหมายงานชื่อ: ${newTask.taskName}`,
      type: 'taskAssignment',
      relatedEntityType: 'task',
      relatedEntityId: newTask._id,
      space: mongoose.Types.ObjectId(spaceId),
      dueDate: parsedDueDate,
      isActionable: false,
    });

    await notification.save();

    res.redirect(`/space/item/${spaceId}/task_board`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};


/// Add Task
exports.addTask = async (req, res) => {
  try {
    const assignedUsers = req.body.assignedUsers || [];
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : undefined;

    const newTask = new Task({
      taskName: req.body.taskName,
      dueDate: dueDate,
      taskTag: req.body.taskTag,
      detail: req.body.detail,
      taskType: req.body.taskType,
      user: req.user.id,
      space: req.body.spaceId,
      assignedUsers: assignedUsers
    });

    await newTask.save();
    res.redirect(`/space/item/${req.body.spaceId}`);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.addTask_list = async (req, res) => {
  try {
    const newTask = new Task({
      taskName: req.body.taskName,
      taskTag: req.body.taskTag,
      detail: req.body.detail,
      user: req.user.id,
      space: req.body.spaceId,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null, // Handle due date
      dueTime: req.body.dueTime || null // Set due time to null if not provided
    });

    await newTask.save();

    res.redirect(`/space/item/${req.body.spaceId}/task_list`);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

/// popup เพิ่มงาน จากหน้า list
exports.addTask2 = async (req, res) => {
  try {
    const { dueDate, taskName, taskTag, detail, taskType, spaceId } = req.body;
    const assignedUsers = req.body.assignedUsers || [];
    const parsedDueDate = dueDate ? new Date(dueDate) : undefined;

    const newTask = new Task({
      taskName: taskName,
      dueDate: parsedDueDate,
      taskTag: taskTag,
      detail: detail,
      taskType: taskType,
      user: req.user.id,
      space: spaceId,
      assignedUsers: assignedUsers
    });

    await newTask.save();

    res.redirect(`/space/item/${spaceId}/task_list`);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.addTask_underBoard = async (req, res) => {
  try {
    const { taskName, project, columnStatus } = req.body;

    // Validate Space ID (project)
    if (!mongoose.Types.ObjectId.isValid(project)) {
      return res.status(400).send("Invalid project ID.");
    }

    const space = await Spaces.findById(project);
    if (!space) {
      return res.status(404).send("Space not found.");
    }

    // Validate column status
    const validStatuses = ['pending', 'inProgress', 'fix', 'finished'];
    if (!validStatuses.includes(columnStatus)) {
      return res.status(400).send("Invalid column status.");
    }

    // Create the new task
    const newTask = new Task({
      taskName,
      project, // Assign the project ID
      taskStatus: columnStatus, // Assign the column status
      user: req.user.id, // Logged-in user
    });

    await newTask.save();
    res.redirect(`/space/item/${project}/task_board`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.createTag = async (req, res) => {
  try {
      const { tagName } = req.body;

      if (!tagName || tagName.trim().length < 2) {
          return res.status(400).json({ message: 'Tag name must be at least 2 characters long.' });
      }

      if (tagName.length > 30) {
          return res.status(400).json({ message: 'Tag name cannot exceed 30 characters.' });
      }

      // Check for invalid characters
      const tagNameRegex = /^[a-zA-Z0-9\s-_]+$/;
      if (!tagNameRegex.test(tagName)) {
          return res.status(400).json({
              message: 'Invalid characters in tag name. Only letters, numbers, spaces, dashes, and underscores are allowed.',
          });
      }

      const userId = req.user && req.user.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: 'Invalid user ID.' });
      }

      // Check if the tag already exists for the user
      const existingTag = await Tag.findOne({ name: tagName, user: userId });
      if (existingTag) {
          return res.status(400).json({ message: 'Tag already exists.' });
      }

      const newTag = new Tag({
          name: tagName,
          color: getRandomPastelColor(),
          user: userId,
      });

      await newTag.save();

      res.status(201).json(newTag);
  } catch (error) {
      console.error('Error creating tag:', error);
      res.status(500).json({ message: 'Internal Server Error', error });
  }
};

exports.getUserTags = async (req, res) => {
  try {
    const tags = await Tag.find({ user: req.user.id }).sort({ name: 1 }); 
    res.status(200).json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getSubtaskCount = async (req, res) => {
  try {
    let { taskIds } = req.body; // Expecting taskIds as an array

    // Validate taskIds
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).send({ message: 'Invalid or missing taskIds' });
    }

    // Count the subtasks related to the tasks
    const subtaskCount = await SubTask.countDocuments({ task: { $in: taskIds } });

    res.status(200).json({ subtaskCount });
  } catch (error) {
    console.error('Error fetching subtask count:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};

exports.deleteTasks = async (req, res) => {
  try {
    let taskIds = req.body.taskIds;

    // Validate taskIds
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'Invalid taskIds provided' });
    }

    const spaceId = req.params.id;
    const space = await Spaces.findOne({
      _id: spaceId,
      $or: [
        { user: req.user.id }, // เจ้าของ Space
        { collaborators: { $elemMatch: { user: req.user.id } } } // Collaborators
      ]
    });

    if (!space) {
      return res.status(404).json({ message: 'Space not found or unauthorized' });
    }

    // Count the subtasks associated with the tasks
    const subtaskCount = await SubTask.countDocuments({ task: { $in: taskIds } });

    // Delete all subtasks related to the tasks
    await SubTask.deleteMany({ task: { $in: taskIds } });

    // Delete the main tasks
    await Task.deleteMany({ _id: { $in: taskIds }, project: spaceId });

    res.status(200).json({
      message: 'Tasks and subtasks deleted successfully',
      subtaskCount
    });
  } catch (error) {
    console.error('Error deleting tasks:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.pendingTask = async (req, res) => {
  try {
    const space = await Spaces.findOne({
        _id: req.params.id,
        $or: [
            { user: req.user._id },
            { collaborators: { $elemMatch: { user: req.user._id, role: { $in: ['owner', 'reporter'] } } } } // Collaborators with 'owner' or 'reporter' role
        ]
    }).lean();

    if (!space) {
      return res.status(404).send("Space not found");
    }

    const tasks = await Task.find({
      project: req.params.id,
      taskStatus: 'pending'
    })
      .populate({
        path: 'assignedUsers',
        select: 'firstName lastName profileImage'
      })
      .populate('attachments.uploadedBy', 'displayName')
      .lean();
    
      const pendingTaskCount = tasks.length;
    // Get the user's role from the collaborators array
    const currentUserRole = space.collaborators.find(collab => collab.user.toString() === req.user._id.toString())?.role || 'member';
    res.render("task/pending-task", {
      tasks,
      spaces: space,
      spaceId: req.params.id,
      user: req.user,
      userName: req.user.firstName,
      userImage: req.user.profileImage,
      pendingTaskCount,
      currentPage: 'pending-task',
      layout: "../views/layouts/task",
      currentUserRole,
    });
  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    res.status(500).send("Internal Server Error");
  }
};

exports.pendingDetail = async (req, res) => {
  try {
    const taskId = mongoose.Types.ObjectId(req.params.id);
    const spaceId = ObjectId(req.query.spaceId);
    const loggedInUserId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).send("Invalid task or space ID.");
    }

    const task = await Task.findById(taskId)
      .populate('comment.createdBy', 'firstName lastName profileImage')
      .populate('approvedBy', 'firstName lastName profileImage')
      .populate('attachments.uploadedBy', 'firstName lastName profileImage')
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
      .populate({
        path: 'comment.createdBy',
        select: 'firstName lastName profileImage',
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
      .filter(collab => collab.user)
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

    const formattedTaskDetail = taskDetail || 'ไม่มีคำอธิบาย';

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
      profileImage: user.profileImage || '/public/img/profileImage/userDefault.jpg',
    }));

    const statusMapping = {
      pending: 'รอตรวจ',
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

    const formattedDueDate = dueDate ? formatDateToThai(dueDate) : 'ไม่มีวันครบกำหนด';
    
    const taskTags = (task.taskTags || []).map(tag => ({
      tagName: tag._id?.tagName || tag.tagName,
      color: tag._id?.color || tag.color,
    }));
    const allTags = await Tag.find({ user: req.user._id }).lean();
    const taskTagsIds = task.taskTags.map(tag => tag._id.toString());
    const availableTags = allTags.filter(tag => !taskTagsIds.includes(tag._id.toString()));

    const collaborators = space.collaborators || [];
    const approvers = collaborators
      .filter(collab => collab.role === 'owner' || collab.role === 'reporter')
      .map(collab => collab.user);

    task.attachments.forEach(attachment => {
      attachment.uploadedAtFormatted = formatDateToThai(attachment.uploadedAt);
      attachment.uploadedByName = attachment.uploadedBy
        ? `${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName}`
        : 'Unknown User';
      attachment.uploadedByProfileImage = attachment.uploadedBy
        ? attachment.uploadedBy.profileImage || '/public/img/profileImage/userDefault.jpg'
        : '/public/img/profileImage/userDefault.jpg'; // Default image if no profile picture
    });

    res.render("task/detail-pending-task", {
      user: req.user,
      currentUserId: req.user._id.toString(),
      taskId: task._id.toString(),
      task,
      attachments: task.attachments || [],
      subtasks: formattedSubtasks,
      inProgressSubtasks,
      tasks: [task],
      taskNames,
      dueDate: formattedDueDate,
      dueTime: dueTime[0],
      taskDetail: formattedTaskDetail,
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
      approvers,
      activityLogs: activityLogsWithFormattedDates,
      userName: req.user.username,
      userImage: req.user.profileImage,
      layout: '../views/layouts/Detail',
      mainTaskDueDate: new Date(dueDate),
      formatDateToThai,
    });
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateTaskDescription = async (req, res) => {
  const { taskId, taskDetail } = req.body; // Ensure 'taskDetail' matches field in frontend

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Update the task description
    task.detail = taskDetail;  // Use 'detail' to align with schema field

    // Add to activity logs
    task.activityLogs.push({
      text: `คำอธิบายของงานถูกอัปเดตเมื่อ ${new Date().toLocaleString()}`,
      type: 'normal',
    });

    await task.save();  // Save the updated task

    res.status(200).json({ success: true, message: 'Task description updated successfully' });
  } catch (error) {
    console.error('Error updating task description:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateProjectName = async (req, res) => {
  try {
      const { spaceId, projectName } = req.body;

      // Validate inputs
      if (!spaceId || !projectName) {
          return res.status(400).json({ error: 'spaceId and projectName are required.' });
      }

      // Find and update the space
      const updatedSpace = await Spaces.findByIdAndUpdate(
          spaceId,
          { projectName },
          { new: true, runValidators: true } // Return the updated document
      );

      if (!updatedSpace) {
          return res.status(404).json({ error: 'Space not found.' });
      }

      res.status(200).json({
          message: 'Project name updated successfully.',
          space: updatedSpace
      });
  } catch (error) {
      console.error('Error updating project name:', error);
      res.status(500).json({ error: 'Internal server error.' });
  }
};

// Check if a task has incomplete subtasks
exports.checkIncompleteSubtasks = async (req, res) => {
  try {
      const { taskId } = req.params;
      const subtasks = await SubTask.find({ task: taskId });

      const hasIncompleteSubtasks = subtasks.length > 0;
      const incompleteCount = subtasks.length;

      res.status(200).send({
          hasIncompleteSubtasks,
          incompleteCount
      });
  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Failed to check incomplete subtasks' });
  }
};

// Update task status with optional subtask completion
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { newStatus, markSubtasksCompleted } = req.body;

    // Find the task
    const task = await Task.findById(taskId).populate('assignedUsers');  // Ensure assigned users are populated
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }

    // Update the task status
    task.taskStatus = newStatus;
    await task.save();

    // Handle subtasks when task status changes to "pending"
    if (newStatus === 'pending') {
      const result = await SubTask.updateMany(
        { task: taskId, subTask_status: { $ne: 'finished' } },
        { $set: { subTask_status: 'finished' } }
      );
    }

    // Handle subtasks when marking a task as "finished" with explicit request
    if (newStatus === 'finished' && markSubtasksCompleted) {
      const result = await SubTask.updateMany(
        { task: taskId, subTask_status: { $ne: 'finished' } },
        { $set: { subTask_status: 'finished' } }
      );
    }

    // Find the space related to the task
    const space = await Spaces.findById(task.project);
    if (!space) {
      return res.status(404).send({ message: 'Space not found' });
    }

    // Find collaborators with 'owner' or 'reporter' roles
    const usersToNotify = await Promise.all(space.collaborators
      .filter(collab => ['owner', 'reporter'].includes(collab.role))  // Filter by 'owner' and 'reporter' roles
      .map(async (collab) => {
        const user = await User.findById(collab.user);  // Fetch the full user object
        return user;
      })
    );
    
    // If no users to notify, return a message
    if (usersToNotify.length === 0) {
      return res.status(404).send({ message: 'No collaborators with the specified roles found' });
    }

    const message = `คุณมีงานใหม่ที่รอการอนุมัติ: ${task.taskName}`;

    // Prepare the notification to be saved in DB
    const notification = new Notification({
      userGroup: usersToNotify.map(userId => ({
        user: userId,
        status: 'unread',
      })),
      triggeredBy: req.user._id,
      type: 'sendTaskApproval',
      message,
      relatedEntityType: 'task',
      relatedEntityId: task._id,
      space: space._id,
      isActionable: true,
      dueDate: task.dueDate || null,
    });

    await notification.save();

    // Send approval emails to the 'owner' and 'reporter' users
    const taskDetailLink = `https://deploytest-8mln.onrender.com/task/${task._id}/pendingDetail?spaceId=${space._id}`;
    console.log('Sending task approval email to users...');
    // Send approval emails to the 'owner' and 'reporter' users
    await sendTaskApprovalEmail(usersToNotify, task.taskName, taskDetailLink, message);
    console.log('Task approval email sent successfully.');

    // Send WebSocket notifications
    const io = req.app.get('io');
    for (const userId of userIds) {
      io.to(userId.toString()).emit('newNotification', {
        _id: notification._id,
        message,
        triggeredBy: { profileImage: req.user.profileImage || '/default-profile.png' },
        createdAt: notification.createdAt,
        userGroup: notification.userGroup,
      });

      // Update unread count
      const unreadCount = await Notification.countDocuments({
        'userGroup.user': userId,
        'userGroup.status': 'unread',
      });
      io.to(userId.toString()).emit('updateUnreadCount', unreadCount);
    }

    res.status(200).send({ message: 'Task and subtasks updated successfully and notifications sent' });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).send({ message: 'Failed to update task status' });
  }
};

// Update subtask status
exports.updateSubtaskStatus = async (req, res) => {
  try {
    const { subtaskId } = req.params;  // Get the subtask ID
    const { status } = req.body;       // Get the new status

    // Find the subtask by ID
    const subtask = await SubTask.findById(subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Update the subtask status
    subtask.subTask_status = status;

    // Save the updated subtask
    await subtask.save();

    res.status(200).json({ message: 'Subtask status updated successfully', subtask });
  } catch (error) {
    console.error('Error updating subtask status:', error);
    res.status(500).json({ message: 'Failed to update subtask status' });
  }
};


// Fetch subtasks for a specific task
exports.getTaskSubtasks = async (req, res) => {
  try {
      const { taskId } = req.params;
      const subtasks = await SubTask.find({ task: taskId });
      res.status(200).send({ subtasks });

  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Failed to fetch subtasks' });
  }
};

// upload file
exports.uploadAttachments = async (req, res) => {
  const { taskId, spaceId } = req.params; // Assuming you have spaceId in params
  const userId = req.user._id;

  // Check if files are uploaded
  if (!req.files || (!req.files.taskAttachments && !req.files.userSubmission)) {
    req.flash('error', 'No files were uploaded');
    return res.redirect(`/task/${taskId}/detail?spaceId=${spaceId}`);
  }

  const attachments = [];

  // Helper function to process file attachments
  const processFiles = (files, attachmentType) => {
    files.forEach(file => {
      let filePath = file.mimetype.startsWith('image') && file.compressedPath
        ? file.compressedPath
        : `/uploads/${file.filename}`;

      // Clean path if needed
      filePath = filePath.endsWith(',') ? filePath.slice(0, -1) : filePath;

      attachments.push({
        path: filePath,
        originalName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedBy: userId,
        attachmentType: attachmentType,
        relatedTask: taskId,
        uploadedAt: new Date()
      });
    });
  };

  // Process files
  if (req.files.taskAttachments) {
    processFiles(req.files.taskAttachments, 'taskAttachment');
  }
  if (req.files.userSubmission) {
    processFiles(req.files.userSubmission, 'userSubmission');
  }

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $push: { attachments: { $each: attachments } } },
      { new: true }
    );

    if (!updatedTask) {
      req.flash('error', 'Task not found');
      return res.redirect(`/task/${taskId}/detail?spaceId=${spaceId}`);
    }

    req.flash('success', 'Files uploaded successfully');
    return res.redirect(`/task/${taskId}/detail?spaceId=${spaceId}`);

  } catch (error) {
    console.error('Upload error:', error);
    req.flash('error', error.name === 'CastError' ? 'Invalid task ID' : 'Upload failed');
    return res.redirect(`/task/${taskId}/detail?spaceId=${spaceId}`);
  }
};

// delete file
exports.deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user._id;

    // Find the task containing the file attachment
    const task = await Task.findOne({
      'attachments._id': fileId,
      $or: [
        { user: userId },
        { 'attachments.uploadedBy': userId }
      ]
    });

    if (!task) {
      return res.status(404).json({ 
        success: false,
        error: 'File not found in database' 
      });
    }

    const attachment = task.attachments.id(fileId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    let filePath = attachment.path;

    // Normalize path (remove leading slash if present)
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    const fullPath = path.join(__dirname, '../../../public', filePath);

    // Delete the physical file
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Successfully deleted file: ${fullPath}`);
    } else {
      console.warn(`File not found at: ${fullPath}`);
      return res.status(404).json({
        success: false,
        message: 'Physical file not found'
      });
    }

    // Remove the attachment from the task
    task.attachments.pull({ _id: fileId });
    await task.save();

    // ADDED: Send success response
    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error('File deletion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controller to handle "send to approve" functionality
exports.sendToApprove = async (req, res) => {
  try {
    const { taskId } = req.params;
    const previousTaskName = req.body.previousTaskName;

    // Find the task and populate the necessary fields
    const task = await Task.findById(taskId)
      .populate('assignedUsers')
      .populate({ path: 'project', model: 'Spaces' }); 

    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }

    // Allow status change only from 'inProgress' or 'fix' to 'pending'
    if (!['inProgress', 'fix'].includes(task.taskStatus)) {
      return res.status(400).send({ 
        message: 'Task must be in progress or fix status to be sent for approval' 
      });
    }

    task.taskStatus = 'pending';

    // Get the username (firstName + lastName)
    const user = await User.findById(req.user._id);
    const userName = `${user.firstName} ${user.lastName}`;

    // Push activity log
    task.activityLogs.push({
      type: 'action',
      details: {
        fieldChanged: 'sendTask',
        oldValue: previousTaskName,
        newValue: task.taskName,
        whoChange: `${userName} ได้ส่งงาน กรุณารอการอนุมัติ`,
      },
      createdBy: req.user._id,
      createdAt: new Date(),
    });

    await task.save();

    // Mark all subtasks as 'finished' (optional)
    const result = await SubTask.updateMany(
      { task: taskId, subTask_status: { $ne: 'finished' } },
      { $set: { subTask_status: 'finished' } }
    );

    // Get projectName from the populated task.project
    const projectName = task.project.projectName;

    // Find collaborators with 'owner' or 'reporter' roles
    const usersToNotify = await Promise.all(
      task.project.collaborators
        .filter((collab) => ['owner', 'reporter'].includes(collab.role))
        .map(async (collab) => {
          const user = await User.findById(collab.user);
          return user;
        })
    );

    if (usersToNotify.length === 0) {
      return res.status(404).send({ message: 'No collaborators with the specified roles found' });
    }

    const message = `คุณมีงานใหม่ที่รอการอนุมัติ: ${task.taskName}`;

    // Save notification to DB
    const notification = new Notification({
      userGroup: usersToNotify.map((user) => ({
        user: user._id,
        status: 'unread',
      })),
      triggeredBy: req.user._id,
      type: 'sendTaskApproval',
      message,
      relatedEntityType: 'task',
      relatedEntityId: task._id,
      space: task.project._id,  
      isActionable: true,
      dueDate: task.dueDate || null,
    });

    await notification.save();

    // Send approval emails
    const taskDetailLink = `https://deploytest-8mln.onrender.com/task/${task._id}/pendingDetail?spaceId=${task.project._id}`;
    await sendTaskApprovalEmail(usersToNotify, task, projectName, taskDetailLink, message);

    // Send WebSocket notifications
    const io = req.app.get('io');
    for (const user of usersToNotify) {
      io.to(user._id.toString()).emit('newNotification', {
        _id: notification._id,
        message,
        triggeredBy: { profileImage: req.user.profileImage || '/default-profile.png' },
        createdAt: notification.createdAt,
        userGroup: notification.userGroup,
      });

      // Update unread count
      const unreadCount = await Notification.countDocuments({
        'userGroup.user': user._id,
        'userGroup.status': 'unread',
      });
      io.to(user._id.toString()).emit('updateUnreadCount', unreadCount);
    }

    res.status(200).send({ message: 'Task sent for approval successfully and notifications sent' });
  } catch (error) {
    console.error('Error sending task for approval:', error);
    res.status(500).send({ message: 'Failed to send task for approval' });
  }
};

exports.handleApproval = async (req, res) => {
  try {
    const { id } = req.params; // Task ID
    const { action } = req.body; // Action: 'approve' or 'reject'
    const userId = req.user._id; // Approver's ID

    // Find the task
    const task = await Task.findById(id)
      .populate('assignedUsers')
      .populate({ path: 'project', model: 'Spaces' });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update task fields based on action
    if (action === 'approve') {
      task.taskStatus = 'finished';
      task.approvedBy = userId;
      task.approvedAt = new Date();
    } else if (action === 'reject') {
      task.taskStatus = 'fix';
      task.approvedBy = userId;
      task.approvedAt = new Date();
    } else {
      return res.status(400).json({ message: 'Invalid action specified' });
    }

    await task.save();

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Find the approver's name
    const approver = await User.findById(userId).select('firstName lastName');
    if (!approver) {
      return res.status(404).json({ message: 'Approver not found' });
    }

    const approverName = `${approver.firstName} ${approver.lastName}`;
    const taskName = task.taskName;
    const spaceId = task.project?._id; // Space ID

    // Prepare the notification message
    const message = action === 'approve'
      ? `งานชื่อ "${taskName}" ได้รับการอนุมัติโดย ${approverName}.`
      : `งานชื่อ "${taskName}" ได้รับการปฏิเสธโดย ${approverName} และกรุณาแก้ไข.`;

    // 🔥 Send response FIRST
    res.status(200).json({ message: `Task ${action}d successfully.` });
    
    // Prepare the task details link
    const taskDetailLink = `https://deploytest-8mln.onrender.com/task/${task._id}/detail?spaceId=${spaceId}`;

    // ✉️ Now do email sending and notifications in the background
    sendTaskStatusEmails(task.assignedUsers, taskName, action, taskDetailLink, message);

    const type = action === 'approve' ? 'taskApproved' : 'taskRejected';
    const notification = new Notification({
      userGroup: task.assignedUsers.map(user => ({
        user: user._id,
        status: 'unread',
      })),
      triggeredBy: userId,
      type,
      message,
      relatedEntityType: 'task',
      relatedEntityId: task._id,
      space: spaceId,
      isActionable: false,
      dueDate: task.dueDate || null,
    });

    await notification.save();

    const io = req.app.get('io');
    for (const assignedUser of task.assignedUsers) {
      io.to(assignedUser._id.toString()).emit('newNotification', {
        _id: notification._id,
        message,
        triggeredBy: {
          profileImage: approver.profileImage || '/default-profile.png',
        },
        createdAt: notification.createdAt,
        userGroup: notification.userGroup,
      });

      const unreadCount = await Notification.countDocuments({
        'userGroup.user': assignedUser._id,
        'userGroup.status': 'unread',
      });
      io.to(assignedUser._id.toString()).emit('updateUnreadCount', unreadCount);
    }

  } catch (err) {
    console.error('❌ handleApproval error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
      const { taskId } = req.params;  // Get task ID from request params
      const { commentInput } = req.body;  // Get comment text from body
      const userId = req.user._id;  // Get the logged-in user ID

      // Ensure the task exists
      const task = await Task.findById(taskId);
      if (!task) {
          console.log('Task not found.');
          return res.status(404).json({ message: 'Task not found' });
      }

      // Prepare attachment data if there are any files
      const attachments = [];
      if (req.attachments && req.attachments.length > 0) {
          for (let file of req.attachments) {
              // Push attachment data directly into the attachments array of the comment
              const attachmentData = {
                  path: file.path.replace('public/', ''),  // Store relative file path
                  originalName: file.originalName,  // Store original file name
                  fileSize: file.fileSize,  // Store file size
                  fileType: file.fileType,  // Store MIME type of the file
                  uploadedBy: userId,  // Reference the user uploading the file
                  taskId: taskId,  // Link the attachment to the task
                  attachmentType: 'commentAttachment',  // This is a comment attachment
              };
              attachments.push(attachmentData);  // Add attachment data to array
          }
      } else {
          console.log('No attachments to add to the comment.');
      }

      // Create the comment object
      const newComment = {
          text: commentInput || '',  // Add text if provided
          createdBy: userId,  // Link the comment to the user who created it
          attachments: attachments,  // Attach the files to the comment
      };

      // Save the comment to the task
      task.comment.push(newComment);
      await task.save();  // Save the updated task

      res.status(200).json({ success: true, message: 'Comment added successfully', comment: newComment });
  } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Error adding comment' });
  }
};

exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    // Find the task containing the comment
    const task = await Task.findOne({ 'comment._id': commentId });

    if (!task) {
        console.log('Task not found');  // Debug log
        return res.status(404).send({ error: 'Task not found' });
    }

     // Find the comment to delete
     const comment = task.comment.id(commentId);

   if (!comment) {
     return res.status(404).json({ message: 'Comment not found.' });
    }

    // Delete physical files associated with the comment
    if (comment.attachments && comment.attachments.length > 0) {
      for (const attachment of comment.attachments) {
        const filePath = path.join(__dirname, '../../../public', attachment.path);

        // Check if the file exists before attempting to delete
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Delete the file
        } else {
          console.warn(`File not found: ${filePath}`);
        }
      }
    }

    // Remove the comment from the task
    comment.remove();
    await task.save();

    res.status(200).send({ message: 'Comment and attachments deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);  // Debug log
    res.status(500).send({ error: 'Error deleting comment' });
  }
};
