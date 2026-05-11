import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../services/SyncService';
import { db } from '../services/db';
import { supabase } from '../services/supabaseClient';

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should queue a mutation locally when offline', async () => {
    const table = 'products';
    const operation = 'INSERT';
    const payload = { name: 'Test Product', stock_quantity: 10 };

    // Mock db.sync_queue with all necessary methods
    db.sync_queue = { 
      add: vi.fn().mockResolvedValue(1),
      toArray: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue()
    };
    db[table] = { add: vi.fn().mockResolvedValue(1) };

    await SyncService.queueMutation(table, operation, payload);

    expect(db.sync_queue.add).toHaveBeenCalledWith(expect.objectContaining({
      table,
      operation,
      payload
    }));
    expect(db[table].add).toHaveBeenCalled();
  });

  it('should attempt to sync all tables when online', async () => {
    const syncSpy = vi.spyOn(SyncService, 'initialSyncFromSupabase').mockResolvedValue([]);
    
    await SyncService.syncAllTables();
    
    // Check if it tries to sync multiple tables
    expect(syncSpy).toHaveBeenCalled();
  });
});
