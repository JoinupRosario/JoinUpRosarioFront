import React from 'react';
import './SimpleChart.css';

const SimpleChart = ({ 
  title, 
  data, 
  type = 'bar', 
  height = 200,
  loading = false 
}) => {
  const maxValue = Math.max(...data.map(item => item.value));
  
  const renderBarChart = () => (
    <div className="chart-container">
      <div className="chart-bars">
        {data.map((item, index) => (
          <div key={index} className="chart-bar-group">
            <div 
              className="chart-bar"
              style={{ 
                height: `${(item.value / maxValue) * 100}%`,
                animationDelay: `${index * 0.1}s`
              }}
            ></div>
            <div className="chart-label">{item.label}</div>
            <div className="chart-value">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;
    
    return (
      <div className="chart-container">
        <div className="pie-chart">
          <svg viewBox="0 0 100 100" className="pie-svg">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const startAngle = (cumulativePercentage / 100) * 360;
              const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
              
              const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
              const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
              
              const largeArcFlag = percentage > 50 ? 1 : 0;
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              cumulativePercentage += percentage;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={`var(--color-${index})`}
                  className="pie-segment"
                  style={{ animationDelay: `${index * 0.2}s` }}
                />
              );
            })}
          </svg>
        </div>
        <div className="pie-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: `var(--color-${index})` }}
              ></div>
              <span className="legend-label">{item.label}</span>
              <span className="legend-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLineChart = () => (
    <div className="chart-container">
      <div className="line-chart">
        <svg viewBox="0 0 100 100" className="line-svg">
          <polyline
            fill="none"
            stroke="var(--primary-color)"
            strokeWidth="2"
            points={data.map((item, index) => 
              `${(index / (data.length - 1)) * 100},${100 - (item.value / maxValue) * 100}`
            ).join(' ')}
            className="line-path"
          />
          {data.map((item, index) => (
            <circle
              key={index}
              cx={(index / (data.length - 1)) * 100}
              cy={100 - (item.value / maxValue) * 100}
              r="2"
              fill="var(--primary-color)"
              className="line-point"
              style={{ animationDelay: `${index * 0.1}s` }}
            />
          ))}
        </svg>
      </div>
      <div className="line-labels">
        {data.map((item, index) => (
          <div key={index} className="line-label">{item.label}</div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">{title}</h3>
        </div>
        <div className="chart-skeleton" style={{ height: `${height}px` }}>
          <div className="skeleton-content"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
      </div>
      <div className="chart-content" style={{ height: `${height}px` }}>
        {type === 'bar' && renderBarChart()}
        {type === 'pie' && renderPieChart()}
        {type === 'line' && renderLineChart()}
      </div>
    </div>
  );
};

export default SimpleChart;
