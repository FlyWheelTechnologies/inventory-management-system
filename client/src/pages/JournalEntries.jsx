import { useState, useEffect, useMemo } from "react";
import "./Dashboard.css";
import { JournalEntriesService } from "../services/JournalEntriesService";
import JournalStats from "../components/JournalEntries/JournalStats";
import JournalTable from "../components/JournalEntries/JournalTable";

export default function JournalEntries() {
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('Daily'); // Daily, Monthly, AllTime
  const [itemsToShow, setItemsToShow] = useState(25);
  const [accountTypeFilter, setAccountTypeFilter] = useState("All");

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const data = await JournalEntriesService.fetchJournalEntries();
      setJournal(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const currentData = useMemo(() => {
    let base = journal;
    if (accountTypeFilter !== 'All') {
      base = base.filter(j => j.account_type === accountTypeFilter);
    }

    if (viewMode === 'Daily') {
      return base.filter(j => j.created_at.startsWith(selectedDate));
    }

    if (viewMode === 'Monthly') {
      const monthPrefix = selectedDate.substring(0, 7);
      const monthlyEntries = base.filter(j => j.created_at.startsWith(monthPrefix));

      const grouped = monthlyEntries.reduce((acc, curr) => {
        const date = curr.created_at.split('T')[0];
        if (!acc[date]) acc[date] = { date, debit: 0, credit: 0, count: 0 };
        acc[date].debit += curr.debit;
        acc[date].credit += curr.credit;
        acc[date].count += 1;
        return acc;
      }, {});

      return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    }

    // AllTime
    const grouped = base.reduce((acc, curr) => {
      const date = curr.created_at.split('T')[0];
      if (!acc[date]) acc[date] = { date, debit: 0, credit: 0, count: 0 };
      acc[date].debit += curr.debit;
      acc[date].credit += curr.credit;
      acc[date].count += 1;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [journal, viewMode, selectedDate, accountTypeFilter]);

  const report = useMemo(() => {
    const dataForSums = viewMode === 'Daily' ? currentData : journal.filter(j => {
      if (viewMode === 'Monthly') return j.created_at.startsWith(selectedDate.substring(0, 7));
      return true;
    });

    const totalsales = dataForSums.filter(j => j.account_type === 'REVENUE').reduce((a, b) => a + b.debit, 0);
    const totaltax = dataForSums.filter(j => j.account_type === 'TAX_PAYABLE').reduce((a, b) => a + b.credit, 0);
    const totalpaid = dataForSums.filter(j => ['CASH', 'MOMO', 'BANK'].includes(j.account_type)).reduce((a, b) => a + (b.debit - b.credit), 0);
    const totalexpenses = dataForSums.filter(j => j.account_type === 'EXPENSE').reduce((a, b) => a + b.debit, 0);

    return {
      totalsales,
      totaltax,
      totalpaid,
      totalexpenses,
      netcash: totalpaid - totalexpenses
    };
  }, [journal, currentData, viewMode, selectedDate]);

  const totalDebits = currentData.reduce((a, b) => a + (b.debit || 0), 0);
  const totalCredits = currentData.reduce((a, b) => a + (b.credit || 0), 0);
  const paginated = currentData.slice(0, itemsToShow);

  const handleExportCSV = () => {
    const isExportAll = viewMode === 'AllTime';
    const filename = isExportAll ? `Accounting_All_Entries_${today}.csv` : `Accounting_${viewMode}_${selectedDate}.csv`;
    JournalEntriesService.exportToCSV(journal, filename);
  };

  if (loading) return <div className="p-6"><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div style={{ padding: 24 }} className="journal-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="section-title">Accounting Ledger</h2>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }} className="no-print">
            {['Daily', 'Monthly', 'AllTime'].map(m => (
              <button 
                key={m}
                onClick={() => { setViewMode(m); setItemsToShow(20); }}
                style={{ 
                  padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  background: viewMode === m ? 'var(--brand-primary)' : '#e5e7eb',
                  color: viewMode === m ? '#fff' : '#4b5563'
                }}
              >
                {m === 'AllTime' ? 'See All' : m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {viewMode !== 'AllTime' && (
            <input 
              type={viewMode === 'Daily' ? "date" : "month"} 
              className="table-search" 
              value={viewMode === 'Daily' ? selectedDate : selectedDate.substring(0, 7)} 
              onChange={e => setSelectedDate(e.target.value)} 
              style={{ width: 160 }}
            />
          )}
          <select 
            className="table-search" 
            value={accountTypeFilter} 
            onChange={e => setAccountTypeFilter(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="All">All Accounts</option>
            {[...new Set(journal.map(j => j.account_type))].sort().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <button onClick={handleExportCSV} className="action-btn" style={{ background: '#059669', color: '#fff' }}>
            {viewMode === 'Daily' ? 'Audit Export' : 'Export All'}
          </button>
          <button onClick={() => window.print()} className="action-btn" style={{ background: '#333', color: '#fff' }}>
            Print PDF
          </button>
        </div>
      </div>

      <JournalStats report={report} />

      <JournalTable
        viewMode={viewMode}
        selectedDate={selectedDate}
        paginated={paginated}
        currentData={currentData}
        itemsToShow={itemsToShow}
        setItemsToShow={setItemsToShow}
        totalDebits={totalDebits}
        totalCredits={totalCredits}
        onDayClick={(date) => { setSelectedDate(date); setViewMode('Daily'); }}
      />

      <style>{`
        @media print {
          .no-print, .sidebar, .top-nav { display: none !important; }
          .app-shell { display: block !important; }
          .main-content { margin-left: 0 !important; padding: 0 !important; }
          .table-card { box-shadow: none !important; border: none !important; }
          .print-section { width: 100% !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
