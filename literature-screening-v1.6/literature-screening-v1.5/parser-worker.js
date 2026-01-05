/**
 * P0 改造：解析/去重 Worker
 * 在后台线程处理所有 CPU 密集的操作
 */

// 文件格式识别和流式解析
const PARSERS = {
  csv: parseCSV,
  tsv: parseTSV,
  ris: parseRIS,
  enw: parseENW,
  bibtex: parseBibTeX,
  rdf: parseRDF,
  txt: parseTXT
};

function parseCSV(content, delimiter = ',') {
  const records = [];
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return records;
  
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx]?.trim() || '';
    });
    records.push(record);
    
    // 定期发送解析进度
    if (i % 1000 === 0) {
      self.postMessage({
        type: 'PARSE_PROGRESS',
        parsed: i,
        total: lines.length
      });
    }
  }
  
  return records;
}

function parseTSV(content) {
  return parseCSV(content, '\t');
}

function parseRIS(content) {
  const records = [];
  const entries = content.split(/\n(?=TY  -)/);
  
  entries.forEach((entry, idx) => {
    const record = {};
    const lines = entry.split(/\r?\n/);
    
    lines.forEach(line => {
      const match = line.match(/^([A-Z]{2})\s*-\s*(.+)$/);
      if (match) {
        const [, tag, value] = match;
        const fieldMap = {
          'TI': 'title', 'AB': 'abstract', 'AU': 'authors',
          'PY': 'year', 'JO': 'journal', 'DO': 'doi',
          'KW': 'keywords', 'ER': 'end'
        };
        
        if (fieldMap[tag]) {
          const field = fieldMap[tag];
          if (field === 'authors') {
            record[field] = (record[field] || '') + (record[field] ? '; ' : '') + value;
          } else if (field !== 'end') {
            record[field] = value;
          }
        }
      }
    });
    
    if (Object.keys(record).length > 0) {
      records.push(record);
    }
    
    if (idx % 100 === 0) {
      self.postMessage({
        type: 'PARSE_PROGRESS',
        parsed: idx,
        total: entries.length
      });
    }
  });
  
  return records;
}

function parseENW(content) {
  // ENW 格式基本上与 RIS 相同
  return parseRIS(content);
}

function parseBibTeX(content) {
  const records = [];
  const entryPattern = /@(\w+)\s*\{\s*([^,]+),\s*([\s\S]*?)\n\}/g;
  let match;
  
  while ((match = entryPattern.exec(content)) !== null) {
    const [, type, key, fields] = match;
    const record = { entryType: type, entryKey: key };
    
    const fieldPattern = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|(\d+))/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldPattern.exec(fields)) !== null) {
      const [, fieldName, braceVal, quoteVal, numberVal] = fieldMatch;
      record[fieldName.toLowerCase()] = braceVal || quoteVal || numberVal;
    }
    
    records.push(record);
  }
  
  return records;
}

function parseRDF(content) {
  // 简化的 RDF/XML 解析（Zotero format）
  const records = [];
  try {
    // 在 Worker 中无法使用 DOMParser，所以做简单的正则解析
    const itemPattern = /<rdf:Description[^>]*>([\s\S]*?)<\/rdf:Description>/g;
    let match;
    
    while ((match = itemPattern.exec(content)) !== null) {
      const itemContent = match[1];
      const record = {};
      
      const titleMatch = itemContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
      if (titleMatch) record.title = titleMatch[1];
      
      const creatorMatch = itemContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);
      if (creatorMatch) record.authors = creatorMatch[1];
      
      const dateMatch = itemContent.match(/<dc:issued[^>]*>([^<]+)<\/dc:issued>/);
      if (dateMatch) record.year = dateMatch[1];
      
      if (Object.keys(record).length > 0) {
        records.push(record);
      }
    }
  } catch (e) {
    console.error('RDF parse error:', e);
  }
  
  return records;
}

function parseTXT(content) {
  // 最后的保底格式：按行解析
  const records = [];
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  lines.forEach((line, idx) => {
    records.push({
      title: line,
      _raw_line: true
    });
  });
  
  return records;
}

// 数据标准化（去小写、去标点等）
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDOI(doi) {
  if (!doi) return '';
  return doi.toLowerCase().trim();
}

function normalizeAuthors(authors) {
  if (!authors) return '';
  // 只取第一作者 + 年份作为 block key
  const parts = authors.split(/[;,]/);
  return parts[0]?.trim().split(/\s+/).pop()?.toLowerCase() || '';
}

// 去重：生成 hash key
function generateDedupeKey(record) {
  const doi = normalizeDOI(record.doi || record.DOI || '');
  if (doi) {
    return { level: 1, key: `doi:${doi}` };
  }
  
  const titleNorm = normalizeTitle(record.title || record.TI || '');
  const year = record.year || record.PY || '';
  const firstAuthor = normalizeAuthors(record.authors || record.AU || '');
  
  if (titleNorm && year && firstAuthor) {
    return {
      level: 2,
      key: `${year}:${firstAuthor}:${titleNorm.substring(0, 20)}`
    };
  }
  
  if (titleNorm) {
    return {
      level: 3,
      key: `title:${titleNorm.substring(0, 30)}`
    };
  }
  
  return { level: 4, key: null };
}

// 处理 Worker 消息
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'PARSE_FILE':
        const { content, format } = data;
        const parser = PARSERS[format] || parseTXT;
        const records = parser(content);
        
        // 规范化字段
        const normalized = records.map(record => ({
          ...record,
          title_norm: normalizeTitle(record.title || record.TI),
          doi_norm: normalizeDOI(record.doi || record.DOI),
          _source_file: data.sourceFile || 'unknown',
          _import_time: Date.now(),
          _dedup_key: null // 在数据库层计算
        }));
        
        self.postMessage({
          type: 'PARSE_COMPLETE',
          records: normalized,
          count: normalized.length
        });
        break;
        
      case 'DEDUP':
        // 本地去重演示（实际应在数据库层进行）
        const { recordsToDedup } = data;
        const deduped = [];
        const seenKeys = new Set();
        
        recordsToDedup.forEach((record, idx) => {
          const dedupeInfo = generateDedupeKey(record);
          if (dedupeInfo.key && seenKeys.has(dedupeInfo.key)) {
            record._is_duplicate = true;
          } else {
            if (dedupeInfo.key) seenKeys.add(dedupeInfo.key);
            deduped.push(record);
          }
          
          if (idx % 5000 === 0) {
            self.postMessage({
              type: 'DEDUP_PROGRESS',
              processed: idx,
              duplicates: recordsToDedup.filter(r => r._is_duplicate).length
            });
          }
        });
        
        self.postMessage({
          type: 'DEDUP_COMPLETE',
          records: deduped,
          duplicateCount: recordsToDedup.length - deduped.length
        });
        break;
        
      default:
        self.postMessage({ type: 'ERROR', error: 'Unknown message type' });
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error.message, stack: error.stack });
  }
};

self.postMessage({ type: 'PARSER_WORKER_READY' });
