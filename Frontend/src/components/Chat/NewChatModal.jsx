import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const NewChatModal = ({ onClose, onConversationCreated }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/chat/users');
      console.log('Fetched users:', data.users); // Debug log
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCreateConversation = async (e) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    if (isGroup && !groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (isGroup && selectedUsers.length < 2) {
      alert('Group must have at least 3 participants (including you)');
      return;
    }

    setLoading(true);

    try {
      console.log('Selected users before API call:', selectedUsers); // Debug log
      
      const { data } = await api.post('/chat/conversations', {
        participantIds: selectedUsers,
        isGroup,
        groupName: isGroup ? groupName : undefined,
        groupDescription: isGroup ? groupDescription : undefined
      });

      onConversationCreated(data.conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      console.error('Error response:', error.response?.data); // More detailed error
      alert(error.response?.data?.message || 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">New Conversation</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Chat Type Toggle */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="w-5 h-5 text-blue-600"
              />
              <span className="font-medium">Create Group Chat</span>
            </label>
          </div>

          {/* Group Details (if group) */}
          {isGroup && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Search Users */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Selected Users Count */}
          {selectedUsers.length > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                {isGroup && selectedUsers.length < 2 && (
                  <span className="text-red-600 ml-2">
                    (Need at least 2 more for a group)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* User List */}
          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            ) : (
              filteredUsers.map((u) => (
                <label
                  key={u._id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedUsers.includes(u._id) ? 'bg-blue-50 border border-blue-300' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u._id)}
                    onChange={() => handleUserToggle(u._id)}
                    className="w-5 h-5 text-blue-600 mr-3"
                  />
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                    {u.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {u.firstName} {u.lastName}
                    </h4>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateConversation}
            disabled={loading || selectedUsers.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;