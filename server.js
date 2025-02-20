require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3500;
const MONGODB_URL = process.env.MONGO_URL;

// Routes
const authRoutes = require('./router/AuthRouter');
const paymentRoutes = require('./router/PaymentRouter');
const orderRoutes = require('./router/OrderRouter');
const DelPersonRouter = require('./router/DelPersonRoutes');
const addtocartRouter = require('./router/CartRouter');
const userRoute = require('./router/UserRouter');
const adminRouter = require('./router/AdminRouter');
const chickenStoreRouter = require('./router/ChickenStoreRouter');
const locationRouter = require('./router/LocationRouter');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (adjust for production)
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB
mongoose
  .connect(MONGODB_URL)
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('Database connection error:', err.message);
  });

// Middleware
app.use(cors());
app.use(express.json());

// Make the io instance available in all routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle location updates
  socket.on('updateLocation', (data) => {
    console.log('Location update received:', data);
    io.to(data.orderId).emit('locationUpdate', data.location); // Emit location update to a specific room
  });

  // Handle order-specific room joining
  socket.on('joinOrderRoom', (orderId) => {
    console.log(`Socket ${socket.id} joined order room: ${orderId}`);
    socket.join(orderId);
  });

  // Handle order-specific room leaving
  socket.on('leaveOrderRoom', (orderId) => {
    console.log(`Socket ${socket.id} left order room: ${orderId}`);
    socket.leave(orderId);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/payment', paymentRoutes);
app.use('/user', orderRoutes);
app.use('/userapi', userRoute);
app.use('/api/addtocart', addtocartRouter);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', addtocartRouter);
app.use('/api/user', userRoute);
app.use('/Admin', adminRouter);
app.use('/citystore', chickenStoreRouter);
app.use('/Adminstore/delivery', DelPersonRouter);
app.use('/location', locationRouter);

// Serve images dynamically
app.get('/images/:id', (req, res) => {
  const { id } = req.params;
  res.sendFile(__dirname + `/ImageStore/${id}`);
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
