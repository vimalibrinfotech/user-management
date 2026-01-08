import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      // Create socket connection
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000', {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      // Connection successful
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        // Join with user ID
        newSocket.emit('user:join', user.id);
      });

      // Handle connection errors
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Receive initial online users list from server
      newSocket.on('users:online-list', (userIds) => {
        console.log('Received online users list:', userIds);
        setOnlineUsers(userIds);
      });

      // User comes online
      newSocket.on('user:online', (userId) => {
        console.log('User came online:', userId);
        setOnlineUsers(prev => {
          // Avoid duplicates
          if (prev.includes(userId)) return prev;
          return [...prev, userId];
        });
      });

      // User goes offline
      newSocket.on('user:offline', (userId) => {
        console.log('User went offline:', userId);
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
      };
    } else {
      // If user logs out, close socket
      if (socket) {
        socket.close();
        setSocket(null);
        setOnlineUsers([]);
      }
    }
  }, [user?.id]); // Only reconnect when user ID changes (login/logout)

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};