import React, { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import './EditUserModal.css';

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      username
      email
      role
      scopes
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

const EditUserModal = ({ user, onClose, onSuccess }) => {
  const { user: currentUser, login } = useAuth();
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

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        role: user.role || 'EMPLOYEE',
        scopes: user.scopes || [],
      });
    }
  }, [user]);

  const [updateUser, { loading }] = useMutation(UPDATE_USER_MUTATION, {
    onCompleted: (data) => {
      const updated = data?.updateUser;
      // If current user edited themselves, update auth context so scopes/role take effect immediately
      if (updated && currentUser && String(updated.id) === String(currentUser.id)) {
        const token = localStorage.getItem('token') || '';
        login(
          {
            id: updated.id,
            username: updated.username,
            email: updated.email,
            role: updated.role,
            scopes: updated.scopes || [],
          },
          token
        );
      }
      onSuccess();
    },
    onError: (err) => {
      if (err.networkError) {
        setError('Network issue');
      } else {
        setError(err.message || 'Failed to update user');
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

    if (!formData.username || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const input = {
      id: user.id,
      username: formData.username,
      email: formData.email,
      role: formData.role,
    };

    // Only include password if it's provided
    if (formData.password) {
      input.password = formData.password;
    }

    // Admin has all access, no scopes needed
    if (formData.role === 'EMPLOYEE') {
      input.scopes = formData.scopes;
    } else {
      input.scopes = [];
    }

    updateUser({
      variables: { input },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit User</h2>
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
            <label htmlFor="password">New Password (leave blank to keep current)</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter new password (min 6 characters)"
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
                // Clear scopes when switching to admin
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
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;

