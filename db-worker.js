/**
 * P0 改造：数据层改用 IndexedDB
 * Web Worker 中处理所有数据库操作，主线程只发送消息
 */

const DB_NAME = 'PRISMA_LiteratureDB_v1.5';
const STORE_NAME = 'records';
const INDEX_STORE = 'dedup_index';
const VERSION = 1;

let db = null;

// 初始化 IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // 创建records存储
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('doi_index', 'doi_norm', { unique: false });
        objectStore.createIndex('title_index', 'title_norm', { unique: false });
        objectStore.createIndex('year_index', 'year', { unique: false });
      }
      
      // 创建去重索引存储
      if (!database.objectStoreNames.contains(INDEX_STORE)) {
        database.createObjectStore(INDEX_STORE, { keyPath: 'hash_key' });
      }
    };
  });
}

// 清空所有数据
function clearAllData() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, INDEX_STORE], 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(INDEX_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// 批量插入记录（流式处理，每次500条）
function batchInsertRecords(records, batchSize = 500) {
  return new Promise(async (resolve, reject) => {
    const total = records.length;
    let inserted = 0;
    
    for (let i = 0; i < total; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      
      batch.forEach(record => {
        objectStore.add(record);
      });
      
      transaction.oncomplete = () => {
        inserted += batch.length;
        // 定期发送进度报告
        if (inserted % (batchSize * 2) === 0) {
          self.postMessage({
            type: 'IMPORT_PROGRESS',
            inserted,
            total
          });
        }
      };
      
      await new Promise((res, rej) => {
        transaction.onerror = () => rej(transaction.error);
        transaction.oncomplete = () => res();
      });
    }
    
    resolve({ imported: inserted });
  });
}

// 获取总记录数
function getRecordCount() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 虚拟滚动：获取分页数据 (pageNum 从 0 开始, pageSize 默认 100)
function getPagedRecords(pageNum = 0, pageSize = 100) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const allRecords = [];
    
    const request = objectStore.openCursor();
    let count = 0;
    const startIdx = pageNum * pageSize;
    const endIdx = startIdx + pageSize;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (count >= startIdx && count < endIdx) {
          allRecords.push(cursor.value);
        }
        count++;
        cursor.continue();
      } else {
        // 游标遍历完毕
        resolve({
          records: allRecords,
          pageNum,
          pageSize,
          totalCount: count
        });
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

// 根据条件查询记录
function queryRecords(filter = {}) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const results = [];
    
    const request = objectStore.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const record = cursor.value;
        let match = true;
        
        // 简单过滤逻辑
        if (filter.minYear && record.year && record.year < filter.minYear) match = false;
        if (filter.maxYear && record.year && record.year > filter.maxYear) match = false;
        if (filter.excludeKeywords && filter.excludeKeywords.some(kw => 
          record.title_norm?.includes(kw.toLowerCase()) || 
          record.abstract?.toLowerCase().includes(kw.toLowerCase())
        )) match = false;
        
        if (match) results.push(record);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

// 更新记录（用于标记排除等）
function updateRecord(id, updates) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    const getRequest = objectStore.get(id);
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      Object.assign(record, updates);
      const putRequest = objectStore.put(record);
      putRequest.onsuccess = () => resolve(record);
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// 导出所有记录为 CSV
async function exportToCSV(filter = {}) {
  const records = await queryRecords(filter);
  if (records.length === 0) return '';
  
  const keys = Object.keys(records[0]);
  const header = keys.map(k => `"${k}"`).join(',');
  const rows = records.map(r => 
    keys.map(k => {
      const v = r[k];
      if (v === null || v === undefined) return '""';
      if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
      return `"${v}"`;
    }).join(',')
  );
  
  return [header, ...rows].join('\n');
}

// 处理 Worker 消息
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'INIT_DB':
        await initDB();
        self.postMessage({ type: 'DB_READY' });
        break;
        
      case 'CLEAR_DATA':
        await clearAllData();
        self.postMessage({ type: 'DATA_CLEARED' });
        break;
        
      case 'IMPORT_RECORDS':
        const result = await batchInsertRecords(data.records, data.batchSize || 500);
        self.postMessage({ type: 'IMPORT_COMPLETE', result });
        break;
        
      case 'GET_COUNT':
        const count = await getRecordCount();
        self.postMessage({ type: 'COUNT_RESULT', count });
        break;
        
      case 'GET_PAGED':
        const paged = await getPagedRecords(data.pageNum, data.pageSize);
        self.postMessage({ type: 'PAGED_RESULT', paged });
        break;
        
      case 'QUERY_RECORDS':
        const records = await queryRecords(data.filter);
        self.postMessage({ type: 'QUERY_RESULT', records });
        break;
        
      case 'UPDATE_RECORD':
        const updated = await updateRecord(data.id, data.updates);
        self.postMessage({ type: 'UPDATE_RESULT', updated });
        break;
        
      case 'EXPORT_CSV':
        const csv = await exportToCSV(data.filter);
        self.postMessage({ type: 'EXPORT_RESULT', csv });
        break;
        
      default:
        self.postMessage({ type: 'ERROR', error: 'Unknown message type' });
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};

// 启动 Worker 时初始化数据库
(async () => {
  await initDB();
  self.postMessage({ type: 'WORKER_READY' });
})();
