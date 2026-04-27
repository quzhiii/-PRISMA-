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

try {
  if (typeof self !== 'undefined' && (!self.DedupEngine || typeof self.DedupEngine.run !== 'function')) {
    importScripts('dedup-engine.js');
  }
} catch (error) {
  // PARSE_FILE can still work without the shared engine; DEDUP will fallback if needed.
}

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
  const records = [];
  const lines = String(content || '').split(/\r?\n/);
  const fieldMap = {
    '%0': 'type',
    '%A': 'authors',
    '%T': 'title',
    '%J': 'journal',
    '%B': 'journal',
    '%S': 'journal',
    '%D': 'year',
    '%8': 'year',
    '%X': 'abstract',
    '%K': 'keywords',
    '%V': 'volume',
    '%N': 'issue',
    '%P': 'pages',
    '%I': 'publisher',
    '%@': 'issn',
    '%U': 'url',
    '%G': 'language'
  };
  const continuationFields = new Set(['title', 'journal', 'abstract', 'publisher', 'pages', 'url']);
  let currentRecord = {};
  let currentField = '';

  function appendField(field, value, continuation = false) {
    if (!field || !value) {
      return;
    }

    if (field === 'authors' || field === 'keywords') {
      currentRecord[field] = currentRecord[field]
        ? `${currentRecord[field]}; ${value}`
        : value;
      return;
    }

    if (continuation) {
      currentRecord[field] = currentRecord[field]
        ? `${currentRecord[field]} ${value}`.trim()
        : value;
      return;
    }

    if (!currentRecord[field]) {
      currentRecord[field] = value;
    }
  }

  function pushCurrentRecord() {
    if (Object.keys(currentRecord).length === 0) {
      currentField = '';
      return;
    }

    if (!currentRecord.identifier_raw && currentRecord.doi) {
      currentRecord.identifier_raw = currentRecord.doi;
    }

    records.push(currentRecord);
    currentRecord = {};
    currentField = '';
  }

  function extractYearValue(value) {
    const match = String(value || '').match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
    return match ? match[1] : String(value || '').trim();
  }

  function captureIdentifier(value) {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) {
      currentField = '';
      return;
    }

    if (!currentRecord.identifier_raw) {
      currentRecord.identifier_raw = normalizedValue;
    }

    if (!currentRecord.doi && /(?:10\.\d{4,9}\/|doi\.org\/|link\.cnki\.net\/doi\/)/i.test(normalizedValue)) {
      currentRecord.doi = normalizedValue;
    }

    currentField = '';
  }

  function applyTaggedValue(tag, value) {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) {
      currentField = '';
      return;
    }

    if (tag === '%0' && Object.keys(currentRecord).length > 0) {
      pushCurrentRecord();
    }

    if (tag === '%R' || tag === '%M') {
      captureIdentifier(normalizedValue);
      return;
    }

    const mappedField = fieldMap[tag];
    if (!mappedField) {
      currentField = '';
      return;
    }

    if (mappedField === 'year') {
      appendField('year', extractYearValue(normalizedValue));
      currentField = '';
      return;
    }

    appendField(mappedField, normalizedValue);

    if (mappedField === 'url' && !currentRecord.identifier_raw && /(?:doi\.org\/|link\.cnki\.net\/doi\/|pubmed\.ncbi\.nlm\.nih\.gov\/)/i.test(normalizedValue)) {
      currentRecord.identifier_raw = normalizedValue;
    }

    if (mappedField === 'url' && !currentRecord.doi && /(?:doi\.org\/|link\.cnki\.net\/doi\/)/i.test(normalizedValue)) {
      currentRecord.doi = normalizedValue;
    }

    currentField = continuationFields.has(mappedField) ? mappedField : '';
  }

  lines.forEach((rawLine, idx) => {
    const line = String(rawLine || '').trim();
    if (!line) {
      pushCurrentRecord();
    } else {
      const match = line.match(/^%([0-9A-Z@])\s*(.*)$/);
      if (match) {
        applyTaggedValue(`%${match[1]}`, match[2]);
      } else if (currentField) {
        appendField(currentField, line, true);
      }
    }

    if (idx % 100 === 0) {
      self.postMessage({
        type: 'PARSE_PROGRESS',
        parsed: idx,
        total: lines.length
      });
    }
  });

  pushCurrentRecord();
  return records;
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
  try {
    const structuredRecords = parseStructuredRDFItems(content);
    if (structuredRecords.length > 0) {
      return structuredRecords;
    }

    return parseGenericRDFDescriptions(content);
  } catch (e) {
    console.error('RDF parse error:', e);
    return [];
  }
}

function parseStructuredRDFItems(content) {
  const records = [];
  const journalsByResource = buildRDFJournalMap(content);
  const itemTags = ['bib:Article', 'bib:Book'];

  itemTags.forEach((tagName) => {
    const itemPattern = new RegExp('<' + escapeRegExp(tagName) + '\\b([^>]*)>([\\s\\S]*?)<\\/' + escapeRegExp(tagName) + '>', 'g');
    let match;

    while ((match = itemPattern.exec(content)) !== null) {
      const attributes = match[1];
      const itemXml = match[2];
      const scopedItemXml = stripTagBlocks(itemXml, ['dcterms:isPartOf']);
      const partOfXml = extractFirstTagXml(itemXml, ['dcterms:isPartOf']);
      const partOfRef = getAttributeValueFromTag(itemXml, 'dcterms:isPartOf', 'rdf:resource');
      const identifier = extractRDFIdentifier(scopedItemXml);
      const title = extractFirstTagValue(scopedItemXml, ['dc:title', 'dcterms:title']);
      const authors = extractAllTagValues(scopedItemXml, ['foaf:surname', 'dc:creator', 'dcterms:creator']).join('; ');
      const rawDate = extractFirstTagValue(scopedItemXml, ['dcterms:issued', 'dc:date', 'prism:publicationDate', 'prism:coverDate']);
      const journal = extractFirstTagValue(partOfXml, ['dc:title', 'dcterms:title']) || journalsByResource[partOfRef] || '';

      const record = {
        id: getAttributeValue(attributes, 'rdf:about'),
        title,
        authors,
        year: extractYear(rawDate),
        abstract: extractFirstTagValue(scopedItemXml, ['dcterms:abstract', 'dc:description']),
        journal,
        volume: extractFirstTagValue(scopedItemXml, ['bib:volume', 'prism:volume']),
        issue: extractFirstTagValue(scopedItemXml, ['bib:issue', 'prism:number']),
        pages: extractFirstTagValue(scopedItemXml, ['bib:pages', 'prism:pageRange']),
        doi: identifier,
        identifier_raw: identifier,
        publication_type: extractFirstTagValue(scopedItemXml, ['z:itemType']),
        language: extractFirstTagValue(scopedItemXml, ['z:language'])
      };

      if (Object.keys(record).some((key) => String(record[key] || '').trim())) {
        records.push(record);
      }
    }
  });

  return records;
}

function parseGenericRDFDescriptions(content) {
  const records = [];
  const itemPattern = /<rdf:Description\b([^>]*)>([\s\S]*?)<\/rdf:Description>/g;
  let match;

  while ((match = itemPattern.exec(content)) !== null) {
    const attributes = match[1];
    const itemContent = match[2];
    const identifier = extractRDFIdentifier(itemContent);
    const record = {
      id: getAttributeValue(attributes, 'rdf:about'),
      title: extractFirstTagValue(itemContent, ['dc:title', 'dcterms:title']),
      authors: extractAllTagValues(itemContent, ['dc:creator', 'dcterms:creator', 'foaf:surname']).join('; '),
      year: extractYear(extractFirstTagValue(itemContent, ['dc:issued', 'dcterms:issued', 'dc:date'])),
      abstract: extractFirstTagValue(itemContent, ['dcterms:abstract', 'dc:description']),
      journal: extractFirstTagValue(itemContent, ['bib:publicationTitle', 'dc:source']),
      doi: identifier,
      identifier_raw: identifier,
      publication_type: extractFirstTagValue(itemContent, ['z:itemType']),
      language: extractFirstTagValue(itemContent, ['z:language'])
    };

    if (Object.keys(record).some((key) => String(record[key] || '').trim())) {
      records.push(record);
    }
  }

  return records;
}

function buildRDFJournalMap(content) {
  const journalsByResource = {};
  const journalPattern = /<bib:Journal\b([^>]*)>([\s\S]*?)<\/bib:Journal>/g;
  let match;

  while ((match = journalPattern.exec(content)) !== null) {
    const about = getAttributeValue(match[1], 'rdf:about');
    const title = extractFirstTagValue(match[2], ['dc:title', 'dcterms:title']);
    if (about && title) {
      journalsByResource[about] = title;
    }
  }

  return journalsByResource;
}

function extractRDFIdentifier(xml) {
  const container = extractFirstTagXml(xml, ['dc:identifier']);
  if (!container) {
    return '';
  }

  return extractFirstTagValue(container, ['rdf:value']) || cleanXmlText(container);
}

function extractFirstTagXml(xml, tagNames) {
  for (const tagName of tagNames) {
    const pattern = new RegExp('<' + escapeRegExp(tagName) + '\\b[^>]*>([\\s\\S]*?)<\\/' + escapeRegExp(tagName) + '>', 'i');
    const match = xml.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return '';
}

function extractFirstTagValue(xml, tagNames) {
  const fragment = extractFirstTagXml(xml, tagNames);
  return fragment ? cleanXmlText(fragment) : '';
}

function extractAllTagValues(xml, tagNames) {
  const values = [];

  tagNames.forEach((tagName) => {
    const pattern = new RegExp('<' + escapeRegExp(tagName) + '\\b[^>]*>([\\s\\S]*?)<\\/' + escapeRegExp(tagName) + '>', 'gi');
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      const value = cleanXmlText(match[1]);
      if (value) {
        values.push(value);
      }
    }
  });

  return values;
}

function stripTagBlocks(xml, tagNames) {
  let nextXml = xml;

  tagNames.forEach((tagName) => {
    const blockPattern = new RegExp('<' + escapeRegExp(tagName) + '\\b[^>]*>[\\s\\S]*?<\\/' + escapeRegExp(tagName) + '>', 'gi');
    const selfClosingPattern = new RegExp('<' + escapeRegExp(tagName) + '\\b[^>]*/>', 'gi');
    nextXml = nextXml.replace(blockPattern, '');
    nextXml = nextXml.replace(selfClosingPattern, '');
  });

  return nextXml;
}

function getAttributeValue(attributeText, attributeName) {
  const pattern = new RegExp(escapeRegExp(attributeName) + '="([^"]*)"', 'i');
  const match = String(attributeText || '').match(pattern);
  return match ? decodeXmlEntities(match[1]) : '';
}

function getAttributeValueFromTag(xml, tagName, attributeName) {
  const pattern = new RegExp('<' + escapeRegExp(tagName) + '\\b[^>]*' + escapeRegExp(attributeName) + '="([^"]*)"[^>]*\\/?>', 'i');
  const match = String(xml || '').match(pattern);
  return match ? decodeXmlEntities(match[1]) : '';
}

function cleanXmlText(value) {
  return decodeXmlEntities(String(value || ''))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function extractYear(value) {
  const match = String(value || '').match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
  return match ? match[1] : '';
}

function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()\[\]^$+*?.]/g, '\\$&');
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

function normalizeIdentifierForDedup(identifier) {
  let normalized = String(identifier || '').trim();
  if (!normalized) return '';

  normalized = normalized
    .replace(/^doi\s*:?\s*/i, '')
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^https?:\/\/link\.cnki\.net\/doi\//i, '')
    .trim();

  return normalized.toLowerCase();
}

function enrichImportedRecord(record, sourceFile) {
  const title = record.title || record.TI || '';
  const rawIdentifier = record.identifier_raw || record.doi || record.DOI || '';

  return {
    ...record,
    identifier_raw: String(rawIdentifier || '').trim(),
    _normalized_identifier: normalizeIdentifierForDedup(rawIdentifier),
    _normalized_title: normalizeTitle(title),
    title_norm: normalizeTitle(title),
    doi_norm: normalizeDOI(record.doi || record.DOI),
    _source_file: sourceFile || 'unknown',
    _import_time: Date.now(),
    _dedup_key: null
  };
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

function resolveWorkerDedupEngine() {
  if (typeof self !== 'undefined' && self.DedupEngine && typeof self.DedupEngine.run === 'function') {
    return self.DedupEngine;
  }

  if (typeof DedupEngine !== 'undefined' && DedupEngine && typeof DedupEngine.run === 'function') {
    return DedupEngine;
  }

  return null;
}

function prepareRecordForSharedDedup(record, index) {
  const enrichedRecord = enrichImportedRecord(record, record?._source_file || 'unknown');
  const title = record.title || record.TI || '';
  const authors = record.authors || record.AU || '';
  const year = record.year || record.PY || record.DP || '';
  const journal = record.journal || record.JO || record.JF || '';
  const pages = record.pages || record.SP || '';
  const doi = record.doi || record.DOI || enrichedRecord.identifier_raw || '';
  const publicationType = record.publication_type || '';

  return {
    ...enrichedRecord,
    record_id: String(record?.record_id || record?.id || `record-${index + 1}`),
    title,
    authors,
    year,
    journal,
    pages,
    doi,
    publication_type: publicationType,
    identifier_raw: String(record?.identifier_raw || doi || '').trim()
  };
}

function runLegacyWorkerDedup(recordsToDedup) {
  const deduped = [];
  const seenKeys = new Set();
  
  recordsToDedup.forEach((record) => {
    const dedupeInfo = generateDedupeKey(record);
    if (dedupeInfo.key && seenKeys.has(dedupeInfo.key)) {
      record._is_duplicate = true;
    } else {
      if (dedupeInfo.key) seenKeys.add(dedupeInfo.key);
      deduped.push(record);
    }
  });

  return {
    deduped,
    duplicateCount: recordsToDedup.length - deduped.length,
    candidateDuplicateCount: 0
  };
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
        const normalized = records.map(record => enrichImportedRecord(record, data.sourceFile));
        
        self.postMessage({
          type: 'PARSE_COMPLETE',
          records: normalized,
          count: normalized.length
        });
        break;
        
      case 'DEDUP':
        const { recordsToDedup } = data;
        const engine = resolveWorkerDedupEngine();
        let dedupOutcome;

        if (engine) {
          const preparedRecords = recordsToDedup.map((record, index) => prepareRecordForSharedDedup(record, index));
          const result = engine.run(preparedRecords, { mode: 'worker' });
          dedupOutcome = {
            deduped: result.retainedRecords,
            duplicateCount: result.hardDuplicates.length,
            candidateDuplicateCount: result.candidateDuplicates.length
          };
        } else {
          dedupOutcome = runLegacyWorkerDedup(recordsToDedup);
        }

        self.postMessage({
          type: 'DEDUP_PROGRESS',
          processed: recordsToDedup.length,
          duplicates: dedupOutcome.duplicateCount
        });
        
        self.postMessage({
          type: 'DEDUP_COMPLETE',
          records: dedupOutcome.deduped,
          duplicateCount: dedupOutcome.duplicateCount,
          candidateDuplicateCount: dedupOutcome.candidateDuplicateCount
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
