import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { hasScope, SCOPES, isAdmin } from '../../utils/permissions';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal';
import './UsersView.css';

const USERS_QUERY = gql`
  query Users {
    users {
      id
      username
      email
      role
      scopes
    }
  }
`;

const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

const UsersView = () => {
  const { user: currentUser } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const { loading, error, data, refetch } = useQuery(USERS_QUERY);
  
  // Permission checks - ADMIN role OR MANAGE_USERS scope
  const canManageUsers = isAdmin(currentUser) || hasScope(currentUser, SCOPES.MANAGE_USERS);
  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER_MUTATION, {
    onCompleted: () => {
      refetch();
      setDeleteConfirm(null);
      setDeleteError('');
    },
    onError: (err) => {
      if (err.networkError) {
        setDeleteError('Network issue');
      } else {
        setDeleteError(err.message || 'Failed to delete user');
      }
    },
  });

  const handleDeleteClick = (userId, username) => {
    setDeleteConfirm({ userId, username });
    setDeleteError('');
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteUser({
        variables: { id: deleteConfirm.userId },
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
    setDeleteError('');
  };

  const handleEdit = (user) => {
    setEditingUser(user);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setEditingUser(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="users-loading">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    const errorMessage = error.networkError 
      ? 'Network issue'
      : error.message || 'Error loading users';
    return (
      <div className="users-error">
        <p>{errorMessage}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  const users = data?.users || [];

  return (
    <div className="users-view">
      <div className="users-header">
        <div>
          <h2>User Management</h2>
          <span className="user-count">{users.length} {users.length === 1 ? 'user' : 'users'}</span>
        </div>
        {canManageUsers && (
          <button className="add-user-button" onClick={() => setShowAddModal(true)}>
            + Add User
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="users-empty">
          <div className="empty-icon">👥</div>
          <h3>No Users</h3>
          <p>Create your first user to get started.</p>
          {canManageUsers && (
            <button className="add-user-button" onClick={() => setShowAddModal(true)}>
              + Create User
            </button>
          )}
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-small">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="user-name">{user.username}</span>
                    </div>
                  </td>
                  <td>
                    <span className="user-email-text">{user.email}</span>
                  </td>
                  <td>
                    <span className={`user-role-badge ${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className="user-status active">Active</span>
                  </td>
                  <td>
                    {canManageUsers && (
                      <div className="user-actions">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(user)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteClick(user.id, user.username)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddUserModal
          onClose={handleCloseModals}
          onSuccess={handleCloseModals}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={handleCloseModals}
          onSuccess={handleCloseModals}
        />
      )}

      {deleteConfirm && (
        <>
          <DeleteConfirmationModal
            isOpen={true}
            onClose={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
            title="Delete User"
            message={`Are you sure you want to delete user "${deleteConfirm.username}"?`}
            itemName={deleteConfirm.username}
            loading={deleting}
          />
          {deleteError && (
            <div className="delete-error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{deleteError}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsersView;

