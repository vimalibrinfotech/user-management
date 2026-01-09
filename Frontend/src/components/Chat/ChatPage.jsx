import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../utils/api';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';

const ChatPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({}); // { conversationId: count }

  // Fetch all conversations on mount
  useEffect(() => {
    fetchConversations();
    fetchUnreadCounts();
  }, []);

  // Listen for new messages to update conversation list
  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', ({ conversationId, message }) => {
      // Update last message in conversation list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessage: message,
              updatedAt: new Date()
            };
          }
          return conv;
        });
        
        // Sort by most recent
        return updated.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      });

      // Increment unread count if not in selected conversation
      if (selectedConversation?._id !== conversationId && message.sender._id !== user.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1
        }));
      }
    });

    return () => {
      socket.off('message:new');
    };
  }, [socket, selectedConversation, user]);

  // Listen for new conversations
  useEffect(() => {
    if (!socket) return;

    socket.on('conversation:new', (newConversation) => {
      setConversations(prev => [newConversation, ...prev]);
    });

    return () => {
      socket.off('conversation:new');
    };
  }, [socket]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/chat/conversations');
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const { data } = await api.get('/chat/unread-counts');
      setUnreadCounts(data.unreadCounts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    // Clear unread count for this conversation immediately (optimistic update)
    setUnreadCounts(prev => ({
      ...prev,
      [conversation._id]: 0
    }));
    // Refetch to sync with backend
    setTimeout(() => fetchUnreadCounts(), 1000);
  };

  const handleNewConversation = (newConversation) => {
    setConversations(prev => [newConversation, ...prev]);
    setSelectedConversation(newConversation);
    setShowNewChatModal(false);
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      if (!window.confirm('Delete this conversation? This action cannot be undone.')) {
        return;
      }

      // Call backend API to delete conversation
      await api.delete(`/chat/conversations/${conversationId}`);

      // Remove from UI
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));

      // If deleted conversation was selected, clear selection
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
      }

      console.log('Conversation deleted successfully');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Chat List */}
      <div className="w-1/3 bg-white border-r border-gray-300 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Messages</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm"
          >
            + New Chat
          </button>
        </div>

        {/* Chat List */}
        <ChatList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleConversationSelect}
          loading={loading}
          currentUser={user}
          unreadCounts={unreadCounts}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            currentUser={user}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg
                className="mx-auto h-24 w-24 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-4 text-xl font-medium text-gray-900">
                Select a conversation
              </h3>
              <p className="mt-2 text-gray-500">
                Choose a conversation from the list or start a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onConversationCreated={handleNewConversation}
        />
      )}
    </div>
  );
};

export default ChatPage;