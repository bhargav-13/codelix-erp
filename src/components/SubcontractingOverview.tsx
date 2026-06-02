import React from 'react';
import './SubcontractingOverview.css';
import type { Subcontracting } from '../types';

interface SubcontractingOverviewProps {
  subcontracts: Subcontracting[];
}

const SubcontractingOverview: React.FC<SubcontractingOverviewProps> = ({ subcontracts }) => {
  return (
    <div className="subcontracting-overview-container">
      <h2>Subcontracting Overview</h2>
      <table className="subcontracting-overview-table">
        <thead>
          <tr>
            <th>Contractor</th>
            <th>Material</th>
            <th>Sent Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {subcontracts.map((subcontract) => (
            <tr key={subcontract.subcontractingId}>
              <td>{subcontract.contractor.name}</td>
              <td>{subcontract.item.name}</td>
              <td>{subcontract.sentStock} {subcontract.unit}</td>
              <td>
                <span className={`status-badge status-${subcontract.status.toLowerCase()}`}>
                  {subcontract.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubcontractingOverview;
