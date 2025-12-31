import React, { useState, useEffect } from 'react';
import { useQuery, useSubscription, gql } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { hasScope, SCOPES } from '../../utils/permissions';
import ShipmentsGrid from './ShipmentsGrid';
import ShipmentsTile from './ShipmentsTile';
import ShipmentFilters from './ShipmentFilters';
import ShipmentDetailModal from './ShipmentDetailModal';
import AddShipmentModal from './AddShipmentModal';
import FlagShipmentModal from './FlagShipmentModal';
// DeleteConfirmationModal is used in ShipmentDetailModal, not here
import './ShipmentsView.css';

const SHIPMENTS_QUERY = gql`
  query GetShipments($page: Int, $limit: Int, $filter: ShipmentFilter, $sort: SortInput) {
    shipments(page: $page, limit: $limit, filter: $filter, sort: $sort) {
      shipments {
        id
        trackingNumber
        origin
        destination
        status
        carrier
        weight
        dimensions
        estimatedDelivery
        actualDelivery
        customerName
        customerEmail
        creatorEmail
        createdAt
        updatedAt
      }
      totalCount
      pageInfo {
        currentPage
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

const SHIPMENT_ADDED_SUBSCRIPTION = gql`
  subscription ShipmentAdded {
    shipmentAdded {
      id
      trackingNumber
      origin
      destination
      status
      carrier
      weight
      dimensions
      estimatedDelivery
      actualDelivery
      customerName
      customerEmail
      creatorEmail
      createdAt
      updatedAt
    }
  }
`;

const SHIPMENT_UPDATED_SUBSCRIPTION = gql`
  subscription ShipmentUpdated {
    shipmentUpdated {
      id
      trackingNumber
      origin
      destination
      status
      carrier
      weight
      dimensions
      estimatedDelivery
      actualDelivery
      customerName
      customerEmail
      creatorEmail
      createdAt
      updatedAt
    }
  }
`;

const SHIPMENT_DELETED_SUBSCRIPTION = gql`
  subscription ShipmentDeleted {
    shipmentDeleted
  }
`;

const ShipmentsView = ({ statusFilter = null }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'tile'
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [filters, setFilters] = useState(statusFilter ? { status: statusFilter } : {});
  const [sort, setSort] = useState({ field: 'createdAt', order: 'DESC' });
  
  // Update filters when statusFilter prop changes
  useEffect(() => {
    if (statusFilter) {
      setFilters({ status: statusFilter });
    } else {
      setFilters({});
    }
    setPage(1); // Reset to first page when filter changes
  }, [statusFilter]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flaggedShipment, setFlaggedShipment] = useState(null);
  const [actionType, setActionType] = useState(null);
  
  // Permission checks
  const canView = hasScope(user, SCOPES.VIEW_SHIPMENTS);
  const canCreate = hasScope(user, SCOPES.CREATE_SHIPMENTS);
  const canEdit = hasScope(user, SCOPES.EDIT_SHIPMENTS);
  const canDelete = hasScope(user, SCOPES.DELETE_SHIPMENTS);
  
  // Hooks must be called before any conditional returns
  const { data, loading, error, refetch } = useQuery(SHIPMENTS_QUERY, {
    variables: {
      page,
      limit,
      filter: Object.keys(filters).length > 0 ? filters : null,
      sort: sort.field ? sort : null,
    },
    fetchPolicy: 'cache-and-network',
          errorPolicy: 'all',
        });

        // Real-time subscriptions
        useSubscription(SHIPMENT_ADDED_SUBSCRIPTION, {
          onData: ({ data: subscriptionData }) => {
            if (subscriptionData?.data?.shipmentAdded) {
              refetch();
            }
          },
        });

        useSubscription(SHIPMENT_UPDATED_SUBSCRIPTION, {
          onData: ({ data: subscriptionData }) => {
            if (subscriptionData?.data?.shipmentUpdated) {
              refetch();
            }
          },
        });

        useSubscription(SHIPMENT_DELETED_SUBSCRIPTION, {
          onData: ({ data: subscriptionData }) => {
            if (subscriptionData?.data?.shipmentDeleted) {
              refetch();
            }
          },
        });

        const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSortChange = (field) => {
    setSort((prevSort) => ({
      field,
      order: prevSort.field === field && prevSort.order === 'ASC' ? 'DESC' : 'ASC',
    }));
  };

  const handleTileClick = (shipment) => {
    setSelectedShipment(shipment);
  };

  const handleAction = (shipment, type) => {
    setActionType(type);
    if (type === 'view' || type === 'edit') {
      setSelectedShipment(shipment);
    } else if (type === 'flag') {
      setFlaggedShipment(shipment);
      setShowFlagModal(true);
    } else if (type === 'delete') {
      // Open detail modal - delete confirmation will be handled there
      setSelectedShipment(shipment);
      setActionType('delete');
    }
  };

  const handleFlagSuccess = () => {
    setShowFlagModal(false);
    setFlaggedShipment(null);
    refetch(); // Refresh the list
  };

  const handleCloseModal = () => {
    setSelectedShipment(null);
    setActionType(null);
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    refetch();
  };

  // If user doesn't have VIEW_SHIPMENTS scope, show access denied message
  if (!canView) {
    return (
      <div className="shipments-view">
        <div className="access-denied">
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <h2>Access Denied</h2>
          <p>You don't have permission to view shipments.</p>
          <p className="access-denied-desc">Please contact your administrator to request VIEW_SHIPMENTS scope.</p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="shipments-loading">
        <div className="loading-spinner"></div>
        <p>Loading shipments...</p>
      </div>
    );
  }

  if (error && !data) {
    const errorMessage = error.networkError 
      ? 'Network issue'
      : error.message || 'Error loading shipments';
    
    return (
      <div className="shipments-error">
        <p>{errorMessage}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  const shipments = data?.shipments?.shipments || [];
  const pageInfo = data?.shipments?.pageInfo || { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
  const totalCount = data?.shipments?.totalCount || 0;

  return (
    <div className="shipments-view">
      <div className="shipments-header">
        <div className="header-left-section">
          <h2>Shipments</h2>
          <span className="shipment-count">({totalCount} total)</span>
        </div>
        <div className="header-right-section">
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={viewMode === 'tile' ? 'active' : ''}
              onClick={() => setViewMode('tile')}
              title="Tile View"
            >
              ⊡
            </button>
          </div>
          {canCreate && (
            <button className="add-button" onClick={() => setShowAddModal(true)}>
              + Add Shipment
            </button>
          )}
        </div>
      </div>

      <ShipmentFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        sort={sort}
      />

      {shipments.length === 0 && !loading && !error ? (
        <div className="shipments-empty">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h3>No Shipments Yet</h3>
          <p>Get started by creating your first shipment.</p>
          {canCreate && (
            <button 
              className="add-button" 
              onClick={() => setShowAddModal(true)}
              style={{ marginTop: '20px' }}
            >
              + Create First Shipment
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <ShipmentsGrid
          shipments={shipments}
          onSort={handleSortChange}
          sort={sort}
          onAction={handleAction}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ) : (
        <ShipmentsTile
          shipments={shipments}
          onTileClick={handleTileClick}
          onAction={handleAction}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {pageInfo.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(page - 1)}
            disabled={!pageInfo.hasPreviousPage}
            className="pagination-button"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pageInfo.currentPage} of {pageInfo.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!pageInfo.hasNextPage}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}

      {selectedShipment && (
        <ShipmentDetailModal
          shipment={selectedShipment}
          onClose={handleCloseModal}
          onUpdate={refetch}
          initialEditMode={actionType === 'edit'}
          initialDeleteMode={actionType === 'delete'}
        />
      )}

      {showAddModal && (
        <AddShipmentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {showFlagModal && flaggedShipment && (
        <FlagShipmentModal
          shipment={flaggedShipment}
          onClose={() => {
            setShowFlagModal(false);
            setFlaggedShipment(null);
          }}
          onFlag={handleFlagSuccess}
        />
      )}
    </div>
  );
};

export default ShipmentsView;

