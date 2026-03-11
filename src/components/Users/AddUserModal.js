import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import './AddUserModal.css';

const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $email: String!, $password: String!, $role: UserRole!, $scopes: [String!]) {
    register(username: $username, email: $email, password: $password, role: $role, scopes: $scopes) {
      user {
        id
        username
        email
        role
        scopes
      }
    }
  }
`;

const AVAILABLE_SCOPES = [
  'VIEW_SHIPMENTS',
  'CREATE_SHIPMENTS',
  'EDIT_SHIPMENTS',
  'DELETE_SHIPMENTS',
  'VIEW_ANALYTICS',
  'VIEW_REPORTS',
  'MANAGE_USERS',
];

const AddUserModal = ({ onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    scopes: [],
  });
  const [error, setError] = useState('');

  // Roles current user is allowed to assign
  const roleOptions = currentUser?.role === 'ADMIN'
    ? ['EMPLOYEE', 'ADMIN']
    : ['EMPLOYEE'];

  // Scopes current user is allowed to assign; only real admins can grant MANAGE_USERS
  const visibleScopes = currentUser?.role === 'ADMIN'
    ? AVAILABLE_SCOPES
    : AVAILABLE_SCOPES.filter(scope => scope !== 'MANAGE_USERS');

  const [register, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: () => {
      onSuccess();
    },
    onError: (err) => {
      if (err.networkError) {
        setError('Network issue');
      } else {
        setError(err.message || 'Failed to create user');
      }
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Admin has all access, no scopes needed
    const scopes = formData.role === 'ADMIN' ? [] : formData.scopes;

    register({
      variables: {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        scopes: scopes,
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New User</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password (min 6 characters)"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={(e) => {
                handleInputChange(e);
                // Clear scopes when switching to admin (admin has all access)
                if (e.target.value === 'ADMIN') {
                  setFormData(prev => ({ ...prev, scopes: [] }));
                }
              }}
              required
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role === 'ADMIN' ? 'Admin' : 'Employee'}
                </option>
              ))}
            </select>
          </div>

          {formData.role === 'EMPLOYEE' && (
            <div className="form-group">
              <label>Access Scopes (Select permissions for employee)</label>
              <div className="scopes-container">
                {visibleScopes.map((scope) => (
                  <label key={scope} className="scope-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            scopes: [...prev.scopes, scope]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            scopes: prev.scopes.filter(s => s !== scope)
                          }));
                        }
                      }}
                    />
                    <span>{scope.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
              {formData.role === 'ADMIN' && (
                <p className="scope-note">Admin has all access - no scopes needed</p>
              )}
            </div>
          )}

          {formData.role === 'ADMIN' && (
            <div className="form-group">
              <p className="scope-note admin-note">
                ⚡ Admin users have full access to all features - no scopes needed
              </p>
            </div>
          )}


          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;

