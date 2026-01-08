import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'express-session';
import connectDB from './config/db.js';
import { configurePassport } from './config/passport.js';
import passportInstance from './config/passport.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import passwordRoutes from './routes/password.js'; 
import profileRoutes from './routes/profile.js';
import chatRoutes from './routes/chat.js';
import paymentRoutes from './routes/payment.js';
import productRoutes from './routes/products.js';

// Connect to database
connectDB();

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Make io accessible in routes/controllers
app.set('io', io);

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
configurePassport();
app.use(passportInstance.initialize());
app.use(passportInstance.session());


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/password', passwordRoutes); 
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/products', productRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'API is running...' });
});

// Socket.IO Connection Handler
// Track online users on server side
const onlineUsers = new Map(); // userId -> Set of socket IDs

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User joins with their ID
  socket.on('user:join', (userId) => {
    socket.userId = userId;
    socket.join(userId); // Join room with user's ID
    
    // Add to online users map
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    
    console.log(`User ${userId} joined with socket ${socket.id}`);
    console.log(`Online users count: ${onlineUsers.size}`);
    
    // Broadcast to ALL clients that this user is online
    io.emit('user:online', userId);
    
    // Send current online users list to newly connected client
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('users:online-list', onlineUserIds);
  });

  // User joins a conversation room (for typing indicators, etc.)
  socket.on('conversation:join', (conversationId) => {
    socket.join(conversationId);
    console.log(`🚪 Socket ${socket.id} joined conversation room ${conversationId}`);
  });

  // User leaves a conversation room
  socket.on('conversation:leave', (conversationId) => {
    socket.leave(conversationId);
    console.log(`🚪 Socket ${socket.id} left conversation room ${conversationId}`);
  });

  // User sends a message
  socket.on('message:send', (data) => {
    console.log('Message received:', data);
    // We'll implement this later with proper logic
  });

  // User is typing
  socket.on('typing:start', (data) => {
    socket.to(data.conversationId).emit('typing:user', {
      userId: socket.userId,
      conversationId: data.conversationId
    });
  });

  socket.on('typing:stop', (data) => {
    socket.to(data.conversationId).emit('typing:stop', {
      userId: socket.userId,
      conversationId: data.conversationId
    });
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket.userId) {
      const userSockets = onlineUsers.get(socket.userId);
      
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If user has no more active connections, mark as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(socket.userId);
          io.emit('user:offline', socket.userId);
          console.log(`User ${socket.userId} is now offline`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO running on port ${PORT}`);
});