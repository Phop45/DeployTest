// TaskRoute.js
const express = require('express');
const router = express.Router();
const taskController = require('../../controllers/taskCon/taskController.js');
const { isLoggedIn } = require('../../middleware/checkAuth');
const { uploadFiles, uploadCommentFiles, processCommentAttachments } = require('../../middleware/upload');

router.post('/createTask', isLoggedIn, uploadFiles, taskController.createTask);
router.post('/uploadDocument/:taskId/:spaceId', uploadFiles, taskController.uploadAttachments);

router.post('/addTask', isLoggedIn, taskController.addTask);
router.post('/addTask2', isLoggedIn, taskController.addTask2);
router.post('/addTask_board', isLoggedIn, taskController.addTask_underBoard);
router.post('/addTask_list', isLoggedIn, taskController.addTask_list);

router.post('/tags/create',isLoggedIn, taskController.createTag);
router.get('/tags', isLoggedIn, taskController.getUserTags);

router.post('/task/deleteTasks/:id', isLoggedIn, taskController.deleteTasks);
router.post('/task/getSubtaskCount/:id', isLoggedIn, taskController.getSubtaskCount);

router.get('/task/:id/pendingDetail', isLoggedIn, taskController.pendingDetail);

router.post('/update-project-name', isLoggedIn, taskController.updateProjectName);
router.post('/updateTaskDescription',isLoggedIn, taskController.updateTaskDescription);
router.get('/space/item/:id/pedding', isLoggedIn, taskController.pendingTask);

router.delete('/deleteFile/:id', isLoggedIn, taskController.deleteFile);

router.post('/task/:taskId/send-to-approve',isLoggedIn, taskController.sendToApprove);
router.post('/task/:taskId/update-status',isLoggedIn, taskController.updateTaskStatus);
router.post('/subtask/:subtaskId/update-status', isLoggedIn, taskController.updateSubtaskStatus);
router.get('/task/:taskId/subtasks',isLoggedIn, taskController.getTaskSubtasks);

router.get('/task/:taskId/check-subtasks',isLoggedIn, taskController.checkIncompleteSubtasks);
router.put('/task/:id/approval',isLoggedIn, taskController.handleApproval);

router.post(
    '/task/:taskId/add-comment',
    isLoggedIn,
    uploadCommentFiles, // Middleware to handle file uploads
    processCommentAttachments, // Middleware to process attachments
    taskController.addComment // Controller to handle adding the comment
);

router.delete('/task/delete-comment/:commentId', isLoggedIn, taskController.deleteComment);

module.exports = router;