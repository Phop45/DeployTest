// dashboardRoute.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController.js');
const { isLoggedIn } = require('../middleware/checkAuth');

router.get('/dashboard', isLoggedIn, dashboardController.dashboardRender);

router.get('/getCalendarTasks', isLoggedIn, dashboardController.getCalendarTasks);
router.get('/api/tasks', isLoggedIn, dashboardController.getTasksByDate);
router.get('/getTask-status', isLoggedIn, dashboardController.getTaskStatusCounts);

module.exports = router;