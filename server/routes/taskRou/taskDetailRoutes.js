// task detail routes
const express = require('express');
const router = express.Router();
const taskDetailController = require('../../controllers/taskCon/taskDetailController');
const { isLoggedIn } = require('../../middleware/checkAuth');
const { uploadFiles, uploadCovers }  = require('../../middleware/upload'); 

router.get('/task/:id/detail', isLoggedIn, taskDetailController.detailPageRender);

// ✅
router.post('/updateName', isLoggedIn, taskDetailController.updateTaskName);
router.post('/updateTaskStatus', isLoggedIn, taskDetailController.updateTaskStatus);
router.post('/updateTaskPriority',isLoggedIn, taskDetailController.updateTaskPriority);
router.post('/updateDueDate', isLoggedIn, taskDetailController.updateDueDate);
router.post('/updateDueTime', isLoggedIn, taskDetailController.updateDueTime);

router.post("/tags/create", isLoggedIn, taskDetailController.createTag);
router.post('/tasks/add-tags/:taskId', isLoggedIn, taskDetailController.addTagsToTask);
router.post('/tasks/remove-tag/:taskId', isLoggedIn, taskDetailController.removeTagFromTask);
router.post('/find-by-name', isLoggedIn, taskDetailController.findTagByName);
router.post('/tasks/assign-user', isLoggedIn, taskDetailController.assignUserToTask);
router.post('/tasks/remove-user', isLoggedIn, taskDetailController.removeUserFromTask);

router.post('/update/:taskId', isLoggedIn, taskDetailController.updateTask);
router.post('/tasks/:id/clearLogs', isLoggedIn, taskDetailController.clearLogs);


// ❌

router.post('/uploadDocument/:id', uploadFiles.array('documents', 5),isLoggedIn, taskDetailController.uploadDocument);

module.exports = router;