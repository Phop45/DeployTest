require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const connectDB = require('./server/config/db');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const path = require('path');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./server/models/User');
const moment = require('moment');
const bodyParser = require('body-parser');
const lineWebhook = require('./server/routes/lineWebhook');
const cors = require('cors');
const http = require("http");
const socketIo = require("socket.io");
const Chat = require('./server/models/Chat');
const getNotifications = require('./server/middleware/notificationMiddleware.js');
const Spaces = require('./server/models/Space');

const app = express();
const port = process.env.PORT || 5001;
const server = http.createServer(app);
const io = socketIo(server);

app.set('io', io);

require('./server/scheduled/deleteOldProjects');

const corsOptions = {
  origin: '*', // Update with your client URL or '*' for all origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With, Accept',
  credentials: true, // Include cookies in CORS requests
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// เชื่อมต่อฐานข้อมูล
connectDB()
  .then(() => {
    console.log('Connected to database');
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

// Middleware สำหรับ parse body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session Middleware ✅ ต้องมาก่อน passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'Lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: 'googleEmail', passwordField: 'password' },
    User.authenticate()
  )
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(cors());

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/docUploads', express.static(path.join(__dirname, 'docUploads')));
app.use(methodOverride('_method'));
app.use('/webhook', lineWebhook);
app.use(cors());

// Flash messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.location(req.get("Referrer") || "/");
  next();
});

// Middleware to handle due date validation
app.use((req, res, next) => {
  if (req.body.dueDate) {
    const dueDate = moment(req.body.dueDate, moment.ISO_8601, true);
    if (!dueDate.isValid()) {
      req.flash('error', 'Invalid date format');
      return res.redirect('back');
    }
    req.body.dueDate = dueDate.toISOString();
  }
  next();
});

// Update lastActive
app.use(async (req, res, next) => {
  if (req.isAuthenticated()) {
    try {
      req.user.lastActive = Date.now();
      req.user.isOnline = true; // Keep user online during authenticated actions
      await req.user.save();
    } catch (error) {
      console.error('Error updating lastActive and isOnline:', error);
    }
  }
  next();
});

// ** Add the checkUserActivity function here **
const checkUserActivity = async () => {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

  try {
    const result = await User.updateMany(
      { lastActive: { $lt: thirtyMinutesAgo }, isOnline: true },
      { isOnline: false }
    );
    console.log(`Marked ${result.modifiedCount} users as offline.`);
  } catch (error) {
    console.error('Error marking offline users:', error);
  }
};

setInterval(checkUserActivity, 5 * 60 * 1000); // Run every 5 minutes

// Templating Engine
app.use(expressLayouts);
app.set('layout', './layouts/main');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(require('express-ejs-layouts'));
app.use('/static', express.static(path.join(__dirname, 'node_modules')));
app.use(getNotifications);

// Routes
app.use('/', require('./server/routes/auth'));
app.use('/', require('./server/routes/index'));
app.use('/', require('./server/routes/dashboardRouter'));
app.use('/', require('./server/routes/projectRoutes'));
app.use('/', require('./server/routes/taskRou/taskRoutes'));
app.use('/', require('./server/routes/taskRou/taskPageRoutes'));
app.use('/', require('./server/routes/taskRou/taskDetailRoutes'));
app.use('/', require('./server/routes/taskRou/taskComplaintRouter'));
app.use('/', require('./server/routes/notiRoutes'));
app.use('/', require('./server/routes/subtaskRoutes'));
app.use('/', require('./server/routes/settingRoutes'));
app.use('/', require('./server/routes/userRoutes'));
app.use('/', require('./server/routes/adminRoutes'));
app.use('/', require('./server/routes/collabRoutes'));

// Handle 404
app.get('*', (req, res) => {
  res.status(404).render('404');
});

app.get('/notifications/unread', async (req, res) => {
  if (req.user) {
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      status: 'unread',
    });

    res.json({ unreadCount });
  } else {
    res.json({ unreadCount: 0 });
  }
});

// WebSocket Setup
// ตั้งค่า usersInChat ใน app
const usersInChat = new Map(); // เก็บข้อมูลผู้ใช้ที่อยู่ในหน้าแชท
app.set('usersInChat', usersInChat);

io.on('connection', (socket) => {

  const userId = socket.handshake.query.userId;

  if (userId) {
    socket.join(userId);
  }

  // Handle new comment event
  socket.on('newComment', async ({ taskId, userId, text }) => {
    try {
      const task = await task.findById(taskId);
      if (!task) return;

      // Create a new comment
      const newComment = {
        text,
        createdBy: userId,
        createdAt: new Date(),
      };

      // Add the comment to the task
      task.comments.push(newComment);
      await task.save();

      // Populate the comment with user details
      const populatedComment = {
        text: newComment.text,
        createdBy: await User.findById(userId).select('firstName lastName profileImage'),
        createdAt: newComment.createdAt,
      };

      // Broadcast the comment to all clients
      io.emit('commentAdded', populatedComment);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  });

  // เมื่อผู้ใช้อยู่ในหน้าแชทกลุ่ม
  socket.on('join space chat', async ({ userId, spaceId }) => {
    socket.join(`space_${spaceId}`);

    // เพิ่มผู้ใช้ลงในรายการผู้ใช้ที่ใช้งานอยู่
    if (!usersInChat.has(spaceId)) {
      usersInChat.set(spaceId, new Set());
    }
    usersInChat.get(spaceId).add(userId);

    // ทำเครื่องหมายข้อความที่ยังไม่ได้อ่านว่าอ่านแล้ว
    try {
      const messagesToUpdate = await Chat.find({
        spaceId,
        readBy: { $ne: userId },
        type: 'group',
        userId: { $ne: userId } // ไม่นับข้อความที่ผู้ใช้ส่งเอง
      });

      // อัปเดตทีละข้อความเพื่อให้สามารถ emit อีเวนต์ได้ถูกต้อง
      for (const msg of messagesToUpdate) {
        msg.readBy.push(userId);
        await msg.save();

        // ส่งการอัพเดตสถานะการอ่านสำหรับแต่ละข้อความ
        const readCount = msg.readBy.filter(id => id.toString() !== msg.userId.toString()).length;

        io.to(`space_${spaceId}`).emit('message read update', {
          messageId: msg._id.toString(),
          readByCount: readCount,
          updatedAt: new Date()
        });

      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการทำเครื่องหมายข้อความว่าอ่านแล้ว:', error);
    }
  });

  // เมื่อผู้ใช้อยู่ในหน้าแชทกลุ่ม
  socket.on('user in chat', async ({ userId, spaceId }) => {
    if (!usersInChat.has(spaceId)) {
      usersInChat.set(spaceId, new Set());
    }
    usersInChat.get(spaceId).add(userId);

    // อัปเดตสถานะ readBy สำหรับข้อความที่ยังไม่ได้อ่าน
    const unreadMessages = await Chat.find({
      spaceId,
      readBy: { $ne: userId },
      type: 'group'
    });

    unreadMessages.forEach(async (msg) => {
      if (msg.userId.toString() !== userId.toString()) {
        msg.readBy.push(userId);
        await msg.save();

        // ส่งอีเวนต์ (ไม่มี log)
        io.emit('message read update', {
          messageId: msg._id.toString(),
          readByCount: msg.readBy.filter(id => id.toString() !== msg.userId.toString()).length,
        });
      }
    });
  });

  // เมื่อผู้ใช้ออกจากหน้าแชทกลุ่ม
  socket.on('user left chat', ({ userId, spaceId }) => {
    if (usersInChat.has(spaceId)) {
      usersInChat.get(spaceId).delete(userId);
    }
  });

  socket.on('mark message as read', async ({ messageId, userId, spaceId }) => {
    try {
      const message = await Chat.findById(messageId);
      if (!message) return;

      // ตรวจสอบว่ายังไม่ได้อ่านและไม่ใช่ผู้ส่ง
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
        await message.save();

        const readCount = message.readBy.filter(id => id.toString() !== message.userId.toString()).length;

        io.to(`space_${spaceId}`).emit('message read update', {
          messageId: message._id.toString(),
          readByCount: readCount
        });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // ตรวจจับอัปเดตสถานะการอ่าน
  socket.on('message read update', (data) => {

    // อัปเดต DOM
    const messageElement = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
    if (messageElement) {
      const readStatusElement = messageElement.querySelector('.read-status');
      if (readStatusElement) {
        readStatusElement.textContent = `เห็นแล้ว: ${data.readByCount} คน`;
      }
    }
  });

  // เมื่อผู้ใช้กลับเข้ามาในหน้าแชทกลุ่ม
  // เมื่อผู้ใช้กลับมาในแชทกลุ่ม
  socket.on('user returned to chat', ({ userId, spaceId }) => {
    // อัปเดต readBy ในฐานข้อมูล
    Chat.updateMany(
      { spaceId, readBy: { $ne: userId }, type: 'group', userId: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    ).exec();

    // ดึงข้อความที่อัปเดตแล้ว
    Chat.find({ spaceId, readBy: userId, type: 'group' })
      .then(messages => {
        messages.forEach(msg => {
          // คำนวณ readCount (ไม่นับผู้ส่ง)
          const readCount = msg.readBy.filter(id => id.toString() !== msg.userId.toString()).length;

          // ส่งอีเวนต์อัปเดตไปยัง Frontend
          io.emit('message read update', {
            messageId: msg._id.toString(),
            readByCount: readCount // ส่งจำนวนคนที่อ่านแล้ว
          });

        });
      });
  });

  // เมื่อมีข้อความใหม่
  socket.on('send message', async ({ spaceId, message, userId, mentionedUsers, type }) => {
    try {
      const newMessage = new Chat({
        spaceId,
        userId,
        message,
        readBy: [userId],
        mentionedUsers: mentionedUsers || [],
        type: type || 'group'
      });

      await newMessage.save();

      // Populate ข้อมูลก่อนส่ง
      const populatedMessage = await Chat.findById(newMessage._id)
        .populate('userId', 'firstName lastName profileImage')
        .populate('readBy', 'firstName lastName')
        .lean();

      if (type === 'group') {
        io.to(`space_${spaceId}`).emit('new group message', populatedMessage);
        io.emit('update last group message', populatedMessage);
      }
    } catch (error) {
      console.error('Error handling send message:', error);
    }
  });

  // เมื่อผู้ใช้อยู่ในหน้าแชทส่วนตัว
  socket.on('user in private chat', async ({ userId, targetUserId }) => {
    socket.join(`private_${userId}_${targetUserId}`);

    await Chat.updateMany(
      {
        userId: targetUserId,
        targetUserId: userId,
        readBy: { $ne: userId },
        type: 'private'
      },
      { $addToSet: { readBy: userId } }
    );



    // ดึงข้อความที่ถูกอัปเดต
    const messages = await Chat.find({
      userId: targetUserId,
      targetUserId: userId,
      type: 'private'
    });

    // ส่งอัพเดตไปยังผู้ใช้ทั้งสองฝ่าย
    messages.forEach(message => {
      const readCount = message.readBy.filter(id =>
        id.toString() !== message.userId.toString()
      ).length;

      io.to(`private_${targetUserId}_${userId}`).emit('private message read update', {
        messageId: message._id.toString(),
        readByCount: readCount
      });

      io.to(`private_${userId}_${targetUserId}`).emit('private message read update', {
        messageId: message._id.toString(),
        readByCount: readCount
      });
    });

  });

  // เมื่อผู้ใช้ออกจากหน้าแชทส่วนตัว
  socket.on('user left private chat', ({ userId, targetUserId }) => {
    socket.leave(`private_${userId}_${targetUserId}`);

    if (usersInChat.has(userId)) {
      usersInChat.get(userId).delete(targetUserId);
      if (usersInChat.get(userId).size === 0) {
        usersInChat.delete(userId);
      }
    }
  });


  // ในส่วนของการจัดการข้อความส่วนตัว
  socket.on('send private message', async (data, callback = () => { }) => {
    try {
      const { spaceId, message, userId, targetUserId } = data;

      const newMessage = new Chat({
        spaceId,
        userId,
        targetUserId,
        message: message.trim(),
        readBy: [userId],
        type: 'private',
      });

      await newMessage.save();

      const populatedMessage = await Chat.findById(newMessage._id)
        .populate('userId', 'firstName lastName profileImage')
        .populate('targetUserId', 'firstName lastName profileImage')
        .lean();

      // ส่งข้อความไปยังห้องแชท
      io.to(`private_${userId}_${targetUserId}`).emit('private message', populatedMessage);
      io.to(`private_${targetUserId}_${userId}`).emit('private message', populatedMessage);

      // อัปเดตข้อความล่าสุดแบบเรียลไทม์
      io.emit('update last private message', {
        userId: {
          _id: populatedMessage.userId._id,
          firstName: populatedMessage.userId.firstName,
          lastName: populatedMessage.userId.lastName
        },
        targetUserId: {
          _id: populatedMessage.targetUserId._id,
          firstName: populatedMessage.targetUserId.firstName,
          lastName: populatedMessage.targetUserId.lastName
        },
        message: populatedMessage.message,
        createdAt: populatedMessage.createdAt
      });

      callback({ success: true, message: populatedMessage });
    } catch (error) {
      console.error('Error handling private message:', error);
      callback({ success: false, error: 'Internal Server Error' });
    }
  });


  socket.on('join private chat', ({ userId, targetUserId }) => {
    const roomKey = `private_${userId}_${targetUserId}`;
    socket.join(roomKey);

    // อัปเดตสถานะผู้ใช้ในแชท
    if (!usersInChat.has(userId)) {
      usersInChat.set(userId, new Set());
    }
    usersInChat.get(userId).add(targetUserId);

    // ทำเครื่องหมายข้อความที่อ่านแล้ว (ไม่นับข้อความที่ผู้ใช้ส่งเอง)
    Chat.updateMany(
      {
        $or: [
          { userId: targetUserId, targetUserId: userId },
          { userId: userId, targetUserId: targetUserId }
        ],
        type: 'private',
        readBy: { $ne: userId },
        userId: { $ne: userId } // เพิ่มเงื่อนไขนี้เพื่อไม่นับข้อความที่ผู้ใช้ส่งเอง
      },
      { $addToSet: { readBy: userId } }
    ).exec();
  });

  // เพิ่มส่วนนี้สำหรับจัดการการออกจากแชทส่วนตัว
  socket.on('leave private chat', ({ userId, targetUserId }) => {
    if (usersInChat.has(userId)) {
      usersInChat.get(userId).delete(targetUserId);
      if (usersInChat.get(userId).size === 0) {
        usersInChat.delete(userId);
      }
    }
  });

  socket.on('mark messages as read', async ({ spaceId, userId, targetUserId }) => {
    try {
      if (targetUserId) {
        // Mark private messages as read
        await Chat.updateMany(
          {
            spaceId,
            $or: [
              { userId: targetUserId, targetUserId: userId },
              { userId: userId, targetUserId: targetUserId }
            ],
            type: 'private',
            readBy: { $ne: userId },
            userId: { $ne: userId }
          },
          { $addToSet: { readBy: userId } }
        );
      } else {
        // Mark group messages as read
        await Chat.updateMany(
          {
            spaceId,
            type: 'group',
            readBy: { $ne: userId },
            userId: { $ne: userId }
          },
          { $addToSet: { readBy: userId } }
        );
      }

      io.emit('messages marked as read', { spaceId, userId, targetUserId });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  socket.on('check user online status', async ({ userId }) => {
    try {
      const user = await User.findById(userId);
      if (user) {
        socket.emit('user online status', {
          userId,
          isOnline: user.isOnline
        });
      }
    } catch (error) {
      console.error('Error checking user online status:', error);
    }
  });

  socket.on('update unread counts', async ({ userId }) => {
    try {
      const spaces = await Spaces.find({ 'collaborators.user': userId }).lean();

      const unreadCounts = await Promise.all(spaces.map(async (space) => {
        const unreadMessages = await Chat.countDocuments({
          spaceId: space._id,
          readBy: { $nin: [userId] },
          userId: { $ne: userId }
        });

        return {
          spaceId: space._id,
          unreadCount: unreadMessages
        };
      }));

      // ส่งข้อมูลกลับไปยังผู้ใช้เฉพาะคน
      socket.emit('unread counts updated', { unreadCounts });
    } catch (error) {
      console.error('Error updating unread counts:', error);
    }
  });

  socket.on('mark private message as read', async (data) => {
    try {
      const { messageId, userId, targetUserId } = data;

      if (!messageId) {
        console.error('ไม่มี messageId');
        return;
      }

      const message = await Chat.findById(messageId);
      if (!message) {
        console.error('ไม่พบข้อความ');
        return;
      }

      // อัปเดตเฉพาะถ้ายังไม่อ่าน
      if (!message.readBy.includes(userId)) {
        await Chat.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: userId }
        });

        const updatedMessage = await Chat.findById(messageId)
          .populate('readBy', '_id')
          .lean();

        // ส่งอัปเดตไปทั้งสองฝ่าย
        io.to(`private_${userId}_${targetUserId}`).emit('private message read update', {
          messageId,
          readBy: updatedMessage.readBy
        });

        io.to(`private_${targetUserId}_${userId}`).emit('private message read update', {
          messageId,
          readBy: updatedMessage.readBy
        });
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาด:', error);
    }
  });

  socket.on('new message', async (message) => {
    // ตรวจสอบและแปลงข้อมูลไฟล์ให้ถูกต้องก่อนส่ง
    if (message.files && message.files.length > 0) {
      message.files = message.files.map(file => ({
        url: file.url,
        originalname: file.originalname,
        mimetype: file.mimetype
      }));
    }

    if (message.type === 'group') {
      io.to(`space_${message.spaceId}`).emit('new group message', message);
      io.emit('update last group message', message); // ส่งข้อมูลทั้งหมดไป
    } else if (message.type === 'private') {
      const targetUserId = message.targetUserId.toString();
      const senderId = message.userId.toString();

      io.to(`private_${senderId}_${targetUserId}`).emit('private message', message);
      io.to(`private_${targetUserId}_${senderId}`).emit('private message', message);
      io.emit('update last private message', message); // ส่งข้อมูลทั้งหมดไป
    }
  });

  // เพิ่มส่วนนี้ในการจัดการการอ่านข้อความส่วนตัว
  socket.on('mark private messages read', async ({ spaceId, userId, targetUserId }) => {
    try {
      // อัปเดตฐานข้อมูล
      await Chat.updateMany(
        {
          spaceId,
          $or: [
            { userId: targetUserId, targetUserId: userId },
            { userId: userId, targetUserId: targetUserId }
          ],
          type: 'private',
          readBy: { $ne: userId }
        },
        { $addToSet: { readBy: userId } }
      );

      // ส่งการอัปเดตไปยังผู้ใช้ทั้งสองฝ่าย
      io.to(`private_${userId}_${targetUserId}`).emit('private messages marked read', {
        spaceId,
        userId,
        targetUserId
      });

      // อัปเดตจำนวนข้อความที่ยังไม่อ่าน
      io.emit('update unread count', {
        spaceId,
        senderId: userId,
        targetUserId
      });
    } catch (error) {
      console.error('Error marking private messages as read:', error);
    }
  });

  // ฟังก์ชันสำหรับอัปเดตข้อความล่าสุดใน sidebar
  function updateLastMessageInSidebar(msg) {
    const spaceId = msg.spaceId;
    const userId = msg.userId._id.toString();
    const currentUserId = '<%= user._id %>'; // นี้ควรมาจาก EJS template

    const isCurrentUser = userId === currentUserId;

    const groupChatElement = document.querySelector(`li[data-space-id="${spaceId}"] .conuser`);
    if (groupChatElement) {
      groupChatElement.textContent = isCurrentUser
        ? 'คุณ: ' + (msg.files && msg.files.length > 0 ? 'แนบไฟล์' : msg.message || '')
        : `${msg.userId.firstName}: ` + (msg.files && msg.files.length > 0 ? 'แนบไฟล์' : msg.message || '');
    }

    const timeElement = document.querySelector(`li[data-space-id="${spaceId}"] .timemessage`);
    if (timeElement) {
      timeElement.textContent = formatTime(new Date(msg.createdAt));
    }
  }
});

// Start server
server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});