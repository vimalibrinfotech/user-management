import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import passwordRoutes from './routes/password.js'; 
import profileRoutes from './routes/profile.js'; 

// Connect to database
connectDB();

const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/password', passwordRoutes); 
app.use('/api/profile', profileRoutes);  


// Test route
app.get('/', (req, res) => {
  res.json({ message: 'API is running...' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});