import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMutation, gql } from '@apollo/client';
import './SettingsView.css';

const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

const SettingsView = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  const [changePassword, { loading: changingPassword }] = useMutation(CHANGE_PASSWORD_MUTATION, {
    onCompleted: () => {
      setSuccess(true);
      setError('');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    },
    onError: (err) => {
      if (err.networkError) {
        setError('Network issue');
      } else {
        setError(err.message || 'Failed to change password');
      }
      setSuccess(false);
    },
  });


  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setError('');
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordData.currentPassword || passwordData.currentPassword.trim() === '') {
      errors.currentPassword = 'Current password is required';
    }
    if (!passwordData.newPassword || passwordData.newPassword.trim() === '') {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    if (!passwordData.confirmPassword || passwordData.confirmPassword.trim() === '') {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }
    return errors;
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setError('');
    setPasswordErrors({});
    
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    changePassword({
      variables: {
        currentPassword: passwordData.currentPassword.trim(),
        newPassword: passwordData.newPassword.trim()
      }
    });
  };


  return (
    <div className="settings-view">
      <div className="settings-header">
        <h2>Settings</h2>
        <p className="settings-subtitle">Manage your account preferences and settings</p>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          <button 
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button 
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔒 Security
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3>Profile Information</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label>Username</label>
                  <input 
                    type="text" 
                    value={user?.username || ''} 
                    disabled
                    className="form-input"
                  />
                  <p className="form-help">Username cannot be changed</p>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={user?.email || ''} 
                    disabled
                    className="form-input"
                  />
                  <p className="form-help">Email cannot be changed</p>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input 
                    type="text" 
                    value={user?.role || ''} 
                    disabled
                    className="form-input"
                  />
                  <p className="form-help">Role is assigned by administrator</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h3>Security Settings</h3>
              <form onSubmit={handlePasswordSubmit} className="settings-form">
                {success && (
                  <div className="success-message">
                    <span className="success-icon">✅</span>
                    <span className="success-text">Password changed successfully!</span>
                  </div>
                )}
                {error && (
                  <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                  </div>
                )}
                <div className="form-group">
                  <label>Current Password *</label>
                  <input 
                    type="password" 
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className={passwordErrors.currentPassword ? 'form-input input-error' : 'form-input'}
                  />
                  {passwordErrors.currentPassword && (
                    <span className="field-error-message">{passwordErrors.currentPassword}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>New Password *</label>
                  <input 
                    type="password" 
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 6 characters)"
                    className={passwordErrors.newPassword ? 'form-input input-error' : 'form-input'}
                  />
                  {passwordErrors.newPassword && (
                    <span className="field-error-message">{passwordErrors.newPassword}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    className={passwordErrors.confirmPassword ? 'form-input input-error' : 'form-input'}
                  />
                  {passwordErrors.confirmPassword && (
                    <span className="field-error-message">{passwordErrors.confirmPassword}</span>
                  )}
                  <p className="form-help">Password must be at least 6 characters long</p>
                </div>
                <div className="form-group">
                  <button 
                    type="submit" 
                    className="save-button"
                    disabled={changingPassword}
                    style={{ marginTop: '8px' }}
                  >
                    {changingPassword ? 'Changing...' : '🔒 Change Password'}
                  </button>
                </div>
              </form>
              <div className="settings-form" style={{ marginTop: '32px' }}>
                <div className="form-group">
                  <label>Two-Factor Authentication</label>
                  <div className="toggle-group">
                    <span>Enable 2FA</span>
                    <label className="toggle-switch">
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="form-help">Add an extra layer of security to your account</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsView;


