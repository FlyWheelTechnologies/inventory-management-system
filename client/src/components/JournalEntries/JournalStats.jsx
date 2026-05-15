import React from "react";
import { formatCurrency } from "../../services/formatters";
import StatCard from "../StatCard";

export default function JournalStats({ report }) {
  return (
    <div className="stats-grid">
      <StatCard
        label="Expected Revenue"
        value={`GHS ${formatCurrency(report.totalsales)}`}
        children={<div style={{fontSize:11, color:'#6b7280', marginTop:4}}>Includes GHS {formatCurrency(report.totaltax)} Tax</div>}
      />
      <StatCard
        label="Actual Cash In"
        value={`GHS ${formatCurrency(report.totalpaid)}`}
        style={{ color: '#059669' }}
      />
      <StatCard
        label="Total Expenses"
        value={`GHS ${formatCurrency(report.totalexpenses)}`}
        style={{ color: '#ef4444' }}
      />
      <StatCard
        label="Net Cash Balance"
        value={`GHS ${formatCurrency(report.netcash)}`}
        style={{
          borderLeft: '3px solid var(--brand-primary)',
          color: report.netcash >= 0 ? '#059669' : '#ef4444'
        }}
      />
    </div>
  );
}
