import { db } from './db';
import { supabase } from './supabaseClient';

export const SyncService = {
  /**
   * Queue a local mutation to be synced to Supabase when online.
   */
  async queueMutation(table, operation, payload) {
    if (!payload.supabase_id) {
      payload.supabase_id = crypto.randomUUID(); // Give it a UUID for Supabase
    }
    
    // Add to local IndexedDB table
    payload.sync_status = 'pending';
    const localId = await db[table].add(payload);
    
    // Add to sync queue
    await db.sync_queue.add({
      table,
      operation,
      payload: { ...payload, id: undefined }, // strip local auto-incremented ID
      created_at: new Date().toISOString()
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncQueueToSupabase();
    }
    
    return { ...payload, id: localId };
  },

  /**
   * Process the sync queue and push to Supabase
   */
  async syncQueueToSupabase() {
    if (!navigator.onLine) return;

    const queue = await db.sync_queue.toArray();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        if (item.operation === 'INSERT') {
          // Send to Supabase
          const { error } = await supabase.from(item.table).insert([item.payload]);
          if (!error) {
            // Mark local as synced
            await db[item.table].where('supabase_id').equals(item.payload.supabase_id).modify({ sync_status: 'synced' });
            await db.sync_queue.delete(item.id);
          } else {
            console.error(`Failed to sync INSERT for ${item.table}`, error);
            // If it's a 400 or something unrecoverable without changes, we might need a dead-letter queue, 
            // but we'll leave it in the queue for now.
          }
        } else if (item.operation === 'RPC') {
          const { error } = await supabase.rpc(item.table, item.payload);
          if (!error) {
            await db.sync_queue.delete(item.id);
          } else {
            console.error(`Failed to sync RPC ${item.table}`, error);
          }
        } else if (item.operation === 'UPDATE') {
          const { error } = await supabase.from(item.table).update(item.payload).eq('id', item.payload.supabase_id);
          if (!error) {
            await db.sync_queue.delete(item.id);
          }
        } else if (item.operation === 'DELETE') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.payload.supabase_id);
          if (!error) {
            await db.sync_queue.delete(item.id);
          }
        }
      } catch (err) {
        console.error("Sync error", err);
      }
    }
  },

  /**
   * Fetch latest data from Supabase and populate local DB.
   * Call this on login or initial app load if online.
   */
  async initialSyncFromSupabase(table) {
    if (!navigator.onLine) return;

    const { data, error } = await supabase.from(table).select('*');
    if (!error && data) {
      // Clear existing local data that has been synced, or just use put to upsert
      // Simple strategy: Clear local and refill, except for unsynced items.
      const unsyncedIds = new Set((await db[table].where('sync_status').equals('pending').toArray()).map(x => x.supabase_id));
      
      const toUpsert = data.map(item => ({
        ...item,
        supabase_id: item.id,
        sync_status: 'synced'
      })).filter(item => !unsyncedIds.has(item.supabase_id));

      if (toUpsert.length > 0) {
        await db[table].bulkPut(toUpsert);
      }
    }
  },

  async syncAllTables() {
    if (!navigator.onLine) return;
    const tables = ['products', 'customers', 'sales', 'expenses', 'sale_items', 'journal_entries', 'logs'];
    await Promise.all(tables.map(t => this.initialSyncFromSupabase(t)));
  },

  async getQueueCount() {
    return await db.sync_queue.count();
  }
};
