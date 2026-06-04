(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.ConservativeAiEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CONSERVATIVE_AI_SCHEMA_VERSION = 'conservative_ai.v2.6';
  const DEFAULT_PROMPT_ID = 'v26-title-abstract-conservative-screening';
  const DEFAULT_PROMPT_VERSION = 'v1';

  function normalizeString(value, fallback = '') {
    const normalized = String(value === undefined || value === null ? '' : value).trim();
    return normalized || fallback || '';
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function stableHash(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value || {});
    let hash = 0x811c9dc5;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }

    return `local-hash-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function readRecordField(record, field, aliases = []) {
    const candidates = [field, ...aliases];
    for (const key of candidates) {
      const value = record && record[key];
      const normalized = normalizeString(value, '');
      if (normalized) return normalized;
    }
    return '';
  }

  function getRecordId(record, index = 0) {
    return normalizeString(
      record && (record.record_id || record.recordId || record.id || record.ID),
      `record-${index + 1}`
    );
  }

  function buildConservativePromptRecord(input = {}) {
    const promptId = normalizeString(input.promptId || input.prompt_id, DEFAULT_PROMPT_ID);
    const promptVersion = normalizeString(input.promptVersion || input.prompt_version, DEFAULT_PROMPT_VERSION);
    const criteria = input.criteria || {};
    const template = normalizeString(
      input.template,
      'Conservative title/abstract screening assistance. Provide advisory include, exclude, or uncertain; humans make final decisions.'
    );

    return {
      promptId,
      promptVersion,
      promptHash: stableHash({ promptId, promptVersion, template }),
      criteriaHash: stableHash(criteria),
      rawPayloadIncluded: false,
      schemaVersion: CONSERVATIVE_AI_SCHEMA_VERSION,
    };
  }

  function includesAny(text, patterns) {
    return normalizeArray(patterns).some((pattern) => {
      const normalized = normalizeString(pattern, '').toLowerCase();
      return normalized && text.includes(normalized);
    });
  }

  function scoreRecord(text, title, abstractText, criteria) {
    const criteriaMatches = [];
    const riskFlags = [];
    const uncertaintyFlags = [];
    const includeCriteria = normalizeArray(criteria.include || criteria.include_any);
    const excludeCriteria = normalizeArray(criteria.exclude || criteria.exclude_any);

    if (includesAny(text, includeCriteria)) {
      criteriaMatches.push('user_include_criteria');
    }

    if (includesAny(text, excludeCriteria)) {
      riskFlags.push('user_exclude_criteria');
    }

    if (/trial|randomi[sz]ed|random|cohort|systematic|meta|intervention|outcome|随机|队列|干预|研究/.test(text)) {
      criteriaMatches.push('study_design_or_relevance_signal');
    }

    if (/protocol|commentary|editorial|letter|conference abstract|会议摘要|方案|社论|评论/.test(text)) {
      riskFlags.push('protocol_or_non_result_record');
    }

    if (!abstractText || abstractText.length < 40) {
      uncertaintyFlags.push('missing_or_short_abstract');
    }

    if (!title) {
      uncertaintyFlags.push('missing_title');
    }

    const includeScore = criteriaMatches.length * 0.32;
    const riskScore = riskFlags.length * 0.38;
    const uncertaintyScore = uncertaintyFlags.length * 0.18;
    const priorityScore = Math.max(0, Math.min(1, 0.38 + includeScore + riskScore + uncertaintyScore));

    return {
      criteriaMatches,
      riskFlags,
      uncertaintyFlags,
      priorityScore: Number(priorityScore.toFixed(2)),
    };
  }

  function decideAdvisoryOutcome(score) {
    if (score.riskFlags.includes('protocol_or_non_result_record') || score.riskFlags.includes('user_exclude_criteria')) {
      return {
        suggestedDecision: 'exclude',
        confidence: score.uncertaintyFlags.length ? 0.58 : 0.66,
        recommendedQueue: 'needs_human_exclusion_check',
        priorityReason: 'Potential exclusion signal found; human confirmation required before any decision is counted.',
      };
    }

    if (score.criteriaMatches.length > 0) {
      return {
        suggestedDecision: 'include',
        confidence: score.uncertaintyFlags.length ? 0.62 : 0.74,
        recommendedQueue: 'likely_relevant',
        priorityReason: 'Relevance signals found; keep high in the human review queue.',
      };
    }

    return {
      suggestedDecision: 'uncertain',
      confidence: 0.42,
      recommendedQueue: 'needs_human_attention',
      priorityReason: 'Insufficient or conflicting information; human review should decide.',
    };
  }

  function buildInputDigest(record, recordId, stage, title, abstractText) {
    return {
      inputHash: stableHash({ recordId, stage, title, abstract: abstractText }),
      inputSummary: title ? title.slice(0, 140) : `Record ${recordId}`,
    };
  }

  function buildConservativeSuggestionForRecord(record, options = {}) {
    const stage = normalizeString(options.stage, 'title_abstract');
    const index = Number.isFinite(options.index) ? options.index : 0;
    const recordId = getRecordId(record, index);
    const title = readRecordField(record, 'title', ['TI', 'T1', 'dc:title']);
    const abstractText = readRecordField(record, 'abstract', ['AB', 'N2', 'dcterms:abstract']);
    const text = `${title}\n${abstractText}`.toLowerCase();
    const criteria = options.criteria || {};
    const prompt = buildConservativePromptRecord(options.prompt || { criteria });
    const score = scoreRecord(text, title, abstractText, criteria);
    const outcome = decideAdvisoryOutcome(score);
    const digest = buildInputDigest(record, recordId, stage, title, abstractText);
    const suggestionId = normalizeString(
      options.suggestionId || options.suggestion_id,
      `v26-${stableHash({ recordId, stage, promptHash: prompt.promptHash }).slice(-8)}`
    );

    return {
      suggestionId,
      projectId: normalizeString(options.projectId || options.project_id, ''),
      recordId,
      stage,
      mode: 'suggest_only',
      modelName: normalizeString(options.modelName || options.model_name, 'local-conservative-ai-v2.6'),
      promptHash: prompt.promptHash,
      inputHash: digest.inputHash,
      inputSummary: digest.inputSummary,
      suggestedDecision: outcome.suggestedDecision,
      rationale: outcome.priorityReason,
      confidence: outcome.confidence,
      humanAction: 'pending',
      metadata: {
        advisoryOnly: true,
        realProviderConnected: false,
        rawPayloadIncluded: false,
        providerType: 'local',
        schemaVersion: CONSERVATIVE_AI_SCHEMA_VERSION,
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        criteriaHash: prompt.criteriaHash,
        criteriaMatches: score.criteriaMatches,
        riskFlags: score.riskFlags,
        uncertaintyFlags: score.uncertaintyFlags,
        priorityScore: score.priorityScore,
        priorityReason: outcome.priorityReason,
        recommendedQueue: outcome.recommendedQueue,
      },
    };
  }

  function buildConservativeSuggestionBatch(records, options = {}) {
    return normalizeArray(records).map((record, index) => buildConservativeSuggestionForRecord(record, {
      ...options,
      index,
    }));
  }

  return {
    CONSERVATIVE_AI_SCHEMA_VERSION,
    stableHash,
    buildConservativePromptRecord,
    buildConservativeSuggestionForRecord,
    buildConservativeSuggestionBatch,
  };
});
