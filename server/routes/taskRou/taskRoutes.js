// TaskRoute.js
const express = require('express');
const router = express.Router();
const taskController = require('../../controllers/taskCon/taskController.js');
const { isLoggedIn } = require('../../middleware/checkAuth');
const { uploadFiles } = require('../../middleware/upload');

router.post('/createTask', isLoggedIn, uploadFiles.array('attachments', 10), taskController.createTask);

// Add this route for uploading attachments and returning URLs
router.post('/uploadAttachments', isLoggedIn, uploadFiles.single('attachments'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // ✅ Generate the public URL for the uploaded file
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, url: fileUrl });
});

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

router.delete('/deleteFile/:id',isLoggedIn, taskController.deleteFile);

router.post('/tasks/:id/addComment', isLoggedIn, taskController.addComment);

router.post('/task/:taskId/update-status',isLoggedIn, taskController.updateTaskStatus);
router.post('/subtask/:subtaskId/update-status', isLoggedIn, taskController.updateSubtaskStatus);
router.get('/task/:taskId/subtasks',isLoggedIn, taskController.getTaskSubtasks);

router.get('/task/:taskId/check-subtasks',isLoggedIn, taskController.checkIncompleteSubtasks);



module.exports = router;