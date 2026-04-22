import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, '..', '..');
const fixtureRootSegments = ['tests', 'fixtures', 'dedup'];
const manifestRelativePath = path.join(...fixtureRootSegments, 'benchmark-manifest.csv');

export async function loadManifest({ repoRoot = defaultRepoRoot } = {}) {
  const manifestPath = path.join(repoRoot, manifestRelativePath);
  const content = await fs.readFile(manifestPath, 'utf8');

  return parseCsvText(content).map(normalizeManifestRow);
}

export async function loadDataset(datasetId, { repoRoot = defaultRepoRoot, manifest } = {}) {
  const resolvedManifest = manifest ?? await loadManifest({ repoRoot });
  const dataset = resolvedManifest.find((entry) => entry.datasetId === datasetId);

  if (!dataset) {
    throw new Error(`Unknown dataset: ${datasetId}`);
  }

  return loadDatasetFromManifestEntry(dataset, { repoRoot });
}

export async function loadAllDatasets({ repoRoot = defaultRepoRoot } = {}) {
  const manifest = await loadManifest({ repoRoot });
  const datasets = [];

  for (const entry of manifest) {
    datasets.push(await loadDatasetFromManifestEntry(entry, { repoRoot }));
  }

  return { manifest, datasets };
}

async function loadDatasetFromManifestEntry(entry, { repoRoot }) {
  const absolutePath = resolveFixturePath(repoRoot, entry.filePath);
  const content = await fs.readFile(absolutePath, 'utf8');
  const records = entry.fileFormat === 'csv'
    ? parseCsvText(content).map((row, index) => normalizeCsvRecord(row, entry, index))
    : parseRdfText(content, entry);

  return {
    ...entry,
    absolutePath,
    recordsTotal: entry.recordsTotal ?? records.length,
    records,
  };
}

function resolveFixturePath(repoRoot, relativeFilePath) {
  return path.join(repoRoot, ...fixtureRootSegments, ...String(relativeFilePath).split('/'));
}

function normalizeManifestRow(row) {
  return {
    datasetId: normalizeScalar(row.dataset_id),
    sourceType: normalizeScalar(row.source_type),
    sourceSystem: normalizeScalar(row.source_system),
    filePath: normalizeScalar(row.file_path),
    fileFormat: normalizeScalar(row.file_format).toLowerCase(),
    recordsTotal: toNullableNumber(row.records_total),
    containsRealData: parseBoolean(row.contains_real_data),
    adjudicationStatus: normalizeScalar(row.adjudication_status),
    primaryUse: normalizeScalar(row.primary_use),
    notes: normalizeScalar(row.notes),
  };
}

function normalizeCsvRecord(row, entry, index) {
  return {
    record_id: pickFirstNonEmpty(row.record_id, row.id, `${entry.datasetId}-${index + 1}`),
    title: normalizeScalar(row.title),
    authors: normalizeScalar(row.authors),
    year: normalizeScalar(row.year),
    journal: normalizeScalar(row.journal),
    pages: normalizeScalar(row.pages),
    doi: normalizeScalar(row.doi),
    publication_type: normalizeScalar(row.publication_type),
    abstract: normalizeScalar(row.abstract),
    language: normalizeScalar(row.language),
    source_file: normalizeScalar(row.source_file),
    _dataset_id: entry.datasetId,
    _source_type: entry.sourceType,
    _source_system: entry.sourceSystem,
    _file_format: entry.fileFormat,
  };
}

function parseRdfText(content, entry) {
  const journalsByResource = buildJournalMap(content);
  const records = [];
  const articlePattern = /<bib:Article\b([^>]*)>([\s\S]*?)<\/bib:Article>/g;
  let match;
  let index = 0;

  while ((match = articlePattern.exec(content)) !== null) {
    index += 1;
    const attributes = match[1];
    const articleXml = match[2];
    const about = getAttributeValue(attributes, 'rdf:about');
    const partOfXml = extractFirstTagXml(articleXml, ['dcterms:isPartOf']);
    const scopedArticleXml = stripTagBlocks(articleXml, ['dcterms:isPartOf']);
    const partOfRef = getAttributeValueFromTag(articleXml, 'dcterms:isPartOf', 'rdf:resource');
    const inlineJournalTitle = extractFirstTagValue(partOfXml, ['dc:title', 'dcterms:title']);
    const identifier = extractIdentifier(scopedArticleXml);
    const title = extractFirstTagValue(scopedArticleXml, ['dc:title', 'dcterms:title']);
    const abstractText = extractFirstTagValue(scopedArticleXml, ['dcterms:abstract', 'dc:description']);
    const citationKey = extractFirstTagValue(scopedArticleXml, ['z:citationKey']);
    const publicationType = extractFirstTagValue(scopedArticleXml, ['z:itemType']);
    const language = extractFirstTagValue(scopedArticleXml, ['z:language']);
    const rawDate = extractFirstTagValue(scopedArticleXml, ['dcterms:issued', 'dc:date', 'prism:publicationDate', 'prism:coverDate']);
    const authors = extractAllTagValues(scopedArticleXml, ['foaf:surname']).join('; ');

    records.push({
      record_id: pickFirstNonEmpty(citationKey, about, `${entry.datasetId}-${index}`),
      id: about,
      title,
      authors,
      year: extractYear(rawDate),
      journal: inlineJournalTitle || journalsByResource.get(partOfRef) || '',
      pages: extractFirstTagValue(articleXml, ['bib:pages', 'prism:pageRange']),
      doi: identifier,
      publication_type: publicationType,
      abstract: abstractText,
      language,
      source_file: path.basename(entry.filePath),
      identifier_raw: identifier,
      _dataset_id: entry.datasetId,
      _source_type: entry.sourceType,
      _source_system: entry.sourceSystem,
      _file_format: entry.fileFormat,
    });
  }

  return records;
}

function buildJournalMap(content) {
  const journalsByResource = new Map();
  const journalPattern = /<bib:Journal\b([^>]*)>([\s\S]*?)<\/bib:Journal>/g;
  let match;

  while ((match = journalPattern.exec(content)) !== null) {
    const about = getAttributeValue(match[1], 'rdf:about');
    const title = extractFirstTagValue(match[2], ['dc:title', 'dcterms:title']);
    if (about && title) {
      journalsByResource.set(about, title);
    }
  }

  return journalsByResource;
}

function extractFirstTagXml(xml, tagNames) {
  for (const tagName of tagNames) {
    const blockPattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, 'i');
    const blockMatch = xml.match(blockPattern);
    if (blockMatch) {
      return blockMatch[1];
    }
  }

  return '';
}

function stripTagBlocks(xml, tagNames) {
  let nextXml = xml;

  for (const tagName of tagNames) {
    const blockPattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>[\\s\\S]*?<\\/${escapeRegExp(tagName)}>`, 'gi');
    const selfClosingPattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*/>`, 'gi');
    nextXml = nextXml.replace(blockPattern, '');
    nextXml = nextXml.replace(selfClosingPattern, '');
  }

  return nextXml;
}

function parseCsvText(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      field = '';
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => stripBom(header).trim());

  return dataRows.map((cells) => {
    const record = {};
    headers.forEach((header, columnIndex) => {
      record[header] = normalizeScalar(cells[columnIndex] ?? '');
    });
    return record;
  });
}

function extractIdentifier(xml) {
  const containerPattern = new RegExp(`<${escapeRegExp('dc:identifier')}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp('dc:identifier')}>`, 'i');
  const containerMatch = xml.match(containerPattern);

  if (!containerMatch) {
    return '';
  }

  const nestedValue = extractFirstTagValue(containerMatch[1], ['rdf:value']);
  if (nestedValue) {
    return nestedValue;
  }

  return cleanXmlText(containerMatch[1]);
}

function extractFirstTagValue(xml, tagNames) {
  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, 'i');
    const match = xml.match(pattern);
    if (match) {
      return cleanXmlText(match[1]);
    }
  }

  return '';
}

function extractAllTagValues(xml, tagNames) {
  const values = [];

  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, 'gi');
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      const value = cleanXmlText(match[1]);
      if (value) {
        values.push(value);
      }
    }
  }

  return values;
}

function getAttributeValue(attributeText, attributeName) {
  const pattern = new RegExp(`${escapeRegExp(attributeName)}="([^"]*)"`, 'i');
  const match = attributeText.match(pattern);
  return match ? decodeXmlEntities(match[1]) : '';
}

function getAttributeValueFromTag(xml, tagName, attributeName) {
  const pattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*${escapeRegExp(attributeName)}="([^"]*)"[^>]*\/?>`, 'i');
  const match = xml.match(pattern);
  return match ? decodeXmlEntities(match[1]) : '';
}

function cleanXmlText(value) {
  return normalizeScalar(
    decodeXmlEntities(
      String(value ?? '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, ' '),
    ),
  );
}

function decodeXmlEntities(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function extractYear(value) {
  const match = String(value ?? '').match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
  return match ? match[1] : '';
}

function stripBom(value) {
  return String(value ?? '').replace(/^\uFEFF/, '');
}

function normalizeScalar(value) {
  return stripBom(String(value ?? '')).replace(/\s+/g, ' ').trim();
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const normalized = normalizeScalar(value);
    if (normalized) {
      return normalized;
    }
  }
  return '';
}

function parseBoolean(value) {
  return /^true$/i.test(normalizeScalar(value));
}

function toNullableNumber(value) {
  const normalized = normalizeScalar(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


