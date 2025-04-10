const Task = require("../../models/Task");
const Spaces = require('../../models/Space');
const moment = require('moment');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

exports.getCalendar = async (req, res) => {
    try {
        const spaceId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(spaceId)) {
            return res.status(400).send("Invalid space ID.");
        }

        const space = await Spaces.findById(spaceId);
        if (!space) {
            return res.status(404).send("Space not found.");
        }

        // Fetch all tasks in the space
        const tasks = await Task.find({
            project: spaceId,
            dueDate: { $exists: true, $ne: null } // Only tasks with due dates
        }).populate('assignedUsers', 'displayName profileImage');

        // Calculate pending tasks count
        const pendingTaskCount = await Task.countDocuments({
            project: spaceId,
            taskStatus: 'pending' // Adjust this based on your schema
        });

        // Format tasks for FullCalendar
        const events = tasks.map(task => ({
            id: task._id,
            title: task.taskName,
            start: task.dueDate,
            allDay: true,
            extendedProps: {
                description: task.taskDetail || '',
                assignedUsers: task.assignedUsers,
                status: task.taskStatus,
                spaceId: spaceId
            }
        }));

        // Combine first name and last name for userName
        const userName = `${req.user.firstName} ${req.user.lastName}`;

        res.render("task/task-calendar", {
            spaces: space,
            spaceId,
            events: JSON.stringify(events),
            pendingTaskCount, // Include pendingTaskCount
            user: req.user,
            userName, // Pass the combined user name
            userImage: req.user.profileImage,
            currentPage: 'task_calenda',
            layout: "../views/layouts/task"
        });
    } catch (error) {
        console.error('Error fetching calendar data:', error);
        res.status(500).send("Internal Server Error");
    }
};