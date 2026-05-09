(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.AiProviderEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PROVIDER_SCHEMA_VERSION = 'ai-provider.v1';
  const VALID_PROVIDER_TYPES = new Set(['none', 'local', 'user_provided_endpoint', 'hosted']);
  const VALID_DATA_BOUNDARIES = new Set(['local_only', 'hash_only', 'cloud_submitted']);
  const VALID_API_KEY_STORAGE = new Set(['not_configured', 'session_only', 'browser_local', 'external_secret']);
  const VALID_REQUEST_POLICIES = new Set(['disabled', 'draft_only', 'manual_dispatch']);
  const VALID_STAGES = new Set(['title_abstract', 'full_text', 'quality_appraisal', 'reporting']);
  const SECRET_KEY_PATTERN = /(api[_-]?key|authorization|bearer|token|secret|password|credential)/i;

  function normalizeString(value, fallback = '') {
    const normalized = String(value === undefined || value === null ? '' : value).trim();
    return normalized || fallback || '';
  }

  function normalizeBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') {
      return Boolean(fallback);
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    return Boolean(fallback);
  }

  function normalizeEnum(value, allowedValues, fallback) {
    const normalized = normalizeString(value, fallback).toLowerCase();
    return allowedValues.has(normalized) ? normalized : fallback;
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function normalizeStage(stage) {
    const normalized = normalizeString(stage, '').toLowerCase();
    return VALID_STAGES.has(normalized) ? normalized : '';
  }

  function normalizeAllowedStages(value) {
    const stages = normalizeArray(value)
      .map((stage) => normalizeStage(stage))
      .filter(Boolean);
    return Array.from(new Set(stages));
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

  function sanitizeEndpointUrl(value) {
    const raw = normalizeString(value, '');
    if (!raw) {
      return {
        endpointUrl: '',
        endpointOrigin: '',
        endpointPathHash: '',
      };
    }

    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          endpointUrl: '',
          endpointOrigin: '',
          endpointPathHash: '',
        };
      }

      parsed.username = '';
      parsed.password = '';
      parsed.search = '';
      parsed.hash = '';

      return {
        endpointUrl: parsed.toString(),
        endpointOrigin: parsed.origin,
        endpointPathHash: stableHash(parsed.pathname || '/'),
      };
    } catch (error) {
      return {
        endpointUrl: '',
        endpointOrigin: '',
        endpointPathHash: '',
      };
    }
  }

  function hasSecretLikeValue(value) {
    if (!value || typeof value !== 'object') {
      return false;
    }

    if (Array.isArray(value)) {
      return value.some((entry) => hasSecretLikeValue(entry));
    }

    return Object.keys(value).some((key) => {
      const normalizedKey = String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (['apikeypresent', 'apikeystorage'].includes(normalizedKey)) {
        return false;
      }

      if (SECRET_KEY_PATTERN.test(key)) {
        const rawValue = value[key];
        if (typeof rawValue === 'boolean') {
          return rawValue;
        }

        const normalizedValue = normalizeString(rawValue, '').toLowerCase();
        return Boolean(normalizedValue && !['false', '0', 'no', 'not_configured'].includes(normalizedValue));
      }

      return hasSecretLikeValue(value[key]);
    });
  }

  function redactSecrets(value) {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => redactSecrets(entry));
    }

    if (typeof value !== 'object') {
      return value;
    }

    return Object.keys(value).reduce((acc, key) => {
      if (SECRET_KEY_PATTERN.test(key)) {
        acc[key] = normalizeString(value[key], '') ? '[redacted]' : '';
        return acc;
      }
      acc[key] = redactSecrets(value[key]);
      return acc;
    }, {});
  }

  function normalizeProviderConfig(input = {}) {
    const providerType = normalizeEnum(input.providerType || input.provider_type, VALID_PROVIDER_TYPES, 'none');
    const endpoint = sanitizeEndpointUrl(input.endpointUrl || input.endpoint_url || input.baseUrl || input.base_url);
    const apiKeyPresent = normalizeBoolean(input.apiKeyPresent || input.api_key_present, false) || hasSecretLikeValue(input);
    const allowedStages = normalizeAllowedStages(input.allowedStages || input.allowed_stages);
    const fallbackBoundary = providerType === 'local' || providerType === 'none' ? 'local_only' : 'hash_only';
    const dataBoundary = normalizeEnum(input.dataBoundary || input.data_boundary, VALID_DATA_BOUNDARIES, fallbackBoundary);
    const requestPolicy = normalizeEnum(input.requestPolicy || input.request_policy, VALID_REQUEST_POLICIES, 'disabled');
    const isRealProvider = providerType === 'user_provided_endpoint' || providerType === 'hosted';

    return {
      providerId: normalizeString(input.providerId || input.provider_id, 'default-ai-provider'),
      providerType,
      providerName: normalizeString(input.providerName || input.provider_name, providerType === 'local' ? 'local_mock_provider' : ''),
      modelName: normalizeString(input.modelName || input.model_name, providerType === 'local' ? 'mock-screening-assistant' : ''),
      endpointUrl: endpoint.endpointUrl,
      endpointOrigin: endpoint.endpointOrigin,
      endpointPathHash: endpoint.endpointPathHash,
      allowedStages,
      dataBoundary,
      apiKeyPresent,
      apiKeyStorage: apiKeyPresent
        ? normalizeEnum(input.apiKeyStorage || input.api_key_storage, VALID_API_KEY_STORAGE, 'session_only')
        : 'not_configured',
      requestPolicy,
      realProviderConnected: isRealProvider && requestPolicy !== 'disabled',
      schemaVersion: PROVIDER_SCHEMA_VERSION,
    };
  }

  function redactProviderConfig(input = {}) {
    const config = normalizeProviderConfig(input);
    return {
      providerId: config.providerId,
      providerType: config.providerType,
      providerName: config.providerName,
      modelName: config.modelName,
      endpointUrl: config.endpointUrl,
      endpointOrigin: config.endpointOrigin,
      endpointPathHash: config.endpointPathHash,
      allowedStages: config.allowedStages,
      dataBoundary: config.dataBoundary,
      apiKeyPresent: config.apiKeyPresent,
      apiKeyStorage: config.apiKeyStorage,
      requestPolicy: config.requestPolicy,
      realProviderConnected: config.realProviderConnected,
      schemaVersion: config.schemaVersion,
    };
  }

  function buildAuditRegistryEntry(input = {}, context = {}) {
    const config = normalizeProviderConfig(input);
    const redacted = redactProviderConfig(config);
    return {
      usageId: normalizeString(context.usageId || context.usage_id, 'default-ai-mode'),
      projectId: normalizeString(context.projectId || context.project_id, ''),
      aiMode: normalizeString(context.aiMode || context.ai_mode, config.providerType === 'none' ? 'off' : 'assistive'),
      providerType: config.providerType,
      providerName: config.providerName,
      modelName: config.modelName,
      enabledAt: normalizeString(context.enabledAt || context.enabled_at, ''),
      disabledAt: normalizeString(context.disabledAt || context.disabled_at, ''),
      allowedStages: config.allowedStages,
      dataBoundary: config.dataBoundary,
      userAcknowledged: normalizeBoolean(context.userAcknowledged === undefined ? context.user_acknowledged : context.userAcknowledged, false),
      metadata: {
        providerConfig: redacted,
        providerSchemaVersion: PROVIDER_SCHEMA_VERSION,
        realProviderConnected: config.realProviderConnected,
        requestPolicy: config.requestPolicy,
      },
    };
  }

  function buildPromptRecord(input = {}) {
    const promptId = normalizeString(input.promptId || input.prompt_id, 'screening-title-abstract');
    const promptVersion = normalizeString(input.promptVersion || input.prompt_version, 'v1');
    const template = normalizeString(input.template, '');
    const variables = redactSecrets(input.variables || {});

    return {
      promptId,
      promptVersion,
      promptHash: stableHash({ promptId, promptVersion, template }),
      variableHash: stableHash(variables),
      schemaVersion: PROVIDER_SCHEMA_VERSION,
    };
  }

  function buildInputDigest(input = {}) {
    const record = input.record || {};
    const recordId = normalizeString(input.recordId || input.record_id || record.record_id || record.recordId || record.id, '');
    const title = normalizeString(input.title || record.title || record.TI || record.T1, '');
    const abstractText = normalizeString(input.abstract || record.abstract || record.AB || record.N2, '');
    const stage = normalizeStage(input.stage) || 'title_abstract';

    return {
      recordId,
      stage,
      inputHash: stableHash({
        recordId,
        stage,
        title,
        abstract: abstractText,
      }),
      inputSummary: title ? title.slice(0, 140) : `Record ${recordId || 'unknown'}`,
      schemaVersion: PROVIDER_SCHEMA_VERSION,
    };
  }

  function createProviderRequestDraft(input = {}) {
    const config = normalizeProviderConfig(input.providerConfig || input.provider_config || {});
    const stage = normalizeStage(input.stage) || 'title_abstract';
    const prompt = buildPromptRecord(input.prompt || {});
    const digest = buildInputDigest({
      ...(input.input || {}),
      stage,
    });

    const stageAllowed = config.allowedStages.length === 0 || config.allowedStages.includes(stage);
    const providerConfigured = config.providerType !== 'none';
    const realDispatchAllowed = false;
    const reason = !providerConfigured
      ? 'provider_not_configured'
      : !stageAllowed
        ? 'stage_not_allowed'
        : 'real_provider_dispatch_disabled';

    return {
      status: 'not_dispatched',
      canDispatch: realDispatchAllowed,
      reason,
      stage,
      provider: redactProviderConfig(config),
      promptHash: prompt.promptHash,
      inputHash: digest.inputHash,
      inputSummary: digest.inputSummary,
      rawPayloadIncluded: false,
      schemaVersion: PROVIDER_SCHEMA_VERSION,
    };
  }

  function buildSuggestionTrace(input = {}) {
    const config = normalizeProviderConfig(input.providerConfig || input.provider_config || {});
    const draft = createProviderRequestDraft({
      providerConfig: config,
      stage: input.stage,
      prompt: input.prompt,
      input: input.input,
    });

    return {
      modelName: config.modelName,
      promptHash: draft.promptHash,
      inputHash: draft.inputHash,
      inputSummary: draft.inputSummary,
      metadata: {
        providerConfig: draft.provider,
        providerSchemaVersion: PROVIDER_SCHEMA_VERSION,
        requestStatus: draft.status,
        requestReason: draft.reason,
        rawPayloadIncluded: false,
        realProviderConnected: config.realProviderConnected,
      },
    };
  }

  return {
    PROVIDER_SCHEMA_VERSION,
    normalizeProviderConfig,
    redactProviderConfig,
    redactSecrets,
    stableHash,
    buildAuditRegistryEntry,
    buildPromptRecord,
    buildInputDigest,
    createProviderRequestDraft,
    buildSuggestionTrace,
  };
});
