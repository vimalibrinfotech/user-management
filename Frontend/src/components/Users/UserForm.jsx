import { useState, useEffect } from 'react';
import PhoneInput from '../Common/PhoneInput';
import api from '../../utils/api';

const UserForm = ({ user, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    address: '',
    role: 'user'
  });
  const [phones, setPhones] = useState(['']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If editing, populate form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        address: user.address || '',
        role: user.role || 'user'
      });
      setPhones(user.phones?.length > 0 ? user.phones : ['']);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.firstName || formData.firstName.length < 2) {
      setError('First name must be at least 2 characters');
      return false;
    }
    if (!formData.lastName || formData.lastName.length < 2) {
      setError('Last name must be at least 2 characters');
      return false;
    }
    if (!formData.email.match(/^\S+@\S+\.\S+$/)) {
      setError('Please enter a valid email');
      return false;
    }
    
    // Password required only for new user
    if (!user && formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    // If editing and password provided, validate it
    if (user && formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    if (!formData.address || formData.address.length < 10) {
      setError('Address must be at least 10 characters');
      return false;
    }

    const validPhones = phones.filter(phone => phone.trim() !== '');
    if (validPhones.length === 0) {
      setError('Please add at least one phone number');
      return false;
    }

    for (let phone of validPhones) {
      if (!/^[0-9]{10}$/.test(phone)) {
        setError('Each phone number must be exactly 10 digits');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const validPhones = phones.filter(phone => phone.trim() !== '');
      
      const submitData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phones: validPhones,
        address: formData.address,
        role: formData.role
      };

      // Include password only if provided
      if (formData.password) {
        submitData.password = formData.password;
      }

      if (user) {
        // Update existing user
        await api.put(`/users/${user._id}`, submitData);
      } else {
        // Create new user
        await api.post('/users', submitData);
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password {user ? '(leave blank to keep current)' : <span className="text-red-500">*</span>}
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required={!user}
          placeholder={user ? 'Enter new password to change' : 'Enter password'}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <PhoneInput phones={phones} setPhones={setPhones} />

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Address <span className="text-red-500">*</span>
        </label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
          rows="3"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UserForm;