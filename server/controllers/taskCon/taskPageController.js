/// task page controller
const Task = require("../../models/Task");
const Spaces = require('../../models/Space');
const SubTask = require('../../models/SubTask');
const User = require("../../models/User");
const Status = require('../../models/Status');
const Notification = require('../../models/Noti');
const moment = require('moment');
const mongoose = require('mongoose');
const { Console } = require("winston/lib/winston/transports");
moment.locale('th');

const extractTaskParameters = async (tasks) => {
    const taskNames = tasks.map(task => task.taskName);
    const taskDetail = tasks.map(task => task.detail);
    const taskStatuses = tasks.map(task => task.taskStatuses);
    const taskTypes = tasks.map(task => task.taskType);
    const taskPriority = tasks.map(task => task.taskPriority);
    const taskTag = tasks.map(task => task.taskTag);

    const dueDate = tasks.map(task => {
        const date = moment(task.dueDate).locale('th'); 
        return {
            day: date.format('DD'),
            month: date.format('MMM'), 
            year: date.format('YYYY') 
        };
    });

    const dueTime = tasks.map(task => task.dueTime);

    const createdAt = tasks.map(task => {
        const date = new Date(task.createdAt);
        const options = { day: 'numeric', month: 'long', year: 'numeric', locale: 'th-TH' };
        return date.toLocaleDateString(undefined, options);
    });

    return { taskNames, taskDetail, taskStatuses, taskTypes, dueDate, dueTime, createdAt, taskPriority, taskTag };
};
const formatDate = (date) => {
    return new Date(date).toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

/// Dashboard page controller
exports.task_dashboard = async (req, res) => {
    try {
        const spaceId = req.params.id;
        const userId = mongoose.Types.ObjectId(req.user.id);
        const period = req.query.period || '7day'; 

        // Find space and ensure access
        const space = await Spaces.findOne({
            _id: spaceId,
            $or: [{ user: userId }, { collaborators: { $elemMatch: { user: userId } } }],
        })
            .populate('collaborators.user', 'firstName lastName profileImage googleEmail')
            .lean();

        if (!space) {
            return res.status(404).send("Space not found");
        }

        // Retrieve tasks and populate fields
        const tasks = await Task.find({ project: spaceId })
            .populate('assignedUsers', 'firstName lastName profileImage')
            .populate('activityLogs.createdBy', 'firstName lastName profileImage')
            .populate({
                path: 'subtasks',
                model: 'SubTask',
                populate: {
                    path: 'assignee',
                    select: 'firstName lastName profileImage',
                },
            })
            .lean();

        // Determine the date range based on the selected period
        let startDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        switch (period) {
            case 'today':
                startDate = today; // Tasks created today
                break;
            case '7day':
                startDate = new Date();
                startDate.setDate(today.getDate() - 7); // Last 7 days
                break;
            case '1month':
                startDate = new Date();
                startDate.setMonth(today.getMonth() - 1); // Last 1 month
                break;
            case 'sinceCreate':
                startDate = new Date(space.createdAt); // From project creation
                break;
            default:
                startDate = new Date();
                startDate.setDate(today.getDate() - 7); // Default to 7 days
        }
        
        // Filter tasks based on the selected period
        const filteredTasks = tasks.filter((task) => new Date(task.createdAt) >= startDate);

        // Task Statistics
        const finishedTasksCount = filteredTasks.filter((task) => task.taskStatus === 'finished').length;
        const recentTasksCount = filteredTasks.length;
        const updatedTasksCount = filteredTasks.filter((task) => new Date(task.updatedAt) > new Date(task.createdAt)).length;

        const nextSevenDays = new Date();
        nextSevenDays.setDate(today.getDate() + 7);
        const dueNextSevenDaysCount = filteredTasks.filter((task) => task.dueDate && new Date(task.dueDate) >= today && new Date(task.dueDate) <= nextSevenDays).length;

        // Calculate subtask count
        const subTasksCount = tasks.reduce((count, task) => {
            if (task.subtasks && task.subtasks.length > 0) {
                return count + task.subtasks.length;
            }
            return count;
        }, 0);

        // Status Chart
        const statusCounts = {
            toDo: filteredTasks.filter(task => task.taskStatus === 'toDo').length || 0,
            inProgress: filteredTasks.filter(task => task.taskStatus === 'inProgress').length || 0,
            fix: filteredTasks.filter(task => task.taskStatus === 'fix').length || 0,
            finished: filteredTasks.filter(task => task.taskStatus === 'finished').length || 0,
        };
        const totalTasks = filteredTasks.length;
        const statusPercentages = Object.fromEntries(
            Object.entries(statusCounts).map(([status, count]) => [
                status, 
                totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0 // Rounded percentage
            ])
        );
        const finishedPercentage = totalTasks > 0 
            ? Math.round((statusCounts.finished / totalTasks) * 100) 
            : 0;

        // Priority Chart
        const priorityCounts = {
            urgent: filteredTasks.filter(task => task.taskPriority === 'urgent').length,
            normal: filteredTasks.filter(task => task.taskPriority === 'normal').length,
            low: filteredTasks.filter(task => task.taskPriority === 'low').length,
        };

        // Workload Distribution
        const incompleteStatuses = ['toDo', 'inProgress', 'fix']; 

        const workloadChartData = space.collaborators
            .filter(collaborator => collaborator.user) // Exclude collaborators with null user
            .map(collaborator => {
                const userId = collaborator.user._id.toString();
                const userTasks = filteredTasks.filter(task => 
                    task.assignedUsers.some(user => user && user._id.toString() === userId) // Check if user exists
                );

                const completedTasks = userTasks.filter(task => task.taskStatus === 'finished').length;
                const incompleteTasks = userTasks.filter(task => incompleteStatuses.includes(task.taskStatus)).length;
                const taskCount = userTasks.length;

                const percentage = taskCount > 0 
                    ? Math.round((completedTasks / taskCount) * 100) 
                    : 0;

                return {
                    user: collaborator.user,
                    percentage,
                    taskCount,
                    completedTasks,
                    incompleteTasks,
                };
            });

        // Render the Dashboard
        res.render('task/task-dashboard', {
            spaces: space,
            spaceId: spaceId, 
            tasks: filteredTasks,
            user: req.user,
            finishedTasksCount,
            recentTasksCount,
            subTasksCount,
            dueNextSevenDaysCount,
            statusCounts,
            statusPercentages,
            finishedPercentage,
            updatedTasksCount,
            priorityCounts,
            workloadChartData,
            startDate,
            selectedPeriod: period, 
            periodText: {
                today: 'วันนี้',
                '7day': 'ในช่วง 7 วันที่ผ่านมา',
                '1month': 'ในช่วง 1 เดือนที่ผ่านมา',
                sinceCreate: 'ตั้งแต่สร้างโปรเจกต์',
            }[period],

            users: space.collaborators.map(c => c.user), 
            layout: '../views/layouts/task',
            currentPage: 'dashboard',
        });

    } catch (error) {
        console.error('Error in task_dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getTasks = async (req, res) => {
    try {
        const { spaceId } = req.query;
        const period = req.query.period || '7day'; 
        if (!spaceId) {
            return res.status(400).send('Missing spaceId');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        let selectedPeriod;
        switch (period) {
            case 'today':
                selectedPeriod = 'วันนี้';
                break;
            case '7day':
                selectedPeriod = '7 วันที่ผ่านมา';
                break;
            case '1month':
                selectedPeriod = '1 เดือนที่ผ่านมา';
                break;
            case 'sinceCreate':
                selectedPeriod = 'ทั้งหมด';
                break;
            default:
                selectedPeriod = '7 วันวันที่ผ่านมา'; 
        }

        // Find tasks within the selected period
        const tasks = await Task.find({
            createdAt: { $gte: startDate },
            project: spaceId,
        })
            .populate('assignedUsers', 'username profileImage') // Populate user data
            .lean();

        res.json(tasks); // Send tasks as JSON
    } catch (error) {
        console.error('Error in getTasks:', error);
        res.status(500).send('Internal Server Error');
    }
};

/// task board page controller
exports.boardPageRender = async (req, res) => {
    try {
        const spaceId = req.params.id;
        const userId = req.user._id; 

        // Fetch the space
        const space = await Spaces.findOne({
            _id: spaceId,
            $or: [{ user: userId }, { collaborators: { $elemMatch: { user: userId } } }],
        })
            .populate('collaborators.user', 'firstName lastName profileImage googleEmail')
            .lean();

        if (!space) {
            return res.status(404).send("Space not found");
        }

        const spaceCollaborators = (space.collaborators || []).filter(c => c && c.user);
        const currentUserRole = spaceCollaborators.find(c => c.user._id.toString() === userId)?.role || 'Member';
        
        console.log(spaceCollaborators); 

        // Fetch tasks and populate required fields
        const tasks = await Task.find({ project: spaceId, deleted: false })
            .populate('assignedUsers', 'profileImage firstName lastName')
            .lean();

        for (const task of tasks) {
            const subtasks = await SubTask.find({ task: task._id }).populate('assignee', 'username profileImage').lean();

            // Group subtasks by assignee and calculate completion percentage
            const assigneeProgress = subtasks.reduce((acc, subtask) => {
                const assigneeId = subtask.assignee?._id.toString();

                if (!acc[assigneeId]) {
                    acc[assigneeId] = {
                        assignee: subtask.assignee,
                        total: 0,
                        completed: 0,
                    };
                }

                acc[assigneeId].total++;
                if (subtask.subTask_status === 'เสร็จสิ้น') acc[assigneeId].completed++;

                return acc;
            }, {});

            // Add the calculated data to the task object
            task.assigneeProgress = Object.values(assigneeProgress).map((progress) => ({
                ...progress,
                percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
            }));
        }

        // Organize tasks by status
        const tasksByStatus = {
            inProgress: tasks.filter(task => task.taskStatus === 'inProgress'),
            pending: tasks.filter(task => task.taskStatus === 'pending'),
            fix: tasks.filter(task => task.taskStatus === 'fix'),
            finished: tasks.filter(task => task.taskStatus === 'finished')
        };

        // Prepare task counts for each status category
        const taskCounts = {
            pending: tasksByStatus.pending.length,
            inProgress: tasksByStatus.inProgress.length,
            fix: tasksByStatus.fix.length,
            finished: tasksByStatus.finished.length
        };

        // Fetch and sort statuses by category
        const statuses = await Status.find({ space: spaceId }).lean();
        const sortedStatuses = statuses.sort((a, b) => {
            const order = ['inProgress', 'pending', 'fix', 'finished'];
            return order.indexOf(a.category) - order.indexOf(b.category);
        });

        // Calculate user workload (tasks assigned to each user)
        const userWorkload = {};
        tasks.forEach(task => {
            task.assignedUsers.forEach(user => {
                const userId = user._id.toString();
                if (!userWorkload[userId]) {
                    userWorkload[userId] = {
                        name: user.displayName,
                        totalTasks: 0,
                        completedTasks: 0,
                    };
                }
                userWorkload[userId].totalTasks += 1; // Increment total tasks
                if (task.taskStatus === 'finished') {
                    userWorkload[userId].completedTasks += 1; // Increment completed tasks
                }
            });
        });

         // Calculate completion percentages for each user
         for (const userId in userWorkload) {
            const workload = userWorkload[userId];
            workload.percentage = workload.totalTasks > 0 ? Math.round((workload.completedTasks / workload.totalTasks) * 100) : 0;
        }

        res.render("task/task-board", {
            spaces: space,
            tasks,
            tasksByStatus,
            statuses: sortedStatuses,
            taskCounts,
            user: req.user,
            spaceCollaborators,
            currentUserRole,
            moment, 
            userWorkload: JSON.stringify(userWorkload),
            currentPage: 'board',
            layout: "../views/layouts/task", 
            priority: tasks.map(task => task.taskPriority), 
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

// ลิสต์งาน (ยังไม่ได้ใช้)
exports.task_list = async (req, res) => {
    try {
        // Fetch the space with collaborators and owner
        const space = await Spaces.findOne({
            _id: req.params.id,
            $or: [
                { user: req.user._id },
                { collaborators: req.user._id }
            ]
        })
            .populate({
                path: 'user',
                select: 'displayName profileImage'
            })
            .lean();

        // Fetch the tasks associated with the space
        const tasks = await Task.find({ space: req.params.id })
            .populate({
                path: 'assignedUsers',
                select: 'displayName profileImage'
            })
            .lean();

        // Extract the parameters
        const { taskNames, taskDetail, taskStatuses, taskTypes, dueDate, createdAt, taskPriority, taskTag } = await extractTaskParameters(tasks);

        // Format the dates in Thai
        const thaiDueDate = dueDate.map(date => moment(date).format('DD MMMM'));
        const thaiCreatedAt = createdAt.map(date => moment(date).format('DD MMMM'));

        const currentUserRole = space.collaborators.find(collab => collab.user.toString() === req.user._id.toString())?.role || 'Member';

        // Render the task list page, passing all extracted data
        res.render("task/task-list", {
            spaces: space,
            spaceId: req.params.id,
            tasks: tasks,
            taskNames: taskNames,
            taskDetail: taskDetail,
            taskStatuses: taskStatuses,
            taskTypes: taskTypes,
            dueDate: thaiDueDate,
            createdAt: thaiCreatedAt,
            taskPriority: taskPriority,  
            taskTag: taskTag,  
            users: tasks.flatMap(task => task.assignedUsers),
            user: req.user.id,
            userName: req.user.firstName,
            userImage: req.user.profileImage,
            currentPage: 'task_list',
            layout: "../views/layouts/task",
            currentUserRole
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

// Grantt Chart
exports.granttChart = async (req, res) => {
    try {
        // Fetch space details (owner or collaborator)
        const space = await Spaces.findOne({
            _id: req.params.id,
            $or: [
                { user: req.user._id }, // Space owner
                { collaborators: { $elemMatch: { user: req.user._id } } } // Collaborators
            ]
        })
            .populate('user', 'username profileImage') // Populate space owner
            .populate('collaborators.user', 'username profileImage email') // Populate collaborators
            .lean();

        if (!space) {
            return res.status(404).send("Space not found");
        }

        // Fetch tasks in the space
        const tasks = await Task.find({ space: req.params.id })
            .select("taskName createdAt dueDate assignedUsers")
            .populate("assignedUsers", "username")
            .lean();

        // Format tasks for Gantt chart
        const formattedTasks = tasks.map(task => ({
            id: task._id.toString(),
            name: task.taskName,
            start: task.createdAt.toISOString(),
            end: task.dueDate.toISOString(),
            assigned: task.assignedUsers.map(user => user.username),
        }));

        // Get the current user's role in the space
        const currentUserRole = space.collaborators.find(
            collab => collab.user._id.toString() === req.user._id.toString()
        )?.role || 'Member';

        // Render the view with data
        res.render("task/granttChart", {
            spaces: space,
            tasks: formattedTasks,
            spaceId: req.params.id,
            user: req.user,
            userImage: req.user.profileImage,
            userName: req.user.username,
            currentUserRole,
            currentPage: 'granttChart',
            layout: "../views/layouts/task",
        });

    } catch (error) {
        console.error('Error rendering Gantt chart page:', error);
        res.status(500).send("Internal Server Error");
    }
};