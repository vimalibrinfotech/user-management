import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Common/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import UserTable from './components/Users/UserTable';
import Profile from './components/Users/Profile';
import ChangePassword from './components/Users/ChangePassword';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return user && user.role === 'admin' ? children : <Navigate to="/profile" />;
};

function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/profile" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/profile" /> : <Register />} 
        />
        <Route 
          path="/forgot-password" 
          element={user ? <Navigate to="/profile" /> : <ForgotPassword />} 
        />
        <Route 
          path="/reset-password" 
          element={user ? <Navigate to="/profile" /> : <ResetPassword />} 
        />

        {/* Protected Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/users"
          element={
            <AdminRoute>
              <UserTable />
            </AdminRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/profile" />} />
      </Routes>
    </div>
  );
}

export default App;