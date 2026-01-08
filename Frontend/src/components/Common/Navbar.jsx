import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-800">
              User Management
            </Link>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md"
              >
                Profile
              </Link>
              
              {/* NEW: Messages/Chat Link */}
              <Link
                to="/chat"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md"
              >
                Messages
              </Link>
              
              {user.role === 'admin' && (
                <Link
                  to="/users"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md"
                >
                  Users
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;