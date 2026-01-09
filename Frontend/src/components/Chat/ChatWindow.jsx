import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../utils/api';
import MessageInput from './MessageInput';

const ChatWindow = ({ conversation, currentUser }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (conversation?._id) {
      fetchMessages();
    }
  }, [conversation?._id]);

  // Join conversation room when chat opens
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    console.log('🚪 Joining conversation room:', conversation._id);
    socket.emit('conversation:join', conversation._id);

    return () => {
      console.log('🚪 Leaving conversation room:', conversation._id);
      socket.emit('conversation:leave', conversation._id);
    };
  }, [socket, conversation?._id]);

  // Listen for new messages via Socket
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleNewMessage = ({ conversationId, message }) => {
      if (conversationId === conversation._id) {
        setMessages(prev => [...prev, message]);
        
        // Mark as read if not sent by current user
        if (message.sender._id !== currentUser.id) {
          console.log('📖 Marking message as read:', message._id);
          markMessageAsRead(message._id);
        }
      }
    };

    const handleTyping = ({ userId, conversationId }) => {
      if (conversationId === conversation._id && userId !== currentUser.id) {
        setTypingUsers(prev => new Set([...prev, userId]));
      }
    };

    const handleTypingStop = ({ userId, conversationId }) => {
      if (conversationId === conversation._id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:user', handleTyping);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:user', handleTyping);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, conversation?._id, currentUser.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/chat/conversations/${conversation._id}/messages`);
      setMessages(data.messages);
      
      // Mark unread messages as read
      data.messages.forEach(message => {
        if (message.sender._id !== currentUser.id && !message.readBy.some(r => r.user === currentUser.id)) {
          console.log('📖 Marking loaded message as read:', message._id);
          markMessageAsRead(message._id);
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      console.log('📖 Marking message as read:', messageId);
      await api.patch(`/chat/messages/${messageId}/read`);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSendMessage = async (content) => {
    try {
      const { data } = await api.post('/chat/messages', {
        conversationId: conversation._id,
        content,
        messageType: 'text'
      });

      // Message will be received via socket, no need to manually add
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing:start', { conversationId: conversation._id });
    }
  };

  const handleStopTyping = () => {
    if (socket) {
      socket.emit('typing:stop', { conversationId: conversation._id });
    }
  };

  const getOtherParticipant = () => {
    if (conversation.isGroup) return null;
    
    // Convert both IDs to string for proper comparison
    const otherParticipant = conversation.participants.find(
      p => p._id.toString() !== currentUser.id.toString()
    );
    
    return otherParticipant;
  };

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const otherUser = getOtherParticipant();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 p-4 flex items-center">
        {conversation.isGroup ? (
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {conversation.groupName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <>
            {otherUser?.profilePhoto ? (
              <img 
                src={otherUser.profilePhoto} 
                alt={otherUser.firstName}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            
            {/* Fallback initials for ChatWindow header */}
            <div 
              className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold"
              style={{ display: otherUser?.profilePhoto ? 'none' : 'flex' }}
            >
              {otherUser?.firstName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </>
        )}
        <div className="ml-3">
          <h3 className="font-semibold text-gray-900">
            {conversation.isGroup
              ? conversation.groupName
              : `${otherUser?.firstName || 'Unknown'} ${otherUser?.lastName || ''}`}
          </h3>
          {conversation.isGroup ? (
            <p className="text-sm text-gray-500">
              {conversation.participants.length} members
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              {/* Online status can be shown here */}
            </p>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p>No messages yet</p>
              <p className="text-sm mt-2">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isSentByMe = message.sender._id === currentUser.id;

              return (
                <div
                  key={message._id}
                  className={`flex mb-4 ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${isSentByMe ? 'order-2' : 'order-1'}`}>
                    {!isSentByMe && conversation.isGroup && (
                      <p className="text-xs text-gray-600 mb-1 ml-2">
                        {message.sender.firstName}
                      </p>
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isSentByMe
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isSentByMe ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-300 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
      />
    </div>
  );
};

export default ChatWindow;