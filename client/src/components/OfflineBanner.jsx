import { useState, useEffect } from 'react';
import { SyncService } from '../services/SyncService';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncing(true);
      SyncService.syncQueueToSupabase().then(() => {
        setSyncing(false);
        updateQueueCount();
      });
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    updateQueueCount();
    const interval = setInterval(updateQueueCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateQueueCount = async () => {
    const count = await SyncService.getQueueCount();
    setQueueCount(count);
  };

  if (isOnline && queueCount === 0 && !syncing) return null;

  return (
    <div style={{
      background: isOnline ? (syncing ? '#fef08a' : '#dcfce3') : '#fee2e2',
      color: isOnline ? (syncing ? '#854d0e' : '#166534') : '#991b1b',
      padding: '10px 24px',
      fontSize: '13px',
      fontWeight: '600',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: isOnline ? (syncing ? '1px solid #fde047' : '1px solid #bbf7d0') : '1px solid #fecaca'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isOnline ? (
          <>
            <span style={{ fontSize: '16px' }}>⚠️</span> 
            <span>Offline mode. Please connect to the internet to sync with the database.</span>
          </>
        ) : syncing ? (
          <>
            <span style={{ fontSize: '16px' }}>🔄</span> 
            <span>Syncing local changes to cloud database...</span>
          </>
        ) : queueCount > 0 ? (
          <>
            <span style={{ fontSize: '16px' }}>☁️</span> 
            <span>{queueCount} pending changes. Syncing...</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '16px' }}>✅</span> 
            <span>All systems synchronized.</span>
          </>
        )}
      </div>
      {!isOnline && queueCount > 0 && (
        <span style={{ fontSize: '12px', background: '#f87171', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
          {queueCount} pending
        </span>
      )}
    </div>
  );
}
