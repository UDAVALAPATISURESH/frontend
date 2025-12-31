import React, { useState } from 'react';
import './ShipmentFilters.css';

const ShipmentFilters = ({ filters, onFilterChange, onSortChange, sort }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterInput = (key, value) => {
    const newFilters = { ...localFilters };
    if (value) {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    setLocalFilters(newFilters);
  };

  // Removed unused functions - filters are applied automatically via useEffect
  // const applyFilters = () => {
  //   onFilterChange(localFilters);
  // };

  // const clearFilters = () => {
  //   setLocalFilters({});
  //   onFilterChange({});
  // };

  const sortOptions = [
    { field: 'createdAt', label: 'Date Created' },
    { field: 'trackingNumber', label: 'Tracking Number' },
    { field: 'status', label: 'Status' },
    { field: 'carrier', label: 'Carrier' },
    { field: 'weight', label: 'Weight' },
  ];

  return (
    <div className="shipment-filters-visible">
      <div className="filters-visible-header">
        <div className="filter-buttons-group">
          <label className="filter-label">Status:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${!localFilters.status ? 'active' : ''}`}
              onClick={() => {
                const newFilters = { ...localFilters };
                delete newFilters.status;
                setLocalFilters(newFilters);
                onFilterChange(newFilters);
              }}
            >
              All
            </button>
            <button 
              className={`filter-btn ${localFilters.status === 'PENDING' ? 'active' : ''}`}
              onClick={() => {
                handleFilterInput('status', 'PENDING');
                onFilterChange({ ...localFilters, status: 'PENDING' });
              }}
            >
              Pending
            </button>
            <button 
              className={`filter-btn ${localFilters.status === 'IN_TRANSIT' ? 'active' : ''}`}
              onClick={() => {
                handleFilterInput('status', 'IN_TRANSIT');
                onFilterChange({ ...localFilters, status: 'IN_TRANSIT' });
              }}
            >
              In Transit
            </button>
            <button 
              className={`filter-btn ${localFilters.status === 'DELIVERED' ? 'active' : ''}`}
              onClick={() => {
                handleFilterInput('status', 'DELIVERED');
                onFilterChange({ ...localFilters, status: 'DELIVERED' });
              }}
            >
              Delivered
            </button>
          </div>
        </div>
        <div className="sort-controls-visible">
          <label className="filter-label">Sort:</label>
          <div className="sort-buttons">
            {sortOptions.map((option) => (
              <button
                key={option.field}
                className={`sort-btn ${sort.field === option.field ? 'active' : ''}`}
                onClick={() => onSortChange(option.field)}
              >
                {option.label}
              </button>
            ))}
            <button
              className="sort-order-btn"
              onClick={() => onSortChange(sort.field)}
              title={`Sort ${sort.order === 'ASC' ? 'Descending' : 'Ascending'}`}
            >
              {sort.order === 'ASC' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
      <div className="search-filter">
        <input
          type="text"
          placeholder="Search by tracking, customer, origin, destination..."
          value={localFilters.search || ''}
          onChange={(e) => {
            const newFilters = { ...localFilters, search: e.target.value };
            setLocalFilters(newFilters);
            onFilterChange(newFilters);
          }}
          className="search-input"
        />
      </div>
    </div>
  );
};

export default ShipmentFilters;

