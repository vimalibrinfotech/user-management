import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Common/Navbar";

// Auth Components
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import ForgotPassword from "./components/Auth/ForgotPassword";
import ResetPassword from "./components/Auth/ResetPassword";

// User Components
import UserTable from "./components/Users/UserTable";
import Profile from "./components/Users/Profile";
import ChangePassword from "./components/Users/ChangePassword";

// Product Components
import ProductsList from "./components/Products/ProductsList";
import ProductDetail from "./components/Products/ProductDetail";
import ProductManagement from "./components/Products/ProductManagement";

// Payment Components
import PaymentSelection from "./components/Payment/PaymentSelection";
import PaymentSuccess from "./components/Payment/PaymentSuccess";
import PaymentCancel from "./components/Payment/PaymentCancel";

// Other Components
import CompleteProfile from "./components/CompleteProfile/CompleteProfile";
import ChatPage from "./components/Chat/ChatPage";

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

        {/* Products Routes - Public */}
        <Route path="/products" element={<ProductsList />} />
        <Route path="/products/:id" element={<ProductDetail />} />

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
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />

        {/* Payment Routes - Protected */}
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <PaymentSelection />
            </ProtectedRoute>
          }
        />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        {/* Chat Route */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
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
        <Route
          path="/products/manage"
          element={
            <AdminRoute>
              <ProductManagement />
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