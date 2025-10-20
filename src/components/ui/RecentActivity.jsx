import React from 'react';
import './RecentActivity.css';

const RecentActivity = ({ 
  title, 
  activities, 
  loading = false,
  maxItems = 5 
}) => {
  const getActivityIcon = (type) => {
    const icons = {
      'application': '📝',
      'company': '🏢',
      'student': '👨‍🎓',
      'practice': '💼',
      'notification': '🔔',
      'approval': '✅',
      'rejection': '❌'
    };
    return icons[type] || '📄';
  };

  const getActivityColor = (type) => {
    const colors = {
      'application': 'primary',
      'company': 'info',
      'student': 'success',
      'practice': 'warning',
      'notification': 'info',
      'approval': 'success',
      'rejection': 'danger'
    };
    return colors[type] || 'primary';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMinutes = Math.floor((now - activityDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    
    return activityDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="recent-activity-card">
        <div className="activity-header">
          <h3 className="activity-title">{title}</h3>
        </div>
        <div className="activity-list">
          {[...Array(maxItems)].map((_, index) => (
            <div key={index} className="activity-item activity-item--loading">
              <div className="activity-icon-skeleton"></div>
              <div className="activity-content">
                <div className="activity-text-skeleton"></div>
                <div className="activity-time-skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="recent-activity-card">
      <div className="activity-header">
        <h3 className="activity-title">{title}</h3>
        <span className="activity-count">{activities.length} actividades</span>
      </div>
      <div className="activity-list">
        {activities.slice(0, maxItems).map((activity, index) => (
          <div key={index} className="activity-item">
            <div className={`activity-icon activity-icon--${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="activity-content">
              <div className="activity-text">
                <span className="activity-description">{activity.description}</span>
                {activity.user && (
                  <span className="activity-user">por {activity.user}</span>
                )}
              </div>
              <div className="activity-meta">
                <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                {activity.status && (
                  <span className={`activity-status activity-status--${activity.status}`}>
                    {activity.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="activity-empty">
            <div className="activity-empty-icon">📭</div>
            <p>No hay actividades recientes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
