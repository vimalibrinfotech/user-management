import { useSocket } from '../../context/SocketContext';
import { useEffect, useState } from 'react';

const ChatList = ({ conversations, selectedConversation, onSelectConversation, loading, currentUser, unreadCounts = {}, onDeleteConversation }) => {
  const { onlineUsers, socket } = useSocket();
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, conversationId: null });

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ conversationId, message }) => {
      console.log('New message received in ChatList:', conversationId);
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu({ show: false, x: 0, y: 0, conversationId: null });
    if (contextMenu.show) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.show]);

  const handleRightClick = (e, conversationId) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      conversationId
    });
  };

  const handleDeleteChat = async () => {
    if (contextMenu.conversationId && onDeleteConversation) {
      await onDeleteConversation(contextMenu.conversationId);
    }
    setContextMenu({ show: false, x: 0, y: 0, conversationId: null });
  };

  const getOtherParticipant = (conversation) => {
    if (conversation.isGroup) {
      return null;
    }
    return conversation.participants.find(
      p => p._id.toString() !== currentUser.id.toString()
    );
  };

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <p>No conversations yet</p>
          <p className="text-sm mt-2">Start a new chat to begin messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const otherUser = getOtherParticipant(conversation);
        const isSelected = selectedConversation?._id === conversation._id;

        return (
          <div
            key={conversation._id}
            onClick={() => onSelectConversation(conversation)}
            onContextMenu={(e) => handleRightClick(e, conversation._id)}
            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
              isSelected ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {conversation.isGroup ? (
                  // Group avatar - always show initials
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    <span>{conversation.groupName.charAt(0).toUpperCase()}</span>
                  </div>
                ) : otherUser?.profilePhoto ? (
                  // User has profile photo - show image with fallback
                  <img 
                    src={otherUser.profilePhoto} 
                    alt={`${otherUser.firstName} ${otherUser.lastName}`}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  // No profile photo - show initials
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    <span>{otherUser?.firstName?.charAt(0).toUpperCase() || 'U'}</span>
                  </div>
                )}
                
                {/* Online indicator for one-to-one chats */}
                {!conversation.isGroup && otherUser && isUserOnline(otherUser._id) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              {/* Conversation Info */}
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {conversation.isGroup
                      ? conversation.groupName
                      : `${otherUser?.firstName || 'Unknown'} ${otherUser?.lastName || ''}`}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 ml-2">
                      {formatTime(conversation.updatedAt)}
                    </span>
                    {/* Unread Badge */}
                    {unreadCounts[conversation._id] > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                        {unreadCounts[conversation._id]}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Last Message Preview */}
                {conversation.lastMessage && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {conversation.lastMessage.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu.show && (
        <div 
          className="fixed bg-white shadow-lg border border-gray-200 rounded-lg py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleDeleteChat}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatList;