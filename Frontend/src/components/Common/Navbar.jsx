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
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-800">
              User Management
            </Link>

            {/* Public Navigation Links */}
            <div className="hidden md:flex space-x-4">
              <Link
                to="/products"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md transition"
              >
                Products
              </Link>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md"
              >
                Profile
              </Link>
              
              {/* Chat Link */}
              <Link
                to="/chat"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md"
              >
                Messages
              </Link>
              
              {user.role === 'admin' && (
                <>
                  <Link
                    to="/users"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md"
                  >
                    Users
                  </Link>
                  <Link
                    to="/products/manage"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md"
                  >
                    Manage Products
                  </Link>
                </>
              )}

              {/* User Info & Logout */}
              <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                <div className="flex items-center space-x-2">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user.firstName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {user.firstName}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {!user && (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;