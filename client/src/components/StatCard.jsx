import React from "react";

function StatCard({ icon, label, value, accent, children, style }) {
  return (
    <div className={`stat-card ${accent ? `stat-card--${accent}` : ""}`} style={style}>
      <div className="stat-card__header">
        <span className="stat-card__label">{label}</span>
        {icon && <span className="stat-card__icon">{icon}</span>}
      </div>
      <div className="stat-card__value">{value}</div>
      {children}
    </div>
  );
}

export default StatCard;
