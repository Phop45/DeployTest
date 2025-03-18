// [project] routes
const { Router } = require('express');
const router = Router();
const { isLoggedIn } = require('../middleware/checkAuth');
const projectController = require('../controllers/projectController');
const { uploadCovers } = require('../middleware/upload');

router.get('/project', isLoggedIn, projectController.allProjectPage);

router.get('/createProject', isLoggedIn, projectController.createProject);
router.post('/createProject', isLoggedIn, uploadCovers.single('projectCover'), projectController.createProject);
router.post('/checkExistingProject', isLoggedIn,projectController.checkExistingProject);

router.get('/getUsers', isLoggedIn,projectController.getUsers);
router.delete('/space/delete/:id', isLoggedIn, projectController.deleteSpace);
router.put('/space/:id/recover', isLoggedIn, projectController.recoverSpace);
router.get('/subject/recover', isLoggedIn, projectController.ShowRecover);

router.post('/updateSpacePicture/:id', isLoggedIn, projectController.edit_Update_SpacePicture);
router.post('/updateSpaceName/:id', isLoggedIn, projectController.edit_Update_SpaceName);

router.get('/searchMembers', isLoggedIn, projectController.searchMembers);
router.post('/addStatus',isLoggedIn, projectController.addStatus);
router.get('/:spaceId/statuses', isLoggedIn, projectController.getSpaceStatuses);

module.exports = router;