// src/utils/syncQueue.js
import axios from 'axios';

export const SyncQueue = {
  add(tableName, operation, data) {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({ tableName, operation, data, timestamp: Date.now() });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  },

  async process(apiMap) {
    let queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    if (queue.length === 0) return;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const url = apiMap[item.tableName];
      if (!url) continue;

      try {
        await axios.post(url, { operation: item.operation, data: item.data });
        queue.splice(i, 1);
        i--;
      } catch (e) {
        console.warn(`Retry sync gagal untuk ${item.tableName}:`, e.message);
        break; 
      }
    }
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  }
};
