import React from 'react';
import './DashboardCard.css';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon }) => {
  return (
    <div className="dashboard-card">
      <div className="card-icon">
        <img src={icon} alt={title} />
      </div>
      <div className="card-content">
        <div className="card-title">{title}</div>
        <div className="card-value">{value}</div>
      </div>
    </div>
  );
};

export default DashboardCard;
