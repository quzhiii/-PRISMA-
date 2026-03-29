(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.DedupEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function canonicalizeIdentifier(identifier) {
    const parsed = parseIdentifier(identifier);
    return parsed.canonical;
  }

  function normalizeTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizePages(pages) {
    return String(pages || '')
      .toLowerCase()
      .replace(/[–—−]/g, '-')
      .replace(/\bpp?\.?\s*/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  function normalizePublicationType(publicationType) {
    const value = String(publicationType || '').toLowerCase().replace(/[\s-]+/g, '_');

    if (!value) return 'unknown';
    if (value.includes('protocol')) return 'protocol';
    if (value.includes('conference') && value.includes('abstract')) return 'conference_abstract';
    if (value === 'abstract' || value.includes('meeting_abstract')) return 'conference_abstract';
    if (value.includes('editorial')) return 'editorial';
    if (value.includes('commentary') || value.includes('comment')) return 'commentary';
    if (value.includes('letter')) return 'letter';
    if (value.includes('preprint')) return 'preprint';
    if (value.includes('journalarticle') || value.includes('journal_article') || value === 'article' || value === 'article_journal') {
      return 'journal_article';
    }

    return value;
  }

  function computeHardDuplicateDecision(left, right) {
    if (isProtectedDistinctPair(left, right)) {
      return null;
    }

    if (left._canonical_identifier && right._canonical_identifier) {
      if (left._identifier_type === right._identifier_type && isDecisiveIdentifierType(left._identifier_type) && left._canonical_identifier === right._canonical_identifier) {
        return buildReason('canonical_identifier_exact', 'Exact canonical identifier match', {
          identifierType: left._identifier_type,
          identifier: left._canonical_identifier,
        });
      }
    }

    if (
      !left._canonical_identifier &&
      !right._canonical_identifier &&
      left._normalized_title &&
      left._normalized_title === right._normalized_title &&
      left._normalized_pages &&
      left._normalized_pages === right._normalized_pages &&
      left._year &&
      left._year === right._year &&
      hasStrongAuthorOverlap(left, right) &&
      hasCompatiblePublicationTypes(left, right)
    ) {
      return buildReason('title_year_pages_authors_exact', 'Exact normalized title, year, pages, and author overlap', {
        title: left._normalized_title,
        year: left._year,
        pages: left._normalized_pages,
      });
    }

    return null;
  }

  function computeCandidateDecision(left, right) {
    if (isProtectedDistinctPair(left, right)) {
      return null;
    }

    if (
      left._normalized_title &&
      left._normalized_title === right._normalized_title &&
      left._year &&
      left._year === right._year &&
      left._normalized_pages &&
      left._normalized_pages === right._normalized_pages &&
      hasStrongAuthorOverlap(left, right) &&
      exactlyOneIdentifierPresent(left, right)
    ) {
      return buildReason('title_year_pages_overlap', 'Same normalized title, year, and pages, but one record is missing a decisive identifier', {
        title: left._normalized_title,
        year: left._year,
        pages: left._normalized_pages,
      });
    }

    if (
      left._normalized_title &&
      left._normalized_title === right._normalized_title &&
      left._year &&
      left._year === right._year &&
      hasStrongAuthorOverlap(left, right)
    ) {
      return buildReason('title_year_author_overlap', 'Same normalized title and year with strong author overlap', {
        title: left._normalized_title,
        year: left._year,
      });
    }

    return null;
  }

  function run(records, options) {
    const settings = {
      mode: 'default',
      ...options,
    };

    const normalizedRecords = Array.isArray(records)
      ? records.map((record, index) => normalizeRecord(record, index))
      : [];

    const retainedRecords = [];
    const hardDuplicates = [];

    normalizedRecords.forEach((record) => {
      let resolved = false;

      for (const keptRecord of retainedRecords) {
        const reason = computeHardDuplicateDecision(keptRecord, record);
        if (reason) {
          hardDuplicates.push({
            keptRecord,
            duplicateRecord: record,
            reason,
          });
          resolved = true;
          break;
        }
      }

      if (!resolved) {
        retainedRecords.push(record);
      }
    });

    const candidateDuplicates = [];
    const candidateKeys = new Set();

    for (let index = 0; index < retainedRecords.length; index += 1) {
      for (let inner = index + 1; inner < retainedRecords.length; inner += 1) {
        const left = retainedRecords[index];
        const right = retainedRecords[inner];
        const reason = computeCandidateDecision(left, right);
        if (!reason) continue;

        const pairKey = [left._engine_record_id, right._engine_record_id].sort().join('::');
        if (candidateKeys.has(pairKey)) continue;
        candidateKeys.add(pairKey);

        candidateDuplicates.push({
          leftRecord: left,
          rightRecord: right,
          reason,
        });
      }
    }

    return {
      retainedRecords,
      hardDuplicates,
      candidateDuplicates,
      stats: {
        inputRecords: normalizedRecords.length,
        retainedRecords: retainedRecords.length,
        hardDuplicateCount: hardDuplicates.length,
        candidateDuplicateCount: candidateDuplicates.length,
      },
      reasons: {
        hard: countReasons(hardDuplicates.map((entry) => entry.reason.code)),
        candidate: countReasons(candidateDuplicates.map((entry) => entry.reason.code)),
      },
      mode: settings.mode,
    };
  }

  function normalizeRecord(record, index) {
    const identifierSource = pickFirstNonEmpty(record && record.identifier_raw, record && record.doi, record && record.DOI);
    const parsedIdentifier = parseIdentifier(identifierSource);
    const publicationType = normalizePublicationType(record && record.publication_type);
    const title = pickFirstNonEmpty(record && record.title, record && record.TI);

    return {
      ...record,
      _engine_record_id: pickFirstNonEmpty(record && record.record_id, record && record.id, `record-${index + 1}`),
      _canonical_identifier: parsedIdentifier.canonical,
      _identifier_type: parsedIdentifier.type,
      _normalized_title: normalizeTitle(title),
      _normalized_pages: normalizePages(record && record.pages),
      _normalized_publication_type: publicationType,
      _year: normalizeYear(record && record.year),
      _normalized_authors: normalizeAuthorTokens(record && record.authors),
    };
  }

  function parseIdentifier(identifier) {
    let raw = String(identifier || '').trim();
    if (!raw) {
      return { type: 'none', canonical: '' };
    }

    raw = raw.replace(/\u0000/g, '');
    raw = safelyDecodeURIComponent(raw);
    const lowered = raw.toLowerCase().trim();

    const pmidMatch = lowered.match(/(?:^|\b)pmid\s*:?\s*(\d+)/i);
    if (pmidMatch) {
      return { type: 'pmid', canonical: `pmid:${pmidMatch[1]}` };
    }

    const pmcidUrlMatch = lowered.match(/(?:pmc\.ncbi\.nlm\.nih\.gov\/articles\/|ncbi\.nlm\.nih\.gov\/pmc\/articles\/|europepmc\.org\/articles\/)(pmc\d+)/i);
    if (pmcidUrlMatch) {
      return { type: 'pmcid', canonical: pmcidUrlMatch[1].toLowerCase() };
    }

    const pmcidMatch = lowered.match(/(?:^|\b)pmc(?:id)?\s*:?\s*(pmc\d+)/i);
    if (pmcidMatch) {
      return { type: 'pmcid', canonical: pmcidMatch[1].toLowerCase() };
    }

    const cnkiMatch = lowered.match(/link\.cnki\.net\/doi\/([^?#\s]+)/i);
    if (cnkiMatch) {
      return { type: 'doi', canonical: trimTrailingPunctuation(cnkiMatch[1]) };
    }

    const doiUrlMatch = lowered.match(/(?:dx\.)?doi\.org\/([^?#\s]+)/i);
    if (doiUrlMatch) {
      return { type: 'doi', canonical: trimTrailingPunctuation(doiUrlMatch[1]) };
    }

    const doiPrefixMatch = lowered.match(/^doi\s*:?\s*(10\.\d{4,9}\/[\w.();:\/+-]+)/i);
    if (doiPrefixMatch) {
      return { type: 'doi', canonical: trimTrailingPunctuation(doiPrefixMatch[1]) };
    }

    const bareDoiMatch = lowered.match(/(10\.\d{4,9}\/[\w.();:\/+-]+)/i);
    if (bareDoiMatch) {
      return { type: 'doi', canonical: trimTrailingPunctuation(bareDoiMatch[1]) };
    }

    return { type: 'other', canonical: lowered };
  }

  function safelyDecodeURIComponent(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  function trimTrailingPunctuation(value) {
    return String(value || '').replace(/[.,;:]+$/g, '').toLowerCase();
  }

  function normalizeYear(year) {
    const match = String(year || '').match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
    return match ? match[1] : '';
  }

  function normalizeAuthorTokens(authors) {
    return String(authors || '')
      .split(/[;,，；]/)
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .map((part) => {
        const normalized = part.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/g, ' ').replace(/\s+/g, ' ').trim();
        const segments = normalized.split(' ').filter(Boolean);
        return segments.length > 1 ? segments[segments.length - 1] : normalized;
      })
      .filter(Boolean);
  }

  function hasStrongAuthorOverlap(left, right) {
    const leftAuthors = left._normalized_authors || [];
    const rightAuthors = right._normalized_authors || [];

    if (leftAuthors.length === 0 || rightAuthors.length === 0) {
      return false;
    }

    if (leftAuthors[0] && rightAuthors[0] && leftAuthors[0] === rightAuthors[0]) {
      return true;
    }

    const rightSet = new Set(rightAuthors);
    return leftAuthors.some((author) => rightSet.has(author));
  }

  function exactlyOneIdentifierPresent(left, right) {
    return Boolean(left._canonical_identifier) !== Boolean(right._canonical_identifier);
  }

  function hasCompatiblePublicationTypes(left, right) {
    if (left._normalized_publication_type === 'unknown' || right._normalized_publication_type === 'unknown') {
      return true;
    }

    return left._normalized_publication_type === right._normalized_publication_type;
  }

  function isDecisiveIdentifierType(identifierType) {
    return identifierType === 'doi' || identifierType === 'pmid' || identifierType === 'pmcid';
  }

  function isProtectedDistinctPair(left, right) {
    const leftType = left._normalized_publication_type;
    const rightType = right._normalized_publication_type;

    return (
      isCrossTypePair(leftType, rightType, 'protocol', 'journal_article') ||
      isCrossTypePair(leftType, rightType, 'conference_abstract', 'journal_article') ||
      isCrossTypePair(leftType, rightType, 'editorial', 'journal_article') ||
      isCrossTypePair(leftType, rightType, 'commentary', 'journal_article') ||
      isCrossTypePair(leftType, rightType, 'letter', 'journal_article')
    );
  }

  function isCrossTypePair(leftType, rightType, a, b) {
    return (leftType === a && rightType === b) || (leftType === b && rightType === a);
  }

  function buildReason(code, message, evidence) {
    return {
      code,
      message,
      evidence: evidence || {},
    };
  }

  function countReasons(reasonCodes) {
    return reasonCodes.reduce((accumulator, code) => {
      accumulator[code] = (accumulator[code] || 0) + 1;
      return accumulator;
    }, {});
  }

  function pickFirstNonEmpty() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = String(arguments[index] || '').trim();
      if (value) {
        return value;
      }
    }

    return '';
  }

  return {
    run,
    canonicalizeIdentifier,
    normalizeTitle,
    normalizePages,
    normalizePublicationType,
    computeHardDuplicateDecision,
    computeCandidateDecision,
  };
});

