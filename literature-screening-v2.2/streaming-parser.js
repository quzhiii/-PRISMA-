(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.StreamingParser = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const INCREMENTAL_FORMATS = new Set(['csv', 'tsv', 'ris', 'nbib', 'enw']);

  function normalizeFormat(format) {
    return String(format || '')
      .trim()
      .replace(/^\./, '')
      .toLowerCase();
  }

  function supportsIncrementalFormat(format) {
    return INCREMENTAL_FORMATS.has(normalizeFormat(format));
  }

  function createStreamingSession(options) {
    const format = normalizeFormat(options && options.format);

    switch (format) {
      case 'csv':
        return createDelimitedSession(format, ',');
      case 'tsv':
        return createDelimitedSession(format, '\t');
      case 'ris':
      case 'nbib':
        return createTaggedSession(format);
      case 'enw':
        return createEnwSession(format);
      default:
        throw new Error(`Unsupported incremental format: ${format || 'unknown'}`);
    }
  }

  function pushChunk(session, chunk) {
    const text = String(chunk || '');
    if (!text) {
      return { records: [], parsedCount: session.parsedCount || 0 };
    }

    switch (session.kind) {
      case 'delimited':
        return {
          records: processDelimitedChunk(session, text, false),
          parsedCount: session.parsedCount || 0,
        };
      case 'tagged':
        return {
          records: processTaggedChunk(session, text, false),
          parsedCount: session.parsedCount || 0,
        };
      case 'enw':
        return {
          records: processEnwChunk(session, text, false),
          parsedCount: session.parsedCount || 0,
        };
      default:
        throw new Error(`Unknown session kind: ${session.kind}`);
    }
  }

  function finishSession(session) {
    switch (session.kind) {
      case 'delimited':
        return {
          records: processDelimitedChunk(session, '', true),
          parsedCount: session.parsedCount || 0,
        };
      case 'tagged':
        return {
          records: processTaggedChunk(session, '', true),
          parsedCount: session.parsedCount || 0,
        };
      case 'enw':
        return {
          records: processEnwChunk(session, '', true),
          parsedCount: session.parsedCount || 0,
        };
      default:
        throw new Error(`Unknown session kind: ${session.kind}`);
    }
  }

  function createDelimitedSession(format, delimiter) {
    return {
      kind: 'delimited',
      format,
      delimiter,
      headers: null,
      currentField: '',
      currentRow: [],
      inQuotes: false,
      pendingQuote: false,
      parsedCount: 0,
      sawBom: false,
    };
  }

  function processDelimitedChunk(session, chunk, flush) {
    const records = [];
    let text = String(chunk || '');

    if (!session.sawBom) {
      session.sawBom = true;
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
    }

    let index = 0;
    if (session.pendingQuote) {
      if (text[index] === '"') {
        session.currentField += '"';
        index += 1;
      } else {
        session.inQuotes = false;
      }
      session.pendingQuote = false;
    }

    for (; index < text.length; index += 1) {
      const char = text[index];
      const nextChar = text[index + 1];

      if (char === '"') {
        if (session.inQuotes) {
          if (nextChar === '"') {
            session.currentField += '"';
            index += 1;
          } else if (index === text.length - 1 && !flush) {
            session.pendingQuote = true;
          } else {
            session.inQuotes = false;
          }
        } else {
          session.inQuotes = true;
        }
        continue;
      }

      if (char === session.delimiter && !session.inQuotes) {
        session.currentRow.push(session.currentField);
        session.currentField = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !session.inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          index += 1;
        }
        session.currentRow.push(session.currentField);
        session.currentField = '';
        finalizeDelimitedRow(session, records);
        continue;
      }

      session.currentField += char;
    }

    if (flush) {
      if (session.pendingQuote) {
        session.pendingQuote = false;
        session.inQuotes = false;
      }
      if (session.currentField.length > 0 || session.currentRow.length > 0) {
        session.currentRow.push(session.currentField);
        session.currentField = '';
        finalizeDelimitedRow(session, records);
      }
    }

    return records;
  }

  function finalizeDelimitedRow(session, records) {
    const row = session.currentRow.splice(0, session.currentRow.length);
    if (!row.some((value) => String(value || '').trim() !== '')) {
      return;
    }

    if (!session.headers) {
      session.headers = row.map((header) => String(header || '').trim().replace(/^"|"$/g, ''));
      return;
    }

    const record = {};
    session.headers.forEach((header, index) => {
      record[header] = String(row[index] ?? '').trim();
    });
    records.push(record);
    session.parsedCount += 1;
  }

  function createTaggedSession(format) {
    return {
      kind: 'tagged',
      format,
      buffer: '',
      currentRecord: {},
      currentField: '',
      parsedCount: 0,
      fieldMap: {
        TY: 'type',
        T1: 'title',
        TI: 'title',
        AU: 'authors',
        A1: 'authors',
        A2: 'authors',
        A3: 'authors',
        FAU: 'authors',
        T2: 'journal',
        JO: 'journal',
        JA: 'journal',
        JF: 'journal',
        TA: 'journal',
        JT: 'journal',
        PY: 'year',
        Y1: 'year',
        DP: 'year',
        DO: 'doi',
        AID: 'doi',
        AB: 'abstract',
        N2: 'abstract',
        KW: 'keywords',
        OT: 'keywords',
        VL: 'volume',
        VI: 'volume',
        IS: 'issue',
        IP: 'issue',
        SP: 'pages',
        EP: 'pages_end',
        PMID: 'pmid',
        SN: 'issn',
        UR: 'url',
      },
    };
  }

  function processTaggedChunk(session, chunk, flush) {
    const records = [];
    session.buffer += String(chunk || '');
    const lines = extractBufferedLines(session, flush);

    lines.forEach((line) => {
      processTaggedLine(session, line, records);
    });

    if (flush) {
      pushTaggedRecord(session, records);
    }

    return records;
  }

  function processTaggedLine(session, line, records) {
    const normalizedLine = String(line || '').replace(/\r$/, '');
    const trimmed = normalizedLine.trim();

    if (!trimmed || /^ER\s*-\s*/i.test(trimmed)) {
      pushTaggedRecord(session, records);
      session.currentField = '';
      return;
    }

    const match = trimmed.match(/^([A-Z0-9]{2,4})\s*-\s*(.*)$/);
    if (match) {
      const tag = match[1];
      const rawValue = String(match[2] || '').trim();

      if (tag === 'TY' && Object.keys(session.currentRecord).length > 0) {
        pushTaggedRecord(session, records);
      }

      applyTaggedValue(session, tag, rawValue);
      return;
    }

    if (session.currentField && trimmed) {
      appendTaggedField(session, session.currentField, trimmed, true);
    }
  }

  function applyTaggedValue(session, tag, rawValue) {
    const mappedField = session.fieldMap[tag];
    if (!mappedField) {
      session.currentField = '';
      return;
    }

    if (mappedField === 'year') {
      session.currentRecord.year = extractYearValue(rawValue);
      session.currentField = 'year';
      return;
    }

    if (mappedField === 'doi') {
      const doiValue = extractDoiValue(rawValue);
      if (doiValue) {
        if (!session.currentRecord.doi) {
          session.currentRecord.doi = doiValue;
        }
        if (!session.currentRecord.identifier_raw) {
          session.currentRecord.identifier_raw = doiValue;
        }
      }
      session.currentField = 'doi';
      return;
    }

    appendTaggedField(session, mappedField, rawValue, false);
  }

  function appendTaggedField(session, field, rawValue, continuation) {
    if (!field) {
      session.currentField = '';
      return;
    }

    const value = String(rawValue || '').trim();
    if (!value) {
      session.currentField = '';
      return;
    }

    if (field === 'authors' || field === 'keywords') {
      session.currentRecord[field] = session.currentRecord[field]
        ? `${session.currentRecord[field]}; ${value}`
        : value;
      session.currentField = field;
      return;
    }

    if (field === 'pmid') {
      session.currentRecord.pmid = session.currentRecord.pmid || value;
      if (!session.currentRecord.identifier_raw) {
        session.currentRecord.identifier_raw = value;
      }
      session.currentField = 'pmid';
      return;
    }

    if (field === 'pages_end') {
      if (session.currentRecord.pages) {
        session.currentRecord.pages = `${session.currentRecord.pages}-${value}`.replace(/--+/g, '-');
      } else {
        session.currentRecord.pages = value;
      }
      session.currentField = 'pages';
      return;
    }

    if (continuation) {
      session.currentRecord[field] = session.currentRecord[field]
        ? `${session.currentRecord[field]} ${value}`.trim()
        : value;
      session.currentField = field;
      return;
    }

    if (!session.currentRecord[field]) {
      session.currentRecord[field] = value;
    }
    session.currentField = field;
  }

  function pushTaggedRecord(session, records) {
    if (Object.keys(session.currentRecord).length === 0) {
      session.currentField = '';
      return;
    }

    if (!session.currentRecord.type) {
      session.currentRecord.type = 'JOUR';
    }

    if (!session.currentRecord.identifier_raw && session.currentRecord.doi) {
      session.currentRecord.identifier_raw = session.currentRecord.doi;
    }

    records.push(session.currentRecord);
    session.currentRecord = {};
    session.currentField = '';
    session.parsedCount += 1;
  }

  function createEnwSession(format) {
    return {
      kind: 'enw',
      format,
      buffer: '',
      currentRecord: {},
      currentField: '',
      parsedCount: 0,
      continuationFields: new Set(['title', 'journal', 'abstract', 'publisher', 'pages', 'url']),
      fieldMap: {
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
        '%G': 'language',
      },
    };
  }

  function processEnwChunk(session, chunk, flush) {
    const records = [];
    session.buffer += String(chunk || '');
    const lines = extractBufferedLines(session, flush);

    lines.forEach((line) => {
      processEnwLine(session, line, records);
    });

    if (flush) {
      pushEnwRecord(session, records);
    }

    return records;
  }

  function processEnwLine(session, line, records) {
    const normalizedLine = String(line || '').replace(/\r$/, '');
    const trimmed = normalizedLine.trim();

    if (!trimmed) {
      pushEnwRecord(session, records);
      return;
    }

    const match = trimmed.match(/^%([0-9A-Z@])\s*(.*)$/);
    if (match) {
      applyEnwTaggedValue(session, `%${match[1]}`, match[2], records);
      return;
    }

    if (session.currentField) {
      appendEnwField(session, session.currentField, trimmed, true);
    }
  }

  function applyEnwTaggedValue(session, tag, rawValue, records) {
    const value = String(rawValue || '').trim();
    if (!value) {
      session.currentField = '';
      return;
    }

    if (tag === '%0' && Object.keys(session.currentRecord).length > 0) {
      pushEnwRecord(session, records);
    }

    if (tag === '%R' || tag === '%M') {
      captureEnwIdentifier(session, value);
      return;
    }

    const mappedField = session.fieldMap[tag];
    if (!mappedField) {
      session.currentField = '';
      return;
    }

    if (mappedField === 'year') {
      session.currentRecord.year = extractYearValue(value);
      session.currentField = 'year';
      return;
    }

    appendEnwField(session, mappedField, value, false);

    if (mappedField === 'url' && !session.currentRecord.identifier_raw && /(?:doi\.org\/|link\.cnki\.net\/doi\/|pubmed\.ncbi\.nlm\.nih\.gov\/)/i.test(value)) {
      session.currentRecord.identifier_raw = value;
    }

    if (mappedField === 'url' && !session.currentRecord.doi && /(?:doi\.org\/|link\.cnki\.net\/doi\/)/i.test(value)) {
      session.currentRecord.doi = value;
    }

    session.currentField = session.continuationFields.has(mappedField) ? mappedField : mappedField;
  }

  function appendEnwField(session, field, rawValue, continuation) {
    const value = String(rawValue || '').trim();
    if (!field || !value) {
      session.currentField = '';
      return;
    }

    if (field === 'authors' || field === 'keywords') {
      session.currentRecord[field] = session.currentRecord[field]
        ? `${session.currentRecord[field]}; ${value}`
        : value;
      session.currentField = field;
      return;
    }

    if (continuation) {
      session.currentRecord[field] = session.currentRecord[field]
        ? `${session.currentRecord[field]} ${value}`.trim()
        : value;
      session.currentField = field;
      return;
    }

    if (!session.currentRecord[field]) {
      session.currentRecord[field] = value;
    }
    session.currentField = field;
  }

  function captureEnwIdentifier(session, value) {
    if (!session.currentRecord.identifier_raw) {
      session.currentRecord.identifier_raw = value;
    }

    if (!session.currentRecord.doi && /(?:10\.\d{4,9}\/|doi\.org\/|link\.cnki\.net\/doi\/)/i.test(value)) {
      session.currentRecord.doi = value;
    }

    session.currentField = '';
  }

  function pushEnwRecord(session, records) {
    if (Object.keys(session.currentRecord).length === 0) {
      session.currentField = '';
      return;
    }

    if (!session.currentRecord.identifier_raw && session.currentRecord.doi) {
      session.currentRecord.identifier_raw = session.currentRecord.doi;
    }

    if (Array.isArray(records)) {
      records.push(session.currentRecord);
    }
    session.currentRecord = {};
    session.currentField = '';
    session.parsedCount += 1;
  }

  function extractBufferedLines(session, flush) {
    const lines = [];
    let start = 0;

    for (let index = 0; index < session.buffer.length; index += 1) {
      const char = session.buffer[index];
      if (char !== '\n' && char !== '\r') {
        continue;
      }

      lines.push(session.buffer.slice(start, index));
      if (char === '\r' && session.buffer[index + 1] === '\n') {
        index += 1;
      }
      start = index + 1;
    }

    session.buffer = session.buffer.slice(start);

    if (flush && session.buffer.length > 0) {
      lines.push(session.buffer);
      session.buffer = '';
    }

    return lines;
  }

  function extractYearValue(value) {
    const match = String(value || '').match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
    return match ? match[1] : String(value || '').trim();
  }

  function extractDoiValue(value) {
    const text = String(value || '').trim();
    if (!text) return '';

    const doiMatch = text.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    if (doiMatch) {
      return doiMatch[0];
    }

    return text.includes('[doi]') ? text.replace(/\s*\[doi\]\s*/i, '').trim() : text;
  }

  return {
    supportsIncrementalFormat,
    createStreamingSession,
    pushChunk,
    finishSession,
    normalizeFormat,
  };
});
