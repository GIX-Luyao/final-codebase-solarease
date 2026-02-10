import React from 'react'
import './SummaryCard.css'

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default', // 'default', 'highlight', 'success', 'warning'
  trend = null, // { value: '+15%', direction: 'up' | 'down' }
  className = ''
}) {
  return (
    <div className={`roi-summary-card roi-summary-card--${variant} ${className}`}>
      {icon && <div className="roi-summary-card-icon">{icon}</div>}

      <div className="roi-summary-card-content">
        <div className="roi-summary-card-title">{title}</div>

        <div className="roi-summary-card-value-row">
          <span className="roi-summary-card-value">{value}</span>
          {trend && (
            <span className={`roi-summary-card-trend roi-trend--${trend.direction}`}>
              {trend.direction === 'up' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
              )}
              {trend.value}
            </span>
          )}
        </div>

        {subtitle && <div className="roi-summary-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}
