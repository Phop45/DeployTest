//Collaboration Controller
const Task = require("../models/Task");
const Spaces = require('../models/Space');
const User = require("../models/User");
const Notification = require('../models/Noti');
const moment = require('moment');
const { sendSpaceMemberAddedEmail }= require('../../emailService');

// Function to map the role to Thai
function mapRoleToThai(role) {
    switch(role) {
        case 'owner':
            return 'เจ้าของ';
        case 'reporter':
            return 'ผู้ช่วย';
        case 'member':
            return 'สมาชิก';
        case 'guest':
            return 'ผู้เยี่ยมชม';
        default:
            return 'สมาชิก'; // Default to 'สมาชิก' if no match
    }
}

exports.manage_Member = async (req, res) => {
    try {
        const tasks = await Task.find({
            project: req.params.id,
            taskStatus: 'pending'
        })
            .populate({
                path: 'assignedUsers',
                select: 'firstName lastName profileImage'
            })
            .populate('attachments.uploadedBy', 'firstName lastName')
            .lean();


        const space = await Spaces.findOne({
            _id: req.params.id,
            $or: [
                { user: req.user._id },
                { collaborators: { $elemMatch: { user: req.user._id } } }
            ]
        })
            .populate('user', 'firstName lastName profileImage isOnline')
            .populate('collaborators.user', 'firstName lastName profileImage email googleEmail lastActive isOnline')
            .lean();


        if (!space) {
            return res.status(404).send("Space not found");
        }

        // Safely filter collaborators to include only valid ones with a populated user
        const validCollaborators = (space.collaborators || []).filter(collab => collab && collab.user);

        const currentUserRole = validCollaborators.find(
            collab => collab.user._id.toString() === req.user._id.toString()
        )?.role || 'member';

        // Collect all collaborator IDs
        const collaboratorIds = validCollaborators.map(collab => collab.user._id.toString());
        if (space.user && space.user._id) {
            collaboratorIds.push(space.user._id.toString());
        }

        // Find all users not already in the space as collaborators
        const allUsers = await User.find(
            { _id: { $nin: collaboratorIds } },
            'firstName lastName profileImage googleEmail isOnline'
        ).lean();

        // Fetch pending invitations
        const pendingInvitations = await Notification.find({ space: req.params.id, status: 'pending' })
            .populate('user', 'firstName lastName profileImage googleEmail isOnline')
            .lean();

        const pendingTaskCount = tasks.length;

        res.render("task/task-member", {
            spaces: space,
            spaceId: req.params.id,
            collaborators: validCollaborators,
            owner: space.user,
            allUsers,
            user: req.user,
            userImage: req.user.profileImage,
            userName: `${req.user.firstName} ${req.user.lastName}`, 
            pendingTaskCount,
            currentPage: 'task_member',
            currentUserRole,
            pendingInvitations,
            layout: "../views/layouts/task",
            moment
        });

    } catch (error) {
        console.error('Error loading task member page:', error);
        res.status(500).send("Internal Server Error");
    }
};

exports.addMemberToSpace = async (req, res) => {
    try {
        const { memberId, role, spaceId } = req.body;

        // Validate required fields
        if (!memberId || !role || !spaceId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Find the space
        const space = await Spaces.findById(spaceId);
        if (!space) {
            return res.status(404).json({ success: false, message: 'Space not found' });
        }

        // Check if the current user has sufficient permissions
        const currentUserRole = space.collaborators.find(collab => collab.user.toString() === req.user._id.toString())?.role;
        if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the admin or owner can add members' });
        }

        // Check if the user is already a member
        const isMember = space.collaborators.some(collab => collab.user.toString() === memberId);
        if (isMember) {
            return res.status(400).json({ success: false, message: 'User is already a member of this space' });
        }

        // Add the user directly to the collaborators
        space.collaborators.push({ user: memberId, role });
        await space.save();

        // Map role to Thai
        const roleInThai = mapRoleToThai(role);

        // Create a notification for the new member
        const notificationMessage = `คุณได้รับเชิญเข้าร่วมโปรเจกต์ "${space.projectName}" ในบทบาท "${roleInThai}"`;
        const notification = new Notification({
            userGroup: [{ user: memberId, status: 'unread' }], // User who is added
            triggeredBy: req.user._id, // The user who triggered the event
            message: notificationMessage,
            type: 'space-invitation', // Custom type for space invitation
            space: spaceId,
            isActionable: false // If the user doesn't need to take action on this notification
        });

        // Save the notification
        await notification.save();

        // Send email notification to the user added to the space
        const userToNotify = await User.findById(memberId);
        if (userToNotify) {
            const spaceDetailLink = `https://deploytest-8mln.onrender.com/space/item/${space._id}/dashboard?period=7day`;
            const emailMessage = `คุณได้รับเชิญเข้าร่วมพื้นที่ "${space.projectName}" ในบทบาท "${roleInThai}"`;

            // Call the email service to send an email to the user
            await sendSpaceMemberAddedEmail(userToNotify, space, spaceDetailLink, emailMessage);
        }

        res.status(200).json({ success: true, message: 'Member added successfully, notification sent, and email sent!' });
    } catch (error) {
        console.error('Error adding member to space:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.searchMembers = async (req, res) => {
    try {
        const query = req.query.q;
        const spaceId = req.query.spaceId;

        if (!query) {
            return res.status(400).json({ message: 'Query is required' });
        }

        // Find the space to get the list of current members and pending invitations
        const space = await Spaces.findById(spaceId).lean();
        if (!space) {
            return res.status(404).json({ message: 'Space not found' });
        }

        const collaboratorIds = space.collaborators.map(collab => collab.user.toString());
        const pendingInvitations = await Notification.find({ space: spaceId, status: 'pending' }).lean();
        const pendingInvitationIds = pendingInvitations.map(invite => invite.user.toString());

        const excludedIds = [...collaboratorIds, ...pendingInvitationIds];

        // Search for users who are not already in the space (as collaborators or pending invitations)
        const users = await User.find(
            {
                _id: { $nin: excludedIds },
                $or: [
                    { googleEmail: { $regex: query, $options: 'i' } },
                    { userid: { $regex: query, $options: 'i' } },
                ],
            },
            'firstName lastName userid googleEmail profileImage' // fields to return
        ).lean();

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        res.status(200).json(users);

    } catch (error) {
        console.error("Error fetching search results:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Controller to update role
exports.updateRole = async (req, res) => {
    const { memberId } = req.params;
    const { role, spaceId } = req.body;

    try {
        // Find the space and verify permissions
        const space = await Spaces.findOne({
            _id: spaceId,
            collaborators: { $elemMatch: { user: req.user._id, role: { $in: ['owner', 'admin'] } } }
        });

        if (!space) {
            return res.status(403).json({ success: false, message: 'Unauthorized to change role.' });
        }

        // Check if the member exists in the space
        const member = space.collaborators.find(collab => collab.user.toString() === memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        // Update the member's role
        await Spaces.updateOne(
            { _id: spaceId, 'collaborators.user': memberId },
            { $set: { 'collaborators.$.role': role } }
        );

        // Map the role to a localized name
        const mappedRole = mapRoleToThai(role);

        // Create a `roleChange` notification
        const message = `${req.user.firstName} ${req.user.lastName} ได้เปลี่ยนบทบาทของคุณเป็น ${mappedRole} ในโปรเจกต์ ${space.projectName}`;
        const notification = new Notification({
            userGroup: [{ user: memberId, status: 'unread' }],
            triggeredBy: req.user._id,
            message,
            type: 'roleChange',
            space: spaceId,
            isActionable: false, // No further action required
            relatedEntityId: spaceId, // Space ID is used as the related entity
            createdAt: new Date()
        });
        await notification.save();

        // Emit the notification with the correct task link
        const io = req.app.get('io');
        io.to(memberId).emit('newNotification', {
            _id: notification._id,
            message,
            triggeredBy: {
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                profileImage: req.user.profileImage || '/default-profile.png'
            },
            createdAt: notification.createdAt,
            link: `/space/item/${spaceId}/member`
        });

        res.json({ success: true, message: 'Role updated successfully and notification sent.' });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};



exports.deleteMember = async (req, res) => {
    const { memberId } = req.params;
    const { spaceId } = req.body;

    try {
        // Check if the current user is an owner or admin of the space
        const space = await Spaces.findById(spaceId);
        const currentUserRole = space.collaborators.find(collab => collab.user.toString() === req.user._id.toString())?.role;

        if (!space) {
            return res.status(404).json({ success: false, message: 'Space not found.' });
        }

        if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized to remove member.' });
        }

        // Find and remove the member from the space
        const memberIndex = space.collaborators.findIndex(collab => collab.user.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        const removedMember = space.collaborators.splice(memberIndex, 1)[0];
        await space.save();

        // Create a notification for the user who has been removed
        const notificationMessage = `คุณถูกลบออกจากโปรเจกต์ "${space.projectName}"`;
        const notification = new Notification({
            userGroup: [{ user: memberId, status: 'unread' }], // The user who is removed
            triggeredBy: req.user._id, // The user who triggered the event (leader/admin)
            message: notificationMessage,
            type: 'space-member-removal',
            space: spaceId,
            isActionable: false // No action needed for removal notification
        });
        await notification.save();

        res.json({ success: true, message: 'Member removed successfully and notification sent.' });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


exports.respondToInvitation = async (req, res) => {
    try {
        const { notificationId, response } = req.body;

        // Find the notification and populate the space
        const notification = await Notification.findById(notificationId).populate('space');
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

        console.log('Notification found:', notification); // Log to check if notification is retrieved properly

        // Proceed only if the response is "accepted"
        if (response === 'accepted') {
            const space = notification.space;
            console.log('Space found:', space);  // Log the space to check

            // Check if the user is already in the collaborators array
            const isUserAlreadyCollaborator = space.collaborators.some(collaborator => 
                collaborator.user.toString() === notification.user.toString()
            );
            if (!isUserAlreadyCollaborator) {
                console.log('Adding user to collaborators');  // Log when adding the user

                // Add the user to the collaborators array with the correct role and join date
                space.collaborators.push({
                    user: notification.user,
                    role: notification.role,
                    joinDate: new Date()
                });

                // Save the updated space document
                await space.save();
                console.log('Space updated:', space);  // Log the updated space
            } else {
                console.log('User already a collaborator');
            }

            // Update the notification to reflect the accepted status
            notification.status = 'accepted';
            await notification.save();
            console.log('Notification updated:', notification); // Log to check if the notification was updated correctly

            // Notify other members about the new collaborator
            const otherMembers = space.collaborators.filter(collab => collab.user.toString() !== notification.user.toString());
            for (const member of otherMembers) {
                const newNotification = new Notification({
                    user: member.user,
                    space: space._id,
                    role: notification.role,
                    status: 'accepted',
                    type: 'memberAdded',
                    leader: notification.user
                });
                await newNotification.save();
            }
        }

        // Delete the invitation notification after responding
        await Notification.findByIdAndDelete(notificationId);

        res.status(200).json({ success: true, message: 'Response recorded successfully' });
    } catch (error) {
        console.error('Error responding to invitation:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
