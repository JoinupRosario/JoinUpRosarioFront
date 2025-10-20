import React from 'react';
import './StatCard.css';

const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color = 'primary',
  loading = false 
}) => {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__header">
        <div className="stat-card__icon">
          <Icon />
        </div>
        <div className="stat-card__title">{title}</div>
      </div>
      <div className="stat-card__content">
        <div className="stat-card__value">
          {loading ? (
            <div className="stat-card__skeleton"></div>
          ) : (
            value
          )}
        </div>
        {change && !loading && (
          <div className={`stat-card__change stat-card__change--${changeType}`}>
            <span className="stat-card__change-icon">
              {changeType === 'positive' ? '↗' : '↘'}
            </span>
            {change}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
