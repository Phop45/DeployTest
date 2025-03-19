/// dashboard controller
const Task = require("../models/Task");
const Spaces = require('../models/Space');
const SubTask = require('../models/SubTask');
const User = require("../models/User");
const Notification = require('../models/Noti');

const moment = require('moment');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dayjs = require('dayjs');
const buddhistEra = require('dayjs/plugin/buddhistEra');
const localizedFormat = require('dayjs/plugin/localizedFormat');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
require('dayjs/locale/th');

dayjs.extend(buddhistEra);
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('th');
moment.locale('th');

exports.dashboardRender = async (req, res) => {
    try {
        const user = req.user;

        // Fetch spaces associated with the user
        const spaces = await Spaces.find({ 'collaborators.user': user._id })
            .select('projectName projectCover projectDetail createdAt collaborators');

        // Filter spaces based on user role
        const allProjects = spaces;
        const leaderProjects = spaces.filter(space => 
            space.collaborators.some(collab => 
                collab.user.equals(user._id) && (collab.role === 'owner' || collab.role === 'admin')
            ));
        const memberProjects = spaces.filter(space => 
            space.collaborators.some(collab => 
                collab.user.equals(user._id) && collab.role === 'member')
        );

        // Aggregate task stats for each project
        const taskStats = await Task.aggregate([
            {
                $match: { project: { $in: spaces.map(space => space._id) } }
            },
            {
                $group: {
                    _id: "$project",
                    totalTasks: { $sum: 1 },
                    completedTasks: { $sum: { $cond: [{ $eq: ["$taskStatus", "finished"] }, 1, 0] } }
                }
            }
        ]);

        // Aggregate task status counts for each project
        const taskStatusCounts = await Task.aggregate([
            {
                $match: { project: { $in: spaces.map(space => space._id) } }
            },
            {
                $group: {
                    _id: "$project",
                    toDo: { $sum: { $cond: [{ $eq: ["$taskStatus", "toDo"] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ["$taskStatus", "inProgress"] }, 1, 0] } },
                    fix: { $sum: { $cond: [{ $eq: ["$taskStatus", "fix"] }, 1, 0] } },
                    finished: { $sum: { $cond: [{ $eq: ["$taskStatus", "finished"] }, 1, 0] } },
                    totalTasks: { $sum: 1 }
                }
            }
        ]);

        // Combine stats and status counts into a single object for each space
        const spacesWithStats = spaces.map(space => {
            const stats = taskStats.find(stat => String(stat._id) === String(space._id)) || {
                totalTasks: 0,
                completedTasks: 0
            };

            const statusCounts = taskStatusCounts.find(count => String(count._id) === String(space._id)) || {
                toDo: 0,
                inProgress: 0,
                fix: 0,
                finished: 0,
                totalTasks: 0
            };

            const completePercent = stats.totalTasks > 0
                ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                : 0;

            return {
                ...space.toObject(),
                totalTasks: stats.totalTasks,
                completePercent,
                statusCounts,
                projectAllTaskCount: statusCounts.totalTasks
            };
        });

        const tasks = await Task.find({
            $or: [{ user: user._id }, { assignedUsers: user._id }],
        }).select('taskName taskPriority taskStatus subtasks');

        const statusCounts = {
            toDo: 0,
            inProgress: 0,
            fix: 0,
            finished: 0,
        };

        let completedCount = 0;
        let incompletedCount = 0;

        // Calculate global task stats
        for (const task of tasks) {
            if (task.taskStatus in statusCounts) {
                statusCounts[task.taskStatus]++;
            }

            if (task.taskStatus === 'finished') {
                completedCount++;
            } else {
                incompletedCount++;
            }

            if (task.subtasks && task.subtasks.length > 0) {
                const subtasks = await SubTask.find({ _id: { $in: task.subtasks } }).select('subTask_status');
                for (const subtask of subtasks) {
                    if (subtask.subTask_status === 'finished') {
                        completedCount++;
                    } else {
                        incompletedCount++;
                    }
                }
            }
        }

        const currentDate = dayjs().tz('Asia/Bangkok').startOf('day').toDate();
        const endOfToday = dayjs().tz('Asia/Bangkok').endOf('day').toDate();

        const tasksDueToday = await Task.find({
            $or: [{ user: user._id }, { assignedUsers: user._id }],
            dueDate: { $gte: currentDate, $lte: endOfToday },
        }).select('taskName dueDate taskPriority');

        const attentionTasks = tasks.filter(task =>
            task.taskPriority === 'urgent' || task.taskStatus === 'fix'
        ).sort((a, b) => {
            if (a.taskPriority === 'urgent' && a.taskStatus === 'fix') return -1;
            if (b.taskPriority === 'urgent' && b.taskStatus === 'fix') return 1;
            if (a.taskPriority === 'urgent') return -1;
            if (b.taskPriority === 'urgent') return 1;
            if (a.taskStatus === 'fix') return -1;
            if (b.taskStatus === 'fix') return 1;
            return 0;
        });

        const dateText = dayjs().format('dddd, D MMMM BBBB');

        // Determine the current time and greeting
        const currentHour = dayjs().tz('Asia/Bangkok').hour();
        let greeting, greetingIcon;
        if (currentHour >= 0 && currentHour < 12) {
            greeting = "สวัสดีตอนเช้า";
            greetingIcon = "fa-solid fa-sun"; 
        } else if (currentHour >= 12 && currentHour < 18) {
            greeting = "สวัสดีตอนบ่าย";
            greetingIcon = "fa-solid fa-cloud-sun"; 
        } else {
            greeting = "สวัสดีตอนค่ำ";
            greetingIcon = "fa-solid fa-moon";
        }

        res.render('layouts/userDashboard', {
            user,
            spaces: spacesWithStats,
            allProjects,
            leaderProjects,
            memberProjects,
            dateText,
            tasksDueToday,
            statusCounts,
            allTaskCount: tasks.length,
            completedCount,
            incompletedCount,
            attentionTasks,
            dayjs,
            greeting,
            greetingIcon,
            periodText: 'ในช่วง 7 วันล่าสุด',
            layout: '../views/layouts/userDashboard',
        });
    } catch (error) {
        console.error('Error in dashboardRender:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getCalendarTasks = async (req, res) => {
    try {
        const { start, end } = req.query;
        const user = req.user;

        const tasks = await Task.find({
            $or: [{ user: user._id }, { assignedUsers: user._id }],
            dueDate: { $gte: new Date(start), $lte: new Date(end) },
        });
        const taskCounts = tasks.reduce((acc, task) => {
            const date = task.dueDate.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { count: 0, priorities: [] };
            }
            acc[date].count += 1;
            acc[date].priorities.push(task.taskPriority || 'normal');
            return acc;
        }, {});

        const events = Object.entries(taskCounts).map(([date, data]) => ({
            start: date,
            title: '', // Task name is replaced with task count
            extendedProps: {
                taskCount: data.count, // Task count for this day
                priorities: data.priorities, // List of priorities for potential further use
            },
        }));

        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar tasks:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getTasksByDate = async (req, res) => {
    try {
        const { date } = req.query;
        const user = req.user;

        if (!date) {
            return res.status(400).json({ message: 'Date is required.' });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await Task.find({
            $or: [{ user: user._id }, { assignedUsers: user._id }],
            dueDate: { $gte: startOfDay, $lte: endOfDay },
        });

        const priorityConfig = {
            urgent: { color: '#DE350B', icon: 'fa-angles-up', text: 'ด่วน' },
            normal: { color: '#FFAB00', icon: 'fa-grip-lines', text: 'ปกติ' },
            low: { color: '#4C9AFF', icon: 'fa-angle-down', text: 'ต่ำ' },
        };

        const statusConfig = {
            toDo: { color: '#DFE1E6', text: 'ยังไม่ทำ' },
            inProgress: { color: '#2684FF', text: 'กำลังทำ' },
            fix: { color: '#FF7452', text: 'แก้ไข' },
            finished: { color: '#57D9A3', text: 'เสร็จสิ้น' },
        };

        const tasksWithConfig = tasks.map(task => ({
            taskName: task.taskName,
            priority: priorityConfig[task.taskPriority] || priorityConfig.normal,
            status: statusConfig[task.taskStatus] || statusConfig.toDo,
        }));

        res.json(tasksWithConfig);
    } catch (error) {
        console.error('Error fetching tasks by date:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getTaskStatusCounts = async (req, res) => {
    try {
        const user = req.user;

        // Aggregate main task statuses
        const mainTasks = await Task.find({
            $or: [{ user: user._id }, { assignedUsers: user._id }],
        }).select('taskStatus subtasks');

        let statusCounts = {
            incomplete: 0, // Grouping toDo, inProgress, fix
            finished: 0,
        };

        for (const task of mainTasks) {
            if (task.taskStatus === 'finished') {
                statusCounts.finished++;
            } else {
                statusCounts.incomplete++;
            }

            // Process subtasks
            if (task.subtasks && task.subtasks.length > 0) {
                const subtasks = await SubTask.find({ _id: { $in: task.subtasks } }).select('subTask_status');
                for (const subtask of subtasks) {
                    if (subtask.subTask_status === 'finished') {
                        statusCounts.finished++;
                    } else {
                        statusCounts.incomplete++;
                    }
                }
            }
        }

        res.json(statusCounts);
    } catch (error) {
        console.error("Error fetching task status counts:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
