// Global state
let uploadedData = [];
let uploadedFiles = []; // v3.0: Track multiple file sources
let currentStep = 1;
let columnMapping = {};
let screeningResults = null;
let fileFormat = 'unknown';
let formatSource = 'Unknown';
let currentTheme = 'subtle';
const APP_RELEASE_VERSION = '2.5-dual-review-release';
const FEATURE_FLAGS = Object.freeze({
  ENABLE_QUALITY_ASSESSMENT: true,
  ENABLE_STREAMING_IMPORT_V21: true,
});
const WORKFLOW_STEP_COUNT = FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT ? 6 : 5;
const QUALITY_ENGINE = typeof globalThis !== 'undefined' ? globalThis.QualityEngine || null : null;
const IMPORT_JOB_RUNTIME = typeof globalThis !== 'undefined' ? globalThis.ImportJobRuntime || null : null;
const AUDIT_ENGINE = typeof globalThis !== 'undefined' ? globalThis.AuditEngine || null : null;
const DUAL_REVIEW_ENGINE = typeof globalThis !== 'undefined' ? globalThis.DualReviewEngine || null : null;
const AI_PROVIDER_ENGINE = typeof globalThis !== 'undefined' ? globalThis.AiProviderEngine || null : null;
const CONSERVATIVE_AI_ENGINE = typeof globalThis !== 'undefined' ? globalThis.ConservativeAiEngine || null : null;
const PROJECT_HISTORY_ENGINE = typeof globalThis !== 'undefined' ? globalThis.ProjectHistoryEngine || null : null;
const AUDIT_EXPORT_TYPES = Object.freeze([
  'audit_manifest',
  'audit_events',
  'audit_screening_decisions',
  'audit_exclusion_reasons',
  'audit_prisma_counts',
  'audit_summary',
  'ai_usage_registry',
  'ai_suggestions',
  'prisma_traice_report',
]);
const DUAL_REVIEW_EXPORT_TYPES = Object.freeze([
  'dual_review_conflicts',
  'dual_review_agreement',
]);
const V25_FINAL_CONFLICT_GATED_EXPORT_TYPES = Object.freeze([
  'included',
  'excluded',
  'svg-colorful',
  'svg-blackwhite',
  'svg-subtle',
  'report',
  'quality_appraisal',
  'evidence_table',
  'grade_summary',
  'audit_prisma_counts',
  'audit_summary',
]);
const V25_CONFLICT_EVIDENCE_EXPORT_TYPES = Object.freeze([
  'audit_manifest',
  'audit_events',
  'audit_screening_decisions',
  'audit_exclusion_reasons',
  'ai_usage_registry',
  'ai_suggestions',
  'prisma_traice_report',
  'dual_review_conflicts',
  'dual_review_agreement',
]);
const QUALITY_DISPLAY_LABELS = Object.freeze({
  status: {
    not_started: { zh: '未开始', en: 'Not started' },
    queued: { zh: '已排队', en: 'Queued' },
    in_progress: { zh: '进行中', en: 'In progress' },
    complete: { zh: '已完成', en: 'Complete' },
    completed: { zh: '已完成', en: 'Completed' },
    needs_full_text: { zh: '需全文确认', en: 'Needs full text' },
  },
  studyDesign: {
    rct: { zh: '随机对照试验', en: 'Randomized trial' },
    systematic_review: { zh: '系统综述 / Meta 分析', en: 'Systematic review / meta-analysis' },
    cohort: { zh: '队列研究', en: 'Cohort study' },
    case_control: { zh: '病例对照研究', en: 'Case-control study' },
    cross_sectional: { zh: '横断面研究', en: 'Cross-sectional study' },
    diagnostic_accuracy: { zh: '诊断准确性研究', en: 'Diagnostic accuracy study' },
    non_randomized_intervention: { zh: '非随机干预研究', en: 'Non-randomized intervention' },
    case_report: { zh: '病例报告', en: 'Case report' },
    case_series: { zh: '病例系列', en: 'Case series' },
    other: { zh: '其他 / 待确认', en: 'Other / needs review' },
  },
  toolFamily: {
    rob2: { zh: 'RoB 2', en: 'RoB 2' },
    robins_i: { zh: 'ROBINS-I', en: 'ROBINS-I' },
    newcastle_ottawa_scale: { zh: 'Newcastle-Ottawa 量表', en: 'Newcastle-Ottawa Scale' },
    jbi: { zh: 'JBI 清单', en: 'JBI checklist' },
    quadas_2: { zh: 'QUADAS-2', en: 'QUADAS-2' },
    amstar_2: { zh: 'AMSTAR 2', en: 'AMSTAR 2' },
    rob2_lite: { zh: 'RoB 2 简版', en: 'RoB 2 Lite' },
    amstar2_lite: { zh: 'AMSTAR 2 简版', en: 'AMSTAR 2 Lite' },
    jbi_nos_lite: { zh: 'JBI / NOS 简版', en: 'JBI / NOS Lite' },
    robins_i_lite: { zh: 'ROBINS-I 简版', en: 'ROBINS-I Lite' },
    case_report_lite: { zh: '病例报告简版', en: 'Case report lite' },
    generic_quality_shell: { zh: '通用质量评价框架', en: 'Generic quality shell' },
  },
  evidence: {
    high: { zh: '高', en: 'High' },
    moderate: { zh: '中等', en: 'Moderate' },
    low: { zh: '低', en: 'Low' },
    very_low: { zh: '很低', en: 'Very low' },
  },
  judgement: {
    low_risk: { zh: '低风险', en: 'Low risk' },
    some_concerns: { zh: '有一些顾虑', en: 'Some concerns' },
    high_risk: { zh: '高风险', en: 'High risk' },
    unclear: { zh: '信息不清', en: 'Unclear' },
    not_applicable: { zh: '不适用', en: 'Not applicable' },
    not_assessed: { zh: '未评价', en: 'Not assessed' },
  },
});
let qualityAssessments = [];
let importJobs = [];
let projectManifest = null;
let auditEvents = [];
let screeningDecisions = [];
let aiSuggestionEvents = [];
let conservativeAiQueueFilter = 'all';
let conservativeAiQueueSortMode = 'original';
let currentConservativeAiQueueContext = null;
let projectHistory = [];

// Runtime mode state (Task 8)
const RUNTIME_MODE = {
  SINGLE: 'single',
  DUAL_MAIN: 'dual-main',
  DUAL_SECONDARY: 'dual-secondary'
};

let runtimeMode = RUNTIME_MODE.SINGLE;
let runtimeSession = null;

// v1.1 collaboration globals (explicit declarations to avoid runtime ReferenceError)
let currentUserSession = null;
let isDualReviewMode = false;
let currentReviewer = 'A';
let reviewerNames = { A: '审查员A', B: '审查员B' };
let dualReviewResults = { A: {}, B: {}, final: {} };
let dualReviewConflictState = {
  screeningPairs: [],
  screeningConflicts: [],
  qualityConflicts: [],
  agreementMetrics: null,
  exportGate: null,
};

function getEmptyDualReviewConflictState() {
  return {
    screeningPairs: [],
    screeningConflicts: [],
    qualityConflicts: [],
    agreementMetrics: null,
    exportGate: null,
  };
}
let projectData = null;
let collaborationSyncInterval = null;
const COLLAB_PROJECTS_KEY = 'prisma_projects';
const USER_SESSION_KEY = 'prisma_user_session';

// v1.5: Smart batch import system (4 mechanisms)
const SMART_IMPORT_CONFIG = {
  MAX_CHUNK_SIZE: 5000,        // 单批次最大记录数
  CHECKPOINT_INTERVAL: 1000,   // Checkpoint间隔
  PARSE_CHUNK_SIZE: 50000,     // 流式解析块大小(bytes)
  MAX_RETRY: 3                 // 最大重试次数
};
const PARSER_WORKER_URL = 'parser-worker.js?v=20260422-streaming-v2';
const LOCAL_FILE_WORKER_FALLBACK_MAX_BYTES = 20 * 1024 * 1024;

let importQueue = {
  tasks: [],                   // 待导入任务队列
  currentTask: null,           // 当前执行任务
  checkpoints: [],             // Checkpoint记录
  status: 'idle',              // idle|running|paused|failed
  progress: { total: 0, processed: 0, failed: 0 }
};

// v1.4: Project-level exclusion reason template (customizable & persisted)
const DEFAULT_EXCLUSION_REASONS = [
  '人群不符',
  '干预不符',
  '对照不符',
  '缺乏结局',
  '数据不完整',
  '研究设计不合适'
];

let exclusionReasons = [...DEFAULT_EXCLUSION_REASONS];

// v1.4: Explicit state split
let filterRules = null; // last used rules
let currentProjectId = null; // local project id for persistence

// v1.1: Multi-user collaboration variables
let projectCollaboration = {
  reviewers: {},
  decisions: {},
  status: 'active',
  createdAt: null,
  lastSync: null
};

// Color themes
const colorThemes = {
  colorful: {
    name: '活力彩色',
    colors: {
      identified: '#FF6B6B',
      screened: '#4ECDC4',
      included: '#45B7D1',
      excluded: '#FFA07A',
      duplicates: '#FFD93D',
      text: '#2C3E50',
      border: '#34495E'
    }
  },
  blackwhite: {
    name: '黑白',
    colors: {
      identified: '#1A1A1A',
      screened: '#4D4D4D',
      included: '#808080',
      excluded: '#B3B3B3',
      duplicates: '#E6E6E6',
      text: '#000000',
      border: '#333333'
    }
  },
  subtle: {
    name: '柔和',
    colors: {
      identified: '#8B4F8B',
      screened: '#5B7C99',
      included: '#6B8E6F',
      excluded: '#C89B6B',
      duplicates: '#A89968',
      text: '#3E3E3E',
      border: '#6B6B6B'
    }
  }
};

// Sample data for demonstration
const sampleData = [
  {
    title: "中医针灸对慢性疼痛的疗效研究",
    abstract: "本研究探讨了针灸治疗慢性疼痛的临床效果，采用随机对照试验方法，结果显示针灸组疼痛评分显著低于对照组。",
    year: 2020,
    journal: "中华中医药杂志",
    authors: "张三;李四",
    doi: "10.1234/tcm.2020.001",
    keywords: "中医;针灸;慢性疼痛"
  },
  {
    title: "Acupuncture for chronic pain: systematic review",
    abstract: "This systematic review evaluates the efficacy of acupuncture in treating chronic pain conditions. Meta-analysis shows significant pain reduction.",
    year: 2021,
    journal: "Pain Medicine",
    authors: "Smith J, Johnson A",
    doi: "10.5678/pain.2021.042",
    keywords: "acupuncture;chronic pain;systematic review"
  },
  {
    title: "医保支付方式改革与价值医疗",
    abstract: "探讨医保支付方式改革对医疗服务价值导向的影响，采用差分中的差分方法评估政策效果。",
    year: 2022,
    journal: "中国卫生经济",
    authors: "王五;赵六",
    doi: "10.9012/che.2022.018",
    keywords: "医保;支付方式;价值医疗;DID"
  },
  {
    title: "Animal study of acupuncture mechanisms",
    abstract: "This study investigates the neurobiological mechanisms of acupuncture using animal models. Rats were subjected to acupuncture treatment.",
    year: 2019,
    journal: "Neuroscience Letters",
    authors: "Chen L, Wang M",
    doi: "10.3456/neuro.2019.089",
    keywords: "animal study;acupuncture;mechanisms"
  },
  {
    title: "Editorial: Future of Traditional Chinese Medicine",
    abstract: "This editorial discusses the future directions and challenges facing traditional Chinese medicine research and practice.",
    year: 2023,
    journal: "Journal of TCM",
    authors: "Li H",
    doi: "10.7890/jtcm.2023.005",
    keywords: "editorial;traditional chinese medicine"
  },
  {
    title: "Causal inference in health economics using AIPW",
    abstract: "We apply augmented inverse probability weighting (AIPW) to estimate causal effects of medical insurance on healthcare utilization.",
    year: 2022,
    journal: "Health Economics",
    authors: "Brown R, Davis K",
    doi: "10.2468/he.2022.134",
    keywords: "causal inference;AIPW;medical insurance"
  },
  {
    title: "In vitro study of herbal medicine efficacy",
    abstract: "Cell culture experiments demonstrate the anti-inflammatory effects of traditional herbal compounds in vitro.",
    year: 2021,
    journal: "Phytomedicine",
    authors: "Liu Y, Zhou X",
    doi: "10.1357/phyto.2021.067",
    keywords: "in vitro;herbal medicine;cell culture"
  },
  {
    title: "Protocol: RCT of acupuncture for migraine",
    abstract: "This paper presents the study protocol for a randomized controlled trial evaluating acupuncture for migraine prevention.",
    year: 2023,
    journal: "Trials",
    authors: "Martinez P, Garcia S",
    doi: "10.8642/trials.2023.091",
    keywords: "protocol;acupuncture;migraine;RCT"
  },
  {
    title: "Overlap weighting for observational studies in medical insurance",
    abstract: "We propose using overlap weighting to improve balance and efficiency in estimating treatment effects from medical insurance data.",
    year: 2023,
    journal: "Statistics in Medicine",
    authors: "Wilson T, Anderson M",
    doi: "10.9753/sim.2023.156",
    keywords: "overlap weighting;medical insurance;causal inference"
  },
  {
    title: "Case report: Rare complication of acupuncture",
    abstract: "We report a case of pneumothorax following acupuncture treatment, highlighting the importance of proper technique and safety precautions.",
    year: 2020,
    journal: "Case Reports in Medicine",
    authors: "Taylor E",
    doi: "10.4826/crm.2020.023",
    keywords: "case report;acupuncture;complication"
  }
];

// Default rules
const defaultRules = {
  time_window: {
    start_year: 2000,
    end_year: 2030
  },
  include_any: [
    // v3.0: 默认为空，不进行关键词过滤
    // 用户可以根据需要自行添加关键词
  ],
  exclude: [
    { keyword: "animal study", reason: "不属于人群研究(动物实验)" },
    { keyword: "editorial", reason: "非研究性文献(社论/评论)" },
    { keyword: "protocol", reason: "仅研究方案,无结果" },
    { keyword: "in vitro", reason: "体外实验,非目标范围" },
    { keyword: "case report", reason: "病例报道,证据等级不足" }
  ],
  language: {
    allow: ["english", "chinese"]
  },
  required_one_of: ["title", "abstract"]
};

function normalizeQualityAssessmentsState(list) {
  if (!Array.isArray(list)) return [];

  return list
    .filter(Boolean)
    .map((assessment, index) => {
      if (QUALITY_ENGINE && typeof QUALITY_ENGINE.createQualityAssessment === 'function') {
        const normalized = QUALITY_ENGINE.createQualityAssessment(
          {
            id: assessment.record_id || assessment.recordId || `record-${index + 1}`,
            title: assessment.title || '',
            abstract: assessment.abstract || '',
            publication_type: assessment.publication_type || assessment.study_design || '',
          },
          {
            id: assessment.id || `qa-${index + 1}`,
            projectId: assessment.project_id || assessment.projectId || currentProjectId || null,
            recordId: assessment.record_id || assessment.recordId || `record-${index + 1}`,
            status: assessment.status,
            studyDesignFamily: assessment.study_design || assessment.studyDesignFamily,
            toolFamily: assessment.tool_family || assessment.toolFamily,
            domainScores: assessment.domain_scores || assessment.domainScores || [],
            overallRisk: assessment.overall_risk || assessment.overallRisk,
            evidenceAdjustments: assessment.evidence_adjustments || assessment.evidenceAdjustments || [],
            evidenceFinal: assessment.evidence_final || assessment.evidenceFinal,
            overallJudgement: assessment.overall_judgement || assessment.overallJudgement,
            overrideReason: assessment.override_reason || assessment.overrideReason || '',
            reviewerId: assessment.reviewer_id || assessment.reviewerId || '',
            notes: assessment.notes || '',
            updatedAt: assessment.updated_at || assessment.updatedAt,
          }
        );

        return {
          ...normalized,
          reviewer_assessments: preserveQualityReviewerAssessments(assessment),
        };
      }

      return {
        id: assessment.id || `qa-${index + 1}`,
        project_id: assessment.project_id || assessment.projectId || currentProjectId || null,
        record_id: assessment.record_id || assessment.recordId || `record-${index + 1}`,
        status: assessment.status || 'not_started',
        study_design: assessment.study_design || assessment.studyDesignFamily || 'other',
        study_type: assessment.study_type || assessment.study_design || assessment.studyDesignFamily || 'other',
        tool_family: assessment.tool_family || assessment.toolFamily || 'generic_quality_shell',
        template_id: assessment.template_id || assessment.templateId || '',
        template_version: assessment.template_version || assessment.templateVersion || '',
        domain_scores: assessment.domain_scores || assessment.domainScores || [],
        domains: assessment.domains || assessment.domain_scores || assessment.domainScores || [],
        overall_risk: assessment.overall_risk || assessment.overallRisk || 'unclear',
        overall_judgement: assessment.overall_judgement || assessment.overallJudgement || assessment.overall_risk || assessment.overallRisk || 'unclear',
        evidence_initial: assessment.evidence_initial || assessment.evidenceInitial || 'very_low',
        evidence_adjustments: assessment.evidence_adjustments || assessment.evidenceAdjustments || [],
        evidence_final: assessment.evidence_final || assessment.evidenceFinal || 'very_low',
        override_reason: assessment.override_reason || assessment.overrideReason || '',
        reviewer_id: assessment.reviewer_id || assessment.reviewerId || '',
        reviewer_assessments: preserveQualityReviewerAssessments(assessment),
        notes: assessment.notes || '',
        updated_at: assessment.updated_at || assessment.updatedAt || new Date().toISOString(),
      };
    });
}

function preserveQualityReviewerAssessments(assessment) {
  if (!assessment || typeof assessment !== 'object' || !assessment.reviewer_assessments || typeof assessment.reviewer_assessments !== 'object') {
    return {};
  }

  return Object.keys(assessment.reviewer_assessments).reduce((acc, reviewerId) => {
    const entry = assessment.reviewer_assessments[reviewerId];
    if (entry && typeof entry === 'object') {
      acc[reviewerId] = { ...entry };
    }
    return acc;
  }, {});
}

function normalizeImportJobsState(list) {
  if (!Array.isArray(list)) return [];

  return list
    .filter(Boolean)
    .map((job) => {
      if (IMPORT_JOB_RUNTIME && typeof IMPORT_JOB_RUNTIME.createImportJob === 'function') {
        const base = IMPORT_JOB_RUNTIME.createImportJob({
          id: job.id,
          projectId: job.project_id || job.projectId || currentProjectId || null,
          fileName: job.file_name || job.fileName || 'unknown',
          fileSize: job.file_size || job.fileSize || 0,
          format: job.format || 'unknown',
          stage: job.stage,
          bytesRead: job.bytes_read || job.bytesRead || 0,
          recordsParsed: job.records_parsed || job.recordsParsed || 0,
          recordsWritten: job.records_written || job.recordsWritten || 0,
          checkpoint: job.checkpoint_json || job.checkpoint || null,
          error: job.error || '',
          startedAt: job.started_at || job.startedAt,
          timestamp: job.updated_at || job.updatedAt,
        });

        return IMPORT_JOB_RUNTIME.patchImportJob(base, {
          stage: job.stage,
          bytesRead: job.bytes_read || job.bytesRead || 0,
          recordsParsed: job.records_parsed || job.recordsParsed || 0,
          recordsWritten: job.records_written || job.recordsWritten || 0,
          checkpoint: job.checkpoint_json || job.checkpoint || null,
          error: job.error || '',
          updatedAt: job.updated_at || job.updatedAt,
        });
      }

      return {
        id: job.id || `import-${Date.now()}`,
        project_id: job.project_id || job.projectId || currentProjectId || null,
        file_name: job.file_name || job.fileName || 'unknown',
        file_size: job.file_size || job.fileSize || 0,
        format: job.format || 'unknown',
        stage: job.stage || 'queued',
        bytes_read: job.bytes_read || job.bytesRead || 0,
        records_parsed: job.records_parsed || job.recordsParsed || 0,
        records_written: job.records_written || job.recordsWritten || 0,
        checkpoint_json: job.checkpoint_json || job.checkpoint || null,
        error: job.error || '',
        started_at: job.started_at || job.startedAt || new Date().toISOString(),
        updated_at: job.updated_at || job.updatedAt || new Date().toISOString(),
      };
    });
}

function buildQualityRecordId(record, fallbackIndex) {
  if (QUALITY_ENGINE && typeof QUALITY_ENGINE.getAssessmentRecordId === 'function') {
    return QUALITY_ENGINE.getAssessmentRecordId(record, fallbackIndex);
  }

  return String(record?.record_id || record?.id || record?.doi || record?.title || `record-${fallbackIndex + 1}`);
}

function createQualityAssessmentShellRecord(record, index) {
  const recordId = buildQualityRecordId(record, index);

  if (QUALITY_ENGINE && typeof QUALITY_ENGINE.createQualityAssessment === 'function') {
    return QUALITY_ENGINE.createQualityAssessment(record, {
      projectId: currentProjectId || null,
      recordId,
    });
  }

  return {
    id: `qa-${recordId}`,
    project_id: currentProjectId || null,
    record_id: recordId,
    status: 'not_started',
    study_design: 'other',
    tool_family: 'generic_quality_shell',
    domain_scores: [],
    overall_risk: 'unclear',
    evidence_initial: 'very_low',
    evidence_adjustments: [],
    evidence_final: 'very_low',
    override_reason: '',
    notes: '',
    updated_at: new Date().toISOString(),
  };
}

function getQualitySourceField(record, fields = []) {
  if (!record || typeof record !== 'object') return '';

  for (const field of fields) {
    const value = record[field];
    if (Array.isArray(value)) {
      const joined = value
        .map((item) => String(item === undefined || item === null ? '' : item).trim())
        .filter(Boolean)
        .join('; ');
      if (joined) return joined;
      continue;
    }

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return '';
}

function rehydrateQualityAssessmentFromSourceRecord(record, assessment, index) {
  const recordId = buildQualityRecordId(record, index);

  if (QUALITY_ENGINE && typeof QUALITY_ENGINE.createQualityAssessment === 'function') {
    const normalized = QUALITY_ENGINE.createQualityAssessment(record, {
      id: assessment.id || `qa-${recordId}`,
      projectId: currentProjectId || assessment.project_id || assessment.projectId || null,
      recordId,
      status: assessment.status,
      domainScores: assessment.domain_scores || assessment.domainScores || [],
      overallRisk: assessment.overall_risk || assessment.overallRisk,
      overallJudgement: assessment.overall_judgement || assessment.overallJudgement,
      evidenceAdjustments: assessment.evidence_adjustments || assessment.evidenceAdjustments || [],
      evidenceFinal: assessment.evidence_final || assessment.evidenceFinal,
      overrideReason: assessment.override_reason || assessment.overrideReason || '',
      reviewerId: assessment.reviewer_id || assessment.reviewerId || '',
      notes: assessment.notes || '',
      updatedAt: assessment.updated_at || assessment.updatedAt,
    });

    return {
      ...normalized,
      reviewer_assessments: preserveQualityReviewerAssessments(assessment),
    };
  }

  return {
    ...assessment,
    id: assessment.id || `qa-${recordId}`,
    project_id: currentProjectId || assessment.project_id || assessment.projectId || null,
    record_id: recordId,
    title: assessment.title || getQualitySourceField(record, ['title', 'TI', 'T1', 'dc:title', 'dcterms:title']) || recordId,
    abstract: assessment.abstract || getQualitySourceField(record, ['abstract', 'AB', 'N2', 'dcterms:abstract', 'dc:description', 'Abstract Note', 'Notes']),
    publication_type: assessment.publication_type || getQualitySourceField(record, ['publication_type', 'type', 'TY', 'PT', 'z:itemType']),
  };
}

function prepareQualityAssessmentShell(options = {}) {
  const { persist = true, silent = false } = options;
  const includedRecords = Array.isArray(screeningResults?.included) ? screeningResults.included : [];

  if (!FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT || includedRecords.length === 0) {
    qualityAssessments = [];
    renderQualityAssessmentShell();
    return qualityAssessments;
  }

  const existing = new Map(
    normalizeQualityAssessmentsState(qualityAssessments).map((assessment) => [
      String(assessment.record_id),
      assessment,
    ])
  );

  qualityAssessments = includedRecords.map((record, index) => {
    const recordId = buildQualityRecordId(record, index);
    const fromState = existing.get(recordId);
    if (fromState) {
      return rehydrateQualityAssessmentFromSourceRecord(record, fromState, index);
    }

    return createQualityAssessmentShellRecord(record, index);
  });

  if (persist && typeof appendAuditEventsSafe === 'function') {
    const qualityEvents = [{
      eventType: 'quality_appraisal_started',
      recordId: '',
      after: {
        assessmentCount: qualityAssessments.length,
      },
      source: 'system',
      metadata: {
        includedCount: includedRecords.length,
      },
    }].concat(qualityAssessments.map((assessment) => ({
      eventType: 'quality_appraisal_updated',
      recordId: String(assessment.record_id || ''),
      after: {
        templateId: assessment.template_id || '',
        studyDesign: assessment.study_design || '',
        toolFamily: assessment.tool_family || '',
        domainCount: Array.isArray(assessment.domain_scores) ? assessment.domain_scores.length : 0,
        evidenceInitial: assessment.evidence_initial || '',
      },
      source: 'system',
      metadata: {
        status: assessment.status || '',
        schemaVersion: assessment.schema_version || '',
      },
    })));
    appendAuditEventsSafe(qualityEvents, { persist: false });
  }

  if (persist) persistCurrentProjectState();
  renderQualityAssessmentShell();

  if (!silent) {
    showToast(`已准备 ${qualityAssessments.length} 条质量评价记录`, 'success');
  }

  return qualityAssessments;
}

function getQualityDisplayLabel(labelGroup, value, lang) {
  const key = String(value || '').trim();
  const group = QUALITY_DISPLAY_LABELS[labelGroup] || {};
  const label = group[key];

  if (label && label[lang]) {
    return label[lang];
  }

  if (!key) {
    return lang === 'zh' ? '待确认' : 'Pending';
  }

  return key.replace(/_/g, ' ');
}

function renderQualityDisplayLabel(labelGroup, value) {
  return `
    <span class="zh">${escapeShellText(getQualityDisplayLabel(labelGroup, value, 'zh'))}</span>
    <span class="en">${escapeShellText(getQualityDisplayLabel(labelGroup, value, 'en'))}</span>
  `;
}

function renderQualityMetaPill(labelZh, labelEn, labelGroup, value) {
  return `
    <span class="quality-meta-pill">
      <span class="quality-meta-label"><span class="zh">${labelZh}</span><span class="en">${labelEn}</span></span>
      <span class="quality-meta-value">${renderQualityDisplayLabel(labelGroup, value)}</span>
    </span>
  `;
}

function renderQualityConflictResolverPanel() {
  if (!isDualReviewMode || runtimeMode !== RUNTIME_MODE.DUAL_MAIN || !DUAL_REVIEW_ENGINE) {
    return '';
  }

  const conflicts = refreshDualReviewConflictState().qualityConflicts || [];
  const pendingConflicts = conflicts.filter((conflict) => conflict.status !== 'resolved');
  const resolvedCount = conflicts.length - pendingConflicts.length;

  return `
    <div class="quality-conflict-panel">
      <div>
        <strong><span class="zh">质量评价分歧</span><span class="en">Quality conflicts</span></strong>
        <div class="muted-text">
          <span class="zh">待处理 ${pendingConflicts.length} 条，已解决 ${resolvedCount} 条。</span>
          <span class="en">${pendingConflicts.length} pending, ${resolvedCount} resolved.</span>
        </div>
      </div>
      <button type="button" class="btn btn-secondary" onclick="showQualityConflictResolver()" ${pendingConflicts.length === 0 ? 'disabled' : ''}>
        <span class="zh">处理质量分歧</span><span class="en">Resolve quality conflicts</span>
      </button>
    </div>
  `;
}

function renderQualityDistribution(entries, labelGroup) {
  if (!entries || entries.length === 0) {
    return '<span class="zh">待生成</span><span class="en">Pending</span>';
  }

  return entries
    .map(([key, value]) => `
      <span class="quality-summary-chip">
        <span>${renderQualityDisplayLabel(labelGroup, key)}</span>
        <strong>${Number(value) || 0}</strong>
      </span>
    `)
    .join('');
}

function getQualityStatusOptions(selectedValue) {
  const selected = String(selectedValue || '');
  return ['not_started', 'queued', 'in_progress', 'complete', 'completed', 'needs_full_text']
    .map((status) => `<option value="${status}" ${status === selected ? 'selected' : ''}>${escapeShellText(getQualityDisplayLabel('status', status, 'zh'))} / ${escapeShellText(getQualityDisplayLabel('status', status, 'en'))}</option>`)
    .join('');
}

function getQualityJudgementOptions(selectedValue) {
  const selected = String(selectedValue || '');
  return ['not_assessed', 'low_risk', 'some_concerns', 'high_risk', 'unclear', 'not_applicable']
    .map((judgement) => `<option value="${judgement}" ${judgement === selected ? 'selected' : ''}>${escapeShellText(getQualityDisplayLabel('judgement', judgement, 'zh'))} / ${escapeShellText(getQualityDisplayLabel('judgement', judgement, 'en'))}</option>`)
    .join('');
}

function getQualityDomainInputId(recordId, domainId, field) {
  const encodedRecordId = encodeURIComponent(String(recordId || ''));
  const encodedDomainId = encodeURIComponent(String(domainId || ''));
  return `quality-domain-${encodedRecordId}-${encodedDomainId}-${field}`;
}

function getQualityAssessmentInputId(recordId, field) {
  return `quality-assessment-${encodeURIComponent(String(recordId || ''))}-${field}`;
}

function readQualityInputValue(id) {
  const element = document.getElementById(id);
  return element ? String(element.value || '').trim() : '';
}

function findQualityAssessmentIndex(recordId) {
  const normalizedRecordId = String(recordId || '');
  return qualityAssessments.findIndex((assessment) => String(assessment.record_id || '') === normalizedRecordId);
}

function cloneQualityAssessmentForAudit(assessment) {
  if (!assessment || typeof assessment !== 'object') {
    return null;
  }

  return {
    assessmentId: assessment.assessment_id || assessment.id || '',
    recordId: assessment.record_id || '',
    status: assessment.status || '',
    overallJudgement: assessment.overall_judgement || '',
    domainScores: Array.isArray(assessment.domain_scores)
      ? assessment.domain_scores.map((domain) => ({
        domainId: domain.domain_id || '',
        judgement: domain.judgement || '',
        supportingQuote: domain.supporting_quote || '',
        reviewerNote: domain.reviewer_note || '',
      }))
      : [],
    notes: assessment.notes || '',
    reviewerId: assessment.reviewer_id || '',
    updatedAt: assessment.updated_at || '',
  };
}

function getCurrentReviewerId() {
  if (currentUserSession?.role === 'reviewer-a') return 'reviewer_A';
  if (currentUserSession?.role === 'reviewer-b') return 'reviewer_B';
  return isDualReviewMode ? `reviewer_${currentReviewer}` : 'reviewer_1';
}

function getReviewerSlotFromRole(role) {
  if (role === 'reviewer-a') return 'A';
  if (role === 'reviewer-b') return 'B';
  return currentReviewer === 'B' ? 'B' : 'A';
}

function normalizeFulltextSelection(value) {
  if (DUAL_REVIEW_ENGINE && typeof DUAL_REVIEW_ENGINE.normalizeReviewSelection === 'function') {
    return DUAL_REVIEW_ENGINE.normalizeReviewSelection(value);
  }

  const rawValue = String(value || '').trim();
  if (rawValue === '__uncertain__') {
    return { decision: 'uncertain', exclusionReason: '', originalValue: rawValue };
  }
  if (!rawValue) {
    return { decision: 'include', exclusionReason: '', originalValue: rawValue };
  }
  return { decision: 'exclude', exclusionReason: rawValue, originalValue: rawValue };
}

function getFulltextSelectValueFromDecision(decisionInput) {
  const decision = String(decisionInput?.decision || decisionInput?.human_decision || '').trim();
  if (decision === 'uncertain') return '__uncertain__';
  if (decision === 'exclude') return String(decisionInput?.exclusionReason || decisionInput?.exclusion_reason || decisionInput?.originalValue || '').trim() || '其他';
  return '';
}

function getReviewerLabelForSlot(slot) {
  return reviewerNames?.[slot] || (slot === 'B' ? '审查员B' : '审查员A');
}

function getAuditRecordIndexMap(records) {
  const map = new Map();
  (Array.isArray(records) ? records : []).forEach((record, index) => {
    map.set(getRecordAuditId(record, index), index);
  });
  return map;
}

function syncDualReviewResultsFromDecisions() {
  if (!DUAL_REVIEW_ENGINE || !Array.isArray(screeningDecisions)) return dualReviewResults;
  const currentFinal = dualReviewResults?.final || {};

  const latest = DUAL_REVIEW_ENGINE.getLatestScreeningDecisions(screeningDecisions);
  const recordIndexMap = getAuditRecordIndexMap(screeningResults?.included || []);
  const next = { A: {}, B: {}, final: { ...currentFinal } };

  latest
    .filter((decision) => decision.stage === 'full_text')
    .forEach((decision) => {
      const index = recordIndexMap.get(decision.recordId);
      if (!Number.isFinite(index)) return;

      if (DUAL_REVIEW_ENGINE.isResolverDecision(decision)) {
        next.final[index] = {
          finalDecision: getFulltextSelectValueFromDecision(decision),
          decision: decision.decision,
          exclusionReason: decision.exclusionReason,
          discussion: decision.notes || decision.metadata?.resolutionNote || '',
          reviewerAOriginal: decision.metadata?.reviewerA?.exclusionReason || decision.metadata?.reviewerA?.decision || '',
          reviewerBOriginal: decision.metadata?.reviewerB?.exclusionReason || decision.metadata?.reviewerB?.decision || '',
          resolvedBy: decision.reviewerId || 'resolver_1',
          timestamp: decision.updatedAt || decision.decidedAt || '',
        };
        return;
      }

      const slot = DUAL_REVIEW_ENGINE.getReviewerSlot(decision.reviewerId);
      if (slot !== 'A' && slot !== 'B') return;
      next[slot][index] = {
        decision: getFulltextSelectValueFromDecision(decision),
        normalizedDecision: decision.decision,
        exclusionReason: decision.exclusionReason,
        timestamp: decision.updatedAt || decision.decidedAt || '',
        reviewer: decision.reviewerId,
      };
    });

  dualReviewResults = next;
  return dualReviewResults;
}

function getReviewerDecisionEntry(slot, index) {
  syncDualReviewResultsFromDecisions();
  return dualReviewResults?.[slot]?.[index] || null;
}

function recordFulltextReviewerDecision(index, rawValue, options = {}) {
  if (!screeningResults || !Array.isArray(screeningResults.included)) return null;
  const record = screeningResults.included[index];
  if (!record) return null;

  const slot = options.slot || getReviewerSlotFromRole(currentUserSession?.role);
  const reviewerId = options.reviewerId || (slot === 'B' ? 'reviewer_B' : 'reviewer_A');
  const selection = normalizeFulltextSelection(rawValue);
  const timestamp = new Date().toISOString();
  const entry = {
    decision: selection.originalValue,
    normalizedDecision: selection.decision,
    exclusionReason: selection.exclusionReason,
    timestamp,
    reviewer: reviewerId,
  };
  const recordId = getRecordAuditId(record, index);

  if (!dualReviewResults[slot]) dualReviewResults[slot] = {};
  dualReviewResults[slot][index] = entry;

  if (currentUserSession && projectData) {
    if (!projectData.reviewDecisions) projectData.reviewDecisions = {};
    if (!projectData.reviewDecisions[currentUserSession.role]) {
      projectData.reviewDecisions[currentUserSession.role] = {};
    }
    projectData.reviewDecisions[currentUserSession.role][index] = {
      decision: selection.originalValue,
      normalizedDecision: selection.decision,
      exclusionReason: selection.exclusionReason,
      timestamp,
      reviewer: currentUserSession.username || reviewerId,
      reviewerId,
      recordId,
    };
  }

  if (typeof upsertScreeningDecisionSafe === 'function') {
    upsertScreeningDecisionSafe({
      recordId,
      stage: 'full_text',
      decision: selection.decision,
      exclusionReason: normalizeAuditExclusionReason(selection.exclusionReason),
      reviewerId,
      conflictStatus: 'none',
      source: 'human',
      notes: selection.exclusionReason,
      metadata: {
        originalReason: selection.exclusionReason,
        originalSelection: selection.originalValue,
        reviewIndex: index,
        reviewerSlot: slot,
      },
    }, { persist: false });
  }

  return entry;
}

function getQualityReviewConflictInputs() {
  const rows = [];
  (Array.isArray(qualityAssessments) ? qualityAssessments : []).forEach((assessment) => {
    if (!assessment || typeof assessment !== 'object') return;

    const reviewerAssessments = assessment.reviewer_assessments && typeof assessment.reviewer_assessments === 'object'
      ? assessment.reviewer_assessments
      : {};

    Object.keys(reviewerAssessments).forEach((reviewerId) => {
      rows.push({
        ...assessment,
        ...reviewerAssessments[reviewerId],
        reviewer_id: reviewerId,
        assessment_id: `${assessment.assessment_id || assessment.id || assessment.record_id || 'qa'}-${reviewerId}`,
        record_id: assessment.record_id,
      });
    });

    if (assessment.reviewer_id && !reviewerAssessments[assessment.reviewer_id]) {
      rows.push(assessment);
    }
  });

  return rows;
}

function getQualityConflictIndexMap() {
  const map = new Map();
  refreshDualReviewConflictState().qualityConflicts.forEach((conflict, index) => {
    map.set(conflict.conflictId, index);
  });
  return map;
}

function getFulltextReviewRecordsForConflictState() {
  const included = Array.isArray(screeningResults?.included) ? screeningResults.included : [];
  const excluded = Array.isArray(screeningResults?.excluded)
    ? screeningResults.excluded.filter((record) => record && record._exclude_stage === 'fulltext')
    : [];
  return included.concat(excluded);
}

function refreshDualReviewConflictState(options = {}) {
  if (!DUAL_REVIEW_ENGINE) return dualReviewConflictState;

  const records = getFulltextReviewRecordsForConflictState();
  const screeningConflicts = DUAL_REVIEW_ENGINE.buildScreeningConflictQueue(screeningDecisions, records);
  const qualityConflicts = DUAL_REVIEW_ENGINE.buildQualityConflictQueue(getQualityReviewConflictInputs());
  const pendingScreeningConflicts = screeningConflicts.filter((conflict) => conflict.status !== 'resolved');
  const screeningPairs = typeof DUAL_REVIEW_ENGINE.buildScreeningAgreementPairs === 'function'
    ? DUAL_REVIEW_ENGINE.buildScreeningAgreementPairs(screeningDecisions, records)
    : [];
  const agreementMetrics = screeningPairs.length > 0
    ? (typeof DUAL_REVIEW_ENGINE.calculateScreeningAgreementMetrics === 'function'
      ? DUAL_REVIEW_ENGINE.calculateScreeningAgreementMetrics(screeningDecisions, records)
      : DUAL_REVIEW_ENGINE.calculateAgreementMetrics(
        screeningPairs.map((pair) => pair.reviewerA),
        screeningPairs.map((pair) => pair.reviewerB)
      ))
    : null;
  const exportGate = DUAL_REVIEW_ENGINE.buildExportGateStatus({ screeningConflicts, qualityConflicts });

  dualReviewConflictState = {
    screeningPairs,
    screeningConflicts,
    qualityConflicts,
    agreementMetrics,
    exportGate,
  };

  if (options.auditNewConflicts && typeof appendAuditEventsSafe === 'function') {
    const existingDetected = new Set(
      auditEvents
        .filter((event) => event?.eventType === 'review_conflict_detected')
        .map((event) => event?.payload?.conflictId || event?.after?.conflictId || event?.metadata?.conflictId)
        .filter(Boolean)
    );
    const events = pendingScreeningConflicts
      .filter((conflict) => !existingDetected.has(conflict.conflictId))
      .map((conflict) => ({
        eventType: 'review_conflict_detected',
        recordId: conflict.recordId,
        stage: conflict.stage,
        after: {
          conflictId: conflict.conflictId,
          status: conflict.status,
          reviewerA: conflict.signatures.reviewerA,
          reviewerB: conflict.signatures.reviewerB,
        },
        source: 'system',
        metadata: {
          conflictId: conflict.conflictId,
          conflictType: conflict.conflictType,
          schemaVersion: conflict.schemaVersion,
        },
      }));
    if (events.length > 0) appendAuditEventsSafe(events, { persist: false });
  }

  return dualReviewConflictState;
}

function getUnresolvedConflictGateStatus() {
  return refreshDualReviewConflictState().exportGate || {
    hasUnresolvedConflicts: false,
    unresolvedConflictCount: 0,
    warnings: [],
  };
}

function recordConflictGateAuditEvent(eventType, type, gate, options = {}) {
  if (typeof appendAuditEventsSafe !== 'function') return;

  appendAuditEventsSafe({
    eventType,
    recordId: '',
    stage: 'export',
    after: {
      exportType: type,
      unresolvedConflictCount: gate.unresolvedConflictCount,
      unresolvedScreeningConflictCount: gate.unresolvedScreeningConflictCount,
      unresolvedQualityConflictCount: gate.unresolvedQualityConflictCount,
      gateStatus: gate.status || '',
    },
    source: 'system',
    metadata: {
      schemaVersion: gate.schemaVersion || '',
      warningOnly: options.warningOnly === true,
      blocked: options.blocked === true,
      gatePolicy: options.gatePolicy || 'v2.5-unresolved-conflict-gate',
    },
  }, { persist: false });
}

function maybeWarnUnresolvedConflictsBeforeExport(type) {
  if (!DUAL_REVIEW_ENGINE) return true;
  const finalExportTypes = new Set(V25_FINAL_CONFLICT_GATED_EXPORT_TYPES);
  const evidenceExportTypes = new Set(V25_CONFLICT_EVIDENCE_EXPORT_TYPES);
  if (!finalExportTypes.has(type) && !evidenceExportTypes.has(type)) return true;

  const gate = getUnresolvedConflictGateStatus();
  if (!gate.hasUnresolvedConflicts) return true;

  if (finalExportTypes.has(type)) {
    const message = `仍有 ${gate.unresolvedConflictCount} 个未解决的双审冲突。V2.5 已阻止最终结果导出；请先解决冲突，或导出 dual_review_conflicts.csv / dual_review_agreement.json 作为冲突证据。`;
    showToast(message, 'error');
    recordConflictGateAuditEvent('export_conflict_blocked', type, gate, { blocked: true });
    return false;
  }

  const message = `仍有 ${gate.unresolvedConflictCount} 个未解决的双审冲突。此导出仅作为审计/冲突证据，最终结果导出仍会被阻止。`;
  showToast(message, 'warning');
  recordConflictGateAuditEvent('export_conflict_warning', type, gate, { warningOnly: true });

  return true;
}

function upsertImportJobState(importJob, options = {}) {
  const { persist = true, render = true } = options;
  const normalized = normalizeImportJobsState([importJob])[0];
  const existingIndex = importJobs.findIndex((job) => job.id === normalized.id);

  if (existingIndex >= 0) {
    importJobs.splice(existingIndex, 1, normalized);
  } else {
    importJobs.push(normalized);
  }

  if (render) renderImportJobShell();
  if (persist) persistCurrentProjectState();

  return normalized;
}

function renderImportJobShell() {
  const summaryEl = document.getElementById('importJobSummary');
  const listEl = document.getElementById('importJobList');
  if (!summaryEl || !listEl) return;

  importJobs = normalizeImportJobsState(importJobs);
  const jobs = importJobs.slice();

  if (jobs.length === 0) {
    summaryEl.innerHTML = '<span class="zh">当前还没有导入任务。</span><span class="en">There are no import jobs yet.</span>';
    listEl.innerHTML = '';
    if (typeof applyLangVisibility === 'function') {
      applyLangVisibility();
    }
    return;
  }

  const summary = IMPORT_JOB_RUNTIME && typeof IMPORT_JOB_RUNTIME.summarizeImportJobs === 'function'
    ? IMPORT_JOB_RUNTIME.summarizeImportJobs(jobs)
    : {
      totalJobs: jobs.length,
      activeCount: jobs.filter((job) => !['completed', 'failed', 'cancelled'].includes(job.stage)).length,
      completedCount: jobs.filter((job) => job.stage === 'completed').length,
      failedCount: jobs.filter((job) => job.stage === 'failed').length,
    };

  summaryEl.innerHTML = `
    <span class="zh">共 ${summary.totalJobs} 个任务，进行中 ${summary.activeCount} 个，完成 ${summary.completedCount} 个，失败 ${summary.failedCount || 0} 个。</span>
    <span class="en">Total ${summary.totalJobs} jobs, ${summary.activeCount} active, ${summary.completedCount} completed, ${summary.failedCount || 0} failed.</span>
  `;

  listEl.innerHTML = jobs
    .slice()
    .reverse()
    .slice(0, 4)
    .map((job) => `
      <div class="surface-panel" style="margin-bottom: 10px; padding: var(--space-12);">
        <div style="display: flex; justify-content: space-between; gap: var(--space-12);">
          <strong>${escapeShellText(job.file_name)}</strong>
          <span class="format-tag">${escapeShellText(job.stage)}</span>
        </div>
        <div class="muted-text" style="margin-top: 6px;">
          <span class="zh">已读 ${job.bytes_read || 0} bytes，解析 ${job.records_parsed || 0} 条，写入 ${job.records_written || 0} 条</span>
          <span class="en">Read ${job.bytes_read || 0} bytes, parsed ${job.records_parsed || 0}, wrote ${job.records_written || 0}</span>
        </div>
        ${job.error ? `<div class="muted-text" style="margin-top: 6px; color: var(--color-danger);">${escapeShellText(job.error)}</div>` : ''}
      </div>
    `)
    .join('');

  if (typeof applyLangVisibility === 'function') {
    applyLangVisibility();
  }
}

function renderQualityAssessmentShell() {
  const queueEl = document.getElementById('qualityAssessmentQueue');
  const summaryEl = document.getElementById('qualityAssessmentSummary');
  if (!queueEl || !summaryEl) return;

  qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments);
  const includedRecords = Array.isArray(screeningResults?.included) ? screeningResults.included : [];
  if (includedRecords.length > 0 && qualityAssessments.length > 0) {
    const sourceRecordMap = new Map(
      includedRecords.map((record, index) => [buildQualityRecordId(record, index), { record, index }])
    );

    qualityAssessments = qualityAssessments.map((assessment, index) => {
      const recordId = String(assessment.record_id || assessment.recordId || '');
      const source = sourceRecordMap.get(recordId);
      return source
        ? rehydrateQualityAssessmentFromSourceRecord(source.record, assessment, source.index)
        : assessment;
    });
  }

  const summary = QUALITY_ENGINE && typeof QUALITY_ENGINE.summarizeQualityAssessments === 'function'
    ? QUALITY_ENGINE.summarizeQualityAssessments(qualityAssessments, includedRecords)
    : {
      totalIncluded: includedRecords.length,
      byStatus: { not_started: qualityAssessments.length, in_progress: 0, completed: 0 },
      completedAssessments: 0,
      missingAssessments: Math.max(includedRecords.length - qualityAssessments.length, 0),
      byToolFamily: {},
      byEvidence: {},
    };

  updateQualityAssessmentCounters(summary);

  if (!screeningResults || includedRecords.length === 0) {
    queueEl.innerHTML = '<span class="zh">完成全文复核后，这里会出现待评价研究队列。</span><span class="en">The included-study queue appears here after full-text review.</span>';
    summaryEl.innerHTML = '<span class="zh">当前还没有可评价研究。</span><span class="en">There are no included studies to assess yet.</span>';
    if (typeof applyLangVisibility === 'function') {
      applyLangVisibility();
    }
    return;
  }

  if (qualityAssessments.length === 0) {
    queueEl.innerHTML = '<span class="zh">点击上方“生成质量评价队列”后，这里会列出纳入研究及其建议研究设计。</span><span class="en">Click "Prepare quality queue" to list included studies and suggested study designs here.</span>';
    summaryEl.innerHTML = '<span class="zh">当前尚未生成质量评价条目。</span><span class="en">No quality-assessment entries have been prepared yet.</span>';
    if (typeof applyLangVisibility === 'function') {
      applyLangVisibility();
    }
    return;
  }

  const qualityConflictIndexMap = getQualityConflictIndexMap();

  queueEl.innerHTML = qualityAssessments
    .slice(0, 8)
    .map((assessment) => {
      const recordId = String(assessment.record_id || '');
      const domains = Array.isArray(assessment.domain_scores) ? assessment.domain_scores : [];
      const domainRows = domains.map((domain) => {
        const domainId = domain.domain_id || domain.domain || domain.label || '';
        const judgementId = getQualityDomainInputId(recordId, domainId, 'judgement');
        const quoteId = getQualityDomainInputId(recordId, domainId, 'quote');
        const noteId = getQualityDomainInputId(recordId, domainId, 'note');

        return `
          <div class="quality-domain-row">
            <div class="quality-domain-title">
              <strong>${escapeShellText(domain.label || domainId)}</strong>
              <span>${escapeShellText(domainId)}</span>
            </div>
            <label>
              <span class="zh">领域判断</span><span class="en">Domain judgement</span>
              <select id="${judgementId}" class="form-input quality-domain-select">
                ${getQualityJudgementOptions(domain.judgement || 'not_assessed')}
              </select>
            </label>
            <label>
              <span class="zh">支持性原文 / 页码</span><span class="en">Supporting quote / page</span>
              <textarea id="${quoteId}" class="form-input quality-domain-textarea" rows="2" placeholder="原文证据或页码">${escapeShellText(domain.supporting_quote || '')}</textarea>
            </label>
            <label>
              <span class="zh">审稿备注</span><span class="en">Reviewer note</span>
              <textarea id="${noteId}" class="form-input quality-domain-textarea" rows="2" placeholder="判断理由、待确认信息或分歧点">${escapeShellText(domain.reviewer_note || '')}</textarea>
            </label>
          </div>
        `;
      }).join('');
      const overallId = getQualityAssessmentInputId(recordId, 'overall');
      const statusId = getQualityAssessmentInputId(recordId, 'status');
      const notesId = getQualityAssessmentInputId(recordId, 'notes');
      const qualityConflictIndex = qualityConflictIndexMap.get(`quality-conflict-${String(recordId).replace(/[^a-z0-9_-]/gi, '_')}`);
      const qualityConflict = Number.isFinite(qualityConflictIndex) ? dualReviewConflictState.qualityConflicts[qualityConflictIndex] : null;
      const qualityConflictBadge = qualityConflict
        ? `<span class="quality-conflict-badge ${qualityConflict.status === 'resolved' ? 'resolved' : ''}">
            <span class="zh">${qualityConflict.status === 'resolved' ? '分歧已解决' : '存在质量分歧'}</span>
            <span class="en">${qualityConflict.status === 'resolved' ? 'Resolved conflict' : 'Quality conflict'}</span>
          </span>`
        : '';

      return `
      <div class="surface-panel quality-assessment-card">
        <div class="quality-assessment-card-head">
          <strong>${escapeShellText(assessment.title || assessment.record_id)}</strong>
          <span class="quality-card-badges">
            ${qualityConflictBadge}
            <span class="format-tag">${renderQualityDisplayLabel('status', assessment.status)}</span>
          </span>
        </div>
        <div class="quality-assessment-meta">
          ${renderQualityMetaPill('研究设计', 'Design', 'studyDesign', assessment.study_design)}
          ${renderQualityMetaPill('评价工具', 'Tool', 'toolFamily', assessment.tool_family)}
          ${renderQualityMetaPill('证据基线', 'Evidence baseline', 'evidence', assessment.evidence_initial)}
        </div>
        <div class="muted-text" style="margin-top: 8px;">
          <span class="zh">模板 ${escapeShellText(assessment.template_id || 'generic_quality_shell_v24_alpha')}，领域 ${Array.isArray(assessment.domain_scores) ? assessment.domain_scores.length : 0} 项。</span>
          <span class="en">Template ${escapeShellText(assessment.template_id || 'generic_quality_shell_v24_alpha')}, ${Array.isArray(assessment.domain_scores) ? assessment.domain_scores.length : 0} domains.</span>
        </div>
        <details class="quality-editor-panel">
          <summary>
            <span class="zh">填写领域判断与引用证据</span>
            <span class="en">Edit domain judgements and evidence</span>
          </summary>
          <div class="quality-editor-body">
            <div class="quality-editor-toolbar">
              <label>
                <span class="zh">总体判断</span><span class="en">Overall judgement</span>
                <select id="${overallId}" class="form-input">
                  ${getQualityJudgementOptions(assessment.overall_judgement || 'not_assessed')}
                </select>
              </label>
              <label>
                <span class="zh">评价状态</span><span class="en">Status</span>
                <select id="${statusId}" class="form-input">
                  ${getQualityStatusOptions(assessment.status || 'not_started')}
                </select>
              </label>
            </div>
            <div class="quality-domain-list">
              ${domainRows || '<span class="muted-text"><span class="zh">当前模板没有可填写领域。</span><span class="en">This template has no editable domains.</span></span>'}
            </div>
            <label class="quality-assessment-notes">
              <span class="zh">评价备注</span><span class="en">Assessment notes</span>
              <textarea id="${notesId}" class="form-input quality-domain-textarea" rows="3" placeholder="记录总体判断依据、需要全文核对的信息或后续 GRADE 注意事项">${escapeShellText(assessment.notes || '')}</textarea>
            </label>
            <div class="quality-editor-actions">
              <button type="button" class="btn btn-primary" data-quality-record-id="${escapeShellText(recordId)}" onclick="saveQualityAssessmentEdits(this.dataset.qualityRecordId)"><span class="zh">保存质量评价</span><span class="en">Save appraisal</span></button>
              <span class="muted-text"><span class="zh">保存后会更新本地项目状态，并写入可追踪的审计事件。</span><span class="en">Saving updates local project state and writes a traceable audit event.</span></span>
            </div>
          </div>
        </details>
      </div>
    `;
    })
    .join('');

  const toolFamilyEntries = Object.entries(summary.byToolFamily || {});
  const evidenceEntries = Object.entries(summary.byEvidence || {});

  summaryEl.innerHTML = `
    <div class="muted-text">
      <span class="zh">总纳入 ${summary.totalIncluded} 篇，已完成 ${summary.completedAssessments} 篇，缺少 ${summary.missingAssessments} 篇。</span>
      <span class="en">${summary.totalIncluded} included, ${summary.completedAssessments} completed, ${summary.missingAssessments} missing.</span>
    </div>
    ${renderQualityConflictResolverPanel()}
    <div class="quality-summary-block">
      <strong><span class="zh">工具分布</span><span class="en">Tool families</span></strong>
      <div class="quality-summary-list">${renderQualityDistribution(toolFamilyEntries, 'toolFamily')}</div>
    </div>
    <div class="quality-summary-block">
      <strong><span class="zh">证据等级分布</span><span class="en">Evidence levels</span></strong>
      <div class="quality-summary-list">${renderQualityDistribution(evidenceEntries, 'evidence')}</div>
    </div>
  `;

  if (typeof applyLangVisibility === 'function') {
    applyLangVisibility();
  }
}

function saveQualityAssessmentEdits(recordId) {
  qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments);
  const index = findQualityAssessmentIndex(recordId);

  if (index < 0) {
    showToast('未找到对应的质量评价记录，请重新生成队列后再试。', 'warning');
    return;
  }

  const before = cloneQualityAssessmentForAudit(qualityAssessments[index]);
  const current = qualityAssessments[index];
  const reviewerId = getCurrentReviewerId();
  const domains = Array.isArray(current.domain_scores) ? current.domain_scores : [];
  const updatedDomains = domains.map((domain) => {
    const domainId = domain.domain_id || domain.domain || domain.label || '';
    return {
      ...domain,
      judgement: readQualityInputValue(getQualityDomainInputId(recordId, domainId, 'judgement')) || 'not_assessed',
      supporting_quote: readQualityInputValue(getQualityDomainInputId(recordId, domainId, 'quote')),
      reviewer_note: readQualityInputValue(getQualityDomainInputId(recordId, domainId, 'note')),
    };
  });
  const updatedAt = new Date().toISOString();

  qualityAssessments[index] = {
    ...current,
    domain_scores: updatedDomains,
    domains: updatedDomains,
    overall_judgement: readQualityInputValue(getQualityAssessmentInputId(recordId, 'overall')) || 'not_assessed',
    status: readQualityInputValue(getQualityAssessmentInputId(recordId, 'status')) || 'not_started',
    notes: readQualityInputValue(getQualityAssessmentInputId(recordId, 'notes')),
    reviewer_id: reviewerId,
    reviewer_assessments: {
      ...(current.reviewer_assessments || {}),
      [reviewerId]: {
        reviewer_id: reviewerId,
        domain_scores: updatedDomains,
        domains: updatedDomains,
        overall_judgement: readQualityInputValue(getQualityAssessmentInputId(recordId, 'overall')) || 'not_assessed',
        status: readQualityInputValue(getQualityAssessmentInputId(recordId, 'status')) || 'not_started',
        notes: readQualityInputValue(getQualityAssessmentInputId(recordId, 'notes')),
        updated_at: updatedAt,
      },
    },
    updated_at: updatedAt,
  };
  qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments);
  const after = cloneQualityAssessmentForAudit(qualityAssessments[index]);

  if (typeof appendAuditEventsSafe === 'function') {
    appendAuditEventsSafe({
      eventType: 'quality_appraisal_updated',
      recordId,
      before,
      after,
      source: 'human',
      metadata: {
        domainCount: updatedDomains.length,
        editor: 'item_level_quality_form',
        schemaVersion: qualityAssessments[index].schema_version || '',
      },
    }, { persist: false });
  }

  createProjectHistorySnapshot('quality_saved', `After quality save ${recordId}`);
  persistCurrentProjectState();
  renderQualityAssessmentShell();
  showToast('质量评价已保存，导出的质量表会使用这些人工填写内容。', 'success');
}

function showQualityConflictResolver() {
  if (runtimeMode !== RUNTIME_MODE.DUAL_MAIN) {
    showToast('仅主审查员可处理质量评价分歧', 'warning');
    return;
  }

  if (!DUAL_REVIEW_ENGINE) {
    showToast('Dual-review resolver module is not loaded', 'error');
    return;
  }

  const conflicts = refreshDualReviewConflictState().qualityConflicts
    .filter((conflict) => conflict.status !== 'resolved');

  if (conflicts.length === 0) {
    showToast('所有质量评价分歧均已解决。', 'success');
    return;
  }

  const conflictRows = conflicts.map((conflict, index) => {
    const fields = (conflict.differences || []).map((difference) => `
      <tr>
        <td>${escapeShellText(difference.field || '')}</td>
        <td>${escapeShellText(difference.reviewerA || '')}</td>
        <td>${escapeShellText(difference.reviewerB || '')}</td>
      </tr>
    `).join('');
    const domainIds = Array.from(new Set(
      (conflict.differences || [])
        .map((difference) => String(difference.field || ''))
        .filter((field) => field.startsWith('domain:'))
        .map((field) => field.slice('domain:'.length))
    ));
    const domainControls = domainIds.map((domainId) => {
      const resolverValue = conflict.reviewerA?.domainJudgements?.[domainId]
        || conflict.reviewerB?.domainJudgements?.[domainId]
        || 'not_assessed';
      return `
        <label>
          <span>${escapeShellText(domainId)}</span>
          <select id="quality-resolver-domain-${index}-${encodeURIComponent(domainId)}" class="form-input">
            ${getQualityJudgementOptions(resolverValue)}
          </select>
        </label>
      `;
    }).join('');

    return `
      <div class="quality-conflict-resolver-card">
        <h4>${escapeShellText(conflict.recordId || '')}</h4>
        <table class="quality-conflict-table">
          <thead>
            <tr>
              <th><span class="zh">字段</span><span class="en">Field</span></th>
              <th>${escapeShellText(getReviewerLabelForSlot('A'))}</th>
              <th>${escapeShellText(getReviewerLabelForSlot('B'))}</th>
            </tr>
          </thead>
          <tbody>${fields}</tbody>
        </table>
        <div class="quality-resolver-controls">
          <label>
            <span class="zh">最终总体判断</span><span class="en">Final overall judgement</span>
            <select id="quality-resolver-overall-${index}" class="form-input">
              ${getQualityJudgementOptions(conflict.reviewerA?.overallJudgement || conflict.reviewerB?.overallJudgement || 'not_assessed')}
            </select>
          </label>
          <label>
            <span class="zh">最终评价状态</span><span class="en">Final status</span>
            <select id="quality-resolver-status-${index}" class="form-input">
              ${getQualityStatusOptions('complete')}
            </select>
          </label>
          ${domainControls}
          <label class="quality-resolver-notes">
            <span class="zh">协商记录</span><span class="en">Resolution note</span>
            <textarea id="quality-resolver-notes-${index}" class="form-input quality-domain-textarea" rows="3"></textarea>
          </label>
        </div>
      </div>
    `;
  }).join('');

  const modalHTML = `
    <div id="quality-conflict-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div style="background: var(--color-surface); border-radius: 12px; padding: var(--space-24); max-width: 960px; width: min(960px, 100%); max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg);">
        <h3 style="margin-bottom: var(--space-16); color: var(--color-primary);"><span class="zh">质量评价分歧处理</span><span class="en">Resolve Quality Conflicts</span></h3>
        <div class="quality-conflict-resolver-list">${conflictRows}</div>
        <div style="text-align: right; margin-top: var(--space-16);">
          <button class="btn btn-secondary" type="button" onclick="closeQualityConflictModal()" style="margin-right: var(--space-8);"><span class="zh">取消</span><span class="en">Cancel</span></button>
          <button class="btn btn-primary" type="button" onclick="applyQualityConflictResolutions()"><span class="zh">应用最终质量判断</span><span class="en">Apply final judgements</span></button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  window.currentQualityConflicts = conflicts;
  if (typeof applyLangVisibility === 'function') {
    applyLangVisibility();
  }
}

function renderProjectHistoryPanel() {
  const container = document.getElementById('projectHistoryPanel');
  if (!container) return;

  if (!Array.isArray(projectHistory) || projectHistory.length === 0) {
    container.innerHTML = `
      <div class="muted-text">
        <span class="zh">当前还没有历史快照。导入、重新筛选和后续恢复点会自动生成历史记录。</span>
        <span class="en">There are no history snapshots yet. Import, rerun, and recovery points will create them automatically.</span>
      </div>
    `;
    if (typeof applyLangVisibility === 'function') applyLangVisibility();
    return;
  }

  container.innerHTML = projectHistory.slice(0, 8).map((snapshot) => {
    const createdAt = escapeHTML(String(snapshot.created_at || ''));
    const label = escapeHTML(String(snapshot.label || 'Project snapshot'));
    const reason = escapeHTML(String(snapshot.reason || 'manual_snapshot'));
    const step = Number(snapshot.step || 1);
    const recordCount = Number(snapshot.record_count || 0);
    const sourceFiles = Array.isArray(snapshot.source_files) ? snapshot.source_files : [];
    const sourceSummary = sourceFiles.length > 0
      ? escapeHTML(sourceFiles.join(', '))
      : '<span class="zh">无来源文件</span><span class="en">No source files</span>';
    return `
      <div class="project-history-card surface-panel">
        <div class="project-history-meta">
          <strong>${label}</strong>
          <span class="format-tag">step ${step}</span>
        </div>
        <div class="muted-text" style="margin-top: 6px;">
          <span class="zh">原因：${reason}</span>
          <span class="en">Reason: ${reason}</span>
        </div>
        <div class="muted-text" style="margin-top: 6px;">
          <span class="zh">时间：${createdAt}；记录数：${recordCount}</span>
          <span class="en">Time: ${createdAt}; records: ${recordCount}</span>
        </div>
        <div class="muted-text" style="margin-top: 6px;">${sourceSummary}</div>
        <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="restoreProjectHistorySnapshot('${escapeHTML(String(snapshot.snapshot_id || ''))}')">
            <span class="zh">恢复这一版</span><span class="en">Restore Snapshot</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (typeof applyLangVisibility === 'function') applyLangVisibility();
}

function renderSourceFileHistoryPanel() {
  const container = document.getElementById('sourceFileHistoryPanel');
  if (!container) return;

  if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="muted-text" style="margin-bottom: 8px;">
      <span class="zh">当前来源文件</span><span class="en">Current source files</span>
    </div>
    ${uploadedFiles.map((file) => {
      const rawName = String(file?.name || file?.file_name || 'unknown');
      const safeName = escapeHTML(rawName);
      const quotedName = JSON.stringify(rawName);
      const count = Number(file?.recordCount || file?.record_count || 0);
      return `
        <div class="project-history-card surface-panel" style="margin-top: 8px;">
          <div class="project-history-meta">
            <strong>${safeName}</strong>
            <span class="format-tag">${count}</span>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" onclick='removeSourceFileFromProject(${quotedName})'>
              <span class="zh">移除来源文件</span><span class="en">Remove Source File</span>
            </button>
          </div>
        </div>
      `;
    }).join('')}
  `;

  if (typeof applyLangVisibility === 'function') applyLangVisibility();
}

function removeSourceFileFromProject(fileName) {
  const normalizedName = String(fileName || '').trim();
  if (!normalizedName) return;

  const currentFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [];
  const currentRecords = ensureStableRecordAuditIds(uploadedData);
  const matchedFile = currentFiles.find((file) => String(file?.name || file?.file_name || '').trim() === normalizedName);
  if (!matchedFile) return;

  const shouldRemove = confirm(`确定移除来源文件 ${normalizedName} 吗？相关记录会从当前项目中删除，并保留历史快照。`);
  if (!shouldRemove) return;

  createProjectHistorySnapshot('source_file_removed', `Before removing ${normalizedName}`);

  const remainingFiles = currentFiles.filter((file) => String(file?.name || file?.file_name || '').trim() !== normalizedName);
  const remainingRecords = currentRecords.filter((record) => String(record?._sourceFile || '').trim() !== normalizedName);
  const remainingRecordIds = new Set(remainingRecords.map((record, index) => getRecordAuditId(record, index)));

  uploadedFiles = remainingFiles;
  uploadedData = remainingRecords;
  screeningDecisions = (Array.isArray(screeningDecisions) ? screeningDecisions : []).filter((decision) => remainingRecordIds.has(String(decision?.recordId || '')));
  aiSuggestionEvents = (Array.isArray(aiSuggestionEvents) ? aiSuggestionEvents : []).filter((entry) => remainingRecordIds.has(String(entry?.recordId || entry?.record_id || '')));
  qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments).filter((assessment) => remainingRecordIds.has(String(assessment?.record_id || assessment?.recordId || '')));
  importJobs = normalizeImportJobsState(importJobs).filter((job) => String(job?.file_name || job?.fileName || '').trim() !== normalizedName);

  updateProjectManifestSafe({
    dataSources: remainingFiles.map((file) => ({
      name: file.name,
      format: file.format,
      source: file.source,
      recordCount: file.recordCount,
    })),
  }, { persist: false });

  appendAuditEventsSafe({
    eventType: 'source_file_removed',
    recordId: '',
    after: {
      fileName: normalizedName,
      removedRecordCount: Number(matchedFile?.recordCount || 0),
      remainingFileCount: remainingFiles.length,
      remainingRecordCount: remainingRecords.length,
    },
    source: 'human',
  }, { persist: false });

  if (remainingRecords.length > 0) {
    if (filterRules) {
      screeningResults = performScreening(remainingRecords, filterRules);
    } else {
      screeningResults = null;
    }

    detectColumns();
    displayUploadInfo();

    if (screeningResults) {
      displayResults(screeningResults);
      if (currentStep >= 4) {
        displayFulltextReviewUI();
      }
      if (currentStep >= 5) {
        prepareQualityAssessmentShell({ persist: false, silent: true });
      }
    }

    currentStep = Math.min(Math.max(filterRules ? currentStep : 2, 2), WORKFLOW_STEP_COUNT);
    setStep(currentStep);
  } else {
    screeningResults = null;
    qualityAssessments = [];
    dualReviewResults = { A: {}, B: {}, final: {} };
    dualReviewConflictState = getEmptyDualReviewConflictState();
    currentStep = 1;
    document.getElementById('uploadInfo')?.classList.add('hidden');
    setStep(1);
  }

  refreshDualReviewConflictState();
  persistCurrentProjectState();
  renderImportJobShell();
  renderQualityAssessmentShell();
  renderSourceFileHistoryPanel();
  renderProjectHistoryPanel();
  updateStep4EntryLock();
  showToast(`已移除来源文件 ${normalizedName}`, 'success');
}

function restoreProjectHistorySnapshot(snapshotId) {
  const historySnapshot = Array.isArray(projectHistory)
    ? projectHistory.find((snapshot) => String(snapshot?.snapshot_id || '') === String(snapshotId || ''))
    : null;
  if (!historySnapshot || !historySnapshot.state) return;

  const shouldRestore = confirm('确定恢复到这个历史版本吗？当前未保存的变更会被覆盖。');
  if (!shouldRestore) return;

  const existingHistory = Array.isArray(projectHistory) ? projectHistory.slice() : [];
  restoreProjectState(historySnapshot.state);
  projectHistory = existingHistory;

  if (uploadedData && uploadedData.length > 0) {
    if (!columnMapping || Object.keys(columnMapping).length === 0) {
      try { detectColumns(); } catch (_) {}
    }
    try { displayUploadInfo(); } catch (_) {}
  }
  if (filterRules) {
    try { setFormRules(filterRules); } catch (_) {}
  }
  if (screeningResults) {
    try { displayResults(screeningResults); } catch (_) {}
    if (currentStep >= 4) {
      try { displayFulltextReviewUI(); } catch (_) {}
    }
  }
  setStep(Math.min(currentStep || 1, WORKFLOW_STEP_COUNT));
  try { refreshDualReviewConflictState(); } catch (_) {}
  appendAuditEventsSafe({
    eventType: 'project_snapshot_restored',
    recordId: '',
    after: {
      snapshotId: historySnapshot.snapshot_id,
      reason: historySnapshot.reason,
      label: historySnapshot.label,
      step: historySnapshot.step,
      recordCount: historySnapshot.record_count,
    },
    source: 'human',
  }, { persist: false });
  persistCurrentProjectState();
  renderProjectHistoryPanel();
  showToast('已恢复历史版本', 'success');
}

function closeQualityConflictModal() {
  const modal = document.getElementById('quality-conflict-modal');
  if (modal) modal.remove();
  window.currentQualityConflicts = null;
}

function applyQualityConflictResolutions() {
  const conflicts = window.currentQualityConflicts || [];
  if (!Array.isArray(conflicts) || conflicts.length === 0 || !DUAL_REVIEW_ENGINE) return;

  let resolvedCount = 0;
  conflicts.forEach((conflict, index) => {
    const domainJudgements = {};
    (conflict.differences || [])
      .map((difference) => String(difference.field || ''))
      .filter((field) => field.startsWith('domain:'))
      .map((field) => field.slice('domain:'.length))
      .forEach((domainId) => {
        domainJudgements[domainId] = readQualityInputValue(`quality-resolver-domain-${index}-${encodeURIComponent(domainId)}`) || 'not_assessed';
      });

    const notes = readQualityInputValue(`quality-resolver-notes-${index}`);
    const resolverAssessment = DUAL_REVIEW_ENGINE.createResolverQualityAssessment(conflict, {
      projectId: ensureProjectId(),
      resolverId: currentUserSession?.username || 'resolver_1',
      overallJudgement: readQualityInputValue(`quality-resolver-overall-${index}`) || 'not_assessed',
      status: readQualityInputValue(`quality-resolver-status-${index}`) || 'complete',
      domainJudgements,
      notes,
    });

    upsertResolvedQualityAssessment(conflict, resolverAssessment);
    appendAuditEventsSafe(
      DUAL_REVIEW_ENGINE.createQualityConflictResolvedAuditEvent(conflict, resolverAssessment, { notes }),
      { persist: false }
    );
    resolvedCount += 1;
  });

  refreshDualReviewConflictState();
  createProjectHistorySnapshot('conflict_resolved', `After resolving ${resolvedCount} quality conflicts`);
  persistCurrentProjectState();
  renderQualityAssessmentShell();
  closeQualityConflictModal();
  showToast(`已解决 ${resolvedCount} 个质量评价分歧。`, 'success');
}

function upsertResolvedQualityAssessment(conflict, resolverAssessment) {
  const recordId = resolverAssessment.record_id || conflict.recordId || '';
  const index = findQualityAssessmentIndex(recordId);
  if (index < 0) return;

  const current = qualityAssessments[index] || {};
  const currentDomains = Array.isArray(current.domain_scores) ? current.domain_scores : [];
  const resolverDomainMap = (resolverAssessment.domain_scores || []).reduce((acc, domain) => {
    acc[domain.domain_id] = domain.judgement;
    return acc;
  }, {});
  const domainScores = currentDomains.map((domain) => {
    const domainId = domain.domain_id || domain.domain || domain.label || '';
    return {
      ...domain,
      judgement: resolverDomainMap[domainId] || domain.judgement || 'not_assessed',
    };
  });
  const resolverId = resolverAssessment.reviewer_id || 'resolver_1';

  qualityAssessments[index] = {
    ...current,
    reviewer_id: resolverId,
    overall_judgement: resolverAssessment.overall_judgement,
    status: resolverAssessment.status,
    domain_scores: domainScores,
    domains: domainScores,
    notes: resolverAssessment.notes || current.notes || '',
    reviewer_assessments: {
      ...(current.reviewer_assessments || {}),
      [resolverId]: {
        reviewer_id: resolverId,
        reviewer_slot: 'resolver',
        overall_judgement: resolverAssessment.overall_judgement,
        status: resolverAssessment.status,
        domain_scores: domainScores,
        domains: domainScores,
        notes: resolverAssessment.notes || '',
        metadata: resolverAssessment.metadata || {},
        updated_at: resolverAssessment.updated_at,
      },
    },
    updated_at: resolverAssessment.updated_at,
  };
  qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments);
}

function updateQualityAssessmentCounters(summary) {
  const totalEl = document.getElementById('quality-total-studies');
  const notStartedEl = document.getElementById('quality-status-not-started');
  const inProgressEl = document.getElementById('quality-status-in-progress');
  const completedEl = document.getElementById('quality-status-completed');

  if (totalEl) totalEl.textContent = summary.totalIncluded || 0;
  if (notStartedEl) notStartedEl.textContent = summary.byStatus?.not_started || 0;
  if (inProgressEl) inProgressEl.textContent = summary.byStatus?.in_progress || 0;
  if (completedEl) completedEl.textContent = summary.byStatus?.completed || 0;
}

function escapeShellText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// v1.3: 研究方法自动识别函数
function guessStudyDesign(record) {
  const text = ((record.title || '') + ' ' + (record.abstract || '')).toLowerCase();
  
  // 随机对照试验
  if (/randomized|randomised|随机(.{0,3})对照|双盲|三盲|单盲|rct\b/.test(text)) {
    return '随机对照试验（RCT）';
  }
  
  // 系统综述/Meta分析
  if (/systematic review|meta-analysis|meta analysis|系统综述|荟萃分析|meta\s?分析/.test(text)) {
    return '系统综述/Meta分析';
  }
  
  // 队列研究
  if (/cohort\s+study|cohort|prospective|队列研究|前瞻性(.{0,3})研究|回顾性(.{0,3})队列/.test(text)) {
    return '队列研究';
  }
  
  // 病例对照研究
  if (/case[-\s]?control|病例对照/.test(text)) {
    return '病例对照研究';
  }
  
  // 横断面研究
  if (/cross[-\s]?sectional|横断面研究|横断面调查/.test(text)) {
    return '横断面研究';
  }
  
  // 临床试验（非随机）
  if (/clinical trial|临床试验/.test(text) && !/random/.test(text)) {
    return '临床试验（非随机）';
  }
  
  // 诊断性试验
  if (/diagnostic\s+accuracy|sensitivity\s+and\s+specificity|诊断(.{0,3})准确性|诊断试验/.test(text)) {
    return '诊断性试验研究';
  }
  
  // 动物实验
  if (/animal\s+model|animal\s+study|in\s+vivo|动物模型|动物实验/.test(text)) {
    return '动物实验研究';
  }
  
  // 体外实验
  if (/in\s+vitro|cell\s+culture|体外实验|细胞实验/.test(text)) {
    return '体外实验研究';
  }
  
  return '未标注';
}

// v1.3: 批量自动识别研究方法
function autoIdentifyStudyDesigns() {
  if (!screeningResults || !screeningResults.included) {
    showToast('请先完成文献筛选', 'warning');
    return;
  }
  
  let identifiedCount = 0;
  screeningResults.included.forEach(record => {
    const design = guessStudyDesign(record);
    if (design !== '未标注') {
      record.studyDesign = design;
      identifiedCount++;
    }
  });
  
  // 刷新人工审查界面
  displayFulltextReviewUI();
  
  showToast(
    `已为 ${identifiedCount}/${screeningResults.included.length} 条文献补充研究设计标签，结果仅作人工复核参考。`,
    'success'
  );
}

function readRuntimeSessionFromStorage() {
  const raw = sessionStorage.getItem(USER_SESSION_KEY);
  if (!raw) return null;

  let session;
  try {
    session = JSON.parse(raw);
  } catch (error) {
    console.warn('[mode] prisma_user_session is not valid JSON — falling back to single', error);
    return null;
  }

  if (typeof session.role !== 'string' || typeof session.isMainReviewer !== 'boolean') {
    console.warn('[mode] prisma_user_session missing required fields — falling back to single', session);
    return null;
  }

  if (session.role !== 'reviewer-a' && session.role !== 'reviewer-b') {
    console.warn('[mode] prisma_user_session role is invalid — falling back to single', session);
    return null;
  }

  return session;
}

function detectRuntimeMode() {
  const session = readRuntimeSessionFromStorage();
  if (!session) {
    runtimeSession = null;
    return RUNTIME_MODE.SINGLE;
  }

  runtimeSession = session;
  return session.isMainReviewer ? RUNTIME_MODE.DUAL_MAIN : RUNTIME_MODE.DUAL_SECONDARY;
}

function toggleDisplay(element, isVisible) {
  if (!element) return;
  element.style.display = isVisible ? '' : 'none';
}

function applyModeGating(mode) {
  const collaborationStatus = document.getElementById('collaboration-status');
  const collaborationPanel = collaborationStatus ? collaborationStatus.closest('.info-box') : null;
  const reviewerAStatus = document.getElementById('reviewer-a-status');
  const reviewerBStatus = document.getElementById('reviewer-b-status');
  const kappaPanel = document.getElementById('kappa-analysis');
  const exportButtons = document.querySelectorAll('button[onclick="saveProjectFile()"]');
  const statusButtons = document.querySelectorAll('button[onclick="showProjectStatus()"]');
  const disagreementButtons = document.querySelectorAll('button[onclick="showDisagreements()"]');

  const isSingleMode = mode === RUNTIME_MODE.SINGLE;
  const isDualMainMode = mode === RUNTIME_MODE.DUAL_MAIN;
  const isDualSecondaryMode = mode === RUNTIME_MODE.DUAL_SECONDARY;

  toggleDisplay(collaborationPanel, !isSingleMode);
  toggleDisplay(collaborationStatus, !isSingleMode);
  toggleDisplay(reviewerAStatus ? reviewerAStatus.parentElement : null, !isSingleMode);
  toggleDisplay(reviewerBStatus ? reviewerBStatus.parentElement : null, !isSingleMode);

  if (kappaPanel && isSingleMode) {
    kappaPanel.style.display = 'none';
  } else if (kappaPanel && !isSingleMode) {
    kappaPanel.style.display = '';
  }

  exportButtons.forEach(btn => {
    toggleDisplay(btn, isDualMainMode);
  });

  statusButtons.forEach(btn => {
    toggleDisplay(btn, !isSingleMode);
  });

  disagreementButtons.forEach(btn => {
    toggleDisplay(btn, isDualMainMode);
  });

  if (runtimeSession) {
    if (isDualMainMode && reviewerAStatus) {
      reviewerAStatus.textContent = `${runtimeSession.username || '主审查员'}（当前登录）`;
    }
    if (isDualSecondaryMode && reviewerBStatus) {
      reviewerBStatus.textContent = `${runtimeSession.username || '副审查员'}（当前登录）`;
    }
  }
}

function initializeRuntimeContext(mode) {
  currentUserSession = mode === RUNTIME_MODE.SINGLE ? null : runtimeSession;
  isDualReviewMode = mode !== RUNTIME_MODE.SINGLE;
  currentReviewer = currentUserSession?.role === 'reviewer-b' ? 'B' : 'A';
}

function openFilePicker() {
  const fileInput = document.getElementById('fileInput');
  if (!fileInput) {
    console.error('File input not found');
    showToast('未找到上传控件，请刷新页面后重试', 'error');
    return;
  }
  fileInput.click();
}

if (typeof window !== 'undefined') {
  window.openFilePicker = openFilePicker;
}

// Initialize
function init() {
  runtimeMode = detectRuntimeMode();
  initializeRuntimeContext(runtimeMode);

  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const uploadFilesButton = document.getElementById('uploadFilesButton');

  applyModeGating(runtimeMode);

  if (!uploadArea || !fileInput) {
    console.error('Upload elements not found');
    return;
  }

  if (uploadFilesButton) {
    uploadFilesButton.addEventListener('click', openFilePicker);
    uploadFilesButton.removeAttribute('onclick');
  }
  uploadArea.addEventListener('click', openFilePicker);
  uploadArea.removeAttribute('onclick');
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    // v3.0: Support multiple files | v1.5: Smart batch import
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleImportFiles(files);
  });

  // v3.0: Change fileInput to support multiple files | v1.5: Smart batch import
  fileInput.multiple = true;
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) handleImportFiles(files);
  });

  // Initialize sliders (with safety check)
  const ftExcludeRatio = document.getElementById('ftExcludeRatio');
  const ftExcludeValue = document.getElementById('ftExcludeValue');
  if (ftExcludeRatio && ftExcludeValue) {
    ftExcludeRatio.addEventListener('input', (e) => {
      ftExcludeValue.textContent = Math.round(e.target.value * 100) + '%';
    });
  }

  // Initialize exclude list
  loadExcludeItems();

  // v1.4: Render exclusion template UI (Step 4)
  renderExclusionTemplateButtons();
  renderExclusionTemplateEditor();
  renderImportJobShell();
  renderQualityAssessmentShell();
  renderAiProviderConfigPanel();

  // v1.4: Ensure Step4 entry button reflects readiness
  updateStep4EntryLock();

  if (currentUserSession) {
    initializeCollaborativeSession();
  } else {
    // v1.4: Restore last opened project (per-project persistence)
    const restored = shouldAutoRestoreProjectState() ? loadCurrentProjectStateFromLocalStorage() : false;
    if (restored) {
      // If we have data, ensure UI gets refreshed
      if (uploadedData && uploadedData.length > 0) {
        if (!columnMapping || Object.keys(columnMapping).length === 0) {
          try { detectColumns(); } catch (_) {}
        }
        try { displayUploadInfo(); } catch (_) {}
      }

      if (filterRules) {
        try { setFormRules(filterRules); } catch (_) {}
      }

      if (screeningResults) {
        try { displayResults(screeningResults); } catch (_) {}
        if (currentStep >= 5 && FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT) {
          try { prepareQualityAssessmentShell({ persist: false, silent: true }); } catch (_) {}
        }
        setStep(Math.min(currentStep || 3, WORKFLOW_STEP_COUNT));
      } else if (uploadedData && uploadedData.length > 0) {
        setStep(2);
        try { syncFormToYAML(); } catch (_) {}
        try { displayRulesPreview(); } catch (_) {}
      } else {
        setStep(1);
      }
    } else {
      setStep(1);
    }
  }
}

function initializeCollaborativeSession() {
  isDualReviewMode = true;
  currentProjectId = currentUserSession.projectId;
  localStorage.setItem('prisma_current_project_id', currentProjectId);

  loadProjectData();
  if (!projectData) return;

  applyCollaborativeProjectState();
  startCollaborationSync();
}

function applyCollaborativeProjectState() {
  if (!projectData) return;

  const waitingDiv = document.getElementById('project-waiting');
  if (waitingDiv) waitingDiv.remove();

  currentProjectId = projectData.id || currentUserSession?.projectId || currentProjectId;
  localStorage.setItem('prisma_current_project_id', currentProjectId);

  restoreProjectState({
    uploadedData: projectData.uploadedData || [],
    uploadedFiles: projectData.uploadedFiles || [],
    screeningResults: projectData.screeningResults || null,
    columnMapping: projectData.columnMapping || {},
    fileFormat: projectData.fileFormat || 'unknown',
    formatSource: projectData.formatSource || 'Unknown',
    currentStep: projectData.currentStep || inferCollaborativeStep(),
    filterRules: projectData.filterRules || null,
    exclusionReasons: projectData.exclusionReasons || [...DEFAULT_EXCLUSION_REASONS],
    qualityAssessments: projectData.qualityAssessments || [],
    importJobs: projectData.importJobs || [],
    projectManifest: projectData.projectManifest || null,
    auditEvents: projectData.auditEvents || [],
    screeningDecisions: projectData.screeningDecisions || [],
    aiSuggestionEvents: projectData.aiSuggestionEvents || [],
    dualReviewResults: projectData.dualReviewResults || { A: {}, B: {}, final: {} },
    dualReviewConflictState: projectData.dualReviewConflictState || null
  });

  if (uploadedData && uploadedData.length > 0) {
    if (!columnMapping || Object.keys(columnMapping).length === 0) {
      try { detectColumns(); } catch (_) {}
    }
    try { displayUploadInfo(); } catch (_) {}
  }

  if (filterRules) {
    try { setFormRules(filterRules); } catch (_) {}
  }

  if (screeningResults) {
    try { displayResults(screeningResults); } catch (_) {}
    const targetStep = Math.max(3, projectData.currentStep || inferCollaborativeStep());
    if (targetStep >= 5 && FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT) {
      try { prepareQualityAssessmentShell({ persist: false, silent: true }); } catch (_) {}
    }
    setStep(targetStep);
    if (targetStep >= 4) {
      try { displayFulltextReviewUI(); } catch (_) {}
      updateCollaborationStatus();
      checkAndCalculateKappa();
    }
  } else if (uploadedData && uploadedData.length > 0) {
    setStep(Math.max(2, projectData.currentStep || 2));
    try { syncFormToYAML(); } catch (_) {}
    try { displayRulesPreview(); } catch (_) {}
  } else {
    setStep(1);
  }

  updateCollaborationStatus();
}

function inferCollaborativeStep() {
  if (screeningResults) {
    return screeningResults.counts?.included !== undefined ? 4 : 3;
  }
  if (uploadedData && uploadedData.length > 0) return 2;
  return 1;
}

function startCollaborationSync() {
  if (collaborationSyncInterval) return;

  window.addEventListener('storage', handleCollaborationStorageEvent);
  collaborationSyncInterval = setInterval(() => {
    syncCollaborativeProjectFromStorage(true);
  }, 1500);
}

function handleCollaborationStorageEvent(event) {
  if (event.key === COLLAB_PROJECTS_KEY) {
    syncCollaborativeProjectFromStorage(true);
  }
}

function syncCollaborativeProjectFromStorage(silent = false) {
  if (!currentUserSession) return;

  const projects = JSON.parse(localStorage.getItem(COLLAB_PROJECTS_KEY) || '{}');
  const latestProject = projects[currentUserSession.projectId];
  if (!latestProject) return;

  const latestSync = latestProject.lastSync || latestProject.createdAt || '';
  const currentSync = projectData?.lastSync || projectData?.createdAt || '';
  if (projectData && latestSync === currentSync) return;

  projectData = latestProject;
  applyCollaborativeProjectState();

  if (!silent) {
    showToast('已同步最新协作项目状态', 'info');
  }
}

// Compatibility wrapper: all multi-file imports must go through handleImportFiles.
function handleMultipleFiles(files) {
  return handleImportFiles(files);
}

// v1.5: Smart auto-batch import system
/**
 * Mechanism 1: Chunked read + background parse
 * 分块读取文件，再交给 Worker 解析，避免在主线程上同步卡住 UI
 */
function getParserFormatFromExt(ext) {
  switch (ext) {
    case '.csv': return 'csv';
    case '.tsv': return 'tsv';
    case '.ris': return 'ris';
    case '.nbib': return 'nbib';
    case '.bib':
    case '.bibtex':
      return 'bibtex';
    case '.txt': return 'txt';
    case '.enw': return 'enw';
    case '.rdf': return 'rdf';
    default: return '';
  }
}

function parseTextWithWorker(text, ext, sourceFile, onProgress) {
  const parserFormat = getParserFormatFromExt(ext);
  if (!parserFormat) {
    return Promise.resolve(parseFileContent(text, ext));
  }

  if (typeof Worker === 'undefined') {
    if (!shouldAllowWholeFileParseFallback(ext)) {
      return Promise.reject(createIncrementalWorkerFailureError(
        { name: sourceFile },
        ext,
        new Error('Worker is unavailable')
      ));
    }
    return Promise.resolve(parseFileContent(text, ext));
  }

  return new Promise((resolve, reject) => {
    let worker;
    let hasStarted = false;
    let hasSettled = false;

    const cleanup = () => {
      if (!worker) return;
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    const settle = (resolver, value) => {
      if (hasSettled) return;
      hasSettled = true;
      cleanup();
      resolver(value);
    };

    try {
      worker = new Worker(PARSER_WORKER_URL);
    } catch (error) {
      reject(error);
      return;
    }

    const startParse = () => {
      if (hasStarted) return;
      hasStarted = true;
      worker.postMessage({
        type: 'PARSE_FILE',
        data: {
          content: text,
          format: parserFormat,
          sourceFile
        }
      });
    };

    worker.onerror = (event) => {
      const message = event?.message || 'Worker 解析失败';
      settle(reject, new Error(message));
    };

    worker.onmessage = (event) => {
      const payload = event?.data || {};
      switch (payload.type) {
        case 'PARSER_WORKER_READY':
          startParse();
          break;
        case 'PARSE_PROGRESS':
          if (typeof onProgress === 'function') {
            onProgress({
              phase: 'parse',
              parsed: payload.parsed || 0,
              total: payload.total || 0
            });
          }
          break;
        case 'PARSE_COMPLETE':
          settle(resolve, Array.isArray(payload.records) ? payload.records : []);
          break;
        case 'ERROR':
          settle(reject, new Error(payload.error || 'Worker 解析失败'));
          break;
        default:
          if (!hasStarted) {
            startParse();
          }
          break;
      }
    };
  });
}

function supportsIncrementalWorkerFormat(ext) {
  if (IMPORT_JOB_RUNTIME && typeof IMPORT_JOB_RUNTIME.supportsIncrementalWorkerExt === 'function') {
    return IMPORT_JOB_RUNTIME.supportsIncrementalWorkerExt(ext);
  }

  const parserFormat = getParserFormatFromExt(ext);
  return ['csv', 'tsv', 'ris', 'nbib', 'enw'].includes(parserFormat);
}

function shouldAllowWholeFileParseFallback(ext) {
  if (IMPORT_JOB_RUNTIME && typeof IMPORT_JOB_RUNTIME.shouldAllowWholeFileParseFallback === 'function') {
    return IMPORT_JOB_RUNTIME.shouldAllowWholeFileParseFallback(ext);
  }

  return !supportsIncrementalWorkerFormat(ext);
}

function isLocalFilePageContext() {
  try {
    return typeof window !== 'undefined'
      && window.location
      && window.location.protocol === 'file:';
  } catch (_error) {
    return false;
  }
}

function shouldAllowLocalFileWorkerFallback(file, ext) {
  if (!isLocalFilePageContext() || !supportsIncrementalWorkerFormat(ext)) {
    return false;
  }

  const fileSize = Number.isFinite(file?.size) ? file.size : 0;
  return fileSize <= LOCAL_FILE_WORKER_FALLBACK_MAX_BYTES;
}

async function parseFileWithLocalFileFallback(file, ext, onProgress = null) {
  const text = await readBlobAsText(file);
  if (typeof onProgress === 'function') {
    onProgress({
      phase: 'read',
      loadedBytes: file.size,
      totalBytes: file.size
    });
  }

  const records = parseFileContent(text, ext);
  if (typeof onProgress === 'function') {
    onProgress({
      phase: 'parse',
      loadedBytes: file.size,
      totalBytes: file.size,
      parsed: records.length,
      total: records.length,
      complete: true
    });
  }
  return records;
}

function createIncrementalWorkerFailureError(file, ext, cause) {
  const causeMessage = cause?.message || '未知 worker 错误';
  const formatLabel = ext || 'unknown';
  const fileName = file?.name || 'Unknown file';
  const error = new Error(
    `${fileName} (${formatLabel}) 必须使用后台增量解析，但 worker 解析失败：${causeMessage}。为避免页面卡住，已停止导入，没有退回主线程整包解析。`
  );
  error.code = 'incremental_worker_failed';
  error.fileName = fileName;
  error.ext = formatLabel;
  error.cause = cause;
  return error;
}

function readBlobAsText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event?.target?.result || ''));
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
    reader.readAsText(blob);
  });
}

function parseFileIncrementallyWithWorker(file, ext, onProgress = null) {
  const parserFormat = getParserFormatFromExt(ext);
  if (!parserFormat || typeof Worker === 'undefined') {
    return Promise.reject(new Error('Incremental worker parsing is unavailable'));
  }

  return new Promise((resolve, reject) => {
    let worker;
    let hasSettled = false;
    let offset = 0;
    const records = [];
    const sessionId = `stream-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const chunkSize = SMART_IMPORT_CONFIG.PARSE_CHUNK_SIZE;

    const cleanup = () => {
      if (!worker) return;
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    const settle = (resolver, value) => {
      if (hasSettled) return;
      hasSettled = true;
      cleanup();
      resolver(value);
    };

    const readAndSendNextChunk = async () => {
      if (hasSettled) return;

      if (offset >= file.size) {
        worker.postMessage({
          type: 'PARSE_STREAM_FINISH',
          data: { sessionId }
        });
        return;
      }

      try {
        const nextOffset = Math.min(offset + chunkSize, file.size);
        const chunk = await readBlobAsText(file.slice(offset, nextOffset));
        offset = nextOffset;

        if (typeof onProgress === 'function') {
          onProgress({
            phase: 'read',
            loadedBytes: offset,
            totalBytes: file.size
          });
        }

        worker.postMessage({
          type: 'PARSE_STREAM_CHUNK',
          data: {
            sessionId,
            chunk
          }
        });
      } catch (error) {
        settle(reject, error);
      }
    };

    try {
      worker = new Worker(PARSER_WORKER_URL);
    } catch (error) {
      reject(error);
      return;
    }

    worker.onerror = (event) => {
      const message = event?.message || 'Worker 流式解析失败';
      settle(reject, new Error(message));
    };

    worker.onmessage = (event) => {
      const payload = event?.data || {};
      switch (payload.type) {
        case 'PARSER_WORKER_READY':
          worker.postMessage({
            type: 'PARSE_STREAM_INIT',
            data: {
              sessionId,
              format: parserFormat,
              sourceFile: file.name
            }
          });
          break;
        case 'PARSE_STREAM_INIT_ACK':
          if (payload.sessionId !== sessionId) return;
          readAndSendNextChunk();
          break;
        case 'PARSE_STREAM_BATCH':
          if (payload.sessionId !== sessionId) return;
          if (Array.isArray(payload.records) && payload.records.length > 0) {
            records.push(...payload.records);
          }
          break;
        case 'PARSE_STREAM_PROGRESS':
          if (payload.sessionId !== sessionId) return;
          if (typeof onProgress === 'function') {
            onProgress({
              phase: 'parse',
              loadedBytes: offset,
              totalBytes: file.size,
              parsed: payload.parsed || records.length
            });
          }
          break;
        case 'PARSE_STREAM_CHUNK_ACK':
          if (payload.sessionId !== sessionId) return;
          if (offset < file.size) {
            setTimeout(() => {
              readAndSendNextChunk();
            }, 0);
          } else {
            worker.postMessage({
              type: 'PARSE_STREAM_FINISH',
              data: { sessionId }
            });
          }
          break;
        case 'PARSE_STREAM_COMPLETE':
          if (payload.sessionId !== sessionId) return;
          if (typeof onProgress === 'function') {
            onProgress({
              phase: 'parse',
              loadedBytes: file.size,
              totalBytes: file.size,
              parsed: payload.count || records.length,
              complete: true
            });
          }
          settle(resolve, records);
          break;
        case 'ERROR':
          settle(reject, new Error(payload.error || 'Worker 流式解析失败'));
          break;
        default:
          break;
      }
    };
  });
}

async function parseFileInChunks(file, onProgress = null) {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (supportsIncrementalWorkerFormat(ext)) {
    try {
      return await parseFileIncrementallyWithWorker(file, ext, onProgress);
    } catch (workerError) {
      if (shouldAllowLocalFileWorkerFallback(file, ext)) {
        console.warn('Incremental worker unavailable in file:// mode, using local main-thread parser:', workerError);
        return parseFileWithLocalFileFallback(file, ext, onProgress);
      }
      throw createIncrementalWorkerFailureError(file, ext, workerError);
    }
  }

  const text = await readBlobAsText(file);
  if (typeof onProgress === 'function') {
    onProgress({
      phase: 'read',
      loadedBytes: file.size,
      totalBytes: file.size
    });
  }

  try {
    const records = await parseTextWithWorker(text, ext, file.name, onProgress);
    if (typeof onProgress === 'function') {
      onProgress({
        phase: 'parse',
        loadedBytes: file.size,
        totalBytes: file.size,
        parsed: records.length,
        total: records.length,
        complete: true
      });
    }
    return records;
  } catch (workerError) {
    if (!shouldAllowWholeFileParseFallback(ext)) {
      throw createIncrementalWorkerFailureError(file, ext, workerError);
    }

    console.warn('Worker parsing failed, falling back to main-thread parser:', workerError);
    const records = parseFileContent(text, ext);
    if (typeof onProgress === 'function') {
      onProgress({
        phase: 'parse',
        loadedBytes: file.size,
        totalBytes: file.size,
        parsed: records.length,
        total: records.length,
        complete: true
      });
    }
    return records;
  }
}

/**
 * Mechanism 2: Checkpoint - 分段事务提交
 * 每N条记录创建checkpoint，失败可从上次成功点继续
 */
async function batchInsertWithCheckpoint(records, onProgress) {
  const CHUNK_SIZE = SMART_IMPORT_CONFIG.MAX_CHUNK_SIZE;
  const CHECKPOINT_INTERVAL = SMART_IMPORT_CONFIG.CHECKPOINT_INTERVAL;
  
  let processedCount = 0;
  let lastCheckpointCount = 0;
  const checkpoints = [];
  
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, Math.min(i + CHUNK_SIZE, records.length));
    
    try {
      // 批量插入当前chunk
      await new Promise((resolve, reject) => {
        // 这里调用IndexedDB worker批量插入
        // 暂时用模拟实现
        setTimeout(() => {
          processedCount += chunk.length;
          
          // 创建checkpoint
          if (processedCount - lastCheckpointCount >= CHECKPOINT_INTERVAL) {
            checkpoints.push({
              count: processedCount,
              timestamp: Date.now(),
              status: 'success'
            });
            lastCheckpointCount = processedCount;
          }
          
          if (onProgress) {
            onProgress(processedCount, records.length);
          }
          resolve();
        }, 100);
      });
      
    } catch (error) {
      // 记录失败checkpoint
      checkpoints.push({
        count: processedCount,
        timestamp: Date.now(),
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }
  
  return { processedCount, checkpoints };
}

/**
 * Mechanism 3: Import Queue & Backpressure - 导入队列和背压控制
 * Worker解析速度 > IndexedDB写入速度时，暂停解析避免内存爆炸
 */
class ImportQueueManager {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.maxQueueSize = 10000; // 队列最大长度
    this.processedCount = 0;
    this.onProgress = null;
  }
  
  async enqueue(records) {
    // Backpressure: 队列过长时等待
    while (this.queue.length > this.maxQueueSize) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.queue.push(...records);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const BATCH_SIZE = 500;
      const batch = this.queue.splice(0, BATCH_SIZE);
      
      try {
        // 插入到IndexedDB
        await this.insertBatch(batch);
        this.processedCount += batch.length;
        
        if (this.onProgress) {
          this.onProgress(this.processedCount);
        }
      } catch (error) {
        console.error('Batch insert failed:', error);
        // 失败的batch重新入队（可选）
        this.queue.unshift(...batch);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.isProcessing = false;
  }
  
  async insertBatch(records) {
    // 模拟IndexedDB插入
    return new Promise(resolve => {
      setTimeout(() => {
        uploadedData.push(...records);
        resolve();
      }, 50);
    });
  }
  
  reset() {
    this.queue = [];
    this.processedCount = 0;
    this.isProcessing = false;
  }
}

const importQueueManager = new ImportQueueManager();

/**
 * Mechanism 4: Failure Recovery - 失败可恢复
 * 记录已成功导入的文件/记录数，刷新页面可继续
 */
function saveImportProgress(state) {
  try {
    localStorage.setItem('import_progress', JSON.stringify({
      files: state.files,
      processedCount: state.processedCount,
      totalCount: state.totalCount,
      checkpoints: state.checkpoints,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to save import progress:', e);
  }
}

function loadImportProgress() {
  try {
    const saved = localStorage.getItem('import_progress');
    if (!saved) return null;
    
    const progress = JSON.parse(saved);
    // 检查是否是最近1小时内的进度
    if (Date.now() - progress.timestamp < 3600000) {
      return progress;
    }
  } catch (e) {
    console.warn('Failed to load import progress:', e);
  }
  return null;
}

function clearImportProgress() {
  localStorage.removeItem('import_progress');
}

function createEmptyImportError(fileCount) {
  const error = new Error(`未解析到有效记录（${fileCount || 0} 个文件）`);
  error.code = 'empty_file';
  return error;
}

function getImportErrorType(error) {
  if (error?.code === 'empty_file') {
    return 'empty_file';
  }
  return 'parsing_error';
}

async function finalizeImportOutcome({
  outcome,
  error = null,
  validFiles = [],
  totalRecords = 0,
  updateImportJobForFile,
}) {
  const finalizeLifecycle = IMPORT_JOB_RUNTIME && typeof IMPORT_JOB_RUNTIME.finalizeImportLifecycle === 'function'
    ? IMPORT_JOB_RUNTIME.finalizeImportLifecycle
    : async (result, effects) => {
      try {
        if (result.outcome === 'success') {
          await effects.completeSuccess?.(result);
          return { status: 'completed', error: null, finalizationFailed: false, errorShown: false, cleanupErrors: [] };
        }

        const failure = result.error || new Error('Import failed');
        await effects.failImportJobs?.(failure, result);
        await effects.showError?.(failure, result);
        return { status: 'failed', error: failure, finalizationFailed: false, errorShown: true, cleanupErrors: [] };
      } catch (finalizeError) {
        await effects.failImportJobs?.(finalizeError, { ...result, finalizationFailed: true });
        await effects.showError?.(finalizeError, { ...result, finalizationFailed: true });
        return { status: 'failed', error: finalizeError, finalizationFailed: true, errorShown: true, cleanupErrors: [] };
      } finally {
        effects.hideProgress?.();
        effects.hideLoading?.();
        effects.persist?.();
      }
    };

  const markFailed = (failure) => {
    if (typeof updateImportJobForFile !== 'function') return;
    validFiles.forEach((file) => {
      updateImportJobForFile(file, {
        stage: 'failed',
        error: failure?.message || 'Import failed',
      }, { persist: false, render: true });
    });
  };

  const showImportFailure = (failure) => {
    const normalizedError = failure || new Error('Import failed');
    showDetailedError(getImportErrorType(normalizedError), {
      fileName: normalizedError.fileName || 'Multiple files',
      fileCount: validFiles.length,
      message: normalizedError.message || 'Import failed',
      line: normalizedError.line || '未知',
      content: normalizedError.content || '未知',
    });
  };

  return finalizeLifecycle({
    outcome,
    error,
    delayMs: outcome === 'success' ? 500 : 0,
    totalRecords,
    fileCount: validFiles.length,
  }, {
    completeSuccess: () => {
      detectColumns();
      displayUploadInfo();
      setStep(2);
      syncFormToYAML();
      displayRulesPreview();
      persistCurrentProjectState();

      const batchCount = Math.ceil(totalRecords / SMART_IMPORT_CONFIG.MAX_CHUNK_SIZE);
      const message = totalRecords > SMART_IMPORT_CONFIG.MAX_CHUNK_SIZE
        ? `✅ 智能分${batchCount}批导入成功！共${validFiles.length}个文件，${totalRecords}条记录`
        : `✅ 成功上传${validFiles.length}个文件，共${totalRecords}条记录`;

      showToast(message, 'success');
      addSuccessAnimation();
      const step2 = document.getElementById('step2');
      if (step2) step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    failImportJobs: (failure) => {
      markFailed(failure);
      clearImportProgress();
    },
    showError: showImportFailure,
    hideProgress,
    hideLoading,
    persist: persistCurrentProjectState,
  });
}

// Legacy name retained for older inline calls; do not add behavior here.
async function handleMultipleFilesV15(files) {
  return handleImportFiles(files);
}

/**
 * Canonical multi-file import orchestrator with smart batch system.
 * 集成4大机制的智能上传函数
 */
async function handleImportFiles(files) {
  const validExts = ['.csv', '.tsv', '.ris', '.bib', '.bibtex', '.txt', '.enw', '.rdf', '.nbib'];
  const validFiles = files.filter(file => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    return validExts.includes(ext);
  });

  if (validFiles.length === 0) {
    showDetailedError('invalid_format', {
      fileName: files[0].name,
      supportedFormats: validExts
    });
    return;
  }

  // 检查是否有未完成的导入进度
  const savedProgress = loadImportProgress();
  if (savedProgress) {
    const resume = confirm(`检测到未完成的导入任务（已导入${savedProgress.processedCount}/${savedProgress.totalCount}条），是否继续？`);
    if (!resume) {
      clearImportProgress();
    }
  }

  createProjectHistorySnapshot('before_import', 'Before import');
  const preservedHistory = Array.isArray(projectHistory) ? projectHistory.slice() : [];
  startNewProjectSession({ projectHistory: preservedHistory });
  importJobs = [];

  const fileJobIds = new Map();
  const updateImportJobForFile = (file, patch = {}, options = {}) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const jobId = fileJobIds.get(file.name) || (IMPORT_JOB_RUNTIME && typeof IMPORT_JOB_RUNTIME.createImportJob === 'function'
      ? IMPORT_JOB_RUNTIME.createImportJob({
        projectId: currentProjectId,
        fileName: file.name,
        fileSize: file.size,
        format: ext,
      }).id
      : `import-${file.name}-${Date.now()}`);

    fileJobIds.set(file.name, jobId);

    const existing = importJobs.find((job) => job.id === jobId) || {
      id: jobId,
      project_id: currentProjectId,
      file_name: file.name,
      file_size: file.size,
      format: ext,
      stage: 'queued',
      bytes_read: 0,
      records_parsed: 0,
      records_written: 0,
      checkpoint_json: null,
      error: '',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const next = IMPORT_JOB_RUNTIME && typeof IMPORT_JOB_RUNTIME.patchImportJob === 'function'
      ? IMPORT_JOB_RUNTIME.patchImportJob(existing, {
        projectId: currentProjectId,
        fileName: file.name,
        fileSize: file.size,
        format: ext,
        ...patch,
      })
      : {
        ...existing,
        project_id: currentProjectId,
        file_name: file.name,
        file_size: file.size,
        format: ext,
        stage: patch.stage || existing.stage,
        bytes_read: Number.isFinite(patch.bytesRead) ? patch.bytesRead : existing.bytes_read,
        records_parsed: Number.isFinite(patch.recordsParsed) ? patch.recordsParsed : existing.records_parsed,
        records_written: Number.isFinite(patch.recordsWritten) ? patch.recordsWritten : existing.records_written,
        error: patch.error !== undefined ? patch.error : existing.error,
        checkpoint_json: patch.checkpoint !== undefined ? patch.checkpoint : existing.checkpoint_json,
        updated_at: patch.updatedAt || new Date().toISOString(),
      };

    return upsertImportJobState(next, options);
  };

  validFiles.forEach((file) => {
    updateImportJobForFile(file, { stage: 'queued' }, { persist: false, render: false });
  });
  renderImportJobShell();
  persistCurrentProjectState();

  showLoading(`正在智能处理${validFiles.length}个文件...`);
  showProgress(`文件解析中...`, 0);

  let allRecords = [];
  let uploadedFilesInfo = [];
  let totalRecords = 0;

  try {
    // Step 1: 流式解析所有文件
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const parsePhaseStart = (i / validFiles.length) * 30;
      const parsePhaseSpan = 30 / validFiles.length;
      updateProgress(Math.round(parsePhaseStart)); // 前30%用于解析
      updateImportJobForFile(file, { stage: 'reading' }, { persist: false, render: true });
      
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const records = await parseFileInChunks(file, (progressState) => {
        let localRatio = 0;
        if (progressState?.phase === 'read') {
          localRatio = progressState.totalBytes > 0
            ? Math.min(progressState.loadedBytes / progressState.totalBytes, 1) * 0.45
            : 0;
        } else if (progressState?.phase === 'parse') {
          const byteRatio = progressState.totalBytes > 0
            ? Math.min(progressState.loadedBytes / progressState.totalBytes, 1)
            : 0;
          const legacyRatio = progressState.total > 0
            ? Math.min(progressState.parsed / progressState.total, 1)
            : 0;
          const parseRatio = progressState.complete ? 1 : Math.max(byteRatio, legacyRatio);
          localRatio = 0.45 + (
            parseRatio * 0.55
          );
        }
        const overallPercent = parsePhaseStart + (localRatio * parsePhaseSpan);
        updateProgress(Math.round(overallPercent));
        updateImportJobForFile(file, {
          stage: progressState?.phase === 'read' ? 'reading' : 'parsing',
          bytesRead: progressState?.loadedBytes ?? (progressState?.phase === 'parse' ? file.size : 0),
          recordsParsed: progressState?.parsed || 0,
        }, { persist: false, render: true });
      });
      updateImportJobForFile(file, {
        stage: 'normalizing',
        bytesRead: file.size,
        recordsParsed: records.length,
      }, { persist: false, render: true });
      
      const fileData = {
        name: file.name,
        format: ext,
        recordCount: records.length,
        source: detectSource(ext)
      };
      
      uploadedFilesInfo.push(fileData);
      
      // 标记来源
      records.forEach(record => {
        record._source = fileData.source;
        record._sourceFile = file.name;
      });
      
      allRecords = allRecords.concat(records);
    }
    
    totalRecords = allRecords.length;
    if (totalRecords === 0) {
      throw createEmptyImportError(validFiles.length);
    }

    updateProgress(30);
    validFiles.forEach((file, index) => {
      const fileInfo = uploadedFilesInfo[index];
      updateImportJobForFile(file, {
        stage: 'writing',
        recordsParsed: fileInfo ? fileInfo.recordCount : 0,
      }, { persist: false, render: true });
    });
    
    // Step 2: 智能分批导入（自动分批 + Checkpoint + 队列控制）
    if (totalRecords <= SMART_IMPORT_CONFIG.MAX_CHUNK_SIZE) {
      // 小于5000条，直接导入
      uploadedData = allRecords;
      updateProgress(100);
    } else {
      // 大于5000条，启动智能分批系统
      showProgress(`正在分批导入${totalRecords}条记录（自动分${Math.ceil(totalRecords / SMART_IMPORT_CONFIG.MAX_CHUNK_SIZE)}批）...`, 30);
      
      importQueueManager.reset();
      importQueueManager.onProgress = (processed) => {
        const percent = 30 + Math.round((processed / totalRecords) * 70);
        updateProgress(percent);
        
        // 保存进度
        saveImportProgress({
          files: uploadedFilesInfo,
          processedCount: processed,
          totalCount: totalRecords,
          checkpoints: [],
          timestamp: Date.now()
        });
      };
      
      // 分批入队（Backpressure自动控制速度）
      const ENQUEUE_BATCH = 1000;
      for (let i = 0; i < allRecords.length; i += ENQUEUE_BATCH) {
        const batch = allRecords.slice(i, Math.min(i + ENQUEUE_BATCH, allRecords.length));
        await importQueueManager.enqueue(batch);
      }
      
      // 等待队列处理完成
      while (importQueueManager.isProcessing || importQueueManager.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    uploadedFiles = uploadedFilesInfo;
    uploadedFilesInfo.forEach((fileInfo) => {
      appendAuditEventsSafe({
        eventType: 'source_file_added',
        recordId: '',
        after: {
          fileName: fileInfo.name,
          format: fileInfo.format,
          source: fileInfo.source,
          recordCount: fileInfo.recordCount,
        },
        source: 'human',
      }, { persist: false });
      createProjectHistorySnapshot('source_file_added', `After adding ${fileInfo.name}`);
    });
    updateProjectManifestSafe({
      dataSources: uploadedFilesInfo.map((file) => ({
        name: file.name,
        format: file.format,
        source: file.source,
        recordCount: file.recordCount,
      })),
    }, { persist: false });
    appendAuditEventsSafe(allRecords.map((record, index) => ({
      eventType: 'record_imported',
      recordId: getRecordAuditId(record, index),
      after: {
        title: record.title || record.TI || record.T1 || '',
        identifier: record.identifier_raw || record.doi || record.DOI || record.DO || '',
        sourceFile: record._sourceFile || '',
        sourceDatabase: record._source || '',
      },
      source: 'system',
      metadata: {
        importIndex: index,
        sourceFile: record._sourceFile || '',
        sourceDatabase: record._source || '',
        parserFormat: uploadedFilesInfo.find((file) => file.name === record._sourceFile)?.format || '',
        sourceAbstractTruncated: Boolean(record._sourceAbstractTruncated || record.sourceAbstractTruncated),
      },
    })), { persist: false });
    validFiles.forEach((file, index) => {
      const fileInfo = uploadedFilesInfo[index];
      updateImportJobForFile(file, {
        stage: 'completed',
        bytesRead: file.size,
        recordsParsed: fileInfo ? fileInfo.recordCount : 0,
        recordsWritten: fileInfo ? fileInfo.recordCount : 0,
        error: '',
      }, { persist: false, render: true });
    });
    clearImportProgress();
    await finalizeImportOutcome({
      outcome: 'success',
      validFiles,
      totalRecords,
      updateImportJobForFile,
    });
    
  } catch (error) {
    await finalizeImportOutcome({
      outcome: 'failure',
      error,
      validFiles,
      totalRecords,
      updateImportJobForFile,
    });
    console.error('Smart import failed:', error);
  }
}

function detectSource(ext) {
  switch (ext) {
    case '.ris': return 'PubMed/Scopus/Endnote';
    case '.nbib': return 'PubMed';
    case '.enw': return 'CNKI';
    case '.rdf': return 'Zotero';
    case '.csv':
    case '.tsv': return 'Excel/Generic';
    case '.bib':
    case '.bibtex': return 'Google Scholar/arXiv';
    default: return 'Unknown';
  }
}

// File handling
function handleFile(file) {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const validExts = ['.csv', '.tsv', '.ris', '.bib', '.bibtex', '.txt', '.enw', '.rdf', '.nbib'];
  
  if (!validExts.includes(ext)) {
    showToast('不支持的文件格式，请上传 CSV, TSV, RIS, BibTeX, TXT, ENW, NBIB 或 RDF 文件', 'error');
    return;
  }

  showLoading('正在读取文件...');
  showProgress('正在上传文件...', 0);

  // Simulate upload progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 10;
    updateProgress(progress);
    if (progress >= 90) clearInterval(progressInterval);
  }, 100);

  const reader = new FileReader();
  reader.onload = (e) => {
    clearInterval(progressInterval);
    updateProgress(100);
    setTimeout(() => {
      hideProgress();
      const text = e.target.result;
      parseFile(text, ext, file.name);
      hideLoading();
    }, 500);
  };
  reader.onerror = () => {
    clearInterval(progressInterval);
    hideProgress();
    hideLoading();
    showToast('文件读取失败', 'error');
  };
  reader.readAsText(file);
}

// v3.0: Unified file content parser (reusable for multiple files)
function parseFileContent(text, ext) {
  let records = [];
  
  switch (ext) {
    case '.csv':
      records = parseCSVContent(text);
      break;
    case '.tsv':
      records = parseTSVContent(text);
      break;
    case '.ris':
    case '.nbib':
      records = parseRISContent(text);
      break;
    case '.bib':
    case '.bibtex':
      records = parseBibTeXContent(text);
      break;
    case '.txt':
      records = parseTXTContent(text);
      break;
    case '.enw':
      records = parseENWContent(text);
      break;
    case '.rdf':
      records = parseRDFContent(text);
      break;
  }
  
  return records;
}

// v3.0: Extract CSV parsing logic to reusable function
function parseCSVContent(text) {
  return parseDelimitedContent(text, ',');
}

// Similar extraction for other formats...
function parseTSVContent(text) {
  return parseDelimitedContent(text, '\t');
}

function parseDelimitedContent(text, delimiter = ',') {
  const rows = [];
  const normalizedText = String(text || '').replace(/^\uFEFF/, '');
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }

      currentRow.push(currentField);
      if (currentRow.some((value) => String(value || '').trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.some((value) => String(value || '').trim() !== '')) {
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => String(header || '').trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (!values || values.length === 0) continue;

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = String(values[idx] ?? '').trim();
    });
    data.push(row);
  }

  return data;
}

function parseRISContent(text) {
  const records = [];
  const lines = text.split('\n');
  let currentRecord = {};
  
  const fieldMap = {
    'TY': 'type', 'T1': 'title', 'TI': 'title', 'AU': 'authors', 'T2': 'journal',
    'JO': 'journal', 'TA': 'journal', 'PY': 'year', 'DP': 'year', 'DO': 'doi', 'AB': 'abstract', 'KW': 'keywords',
    'VL': 'volume', 'VI': 'volume', 'IS': 'issue', 'IP': 'issue'
  };

  for (let line of lines) {
    line = line.trim();
    
    // Handle record delimiters: ER marker or blank line (for NBIB compatibility)
    if (line.startsWith('ER') || line === '') {
      if (Object.keys(currentRecord).length > 0) {
        // NBIB files may not have explicit TY field; default to JOUR for journal articles
        if (!currentRecord.type) {
          currentRecord.type = 'JOUR';
        }
        records.push(currentRecord);
        currentRecord = {};
      }
    } else if (line.includes('  - ')) {
      const [tag, ...valueParts] = line.split('  - ');
      const value = valueParts.join('  - ').trim();
      const mappedField = fieldMap[tag.trim()];
      
      if (mappedField) {
        if (mappedField === 'authors' || mappedField === 'keywords') {
          if (!currentRecord[mappedField]) {
            currentRecord[mappedField] = value;
          } else {
            currentRecord[mappedField] += '; ' + value;
          }
        } else if (mappedField === 'year') {
          // Extract 4-digit year from NBIB DP format (e.g., "2024" from "20240221")
          if (!currentRecord[mappedField]) {
            const yearMatch = value.match(/\d{4}/);
            currentRecord[mappedField] = yearMatch ? yearMatch[0] : value;
          }
        } else {
          currentRecord[mappedField] = value;
        }
      }
    }
  }

  return records.length > 0 ? records : [];
}

function parseBibTeXContent(text) {
  const records = [];
  const entryPattern = /@\w+\{([^,]+),([^}]+)\}/gs;
  let match;

  while ((match = entryPattern.exec(text)) !== null) {
    const entryKey = match[1].trim();
    const entryContent = match[2];
    const record = { key: entryKey };

    const fieldPattern = /(\w+)\s*=\s*[{"]([^}"]+)[}"]/g;
    let fieldMatch;

    while ((fieldMatch = fieldPattern.exec(entryContent)) !== null) {
      const fieldName = fieldMatch[1].toLowerCase();
      const fieldValue = fieldMatch[2].trim();
      record[fieldName] = fieldValue;
    }

    if (record.title || record.author) {
      records.push(record);
    }
  }

  return records.length > 0 ? records : [];
}

function parseENWContent(text) {
  const records = parseENWRecords(text);
  return records.length > 0 ? records : [];
}

function parseENWRecords(text) {
  const records = [];
  const lines = String(text || '').split(/\r?\n/);
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

  lines.forEach((rawLine) => {
    const line = String(rawLine || '').trim();
    if (!line) {
      pushCurrentRecord();
      return;
    }

    const match = line.match(/^%([0-9A-Z@])\s*(.*)$/);
    if (match) {
      applyTaggedValue(`%${match[1]}`, match[2]);
      return;
    }

    if (currentField) {
      appendField(currentField, line, true);
    }
  });

  pushCurrentRecord();
  return records;
}

function parseRDFContent(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    return [];
  }
  
  const records = collectRDFRecords(xmlDoc);

  return records.length > 0 ? records : [];
}

function parseTXTContent(text) {
  const lines = text.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }

  const possibleHeaders = ['title', 'abstract', 'year', 'author'];
  const firstLine = lines[0].toLowerCase();
  const hasHeader = possibleHeaders.some(h => firstLine.includes(h));

  if (hasHeader && lines.length > 1) {
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx].trim();
        });
        data.push(row);
      }
    }
    return data.length > 0 ? data : [];
  } else {
    return lines.map((line, idx) => ({
      title: line,
      abstract: '',
      year: new Date().getFullYear(),
      journal: 'Unknown',
      authors: 'Unknown',
      doi: ''
    }));
  }
}

// File parser dispatcher
function parseFile(text, ext, fileName = 'single-upload') {
  const records = parseFileContent(text, ext);

  switch (ext) {
    case '.csv':
      fileFormat = 'CSV';
      formatSource = 'Excel, Google Sheets';
      break;
    case '.tsv':
      fileFormat = 'TSV';
      formatSource = 'Excel (Tab-delimited)';
      break;
    case '.ris':
    case '.nbib':
      fileFormat = 'RIS';
      formatSource = ext === '.nbib' ? 'PubMed (.nbib)' : 'Endnote, Zotero, Mendeley';
      break;
    case '.bib':
    case '.bibtex':
      fileFormat = 'BibTeX';
      formatSource = 'Google Scholar, arXiv';
      break;
    case '.txt':
      fileFormat = 'TXT';
      formatSource = '简单文本';
      break;
    case '.enw':
      fileFormat = 'ENW';
      formatSource = '知网导出';
      break;
    case '.rdf':
      fileFormat = 'RDF';
      formatSource = 'Zotero导出';
      break;
    default:
      showToast('不支持的文件格式', 'error');
      return;
  }

  const source = detectSource(ext);
  if (!Array.isArray(records) || records.length === 0) {
    showToast('未能解析到有效数据，使用示例数据', 'warning');
    uploadedData = sampleData.map((item) => ({
      ...item,
      _source: source,
      _sourceFile: 'sample.data'
    }));
    uploadedFiles = [{
      name: 'sample.data',
      format: ext,
      recordCount: uploadedData.length,
      source
    }];
  } else {
    uploadedData = records.map((record) => ({
      ...record,
      _source: record._source || source,
      _sourceFile: record._sourceFile || fileName
    }));
    uploadedFiles = [{
      name: fileName,
      format: ext,
      recordCount: uploadedData.length,
      source
    }];
  }

  detectColumns();
  displayUploadInfo();
  showToast(`文件上传成功 (${fileFormat} 格式，共${uploadedData.length}条记录)`, 'success');
  addSuccessAnimation();
}

// CSV parser
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    showToast('CSV 文件格式错误', 'error');
    return;
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      data.push(row);
    }
  }

  if (data.length === 0) {
    showToast('未能解析到有效数据，使用示例数据', 'warning');
    uploadedData = sampleData;
  } else {
    uploadedData = data;
  }

  detectColumns();
  displayUploadInfo();
  showToast(`文件上传成功 (${fileFormat} 格式)`, 'success');
  addSuccessAnimation();
}

// TSV parser
function parseTSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    showToast('TSV 文件格式错误', 'error');
    return;
  }

  const headers = lines[0].split('\t').map(h => h.trim().replace(/"/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      data.push(row);
    }
  }

  if (data.length === 0) {
    showToast('未能解析到有效数据，使用示例数据', 'warning');
    uploadedData = sampleData;
  } else {
    uploadedData = data;
  }

  detectColumns();
  displayUploadInfo();
  showToast(`文件上传成功 (${fileFormat} 格式)`, 'success');
  addSuccessAnimation();
}

// RIS parser
function parseRIS(text) {
  const records = [];
  const lines = text.split('\n');
  let currentRecord = {};
  
  const fieldMap = {
    'TY': 'type',
    'T1': 'title',
    'TI': 'title',
    'AU': 'authors',
    'T2': 'journal',
    'JO': 'journal',
    'PY': 'year',
    'DO': 'doi',
    'AB': 'abstract',
    'KW': 'keywords',
    'VL': 'volume',
    'IS': 'issue'
  };

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('ER')) {
      if (Object.keys(currentRecord).length > 0) {
        records.push(currentRecord);
        currentRecord = {};
      }
    } else if (line.includes('  - ')) {
      const [tag, ...valueParts] = line.split('  - ');
      const value = valueParts.join('  - ').trim();
      const mappedField = fieldMap[tag.trim()];
      
      if (mappedField) {
        if (mappedField === 'authors' || mappedField === 'keywords') {
          if (!currentRecord[mappedField]) {
            currentRecord[mappedField] = value;
          } else {
            currentRecord[mappedField] += '; ' + value;
          }
        } else {
          currentRecord[mappedField] = value;
        }
      }
    }
  }

  if (records.length === 0) {
    showToast('未能解析到有效RIS记录，使用示例数据', 'warning');
    uploadedData = sampleData;
  } else {
    uploadedData = records;
  }

  detectColumns();
  displayUploadInfo();
  showToast(`文件上传成功 (${fileFormat} 格式，共${records.length}条记录)`, 'success');
  addSuccessAnimation();
}

// BibTeX parser
function parseBibTeX(text) {
  const records = [];
  const entryPattern = /@\w+\{([^,]+),([^}]+)\}/gs;
  let match;

  while ((match = entryPattern.exec(text)) !== null) {
    const entryKey = match[1].trim();
    const entryContent = match[2];
    const record = { key: entryKey };

    const fieldPattern = /(\w+)\s*=\s*[{"]([^}"]+)[}"]/g;
    let fieldMatch;

    while ((fieldMatch = fieldPattern.exec(entryContent)) !== null) {
      const fieldName = fieldMatch[1].toLowerCase();
      const fieldValue = fieldMatch[2].trim();
      record[fieldName] = fieldValue;
    }

    if (record.title || record.author) {
      records.push(record);
    }
  }

  if (records.length === 0) {
    showToast('未能解析到有效BibTeX记录，使用示例数据', 'warning');
    uploadedData = sampleData;
  } else {
    uploadedData = records;
  }

  detectColumns();
  displayUploadInfo();
  showToast(`文件上传成功 (${fileFormat} 格式，共${records.length}条记录)`, 'success');
  addSuccessAnimation();
}

// TXT parser (simple line-by-line)
// ENW parser (CNKI format)
function parseENW(text) {
  const records = parseENWRecords(text);

  if (records.length === 0) {
    showToast('未能解析到有效ENW记录，使用示例数据', 'warning');
    uploadedData = sampleData;
  } else {
    uploadedData = records;
  }

  detectColumns();
  displayUploadInfo();
  showToast(`文件上传成功 (${fileFormat} 格式 - 知网CNKI，共${records.length}条记录)`, 'success');
  addSuccessAnimation();
}

// RDF parser (Zotero RDF/XML format)
function parseRDF(text) {
  // Simple XML parsing for RDF
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  // Check for parsing errors
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    showToast('RDF文件格式错误，使用示例数据', 'warning');
    uploadedData = sampleData;
    detectColumns();
    displayUploadInfo();
    return;
  }
  
  const records = collectRDFRecords(xmlDoc);

  if (records.length === 0) {
    showToast('未能解析到有效RDF记录，使用示例数据', 'warning');
    uploadedData = sampleData;
  } else {
    uploadedData = records;
  }

  detectColumns();
  displayUploadInfo();
  showToast(`文件上传成功 (${fileFormat} 格式 - Zotero，共${records.length}条记录)`, 'success');
  addSuccessAnimation();
}

function getRDFNestedText(child, selectors) {
  if (!child || typeof child.querySelector !== 'function') {
    return '';
  }

  for (const selector of selectors) {
    const node = child.querySelector(selector);
    if (node && node.textContent) {
      const value = node.textContent.trim();
      if (value) {
        return value;
      }
    }
  }

  return '';
}

function getRDFChildValue(child) {
  if (!child) {
    return '';
  }

  return getRDFNestedText(child, ['rdf\\:value']) || String(child.textContent || '').trim();
}

function stripInlineHtmlTags(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ');
}

function sanitizeAbstractText(value) {
  let text = String(value || '').replace(/\u00a0/g, ' ').trim();
  if (!text) {
    return '';
  }

  text = stripInlineHtmlTags(text)
    .replace(/\s*更多\s*还原\s*AbstractFilter\([^)]*\)\s*$/i, '')
    .replace(/\s*AbstractFilter\([^)]*\)\s*$/i, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function looksLikeMetadataOnlyText(value) {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }

  const markers = [
    'foundation:',
    'download:',
    'album:',
    'CLC:',
    'dbcode:',
    'dbname:',
    'filename:',
    'publicationTag:',
    'CIF:',
    'AIF:',
    'original-container-title:',
    '_eprint:',
    'CNKICite:'
  ];

  const hitCount = markers.reduce((count, marker) => count + (text.includes(marker) ? 1 : 0), 0);
  return hitCount >= 2;
}

function getPreferredAbstractValue(row) {
  if (!row) return '';

  const candidates = [];
  const directValue = row.abstract;
  if (directValue !== undefined && directValue !== null) {
    candidates.push(directValue);
  }

  const mappedColumn = columnMapping.abstract;
  if (mappedColumn && mappedColumn !== 'abstract') {
    candidates.push(row[mappedColumn]);
  }

  for (const fallback of ['AB', 'dcterms:abstract', 'Abstract Note', 'Notes']) {
    candidates.push(row[fallback]);
  }

  for (const candidate of candidates) {
    const sanitized = sanitizeAbstractText(candidate);
    if (sanitized && !looksLikeMetadataOnlyText(sanitized)) {
      return sanitized;
    }
  }

  return '';
}

function getRDFJournalValue(child) {
  if (!child) {
    return '';
  }

  return getRDFNestedText(child, ['dc\\:title', 'dcterms\\:title']) || String(child.textContent || '').trim();
}

function enrichParsedRDFRecord(record) {
  const identifierRaw = String(record.identifier_raw || record.doi || '').trim();
  const title = String(record.title || '').trim();

  return {
    ...record,
    abstract: sanitizeAbstractText(record.abstract),
    identifier_raw: identifierRaw,
    _normalized_identifier: normalizeIdentifierForDedup(identifierRaw),
    _normalized_title: normalizeTitle(title)
  };
}

function parseRDFItem(item) {
  const record = {};

  const fieldMap = {
    'dc:title': 'title',
    'dcterms:title': 'title',
    'dc:creator': 'authors',
    'dcterms:creator': 'authors',
    'dcterms:issued': 'year',
    'dc:date': 'year',
    'prism:publicationDate': 'year',
    'prism:coverDate': 'year',
    'dcterms:abstract': 'abstract',
    'dc:description': 'description',
    'bib:publicationTitle': 'journal',
    'dc:source': 'journal',
    'dcterms:isPartOf': 'journal',
    'bib:volume': 'volume',
    'bib:issue': 'issue',
    'dc:identifier': 'doi',
    'bib:pages': 'pages',
    'z:itemType': 'publication_type',
    'z:language': 'language'
  };

  for (let child of item.children) {
    const tagName = child.tagName;
    const mappedField = fieldMap[tagName];

    if (mappedField) {
      let value = tagName === 'dcterms:isPartOf' ? getRDFJournalValue(child) : getRDFChildValue(child);

      if (mappedField === 'year') {
        const yearMatch = value.match(/\d{4}/);
        if (yearMatch) value = yearMatch[0];
      }

      if (mappedField === 'abstract') {
        value = sanitizeAbstractText(value);
      }

      if (mappedField === 'authors') {
        if (!record[mappedField]) {
          record[mappedField] = value;
        } else {
          record[mappedField] += '; ' + value;
        }
      } else if (mappedField === 'abstract') {
        if (value && (!record.abstract || value.length > record.abstract.length)) {
          record.abstract = value;
        }
      } else if (value) {
        record[mappedField] = value;
      }

      if (tagName === 'dc:identifier' && value && !record.identifier_raw) {
        record.identifier_raw = value;
        if (!record.doi && /(?:10\.\d{4,9}\/|doi\.org\/)/i.test(value)) {
          record.doi = value;
        }
      }
    }
  }

  for (let i = 0; i < item.attributes.length; i++) {
    const attr = item.attributes[i];
    if (attr.name === 'rdf:about') {
      record.id = attr.value;
    }
  }

  return enrichParsedRDFRecord(record);
}

function getRDFAttachmentUrl(item) {
  if (!item) {
    return '';
  }

  const fileType = getRDFNestedText(item, ['link\\:type']).toLowerCase();
  const attachmentTitle = getRDFNestedText(item, ['dc\\:title', 'dcterms\\:title']);
  const identifierNode = Array.from(item.children || []).find((child) => child.tagName === 'dc:identifier');
  const url = identifierNode ? getRDFChildValue(identifierNode) : '';

  if (!looksLikeHttpUrl(url)) {
    return '';
  }

  if (fileType.includes('pdf') || /\.pdf($|\?)/i.test(attachmentTitle) || /download\/order/i.test(url)) {
    return String(url).trim();
  }

  return '';
}

function collectRDFRecords(xmlDoc) {
  const records = [];
  const rootChildren = Array.from(xmlDoc?.documentElement?.children || []);
  let lastPrimaryRecord = null;

  rootChildren.forEach((item) => {
    const tagName = item.tagName;
    if (tagName === 'bib:Article' || tagName === 'bib:Book' || tagName === 'rdf:Description') {
      const record = parseRDFItem(item);
      if (record.title || record.authors) {
        records.push(record);
        lastPrimaryRecord = record;
      }
      return;
    }

    if (tagName === 'z:Attachment' && lastPrimaryRecord) {
      const attachmentUrl = getRDFAttachmentUrl(item);
      if (attachmentUrl) {
        lastPrimaryRecord.pdfUrl = lastPrimaryRecord.pdfUrl || attachmentUrl;
        lastPrimaryRecord.fulltextUrl = lastPrimaryRecord.fulltextUrl || attachmentUrl;
      }
    }
  });

  return records;
}

function parseTXT(text) {
  const lines = text.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    showToast('文本文件为空，使用示例数据', 'warning');
    uploadedData = sampleData;
  } else {
    // Try to detect if first line is header
    const possibleHeaders = ['title', 'abstract', 'year', 'author'];
    const firstLine = lines[0].toLowerCase();
    const hasHeader = possibleHeaders.some(h => firstLine.includes(h));

    if (hasHeader && lines.length > 1) {
      // Treat as simple delimited format
      const delimiter = firstLine.includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        if (values.length === headers.length) {
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx].trim();
          });
          data.push(row);
        }
      }
      uploadedData = data.length > 0 ? data : sampleData;
    } else {
      // Treat each line as a title
      uploadedData = lines.map((line, idx) => ({
        title: line,
        abstract: '',
        year: new Date().getFullYear(),
        journal: 'Unknown',
        authors: 'Unknown',
        doi: ''
      }));
    }
  }

  detectColumns();
  displayUploadInfo();
  showToast(`文件上传成功 (${fileFormat} 格式)`, 'success');
  addSuccessAnimation();
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Column detection
function detectColumns() {
  const aliases = {
    title: ['title', 'Title', 'TITLE', '题名', '标题', 'ti', 'T1', 'TI', 'dc:title', 'dcterms:title'],
    abstract: ['abstract', 'Abstract', 'ABSTRACT', '摘要', 'ab', 'AB', 'dcterms:abstract', 'dc:description', 'Abstract Note', 'Notes'],
    year: ['year', 'Year', 'YEAR', '年份', '出版年', 'publication_year', 'py', 'PY', 'dcterms:issued', 'dc:date', 'Publication Year'],
    journal: ['journal', 'Journal', 'JOURNAL', '期刊', '来源', 'source', 'so', 'T2', 'JO', 'bib:publicationTitle', 'dc:source', 'Publication Title'],
    authors: ['authors', 'Authors', 'AUTHORS', '作者', 'author', 'au', 'AU', 'dc:creator', 'dcterms:creator', 'Author'],
    doi: ['doi', 'DOI', 'Doi', 'DO', 'dc:identifier'],
    keywords: ['keywords', 'Keywords', 'KEYWORDS', '关键词', 'keyword', 'kw', 'KW', 'Manual Tags', 'Automatic Tags']
  };

  columnMapping = {};
  const availableColumns = Object.keys(uploadedData[0] || {});
  
  console.log('🔍 检测列名：可用列 =', availableColumns);

  for (const [standard, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      if (availableColumns.includes(alias)) {
        columnMapping[standard] = alias;
        console.log(`✅ 映射成功: ${standard} → ${alias}`);
        break;
      }
    }
    if (!columnMapping[standard]) {
      console.warn(`⚠️ 未找到字段: ${standard}`);
    }
  }
  
  console.log('最终 columnMapping:', columnMapping);
}

// Override legacy column detection so RDF metadata notes are not treated as abstracts.
function detectColumns() {
  const aliases = {
    title: ['title', 'Title', 'TITLE', 'é¢˜å', 'æ ‡é¢˜', 'ti', 'T1', 'TI', 'dc:title', 'dcterms:title'],
    abstract: ['abstract', 'Abstract', 'ABSTRACT', 'æ‘˜è¦', 'ab', 'AB', 'dcterms:abstract', 'Abstract Note', 'Notes'],
    year: ['year', 'Year', 'YEAR', 'å¹´ä»½', 'å‡ºç‰ˆå¹´', 'publication_year', 'py', 'PY', 'dcterms:issued', 'dc:date', 'Publication Year'],
    journal: ['journal', 'Journal', 'JOURNAL', 'æœŸåˆŠ', 'æ¥æº', 'source', 'so', 'T2', 'JO', 'bib:publicationTitle', 'dc:source', 'Publication Title'],
    authors: ['authors', 'Authors', 'AUTHORS', 'ä½œè€…', 'author', 'au', 'AU', 'dc:creator', 'dcterms:creator', 'Author'],
    doi: ['doi', 'DOI', 'Doi', 'DO', 'dc:identifier'],
    keywords: ['keywords', 'Keywords', 'KEYWORDS', 'å…³é”®è¯', 'keyword', 'kw', 'KW', 'Manual Tags', 'Automatic Tags']
  };

  columnMapping = {};
  const availableColumns = Object.keys(uploadedData[0] || {});

  console.log('ðŸ” æ£€æµ‹åˆ—åï¼šå¯ç”¨åˆ— =', availableColumns);

  for (const [standard, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      if (availableColumns.includes(alias)) {
        columnMapping[standard] = alias;
        console.log(`âœ… æ˜ å°„æˆåŠŸ: ${standard} â†’ ${alias}`);
        break;
      }
    }
    if (!columnMapping[standard]) {
      console.warn(`âš ï¸ æœªæ‰¾åˆ°å­—æ®µ: ${standard}`);
    }
  }

  console.log('æœ€ç»ˆ columnMapping:', columnMapping);
}

// Final column-detection override with encoding-safe aliases.
function detectColumns() {
  const aliases = {
    title: ['title', 'Title', 'TITLE', '\u9898\u540D', '\u6807\u9898', 'ti', 'T1', 'TI', 'dc:title', 'dcterms:title'],
    abstract: ['abstract', 'Abstract', 'ABSTRACT', '\u6458\u8981', 'ab', 'AB', 'dcterms:abstract', 'Abstract Note', 'Notes'],
    year: ['year', 'Year', 'YEAR', '\u5E74\u4EFD', '\u51FA\u7248\u5E74', 'publication_year', 'py', 'PY', 'dcterms:issued', 'dc:date', 'Publication Year'],
    journal: ['journal', 'Journal', 'JOURNAL', '\u671F\u520A', '\u6765\u6E90', 'source', 'so', 'T2', 'JO', 'bib:publicationTitle', 'dc:source', 'Publication Title'],
    authors: ['authors', 'Authors', 'AUTHORS', '\u4F5C\u8005', 'author', 'au', 'AU', 'dc:creator', 'dcterms:creator', 'Author'],
    doi: ['doi', 'DOI', 'Doi', 'DO', 'dc:identifier'],
    keywords: ['keywords', 'Keywords', 'KEYWORDS', '\u5173\u952E\u8BCD', 'keyword', 'kw', 'KW', 'Manual Tags', 'Automatic Tags']
  };

  columnMapping = {};
  const availableColumns = Object.keys(uploadedData[0] || {});

  console.log('Detect columns:', availableColumns);

  for (const [standard, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      if (availableColumns.includes(alias)) {
        columnMapping[standard] = alias;
        break;
      }
    }
  }

  console.log('columnMapping:', columnMapping);
}

// Display upload info
function displayUploadInfo() {
  document.getElementById('totalRecords').textContent = uploadedData.length;
  
  // v3.0: Display file sources
  if (uploadedFiles.length > 0) {
    // v4.0: Fixed format display for JSON and other formats
    fileFormat = uploadedFiles.map(f => {
      const fmt = f.format || 'unknown';
      return fmt.startsWith('.') ? fmt.substring(1).toUpperCase() : fmt.toUpperCase();
    }).join(' + ');
    formatSource = uploadedFiles.map(f => `${f.name} (${f.recordCount}条)`).join('; ');
    document.getElementById('fileFormat').textContent = fileFormat;
    document.getElementById('formatSource').textContent = formatSource;
  } else {
    document.getElementById('fileFormat').textContent = fileFormat || 'unknown';
    document.getElementById('formatSource').textContent = formatSource || 'Unknown';
  }
  
  const columns = Object.keys(uploadedData[0] || {});
  document.getElementById('columnList').textContent = columns.join(', ');
  document.getElementById('columnList').textContent = columns.join(', ');

  const mappingDiv = document.getElementById('columnMapping');
  const mappingEntries = Object.entries(columnMapping);
  if (mappingEntries.length > 0) {
    mappingDiv.innerHTML = mappingEntries
      .map(([std, col]) => `<div><strong>${std}</strong> → ${col}</div>`)
      .join('');
  } else {
    mappingDiv.innerHTML = '<div style="color: var(--color-warning);">未检测到标准字段映射，请在规则配置中确认</div>';
  }

  displayPreviewTable();
  document.getElementById('uploadInfo').classList.remove('hidden');
  renderSourceFileHistoryPanel();
}

function displayPreviewTable() {
  const table = document.getElementById('previewTable');
  const thead = document.getElementById('previewTableHead');
  const tbody = document.getElementById('previewTableBody');

  const columns = Object.keys(uploadedData[0] || {});
  thead.innerHTML = '<tr>' + columns.map(col => `<th>${col}</th>`).join('') + '</tr>';

  const preview = uploadedData.slice(0, 50);
  tbody.innerHTML = preview.map(row => 
    '<tr>' + columns.map(col => `<td>${truncate(row[col] || '', 50)}</td>`).join('') + '</tr>'
  ).join('');
}

function truncate(str, len) {
  str = String(str);
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// v1.4: Project persistence (per-project, no cross-project interference)
function getAuditActorContext() {
  const role = currentUserSession?.role || runtimeSession?.role || (isDualReviewMode ? `reviewer_${currentReviewer}` : 'owner');
  const actorId = currentUserSession?.username || runtimeSession?.username || role || 'system';

  return {
    actorId: String(actorId || 'system'),
    actorRole: String(role || 'system'),
  };
}

function getRecordAuditId(record, fallbackIndex) {
  const candidate = record && (
    record.record_id ||
    record.recordId ||
    record.id ||
    record._engine_record_id ||
    record.doi ||
    record.DOI ||
    record.DO ||
    record.title ||
    record.TI ||
    record.T1
  );

  if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
    return String(candidate).trim();
  }

  return `record-${Number.isFinite(fallbackIndex) ? fallbackIndex + 1 : Date.now()}`;
}

function ensureStableRecordAuditIds(records) {
  return (Array.isArray(records) ? records : []).map((record, index) => {
    if (!record || typeof record !== 'object') return record;
    const hasStableCandidate = Boolean(
      record.record_id ||
      record.recordId ||
      record.id ||
      record._engine_record_id ||
      record.doi ||
      record.DOI ||
      record.DO ||
      record.title ||
      record.TI ||
      record.T1
    );
    if (!hasStableCandidate) {
      record._engine_record_id = getRecordAuditId(record, index);
    }
    return record;
  });
}

function normalizeAuditExclusionReason(reason) {
  const value = String(reason || '').trim();
  const taxonomy = AUDIT_ENGINE?.EXCLUSION_REASONS || [];

  if (!value) return '';
  if (taxonomy.includes(value)) return value;

  const lower = value.toLowerCase();
  const mapped = {
    '人群不符': 'wrong_population',
    '干预不符': 'wrong_intervention_or_exposure',
    '对照不符': 'wrong_comparator',
    '缺乏结局': 'wrong_outcome',
    '数据不完整': 'not_full_text_available',
    '研究设计不合适': 'wrong_study_design',
    '重复文献': 'duplicate',
    duplicate: 'duplicate',
    duplicates: 'duplicate',
    language: 'non_target_language',
    year: 'outside_year_range',
  };

  return mapped[value] || mapped[lower] || 'other';
}

function ensureProjectManifest() {
  if (!AUDIT_ENGINE || typeof AUDIT_ENGINE.createProjectManifest !== 'function') {
    return null;
  }

  const projectId = currentProjectId || ensureProjectId();
  if (projectManifest && projectManifest.projectId === projectId) {
    return projectManifest;
  }

  projectManifest = AUDIT_ENGINE.createProjectManifest({
    ...(projectManifest || {}),
    projectId,
    projectName: projectManifest?.projectName || 'Untitled systematic review',
    reviewType: projectManifest?.reviewType || 'systematic_review',
    prismaVersion: 'PRISMA_2020',
    appVersion: 'v2.5',
    aiMode: projectManifest?.aiMode || 'off',
    dataSources: uploadedFiles.map((file) => file.source || file.name || file.format).filter(Boolean),
    settings: {
      ...(projectManifest?.settings || {}),
      workflowSteps: WORKFLOW_STEP_COUNT,
    },
  });

  return projectManifest;
}

function updateProjectManifestSafe(patch = {}, options = {}) {
  if (!AUDIT_ENGINE || typeof AUDIT_ENGINE.createProjectManifest !== 'function') {
    return null;
  }

  const { persist = true } = options;
  const current = ensureProjectManifest() || {};
  projectManifest = AUDIT_ENGINE.createProjectManifest({
    ...current,
    ...patch,
    projectId: ensureProjectId(),
    updatedAt: new Date().toISOString(),
  });

  if (persist) persistAuditState();
  return projectManifest;
}

function upsertAiUsageRegistrySafe(entryInput, options = {}) {
  if (!AUDIT_ENGINE || typeof AUDIT_ENGINE.upsertAiUsageRegistry !== 'function') {
    return [];
  }

  const { persist = true } = options;
  const manifest = ensureProjectManifest() || {};
  const registry = AUDIT_ENGINE.upsertAiUsageRegistry(manifest.aiUsageRegistry || [], {
    projectId: ensureProjectId(),
    aiMode: manifest.aiMode || 'off',
    ...entryInput,
  });
  updateProjectManifestSafe({ aiUsageRegistry: registry }, { persist });
  return registry;
}

function appendAiSuggestionEventsSafe(eventInputs, options = {}) {
  if (!AUDIT_ENGINE || typeof AUDIT_ENGINE.appendAiSuggestionEvent !== 'function') {
    return [];
  }

  const { persist = true } = options;
  ensureProjectManifest();
  const inputs = Array.isArray(eventInputs) ? eventInputs : [eventInputs];
  const normalizedInputs = inputs.filter(Boolean).map((eventInput) => ({
    projectId: ensureProjectId(),
    ...eventInput,
  }));

  if (normalizedInputs.length === 0) return aiSuggestionEvents;

  aiSuggestionEvents = AUDIT_ENGINE.appendAiSuggestionEvent(aiSuggestionEvents, normalizedInputs);
  if (persist) persistAuditState();
  return aiSuggestionEvents;
}

function updateAiSuggestionEventSafe(suggestionId, patch = {}, options = {}) {
  if (!AUDIT_ENGINE || typeof AUDIT_ENGINE.createAiSuggestionEvent !== 'function') {
    return null;
  }

  const { persist = true } = options;
  const index = aiSuggestionEvents.findIndex((entry) => String(entry?.suggestionId || '') === String(suggestionId || ''));
  if (index < 0) return null;

  const current = AUDIT_ENGINE.createAiSuggestionEvent(aiSuggestionEvents[index]);
  const next = AUDIT_ENGINE.createAiSuggestionEvent({
    ...current,
    ...patch,
    suggestionId: current.suggestionId,
    projectId: current.projectId || ensureProjectId(),
    createdAt: current.createdAt,
  });
  aiSuggestionEvents[index] = next;
  if (persist) persistAuditState();
  return next;
}

function getDefaultAiProviderConfig(aiMode = 'off') {
  const mode = String(aiMode || 'off').trim();
  return {
    providerId: 'default-ai-provider',
    providerType: mode === 'off' ? 'none' : 'local',
    providerName: mode === 'off' ? '' : 'local_mock_provider',
    modelName: mode === 'off' ? '' : 'mock-screening-assistant',
    allowedStages: ['title_abstract'],
    dataBoundary: 'local_only',
    apiKeyPresent: false,
    apiKeyStorage: 'not_configured',
    requestPolicy: 'disabled',
  };
}

function normalizeAiProviderConfigSafe(configInput = {}) {
  if (AI_PROVIDER_ENGINE && typeof AI_PROVIDER_ENGINE.normalizeProviderConfig === 'function') {
    return AI_PROVIDER_ENGINE.normalizeProviderConfig(configInput);
  }

  return {
    ...getDefaultAiProviderConfig(configInput.aiMode || 'off'),
    ...configInput,
    realProviderConnected: false,
  };
}

function getCurrentAiProviderConfig(aiMode) {
  const manifest = ensureProjectManifest() || {};
  const configured = manifest?.settings?.aiProviderConfig || {};
  return normalizeAiProviderConfigSafe({
    ...getDefaultAiProviderConfig(aiMode || manifest.aiMode || 'off'),
    ...configured,
  });
}

function getAiProviderControlValue(id, fallback = '') {
  if (typeof document === 'undefined') return fallback;
  const element = document.getElementById(id);
  return element ? String(element.value || '').trim() : fallback;
}

function getAiProviderCheckboxValue(id) {
  if (typeof document === 'undefined') return false;
  const element = document.getElementById(id);
  return Boolean(element && element.checked);
}

function buildAiProviderConfigFromControls() {
  const providerType = getAiProviderControlValue('aiProviderType', 'local');
  const allowedStages = ['title_abstract'];
  if (getAiProviderCheckboxValue('aiProviderStageFullText')) allowedStages.push('full_text');
  if (getAiProviderCheckboxValue('aiProviderStageQuality')) allowedStages.push('quality_appraisal');
  if (getAiProviderCheckboxValue('aiProviderStageReporting')) allowedStages.push('reporting');

  return normalizeAiProviderConfigSafe({
    providerId: 'default-ai-provider',
    providerType,
    providerName: getAiProviderControlValue('aiProviderName', providerType === 'local' ? 'local_mock_provider' : ''),
    modelName: getAiProviderControlValue('aiProviderModel', providerType === 'local' ? 'mock-screening-assistant' : ''),
    endpointUrl: getAiProviderControlValue('aiProviderEndpoint', ''),
    allowedStages,
    dataBoundary: getAiProviderControlValue('aiProviderDataBoundary', providerType === 'local' ? 'local_only' : 'hash_only'),
    apiKeyPresent: false,
    apiKeyStorage: 'not_configured',
    requestPolicy: 'disabled',
  });
}

function saveAiProviderConfig() {
  const config = buildAiProviderConfigFromControls();
  const manifest = ensureProjectManifest() || {};
  const settings = {
    ...(manifest.settings || {}),
    aiProviderConfig: config,
  };

  updateProjectManifestSafe({ settings }, { persist: false });
  upsertAiUsageRegistrySafe(buildAiUsageRegistryEntrySafe(manifest.aiMode || 'off', {
    enabledAt: new Date().toISOString(),
  }), { persist: false });
  appendAuditEventsSafe({
    eventType: 'ai_provider_config_updated',
    recordId: '',
    after: {
      providerType: config.providerType,
      providerName: config.providerName,
      modelName: config.modelName,
      endpointOrigin: config.endpointOrigin || '',
      allowedStages: config.allowedStages,
      dataBoundary: config.dataBoundary,
      requestPolicy: config.requestPolicy,
      realProviderConnected: config.realProviderConnected,
    },
    source: 'human',
  }, { persist: false });

  persistCurrentProjectState();
  renderAiProviderConfigPanel();
  renderAiSuggestionPanel();
  const toastLang = typeof getAiSuggestionPanelLang === 'function' ? getAiSuggestionPanelLang() : 'en';
  showToast(toastLang === 'zh'
    ? 'AI 服务边界已保存；真实服务请求仍然关闭'
    : 'AI provider boundary saved. Real API dispatch remains disabled.', 'success');
  return config;
}

function renderAiProviderConfigPanel() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('aiProviderConfigPanel');
  if (!container) return;

  const manifest = ensureProjectManifest() || {};
  const config = getCurrentAiProviderConfig(manifest.aiMode || 'off');
  const panelLang = getAiSuggestionPanelLang();
  const isZh = panelLang === 'zh';
  const providerOptions = [
    ['local', isZh ? '本地示例服务' : 'Local mock provider'],
    ['user_provided_endpoint', isZh ? '用户自带兼容服务（仅记录）' : 'User-provided OpenAI-compatible endpoint'],
    ['hosted', isZh ? '托管服务（仅记录）' : 'Hosted provider (record only)'],
  ].map(([value, label]) => `<option value="${value}" ${config.providerType === value ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('');
  const boundaryOptions = [
    ['local_only', isZh ? '仅本地' : 'Local only'],
    ['hash_only', isZh ? '仅记录摘要指纹和服务边界' : 'Hash and endpoint boundary only'],
    ['cloud_submitted', isZh ? '未来云端提交（当前仍关闭）' : 'Future cloud submission (currently disabled)'],
  ].map(([value, label]) => `<option value="${value}" ${config.dataBoundary === value ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('');
  const stageChecked = (stage) => config.allowedStages.includes(stage) ? 'checked' : '';

  container.innerHTML = `
    <details class="ai-provider-config-card">
      <summary>
        <span>${escapeHTML(isZh ? 'AI 服务边界记录' : 'AI Provider Configuration Record')}</span>
        <small>${escapeHTML(isZh ? '只保存边界，不保存密钥，不发送请求' : 'Boundary only. No API key storage. No dispatch.')}</small>
      </summary>
      <div class="ai-provider-config-grid">
        <label>
          <span>${escapeHTML(isZh ? '服务类型' : 'Provider type')}</span>
          <select id="aiProviderType">${providerOptions}</select>
        </label>
        <label>
          <span>${escapeHTML(isZh ? '服务名称' : 'Provider name')}</span>
          <input id="aiProviderName" type="text" value="${escapeHTML(config.providerName || '')}" placeholder="local_mock_provider">
        </label>
        <label>
          <span>${escapeHTML(isZh ? '模型名称' : 'Model name')}</span>
          <input id="aiProviderModel" type="text" value="${escapeHTML(config.modelName || '')}" placeholder="mock-screening-assistant">
        </label>
        <label>
          <span>${escapeHTML(isZh ? '服务地址（可选，仅记录脱敏边界）' : 'Endpoint URL (optional, redacted boundary only)')}</span>
          <input id="aiProviderEndpoint" type="url" value="${escapeHTML(config.endpointUrl || '')}" placeholder="https://api.example.com/v1/responses">
        </label>
        <label>
          <span>${escapeHTML(isZh ? '数据边界' : 'Data boundary')}</span>
          <select id="aiProviderDataBoundary">${boundaryOptions}</select>
        </label>
      </div>
      <fieldset class="ai-provider-stage-list">
        <legend>${escapeHTML(isZh ? '允许阶段（仅记录，不触发请求）' : 'Allowed stages (record only)')}</legend>
        <label><input type="checkbox" checked disabled> ${escapeHTML(isZh ? '标题摘要筛选' : 'Title and abstract')}</label>
        <label><input id="aiProviderStageFullText" type="checkbox" ${stageChecked('full_text')}> ${escapeHTML(isZh ? '全文复核' : 'Full text')}</label>
        <label><input id="aiProviderStageQuality" type="checkbox" ${stageChecked('quality_appraisal')}> ${escapeHTML(isZh ? '质量评价' : 'Quality appraisal')}</label>
        <label><input id="aiProviderStageReporting" type="checkbox" ${stageChecked('reporting')}> ${escapeHTML(isZh ? '报告辅助' : 'Reporting')}</label>
      </fieldset>
      <div class="ai-provider-safety-note">
        ${escapeHTML(isZh
          ? '当前请求策略固定为关闭；页面不提供密钥输入框，也不会把密钥写入导出文件。'
          : 'requestPolicy is fixed to disabled; API keys have no input field and are never written to exports.')}
      </div>
      <div class="button-group ai-provider-actions">
        <button type="button" class="btn btn-secondary" onclick="saveAiProviderConfig()">${escapeHTML(isZh ? '保存服务边界' : 'Save provider boundary')}</button>
      </div>
    </details>
  `;
}

function buildAiUsageRegistryEntrySafe(aiMode, context = {}) {
  const providerConfig = getCurrentAiProviderConfig(aiMode);
  if (AI_PROVIDER_ENGINE && typeof AI_PROVIDER_ENGINE.buildAuditRegistryEntry === 'function') {
    return AI_PROVIDER_ENGINE.buildAuditRegistryEntry(providerConfig, {
      usageId: 'default-ai-mode',
      projectId: ensureProjectId(),
      aiMode,
      userAcknowledged: aiMode === 'off',
      ...context,
    });
  }

  return {
    usageId: 'default-ai-mode',
    projectId: ensureProjectId(),
    aiMode,
    providerType: providerConfig.providerType,
    providerName: providerConfig.providerName,
    modelName: providerConfig.modelName,
    allowedStages: providerConfig.allowedStages || ['title_abstract'],
    dataBoundary: providerConfig.dataBoundary || 'local_only',
    userAcknowledged: aiMode === 'off',
    ...context,
  };
}

function buildAiSuggestionTraceSafe(record, stage = 'title_abstract') {
  const providerConfig = getCurrentAiProviderConfig('assistive');
  const recordId = getRecordAuditId(record, 0);
  const title = String(record?.title || record?.TI || record?.T1 || '').trim();
  const abstractText = String(record?.abstract || record?.AB || record?.N2 || '').trim();
  const fallbackTrace = {
    modelName: providerConfig.modelName || 'mock-screening-assistant',
    promptHash: `mock-prompt-title-abstract-v1`,
    inputHash: `mock-input-${recordId}`,
    inputSummary: title ? title.slice(0, 140) : `Record ${recordId}`,
    metadata: {
      providerConfig,
      providerSchemaVersion: 'ai-provider.fallback',
      requestStatus: 'not_dispatched',
      requestReason: 'provider_engine_unavailable',
      rawPayloadIncluded: false,
      realProviderConnected: false,
    },
  };

  if (AI_PROVIDER_ENGINE && typeof AI_PROVIDER_ENGINE.buildSuggestionTrace === 'function') {
    return AI_PROVIDER_ENGINE.buildSuggestionTrace({
      providerConfig,
      stage,
      prompt: {
        promptId: 'mock-title-abstract-screening',
        promptVersion: 'v1',
        template: 'Local mock heuristic for title and abstract screening. Output include, exclude, or uncertain for human confirmation only.',
      },
      input: {
        recordId,
        title,
        abstract: abstractText,
      },
    });
  }

  return fallbackTrace;
}

function ensureDefaultAiUsageRegistry(options = {}) {
  const manifest = ensureProjectManifest();
  if (!manifest) return [];
  if (Array.isArray(manifest.aiUsageRegistry) && manifest.aiUsageRegistry.length > 0) {
    return manifest.aiUsageRegistry;
  }

  return upsertAiUsageRegistrySafe(buildAiUsageRegistryEntrySafe(manifest.aiMode || 'off'), options);
}

function setAiModeSafe(nextMode, options = {}) {
  const mode = String(nextMode || 'off').trim();
  if (!AUDIT_ENGINE || !['off', 'assistive', 'experimental'].includes(mode)) {
    return ensureProjectManifest();
  }

  const manifest = updateProjectManifestSafe({ aiMode: mode }, options);
  upsertAiUsageRegistrySafe(buildAiUsageRegistryEntrySafe(mode, {
    enabledAt: manifest?.updatedAt || new Date().toISOString(),
    disabledAt: mode === 'off' ? manifest?.updatedAt || new Date().toISOString() : '',
  }), options);

  if (typeof appendAuditEventsSafe === 'function') {
    appendAuditEventsSafe({
      eventType: 'ai_mode_updated',
      recordId: '',
      after: {
        aiMode: mode,
      },
      source: 'human',
    }, { persist: false });
  }

  if (options.persist !== false) {
    persistCurrentProjectState();
  }

  return ensureProjectManifest();
}

function buildMockAiSuggestionForRecord(record, stage = 'title_abstract') {
  const recordId = getRecordAuditId(record, 0);
  const title = String(record?.title || record?.TI || record?.T1 || '').trim();
  const abstractText = String(record?.abstract || record?.AB || record?.N2 || '').trim();
  const combined = `${title}\n${abstractText}`.toLowerCase();
  const looksRelevant = /trial|cohort|random|systematic|meta|干预|研究|队列|随机/.test(combined);
  const suggestedDecision = looksRelevant ? 'include' : 'uncertain';
  const confidence = looksRelevant ? 0.74 : 0.41;
  const trace = buildAiSuggestionTraceSafe(record, stage);

  return {
    projectId: ensureProjectId(),
    recordId,
    stage,
    mode: 'suggest_only',
    modelName: trace.modelName || 'mock-screening-assistant',
    promptHash: trace.promptHash || 'mock-prompt-title-abstract-v1',
    inputHash: trace.inputHash || `mock-input-${recordId}`,
    inputSummary: trace.inputSummary || (title ? title.slice(0, 140) : `Record ${recordId}`),
    suggestedDecision,
    rationale: looksRelevant
      ? 'Mock pathway flagged study-like design terms and kept the record for human confirmation.'
      : 'Mock pathway could not find enough relevance signals and leaves the record for human confirmation.',
    confidence,
    humanAction: 'pending',
    metadata: {
      ...(trace.metadata || {}),
      mock: true,
      source: 'local_demo',
    },
  };
}

function buildConservativeAiSuggestionForRecord(record, stage = 'title_abstract', index = 0) {
  const criteria = filterRules || {};
  if (CONSERVATIVE_AI_ENGINE && typeof CONSERVATIVE_AI_ENGINE.buildConservativeSuggestionForRecord === 'function') {
    return CONSERVATIVE_AI_ENGINE.buildConservativeSuggestionForRecord(record, {
      projectId: ensureProjectId(),
      stage,
      criteria,
      index,
    });
  }

  const fallback = buildMockAiSuggestionForRecord(record, stage);
  return {
    ...fallback,
    metadata: {
      ...(fallback.metadata || {}),
      advisoryOnly: true,
      realProviderConnected: false,
      rawPayloadIncluded: false,
      priorityScore: 0.5,
      priorityReason: 'Fallback conservative advisory suggestion for human review only.',
      recommendedQueue: 'needs_human_attention',
      uncertaintyFlags: ['engine_unavailable_fallback'],
      riskFlags: [],
      criteriaMatches: [],
    },
  };
}

function getAiSuggestionIdentity(entry) {
  return [
    String(entry?.recordId || entry?.record_id || '').trim(),
    String(entry?.stage || 'title_abstract').trim(),
    String(entry?.modelName || entry?.model_name || '').trim(),
    String(entry?.promptHash || entry?.prompt_hash || '').trim(),
  ].join('::');
}

function hasAiSuggestionForIdentity(suggestionInput) {
  const identity = getAiSuggestionIdentity(suggestionInput);
  if (!identity || identity.startsWith('::')) return false;

  return aiSuggestionEvents.some((entry) => getAiSuggestionIdentity(entry) === identity);
}

function generateMockAiSuggestions(limit = 3) {
  if (!uploadedData || uploadedData.length === 0) {
    showToast('请先上传或加载示例数据，再生成本地示例 AI 建议', 'warning');
    return [];
  }

  const manifest = setAiModeSafe('assistive', { persist: false });
  const registry = ensureDefaultAiUsageRegistry({ persist: false });
  const selected = uploadedData.slice(0, Math.max(1, limit));
  const candidates = selected.map((record) => buildMockAiSuggestionForRecord(record, 'title_abstract'));
  const suggestions = candidates.filter((suggestion) => !hasAiSuggestionForIdentity(suggestion));
  const skippedCount = candidates.length - suggestions.length;

  if (suggestions.length > 0) {
    appendAiSuggestionEventsSafe(suggestions, { persist: false });
  }

  appendAuditEventsSafe({
    eventType: 'ai_suggestion_generated',
    recordId: '',
    after: {
      suggestionCount: suggestions.length,
      skippedExistingSuggestionCount: skippedCount,
      aiMode: manifest?.aiMode || 'assistive',
    },
    source: 'system',
    metadata: {
      mock: true,
      registryCount: registry.length,
    },
  }, { persist: false });

  persistCurrentProjectState();
  renderAiSuggestionPanel();
  const skippedMessage = skippedCount > 0 ? `，跳过 ${skippedCount} 条已有建议` : '';
  const toastType = suggestions.length > 0 ? 'success' : 'info';
  showToast(`已生成 ${suggestions.length} 条本地示例 AI 建议${skippedMessage}，仍需人工确认`, toastType);
  return suggestions;
}

function generateConservativeAiSuggestions(limit = 5) {
  if (!uploadedData || uploadedData.length === 0) {
    showToast('请先上传或加载示例数据，再生成 V2.6 保守 AI 建议', 'warning');
    return [];
  }

  const manifest = setAiModeSafe('assistive', { persist: false });
  const registry = ensureDefaultAiUsageRegistry({ persist: false });
  const selected = uploadedData.slice(0, Math.max(1, limit));
  const candidates = selected.map((record, index) => buildConservativeAiSuggestionForRecord(record, 'title_abstract', index));
  const suggestions = candidates.filter((suggestion) => !hasAiSuggestionForIdentity(suggestion));
  const skippedCount = candidates.length - suggestions.length;

  if (suggestions.length > 0) {
    appendAiSuggestionEventsSafe(suggestions, { persist: false });
  }

  appendAuditEventsSafe({
    eventType: 'ai_suggestion_generated',
    recordId: '',
    after: {
      suggestionCount: suggestions.length,
      skippedExistingSuggestionCount: skippedCount,
      aiMode: manifest?.aiMode || 'assistive',
      generator: 'v2_6_conservative_ai',
    },
    source: 'system',
    metadata: {
      advisoryOnly: true,
      realProviderConnected: false,
      registryCount: registry.length,
    },
  }, { persist: false });

  persistCurrentProjectState();
  renderConservativeAiQueuePanel();
  renderAiSuggestionPanel();
  const skippedMessage = skippedCount > 0 ? `，跳过 ${skippedCount} 条已有建议` : '';
  const toastType = suggestions.length > 0 ? 'success' : 'info';
  showToast(`已生成 ${suggestions.length} 条 V2.6 保守 AI 建议${skippedMessage}，仍需人工确认`, toastType);
  return suggestions;
}

function setConservativeAiQueueFilter(nextFilter = 'all') {
  const allowed = new Set([
    'all',
    'likely_relevant',
    'needs_human_attention',
    'needs_human_exclusion_check',
  ]);
  conservativeAiQueueFilter = allowed.has(String(nextFilter || '').trim())
    ? String(nextFilter || '').trim()
    : 'all';
  renderConservativeAiQueuePanel();
  return conservativeAiQueueFilter;
}

function setConservativeAiQueueSortMode(mode = 'original') {
  conservativeAiQueueSortMode = String(mode || '').trim() === 'priority' ? 'priority' : 'original';
  renderConservativeAiQueuePanel();
  return conservativeAiQueueSortMode;
}

function getSortedConservativeAiQueueEntries(entries) {
  const list = Array.isArray(entries) ? [...entries] : [];
  if (conservativeAiQueueSortMode !== 'priority') return list;

  return list.sort((left, right) => {
    const leftScore = Number(left?.metadata?.priorityScore ?? Number.NEGATIVE_INFINITY);
    const rightScore = Number(right?.metadata?.priorityScore ?? Number.NEGATIVE_INFINITY);
    return rightScore - leftScore;
  });
}

function setConservativeAiQueueContext(recordId) {
  const normalizedRecordId = String(recordId || '').trim();
  const advisoryEntries = Array.isArray(aiSuggestionEvents) ? aiSuggestionEvents : [];

  const matchingEntry = normalizedRecordId
    ? [...advisoryEntries].reverse().find((entry) => {
        const entryRecordId = String(entry?.recordId || entry?.record_id || '').trim();
        const stage = String(entry?.stage || '').trim();
        return entryRecordId === normalizedRecordId && stage === 'title_abstract' && entry?.metadata?.advisoryOnly === true;
      }) || null
    : null;

  currentConservativeAiQueueContext = matchingEntry
    ? {
        recordId: normalizedRecordId,
        title: String(matchingEntry.inputSummary || matchingEntry.recordTitle || matchingEntry.recordId || normalizedRecordId),
        recommendedQueue: String(matchingEntry?.metadata?.recommendedQueue || '').trim(),
        priorityScore: matchingEntry?.metadata?.priorityScore ?? null,
        uncertaintyFlags: Array.isArray(matchingEntry?.metadata?.uncertaintyFlags) ? matchingEntry.metadata.uncertaintyFlags : [],
      }
    : null;

  renderConservativeAiStep4ContextBanner();
  return currentConservativeAiQueueContext;
}

function clearConservativeAiQueueContext() {
  currentConservativeAiQueueContext = null;
  renderConservativeAiStep4ContextBanner();
  return currentConservativeAiQueueContext;
}

function renderConservativeAiStep4ContextBanner() {
  const container = document.getElementById('conservativeAiStep4ContextBanner');
  if (!container) return;

  if (!currentConservativeAiQueueContext) {
    container.innerHTML = '';
    return;
  }

  const context = currentConservativeAiQueueContext;
  const uncertaintyFlags = Array.isArray(context.uncertaintyFlags) && context.uncertaintyFlags.length > 0
    ? context.uncertaintyFlags.join(', ')
    : '-';

  container.innerHTML = `
    <div class="info-box workspace-info-panel" style="margin-bottom: 20px; border-left-color: var(--color-warning);">
      <h3><span class="zh">V2.6 保守 AI 承接上下文</span><span class="en">V2.6 Conservative AI Handoff</span></h3>
      <p>
        <span class="zh">当前聚焦记录来自 Step 3 advisory queue，仅作为人工全文复核的上下文提示，不会自动改写最终决定。</span>
        <span class="en">The current record came from the Step 3 advisory queue. This banner is context only and does not automatically rewrite the final decision.</span>
      </p>
      <div class="grid grid-3" style="gap: var(--space-12); margin-top: 12px;">
        <div class="surface-panel" style="padding: 12px;">
          <div class="muted-text"><span class="zh">建议队列</span><span class="en">Recommended queue</span></div>
          <strong>${escapeHTML(getConservativeAiQueueLabel(context.recommendedQueue))}</strong>
        </div>
        <div class="surface-panel" style="padding: 12px;">
          <div class="muted-text"><span class="zh">优先级分数</span><span class="en">Priority score</span></div>
          <strong>${escapeHTML(String(context.priorityScore ?? '-'))}</strong>
        </div>
        <div class="surface-panel" style="padding: 12px;">
          <div class="muted-text"><span class="zh">不确定性标记</span><span class="en">Uncertainty flags</span></div>
          <strong>${escapeHTML(uncertaintyFlags)}</strong>
        </div>
      </div>
      <div class="muted-text" style="margin-top: 12px;">${escapeHTML(context.title || context.recordId || '')}</div>
    </div>
  `;
}

function focusFulltextReviewRecord(recordId) {
  const normalizedRecordId = String(recordId || '').trim();
  if (!normalizedRecordId || !screeningResults || !Array.isArray(screeningResults.included)) return false;

  const recordIndex = getAuditRecordIndexMap(screeningResults.included).get(normalizedRecordId);
  if (!Number.isFinite(recordIndex)) return false;

  const row = document.getElementById(`fulltext-review-row-${recordIndex}`);
  const select = document.getElementById(`exclude-${recordIndex}`);

  if (row && typeof row.scrollIntoView === 'function') {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (select && typeof select.focus === 'function') {
    select.focus();
  }

  return Boolean(row || select);
}

function openConservativeAiQueueRecord(recordId) {
  if (!String(recordId || '').trim()) return false;
  setConservativeAiQueueContext(recordId);
  goToStep4({ preserveQueueContext: true });
  return focusFulltextReviewRecord(recordId);
}

function getAiSuggestionById(suggestionId) {
  return aiSuggestionEvents.find((entry) => String(entry?.suggestionId || '') === String(suggestionId || '')) || null;
}

function normalizeAiHumanDecision(decision) {
  const normalized = String(decision || '').trim().toLowerCase();
  return ['include', 'exclude', 'uncertain'].includes(normalized) ? normalized : '';
}

function getAiSuggestionControlId(suggestionId, controlName) {
  const safeId = String(suggestionId || '').replace(/[^a-z0-9_-]/gi, '_') || 'unknown';
  return `ai-suggestion-${controlName}-${safeId}`;
}

function toggleAiSuggestionEditReason(suggestionId) {
  const decisionSelect = document.getElementById(getAiSuggestionControlId(suggestionId, 'edit-decision'));
  const reasonWrapper = document.getElementById(getAiSuggestionControlId(suggestionId, 'edit-reason-wrapper'));
  const reasonSelect = document.getElementById(getAiSuggestionControlId(suggestionId, 'edit-reason'));
  const isExclude = decisionSelect?.value === 'exclude';

  if (reasonWrapper) reasonWrapper.hidden = !isExclude;
  if (reasonSelect) reasonSelect.disabled = !isExclude;
}

const AI_SUGGESTION_STAGE_LABELS = Object.freeze({
  title_abstract: { zh: '标题摘要筛选', en: 'Title and abstract' },
  full_text: { zh: '全文复核', en: 'Full text' },
  quality_appraisal: { zh: '质量评价', en: 'Quality appraisal' },
});

const AI_SUGGESTION_DECISION_LABELS = Object.freeze({
  include: { zh: '纳入', en: 'include' },
  exclude: { zh: '排除', en: 'exclude' },
  uncertain: { zh: '暂不确定', en: 'uncertain' },
});

const AI_SUGGESTION_ACTION_LABELS = Object.freeze({
  pending: { zh: '待人工确认', en: 'pending' },
  accepted: { zh: '已接受', en: 'accepted' },
  rejected: { zh: '已拒绝', en: 'rejected' },
  edited: { zh: '已改写', en: 'edited' },
  ignored: { zh: '已忽略', en: 'ignored' },
});

const AI_SUGGESTION_RATIONALE_LABELS = Object.freeze({
  'Mock pathway flagged study-like design terms and kept the record for human confirmation.': {
    zh: '本地示例规则识别到研究设计相关线索，建议保留给人工确认。',
    en: 'Mock pathway flagged study-like design terms and kept the record for human confirmation.',
  },
  'Mock pathway could not find enough relevance signals and leaves the record for human confirmation.': {
    zh: '本地示例规则未找到足够相关线索，因此交由人工继续判断。',
    en: 'Mock pathway could not find enough relevance signals and leaves the record for human confirmation.',
  },
});

const CONSERVATIVE_AI_QUEUE_LABELS = Object.freeze({
  likely_relevant: { zh: '优先保留', en: 'Likely relevant' },
  needs_human_attention: { zh: '需要人工关注', en: 'Needs human attention' },
  needs_human_exclusion_check: { zh: '需要重点排除核查', en: 'Needs human exclusion check' },
});

function getAiSuggestionPanelLang() {
  return typeof document !== 'undefined' && document.documentElement?.lang === 'en' ? 'en' : 'zh';
}

function getAiSuggestionLocalizedLabel(labels, key, fallback = '') {
  const lang = getAiSuggestionPanelLang();
  const normalized = String(key || '').trim();
  return labels?.[normalized]?.[lang] || labels?.[normalized]?.en || fallback || normalized;
}

function getAiSuggestionStageLabel(stage) {
  return getAiSuggestionLocalizedLabel(AI_SUGGESTION_STAGE_LABELS, stage, stage || 'title_abstract');
}

function getAiSuggestionDecisionLabel(decision) {
  return getAiSuggestionLocalizedLabel(AI_SUGGESTION_DECISION_LABELS, decision, decision || 'uncertain');
}

function getAiSuggestionActionLabel(action) {
  return getAiSuggestionLocalizedLabel(AI_SUGGESTION_ACTION_LABELS, action, action || 'pending');
}

function getAiSuggestionRationaleText(entry) {
  const rationale = String(entry?.rationale || '').trim();
  return getAiSuggestionLocalizedLabel(AI_SUGGESTION_RATIONALE_LABELS, rationale, rationale);
}

function getConservativeAiQueueLabel(queueKey) {
  return getAiSuggestionLocalizedLabel(CONSERVATIVE_AI_QUEUE_LABELS, queueKey, queueKey || '-');
}

function getConservativeAiQueueSummary(entries) {
  const summary = {
    total: 0,
    pending: 0,
    reviewed: 0,
    buckets: {
      likely_relevant: 0,
      needs_human_attention: 0,
      needs_human_exclusion_check: 0,
    },
  };

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    summary.total += 1;
    const action = String(entry?.humanAction || entry?.human_action || 'pending').trim();
    if (!action || action === 'pending') {
      summary.pending += 1;
    } else {
      summary.reviewed += 1;
    }

    const bucketKey = String(entry?.metadata?.recommendedQueue || '').trim();
    if (Object.prototype.hasOwnProperty.call(summary.buckets, bucketKey)) {
      summary.buckets[bucketKey] += 1;
    }
  });

  return summary;
}

function applyAiSuggestionPanelLangVisibility() {
  if (typeof applyLangVisibility === 'function') {
    applyLangVisibility();
  }
}

function buildHumanConfirmedDecisionFromSuggestion(suggestion, overrideDecision, options = {}) {
  const normalizedDecision = normalizeAiHumanDecision(overrideDecision || suggestion?.suggestedDecision) || 'uncertain';
  const originalExclusionReason = String(options.exclusionReason || options.exclusion_reason || '').trim();
  const exclusionReason = normalizedDecision === 'exclude'
    ? normalizeAuditExclusionReason(originalExclusionReason)
    : '';
  const record = uploadedData.find((entry, index) => getRecordAuditId(entry, index) === suggestion.recordId) || null;
  const actor = getAuditActorContext();

  return upsertScreeningDecisionSafe({
    recordId: suggestion.recordId,
    stage: suggestion.stage || 'title_abstract',
    decision: normalizedDecision,
    exclusionReason,
    reviewerId: `${actor.actorId}_ai_confirmed`,
    sourceFile: record?._sourceFile || '',
    sourceDatabase: record?._source || '',
    source: 'human_ai_confirmation',
    aiAssistanceUsed: true,
    aiModel: suggestion.modelName || 'mock-screening-assistant',
    aiPromptHash: suggestion.promptHash || '',
    aiOutputSummary: suggestion.rationale || '',
    notes: options.notes || `Human confirmation from AI suggestion ${suggestion.suggestionId}`,
    metadata: {
      aiSuggestionId: suggestion.suggestionId,
      mock: suggestion.metadata?.mock === true,
      humanEditedDecision: options.humanEditedDecision || '',
      originalExclusionReason: normalizedDecision === 'exclude' ? originalExclusionReason : '',
    },
  }, { persist: false });
}

function acceptAiSuggestion(suggestionId) {
  const suggestion = getAiSuggestionById(suggestionId);
  if (!suggestion) {
    showToast('未找到对应的 AI 建议', 'warning');
    return;
  }

  const decision = buildHumanConfirmedDecisionFromSuggestion(suggestion, suggestion.suggestedDecision);
  const reviewedAt = new Date().toISOString();
  updateAiSuggestionEventSafe(suggestionId, {
    humanAction: 'accepted',
    linkedDecisionId: decision?.decisionId || '',
    metadata: {
      ...(suggestion.metadata || {}),
      reviewedAt,
      reviewNote: 'Human accepted AI suggestion and created a linked ScreeningDecision.',
    },
  }, { persist: false });
  appendAuditEventsSafe({
    eventType: 'ai_suggestion_reviewed',
    recordId: suggestion.recordId,
    after: {
      suggestionId,
      humanAction: 'accepted',
      linkedDecisionId: decision?.decisionId || '',
      reviewedAt,
    },
    source: 'human',
  }, { persist: false });
  persistCurrentProjectState();
  renderConservativeAiQueuePanel();
  renderAiSuggestionPanel();
  showToast('已接受 AI 建议，并生成对应的人类确认 decision', 'success');
}

function rejectAiSuggestion(suggestionId) {
  const suggestion = getAiSuggestionById(suggestionId);
  if (!suggestion) {
    showToast('未找到对应的 AI 建议', 'warning');
    return;
  }

  const reviewedAt = new Date().toISOString();
  updateAiSuggestionEventSafe(suggestionId, {
    humanAction: 'rejected',
    linkedDecisionId: '',
    metadata: {
      ...(suggestion.metadata || {}),
      reviewedAt,
      reviewNote: 'Human rejected AI suggestion; no ScreeningDecision was created from this suggestion.',
    },
  }, { persist: false });
  appendAuditEventsSafe({
    eventType: 'ai_suggestion_reviewed',
    recordId: suggestion.recordId,
    after: {
      suggestionId,
      humanAction: 'rejected',
      linkedDecisionId: '',
      reviewedAt,
    },
    source: 'human',
  }, { persist: false });
  persistCurrentProjectState();
  renderAiSuggestionPanel();
  showToast('已拒绝 AI 建议，未改动最终筛选 decision', 'info');
}

function editAiSuggestion(suggestionId, editedDecision, exclusionReason = '') {
  const suggestion = getAiSuggestionById(suggestionId);
  if (!suggestion) {
    showToast('未找到对应的 AI 建议', 'warning');
    return;
  }

  const normalizedDecision = normalizeAiHumanDecision(editedDecision);
  if (!normalizedDecision) {
    showToast('请选择纳入、排除或暂不确定后再改写', 'warning');
    return;
  }

  const originalExclusionReason = String(exclusionReason || '').trim();
  if (normalizedDecision === 'exclude' && !originalExclusionReason) {
    showToast('请选择排除理由后再改写为排除', 'warning');
    return;
  }

  const normalizedExclusionReason = normalizedDecision === 'exclude'
    ? normalizeAuditExclusionReason(originalExclusionReason)
    : '';
  const decision = buildHumanConfirmedDecisionFromSuggestion(suggestion, normalizedDecision, {
    exclusionReason: originalExclusionReason,
    humanEditedDecision: normalizedDecision,
    notes: normalizedDecision === 'exclude'
      ? `Human-edited AI suggestion ${suggestion.suggestionId}; exclusion reason: ${normalizedExclusionReason}`
      : `Human-edited AI suggestion ${suggestion.suggestionId}`,
  });
  const reviewedAt = new Date().toISOString();
  updateAiSuggestionEventSafe(suggestionId, {
    humanAction: 'edited',
    linkedDecisionId: decision?.decisionId || '',
    metadata: {
      ...(suggestion.metadata || {}),
      reviewedAt,
      humanEditedDecision: normalizedDecision,
      humanEditedExclusionReason: normalizedExclusionReason,
      humanEditedOriginalExclusionReason: normalizedDecision === 'exclude' ? originalExclusionReason : '',
      reviewNote: 'Human rewrote AI suggestion and created a linked ScreeningDecision.',
    },
  }, { persist: false });
  appendAuditEventsSafe({
    eventType: 'ai_suggestion_reviewed',
    recordId: suggestion.recordId,
    after: {
      suggestionId,
      humanAction: 'edited',
      linkedDecisionId: decision?.decisionId || '',
      reviewedAt,
      editedDecision: normalizedDecision,
      exclusionReason: normalizedExclusionReason,
      originalExclusionReason: normalizedDecision === 'exclude' ? originalExclusionReason : '',
    },
    reason: normalizedExclusionReason,
    source: 'human',
  }, { persist: false });
  persistCurrentProjectState();
  renderAiSuggestionPanel();
  showToast(`已改写 AI 建议，并按人工决定记录为 ${normalizedDecision}`, 'success');
}

function persistAuditState() {
  if (typeof localStorage === 'undefined' || !currentProjectId) return;

  try {
    const storageKey = getProjectStorageKey(currentProjectId);
    const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
    localStorage.setItem(storageKey, JSON.stringify({
      ...existing,
      projectManifest,
      auditEvents,
      screeningDecisions,
      aiSuggestionEvents,
      projectHistory,
    }));
  } catch (error) {
    console.warn('Failed to persist audit state:', error);
  }
}

function appendAuditEventsSafe(eventInputs, options = {}) {
  if (!AUDIT_ENGINE || typeof AUDIT_ENGINE.appendAuditEvent !== 'function') {
    return [];
  }

  const { persist = true } = options;
  const projectId = ensureProjectId();
  const actor = getAuditActorContext();
  ensureProjectManifest();
  const inputs = Array.isArray(eventInputs) ? eventInputs : [eventInputs];
  const normalizedInputs = inputs.filter(Boolean).map((eventInput) => ({
    projectId,
    ...actor,
    ...eventInput,
  }));

  if (normalizedInputs.length === 0) return auditEvents;

  auditEvents = AUDIT_ENGINE.appendAuditEvent(auditEvents, normalizedInputs);
  if (persist) persistAuditState();
  return auditEvents;
}

function upsertScreeningDecisionSafe(decisionInput, options = {}) {
  if (!AUDIT_ENGINE || typeof AUDIT_ENGINE.createScreeningDecision !== 'function') {
    return null;
  }

  const { persist = true } = options;
  const projectId = ensureProjectId();
  const actor = getAuditActorContext();
  ensureProjectManifest();
  const input = {
    projectId,
    reviewerId: actor.actorId || decisionInput?.reviewerId || 'system',
    ...decisionInput,
  };
  const recordId = String(input.recordId || '').trim();
  const stage = String(input.stage || 'title_abstract').trim();
  const reviewerId = String(input.reviewerId || 'system').trim();
  const existingIndex = screeningDecisions.findIndex((decision) => (
    decision.recordId === recordId &&
    decision.stage === stage &&
    decision.reviewerId === reviewerId
  ));
  const decision = existingIndex >= 0
    ? AUDIT_ENGINE.updateScreeningDecision(screeningDecisions[existingIndex], input)
    : AUDIT_ENGINE.createScreeningDecision(input);

  if (existingIndex >= 0) {
    screeningDecisions[existingIndex] = decision;
  } else {
    screeningDecisions.push(decision);
  }

  if (persist) persistAuditState();
  return decision;
}

function generateProjectId() {
  try {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch (_) {}
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getProjectStorageKey(projectId) {
  return `prisma_project_${projectId}`;
}

function ensureProjectId() {
  if (currentProjectId) return currentProjectId;

  const sessionProjectId = runtimeSession && typeof runtimeSession.projectId === 'string'
    ? runtimeSession.projectId.trim()
    : '';
  if (sessionProjectId) {
    currentProjectId = sessionProjectId;
    localStorage.setItem('prisma_current_project_id', currentProjectId);
    return currentProjectId;
  }

  const savedId = localStorage.getItem('prisma_current_project_id');
  if (savedId) {
    currentProjectId = savedId;
    return currentProjectId;
  }
  currentProjectId = generateProjectId();
  localStorage.setItem('prisma_current_project_id', currentProjectId);
  return currentProjectId;
}

function startNewProjectSession(options = {}) {
  const sessionProjectId = runtimeSession && typeof runtimeSession.projectId === 'string'
    ? runtimeSession.projectId.trim()
    : '';
  currentProjectId = sessionProjectId || currentProjectId || generateProjectId();
  localStorage.setItem('prisma_current_project_id', currentProjectId);

  // Reset project-scoped pieces
  uploadedData = [];
  uploadedFiles = [];
  columnMapping = {};
  fileFormat = 'unknown';
  formatSource = 'Unknown';
  exclusionReasons = [...DEFAULT_EXCLUSION_REASONS];
  filterRules = null;
  screeningResults = null;
  currentStep = 1;
  qualityAssessments = [];
  importJobs = [];
  auditEvents = [];
  screeningDecisions = [];
  aiSuggestionEvents = [];
  projectHistory = Array.isArray(options.projectHistory) ? options.projectHistory : [];
  dualReviewResults = { A: {}, B: {}, final: {} };
  dualReviewConflictState = getEmptyDualReviewConflictState();
  projectManifest = null;
  ensureProjectManifest();
  ensureDefaultAiUsageRegistry({ persist: false });

  persistCurrentProjectState();
  renderExclusionTemplateButtons();
  renderExclusionTemplateEditor();
  renderImportJobShell();
  renderQualityAssessmentShell();
  renderAiProviderConfigPanel();
  renderAiSuggestionPanel();
  updateStep4EntryLock();
}

function buildCurrentProjectHistoryState() {
  return {
    uploadedData,
    uploadedFiles,
    screeningResults,
    columnMapping,
    fileFormat,
    formatSource,
    currentStep,
    filterRules,
    exclusionReasons,
    qualityAssessments,
    importJobs,
    projectManifest: ensureProjectManifest(),
    auditEvents,
    screeningDecisions,
    aiSuggestionEvents,
    projectHistory,
    dualReviewResults,
    dualReviewConflictState,
  };
}

function createProjectHistorySnapshot(reason, label, options = {}) {
  if (!PROJECT_HISTORY_ENGINE || typeof PROJECT_HISTORY_ENGINE.addProjectSnapshot !== 'function') return null;
  const beforeLength = projectHistory.length;
  projectHistory = PROJECT_HISTORY_ENGINE.addProjectSnapshot(projectHistory, buildCurrentProjectHistoryState(), {
    reason,
    label,
    limit: 20,
    ...options,
  });
  const snapshot = projectHistory[0] || null;
  if (snapshot && projectHistory.length !== beforeLength) {
    appendAuditEventsSafe({
      eventType: 'project_snapshot_created',
      recordId: '',
      after: {
        snapshotId: snapshot.snapshot_id,
        reason: snapshot.reason,
        label: snapshot.label,
        step: snapshot.step,
        recordCount: snapshot.record_count,
      },
      source: 'human',
    }, { persist: false });
  }
  return snapshot;
}

function persistCurrentProjectState() {
  const projectId = ensureProjectId();
  const snapshot = {
    version: APP_RELEASE_VERSION,
    timestamp: new Date().toISOString(),
    projectId,
    uploadedData,
    uploadedFiles,
    screeningResults,
    columnMapping,
    fileFormat,
    formatSource,
    currentStep,
    filterRules,
    exclusionReasons,
    qualityAssessments,
    importJobs,
    projectManifest: ensureProjectManifest(),
    auditEvents,
    screeningDecisions,
    aiSuggestionEvents,
    projectHistory,
    dualReviewResults,
    dualReviewConflictState,
  };
  try {
    localStorage.setItem(getProjectStorageKey(projectId), JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Failed to persist project state:', e);
  }

  if (currentUserSession && projectData) {
    saveProjectData();
  }
}

function restoreProjectState(snapshot) {
  uploadedData = snapshot.uploadedData || [];
  uploadedFiles = snapshot.uploadedFiles || [];
  screeningResults = snapshot.screeningResults || null;
  columnMapping = snapshot.columnMapping || {};
  fileFormat = snapshot.fileFormat || 'unknown';
  formatSource = snapshot.formatSource || 'Unknown';
  currentStep = snapshot.currentStep || 1;
  filterRules = snapshot.filterRules || null;
  qualityAssessments = normalizeQualityAssessmentsState(snapshot.qualityAssessments || []);
  importJobs = normalizeImportJobsState(snapshot.importJobs || []);
  projectManifest = snapshot.projectManifest || null;
  auditEvents = Array.isArray(snapshot.auditEvents) ? snapshot.auditEvents : [];
  screeningDecisions = Array.isArray(snapshot.screeningDecisions) ? snapshot.screeningDecisions : [];
  aiSuggestionEvents = Array.isArray(snapshot.aiSuggestionEvents) ? snapshot.aiSuggestionEvents : [];
  conservativeAiQueueFilter = 'all';
  currentConservativeAiQueueContext = null;
  projectHistory = Array.isArray(snapshot.projectHistory) ? snapshot.projectHistory : [];
  dualReviewResults = snapshot.dualReviewResults || dualReviewResults || { A: {}, B: {}, final: {} };
  dualReviewConflictState = {
    ...getEmptyDualReviewConflictState(),
    ...(snapshot.dualReviewConflictState || dualReviewConflictState || {}),
  };
  ensureProjectManifest();
  ensureDefaultAiUsageRegistry({ persist: false });

  // v1.4: template
  if (Array.isArray(snapshot.exclusionReasons) && snapshot.exclusionReasons.length > 0) {
    exclusionReasons = snapshot.exclusionReasons.map(s => String(s)).filter(Boolean);
  } else {
    exclusionReasons = [...DEFAULT_EXCLUSION_REASONS];
  }

  renderImportJobShell();
  renderQualityAssessmentShell();
  renderProjectHistoryPanel();
  renderSourceFileHistoryPanel();
  renderConservativeAiQueuePanel();
  renderConservativeAiStep4ContextBanner();
  renderAiProviderConfigPanel();
  renderAiSuggestionPanel();
}

function renderAiSuggestionPanel() {
  const container = document.getElementById('aiSuggestionPanel');
  if (!container) return;
  const panelLang = getAiSuggestionPanelLang();
  const chooseDecisionText = panelLang === 'zh' ? '请选择' : 'Choose';
  const chooseReasonText = panelLang === 'zh' ? '请选择排除理由' : 'Choose a reason';
  const decisionOptions = ['include', 'exclude', 'uncertain']
    .map((decision) => `<option value="${decision}">${escapeHTML(getAiSuggestionDecisionLabel(decision))}</option>`)
    .join('');
  const ui = panelLang === 'zh'
    ? {
        totalSuggestions: '建议总数',
        pending: '待确认',
        reviewed: '已复核',
        linkedHumanDecisions: '关联人工决定',
        advisoryOnlyReviews: '仅建议日志',
        summaryNote: '待确认、已拒绝或已忽略的 AI 建议不会直接进入 PRISMA 计数；只有关联的人工筛选决定会影响最终计数。',
        empty: '当前还没有 AI 建议。可以先生成本地示例建议，再由人工接受、拒绝或改写。',
        linkedDecision: '关联人工决定：',
        rewriteDecision: '人工改写决定',
        exclusionReason: '排除理由',
        confidence: '置信度：',
        promptHash: '提示词 hash：',
        accept: '接受',
        edit: '改写',
        reject: '拒绝',
      }
    : {
        totalSuggestions: 'Total suggestions',
        pending: 'Pending',
        reviewed: 'Reviewed',
        linkedHumanDecisions: 'Linked human decisions',
        advisoryOnlyReviews: 'Advisory-only reviews',
        summaryNote: 'Pending, rejected, or ignored suggestions do not enter PRISMA counts directly; only linked human ScreeningDecision records affect final counts.',
        empty: 'There are no AI suggestions yet. Generate local mock suggestions first, then accept, reject, or edit them manually.',
        linkedDecision: 'Linked decision:',
        rewriteDecision: 'Human rewrite decision',
        exclusionReason: 'Exclusion reason',
        confidence: 'Confidence:',
        priorityScore: 'Priority score:',
        recommendedQueue: 'Recommended queue:',
        uncertaintyFlags: 'Uncertainty flags:',
        promptHash: 'Prompt hash:',
        accept: 'Accept',
        edit: 'Edit',
        reject: 'Reject',
      };
  const summary = AUDIT_ENGINE.summarizeAiSuggestions(aiSuggestionEvents);
  const summaryHtml = `
    <div class="surface-panel ai-suggestion-summary" style="margin-bottom: 12px;">
      <div class="ai-suggestion-summary-grid">
        <div><div class="muted-text">${escapeHTML(ui.totalSuggestions)}</div><strong>${summary.totalSuggestions}</strong></div>
        <div><div class="muted-text">${escapeHTML(ui.pending)}</div><strong>${summary.pendingSuggestions}</strong></div>
        <div><div class="muted-text">${escapeHTML(ui.reviewed)}</div><strong>${summary.reviewedSuggestions}</strong></div>
        <div><div class="muted-text">${escapeHTML(ui.linkedHumanDecisions)}</div><strong>${summary.linkedHumanDecisionCount}</strong></div>
        <div><div class="muted-text">${escapeHTML(ui.advisoryOnlyReviews)}</div><strong>${summary.advisoryOnlyReviewedSuggestionCount}</strong></div>
      </div>
      <div class="muted-text ai-suggestion-summary-note">
        ${escapeHTML(ui.summaryNote)}
      </div>
    </div>
  `;

  if (!Array.isArray(aiSuggestionEvents) || aiSuggestionEvents.length === 0) {
    container.innerHTML = `
      ${summaryHtml}
      <div class="muted-text ai-suggestion-empty">
        ${escapeHTML(ui.empty)}
      </div>
    `;
    applyAiSuggestionPanelLangVisibility();
    return;
  }

  const template = sanitizeExclusionTemplate(exclusionReasons);
  const reasonOptions = template
    .map((reason) => `<option value="${escapeHTML(reason)}">${escapeHTML(reason)}</option>`)
    .join('');

  const rows = aiSuggestionEvents.slice().reverse().map((entry) => {
    const isPending = entry.humanAction === 'pending';
    const editDecisionId = getAiSuggestionControlId(entry.suggestionId, 'edit-decision');
    const editReasonWrapperId = getAiSuggestionControlId(entry.suggestionId, 'edit-reason-wrapper');
    const editReasonId = getAiSuggestionControlId(entry.suggestionId, 'edit-reason');
    const suggestionId = escapeHTML(entry.suggestionId);
    const rationaleText = getAiSuggestionRationaleText(entry);
    const linkedDecision = entry.linkedDecisionId
      ? `<div class="muted-text" style="margin-top: 6px;">${escapeHTML(ui.linkedDecision)} <code>${escapeHTML(entry.linkedDecisionId)}</code></div>`
      : '';
    const metadata = entry.metadata || {};
    const uncertaintyFlags = Array.isArray(metadata.uncertaintyFlags) ? metadata.uncertaintyFlags : [];
    const advisoryMeta = `
      <div class="muted-text ai-suggestion-meta">
        ${escapeHTML(ui.priorityScore)} ${escapeHTML(String(metadata.priorityScore ?? '-'))}
        <span aria-hidden="true"> | </span>
        ${escapeHTML(ui.recommendedQueue)} ${escapeHTML(getConservativeAiQueueLabel(metadata.recommendedQueue))}
      </div>
      <div class="muted-text ai-suggestion-meta">
        ${escapeHTML(ui.uncertaintyFlags)} ${escapeHTML(uncertaintyFlags.length ? uncertaintyFlags.join(', ') : '-')}
      </div>
    `;
    const editControls = isPending
      ? `
        <div class="ai-suggestion-edit-grid">
          <label class="form-label" style="margin-bottom: 0;">
            ${escapeHTML(ui.rewriteDecision)}
            <select id="${editDecisionId}" class="form-input" onchange="toggleAiSuggestionEditReason('${suggestionId}')" style="margin-top: 4px;">
              <option value="">${chooseDecisionText}</option>
              ${decisionOptions}
            </select>
          </label>
          <label id="${editReasonWrapperId}" class="form-label" style="margin-bottom: 0;" hidden>
            ${escapeHTML(ui.exclusionReason)}
            <select id="${editReasonId}" class="form-input" style="margin-top: 4px;" disabled>
              <option value="">${chooseReasonText}</option>
              ${reasonOptions}
            </select>
          </label>
        </div>
      `
      : '';

    return `
      <div class="surface-panel ai-suggestion-card" style="margin-bottom: 12px;">
        <div class="ai-suggestion-card-layout">
          <div class="ai-suggestion-card-main">
            <div class="ai-suggestion-chip-row">
              <span class="status-chip">${escapeHTML(getAiSuggestionStageLabel(entry.stage || 'title_abstract'))}</span>
              <span class="status-chip">${escapeHTML(getAiSuggestionDecisionLabel(entry.suggestedDecision || 'uncertain'))}</span>
              <span class="status-chip">${escapeHTML(getAiSuggestionActionLabel(entry.humanAction || 'pending'))}</span>
            </div>
            <div class="ai-suggestion-title">${escapeHTML(entry.inputSummary || entry.recordId || entry.suggestionId)}</div>
            <div class="muted-text ai-suggestion-rationale">${escapeHTML(rationaleText)}</div>
            <div class="muted-text ai-suggestion-meta">
              ${escapeHTML(ui.confidence)} ${entry.confidence ?? '-'}
              <span aria-hidden="true"> | </span>
              ${escapeHTML(ui.promptHash)} <code>${escapeHTML(entry.promptHash || '-')}</code>
            </div>
            ${advisoryMeta}
            ${linkedDecision}
            ${editControls}
          </div>
          <div class="button-group ai-suggestion-actions">
            <button type="button" class="btn btn-secondary" onclick="acceptAiSuggestion('${suggestionId}')" ${!isPending ? 'disabled' : ''}>${escapeHTML(ui.accept)}</button>
            <button type="button" class="btn btn-secondary" onclick="editAiSuggestion('${suggestionId}', document.getElementById('${editDecisionId}')?.value, document.getElementById('${editReasonId}')?.value)" ${!isPending ? 'disabled' : ''}>${escapeHTML(ui.edit)}</button>
            <button type="button" class="btn btn-secondary" onclick="rejectAiSuggestion('${suggestionId}')" ${!isPending ? 'disabled' : ''}>${escapeHTML(ui.reject)}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = summaryHtml + rows;
  applyAiSuggestionPanelLangVisibility();
}

function shouldAutoRestoreProjectState() {
  return !!currentUserSession;
}

function loadCurrentProjectStateFromLocalStorage() {
  const candidateIds = [];
  const sessionProjectId = runtimeSession && typeof runtimeSession.projectId === 'string'
    ? runtimeSession.projectId.trim()
    : '';
  if (sessionProjectId) candidateIds.push(sessionProjectId);

  const savedId = localStorage.getItem('prisma_current_project_id');
  if (savedId && !candidateIds.includes(savedId)) candidateIds.push(savedId);

  if (candidateIds.length === 0) return false;

  let raw = null;
  let matchedProjectId = null;
  for (const projectId of candidateIds) {
    const snapshotRaw = localStorage.getItem(getProjectStorageKey(projectId));
    if (snapshotRaw) {
      raw = snapshotRaw;
      matchedProjectId = projectId;
      break;
    }
  }

  if (!raw) return false;

  try {
    const snapshot = JSON.parse(raw);
    if (!snapshot || !snapshot.projectId) return false;
    currentProjectId = snapshot.projectId;
    if (matchedProjectId !== snapshot.projectId) {
      localStorage.setItem('prisma_current_project_id', snapshot.projectId);
    }
    restoreProjectState(snapshot);
    return true;
  } catch (e) {
    console.warn('Failed to load project state:', e);
    return false;
  }
}

// v1.4: Exclusion template helpers
function sanitizeExclusionTemplate(list) {
  const cleaned = (Array.isArray(list) ? list : [])
    .map(s => String(s || '').trim())
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : [...DEFAULT_EXCLUSION_REASONS];
}

function setExclusionReasonsTemplate(nextTemplate, { persist = true, rerender = true } = {}) {
  exclusionReasons = sanitizeExclusionTemplate(nextTemplate);
  if (persist) persistCurrentProjectState();
  if (rerender) {
    renderExclusionTemplateButtons();
    renderExclusionTemplateEditor();
    // If Step 4 table already exists, rebuild to refresh dropdown options
    if (currentStep === 4) displayFulltextReviewUI();
  }
}

function renderExclusionTemplateButtons() {
  const container = document.getElementById('exclusion-template-buttons');
  if (!container) return;

  const template = sanitizeExclusionTemplate(exclusionReasons);
  const numberEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

  container.innerHTML = template
    .map((reason, idx) => {
      const isHotkey = idx < 6;
      const labelPrefix = isHotkey ? `${numberEmoji[idx]} ` : '';
      const dataKey = isHotkey ? `data-key="${idx + 1}"` : '';
      return `<button class="btn btn-secondary" type="button" onclick="setDefaultExclusion(${JSON.stringify(reason)})" data-reason="${escapeHTML(reason)}" ${dataKey}>${labelPrefix}${escapeHTML(reason)}</button>`;
    })
    .join('');
}

function toggleExclusionTemplateEditor() {
  const editor = document.getElementById('exclusion-template-editor');
  if (!editor) return;
  editor.classList.toggle('hidden');
  if (!editor.classList.contains('hidden')) {
    renderExclusionTemplateEditor();
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderExclusionTemplateEditor() {
  const listEl = document.getElementById('exclusion-template-list');
  if (!listEl) return;
  const template = sanitizeExclusionTemplate(exclusionReasons);

  listEl.innerHTML = template
    .map((reason, idx) => {
      const disableDelete = template.length <= 1;
      return `
        <div style="display: flex; gap: var(--space-8); align-items: center;">
          <input class="form-input" type="text" value="${escapeHTML(reason)}" oninput="updateExclusionTemplateRow(${idx}, this.value)" />
          <button class="btn btn-secondary" type="button" onclick="deleteExclusionTemplateRow(${idx})" ${disableDelete ? 'disabled' : ''}>删除</button>
        </div>
      `;
    })
    .join('');
}

function updateExclusionTemplateRow(index, value) {
  const template = sanitizeExclusionTemplate(exclusionReasons);
  template[index] = String(value || '').trim();
  setExclusionReasonsTemplate(template);
}

function deleteExclusionTemplateRow(index) {
  const template = sanitizeExclusionTemplate(exclusionReasons);
  template.splice(index, 1);
  setExclusionReasonsTemplate(template);
}

function addExclusionTemplateRow() {
  const template = sanitizeExclusionTemplate(exclusionReasons);
  template.push('');
  exclusionReasons = template;
  renderExclusionTemplateEditor();
  persistCurrentProjectState();
}

function restoreDefaultExclusionTemplate() {
  setExclusionReasonsTemplate([...DEFAULT_EXCLUSION_REASONS]);
}

// v1.4: Step scrolling helpers
function scrollToStep(stepNumber) {
  const el = document.getElementById(`step${stepNumber}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// v1.4: Rule backfill to Step 2
function setFormRules(rules) {
  if (!rules) return;
  if (rules.time_window) {
    document.getElementById('startYear').value = rules.time_window.start_year ?? document.getElementById('startYear').value;
    document.getElementById('endYear').value = rules.time_window.end_year ?? document.getElementById('endYear').value;
  }

  if (Array.isArray(rules.include_any)) {
    document.getElementById('includeKeywords').value = rules.include_any.join('\n');
  }

  if (Array.isArray(rules.exclude)) {
    const container = document.getElementById('excludeList');
    container.innerHTML = '';
    rules.exclude.forEach(item => addExcludeItemToDOM(item.keyword || '', item.reason || ''));
  }

  if (rules.language && Array.isArray(rules.language.allow)) {
    const allow = new Set(rules.language.allow);
    document.querySelectorAll('input[type="checkbox"][value="english"], input[type="checkbox"][value="chinese"]').forEach(cb => {
      cb.checked = allow.has(cb.value);
    });
  }

  if (Array.isArray(rules.required_one_of)) {
    const required = new Set(rules.required_one_of);
    document.querySelectorAll('.required-field').forEach(cb => {
      cb.checked = required.has(cb.value);
    });
  }

  if (typeof rules.fulltext_exclude_ratio === 'number' && !Number.isNaN(rules.fulltext_exclude_ratio)) {
    const slider = document.getElementById('ftExcludeRatio');
    const label = document.getElementById('ftExcludeValue');
    if (slider) slider.value = String(rules.fulltext_exclude_ratio);
    if (label) label.textContent = Math.round(rules.fulltext_exclude_ratio * 100) + '%';
  }

  syncFormToYAML();
}

function getManualReviewMarkedCount() {
  // Prefer finalized counts if available
  const finalized = screeningResults?.excluded?.filter(r => r._exclude_stage === 'fulltext')?.length || 0;
  if (finalized > 0) return finalized;

  // Dual-review mode: count any non-empty decision per index
  if (projectData && projectData.reviewDecisions && screeningResults?.included?.length) {
    const total = screeningResults.included.length;
    let marked = 0;
    for (let i = 0; i < total; i++) {
      const a = projectData.reviewDecisions['reviewer-a']?.[i]?.decision;
      const b = projectData.reviewDecisions['reviewer-b']?.[i]?.decision;
      if ((a && String(a).trim()) || (b && String(b).trim())) marked++;
    }
    if (marked > 0) return marked;
  }

  // Single-review draft stored in screeningResults
  const draft = screeningResults?.manualReviewDraft;
  if (draft && typeof draft === 'object') {
    const decided = Object.values(draft).filter(v => v && String(v).trim().length > 0).length;
    if (decided > 0) return decided;
  }

  // As a last fallback: count current DOM selections if Step 4 table exists
  const selects = document.querySelectorAll('select[id^="exclude-"]');
  if (selects && selects.length) {
    let decided = 0;
    selects.forEach(s => {
      if (s && s.value && String(s.value).trim().length > 0) decided++;
    });
    if (decided > 0) return decided;
  }

  return 0;
}

function editRulesAndRerun() {
  if (!uploadedData || uploadedData.length === 0) {
    showToast('请先上传文献数据', 'warning');
    return;
  }
  if (!filterRules) {
    showToast('当前还没有可回填的筛选规则，请先运行一次筛选', 'info');
    goToStep2();
    scrollToStep(2);
    return;
  }

  const markedCount = getManualReviewMarkedCount();
  if (markedCount > 0) {
    const ok = confirm(`修改筛选规则将重置当前人工审核结果（已标记 ${markedCount} 条记录）。\n是否继续？`);
    if (!ok) return;

    // Reset collaborative decisions if present
    if (projectData) {
      projectData.reviewDecisions = {};
      saveProjectData();
    }

    if (screeningResults && screeningResults.manualReviewDraft) {
      screeningResults.manualReviewDraft = {};
      persistCurrentProjectState();
    }
  }

  goToStep2();
  setFormRules(filterRules);
  scrollToStep(2);
}

function returnToRulesConfig() {
  if (!uploadedData || uploadedData.length === 0) {
    showToast('请先上传文献数据', 'warning');
    return;
  }

  goToStep2();
  if (filterRules) {
    setFormRules(filterRules);
  }
  scrollToStep(2);
}

function setManualReviewDraftDecision(idx, decision) {
  if (!screeningResults) return;
  if (!screeningResults.manualReviewDraft || typeof screeningResults.manualReviewDraft !== 'object') {
    screeningResults.manualReviewDraft = {};
  }

  const v = String(decision || '').trim();
  if (v) {
    screeningResults.manualReviewDraft[idx] = v;
  } else {
    delete screeningResults.manualReviewDraft[idx];
  }

  persistCurrentProjectState();
}

// Step navigation
function goToStep1() {
  setStep(1);
}

function goToStep2() {
  if (uploadedData.length === 0) {
    showToast('请先上传文件或使用示例数据', 'warning');
    uploadedData = sampleData.map(item => ({
      ...item,
      _source: 'Sample Data',
      _sourceFile: 'sample.data'
    }));
    uploadedFiles = [{
      name: 'sample.data',
      format: '.sample',
      recordCount: uploadedData.length,
      source: 'Sample Data'
    }];
    detectColumns();
    displayUploadInfo();
  }
  setStep(2);
  syncFormToYAML();
  displayRulesPreview();
}

function goToStep3() {
  setStep(3);
}

// v3.0: New step 4 for manual fulltext review
function goToStep4(options = {}) {
  if (!screeningResults) {
    showToast('请先完成文献筛选', 'warning');
    return;
  }

  const preserveQueueContext = options?.preserveQueueContext === true;
  if (!preserveQueueContext) {
    clearConservativeAiQueueContext();
  }

  setStep(4);
  displayFulltextReviewUI();
}

// v2.2: Step 5 for quality assessment shell
function goToStep5() {
  if (!screeningResults) {
    showToast('请先完成文献筛选', 'warning');
    return;
  }
  if (FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT) {
    prepareQualityAssessmentShell({ silent: true });
  }
  setStep(5);
  renderQualityAssessmentShell();
}

function goToStep6() {
  if (!screeningResults) {
    showToast('请先完成文献筛选', 'warning');
    return;
  }
  setStep(FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT ? 6 : 5);
  displayResults(screeningResults);
}

function setStep(step) {
  const nextStep = Math.max(1, Math.min(step, WORKFLOW_STEP_COUNT));
  currentStep = nextStep;
  
  // Hide all steps
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('step3').classList.add('hidden');
  const step4 = document.getElementById('step4');
  if (step4) step4.classList.add('hidden');
  const step5 = document.getElementById('step5');
  if (step5) step5.classList.add('hidden');
  const step6 = document.getElementById('step6');
  if (step6) step6.classList.add('hidden');
  
  // Show current step
  const currentStepPanel = document.getElementById('step' + nextStep);
  if (currentStepPanel) currentStepPanel.classList.remove('hidden');
  
  // Update indicators
  for (let i = 1; i <= WORKFLOW_STEP_COUNT; i++) {
    const indicator = document.getElementById('step-indicator-' + i);
    if (indicator) {
      indicator.classList.remove('active', 'completed');
      if (i < nextStep) {
        indicator.classList.add('completed');
      } else if (i === nextStep) {
        indicator.classList.add('active');
      }
    }
  }

  if (nextStep === 5) {
    renderQualityAssessmentShell();
  }
  if (nextStep === 6 || (!FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT && nextStep === 5)) {
    renderImportJobShell();
    renderAiProviderConfigPanel();
    renderAiSuggestionPanel();
  }
}

// Tab switching
function switchTab(tab) {
  const tabs = document.querySelectorAll('.tab-button');
  const contents = [document.getElementById('formTab'), document.getElementById('yamlTab'), document.getElementById('formatTab'), document.getElementById('mappingTab')];
  
  tabs.forEach(t => t.classList.remove('active'));
  contents.forEach(c => c.classList.remove('active'));
  
  if (tab === 'form') {
    tabs[0].classList.add('active');
    document.getElementById('formTab').classList.add('active');
    syncYAMLToForm();
  } else if (tab === 'yaml') {
    tabs[1].classList.add('active');
    document.getElementById('yamlTab').classList.add('active');
    syncFormToYAML();
  } else if (tab === 'format') {
    tabs[2].classList.add('active');
    document.getElementById('formatTab').classList.add('active');
  } else if (tab === 'mapping') {
    tabs[3].classList.add('active');
    document.getElementById('mappingTab').classList.add('active');
  }
}

// Rules management
function loadExcludeItems() {
  const container = document.getElementById('excludeList');
  container.innerHTML = '';
  
  defaultRules.exclude.forEach((item, idx) => {
    addExcludeItemToDOM(item.keyword, item.reason);
  });
}

function addExcludeItem() {
  addExcludeItemToDOM('', '');
}

function addExcludeItemToDOM(keyword = '', reason = '') {
  const container = document.getElementById('excludeList');
  const div = document.createElement('div');
  div.className = 'exclude-item';
  div.innerHTML = `
    <input type="text" class="form-input exclude-keyword" placeholder="关键词" value="${keyword}" style="flex: 1;">
    <input type="text" class="form-input exclude-reason" placeholder="排除理由" value="${reason}" style="flex: 2;">
    <button class="btn-remove" onclick="this.parentElement.remove()">删除</button>
  `;
  container.appendChild(div);
}

function loadExampleRules() {
  document.getElementById('startYear').value = defaultRules.time_window.start_year;
  document.getElementById('endYear').value = defaultRules.time_window.end_year;
  document.getElementById('includeKeywords').value = defaultRules.include_any.join('\n');
  
  const container = document.getElementById('excludeList');
  container.innerHTML = '';
  defaultRules.exclude.forEach(item => {
    addExcludeItemToDOM(item.keyword, item.reason);
  });

  // Update checkboxes
  document.querySelectorAll('input[type="checkbox"][value="english"]')[0].checked = true;
  document.querySelectorAll('input[type="checkbox"][value="chinese"]')[0].checked = true;
  document.querySelectorAll('.required-field[value="title"]')[0].checked = true;
  document.querySelectorAll('.required-field[value="abstract"]')[0].checked = true;

  syncFormToYAML();
  showToast('已加载示例规则', 'success');
}

function syncFormToYAML() {
  const rules = getFormRules();
  const yaml = JSON.stringify(rules, null, 2);
  document.getElementById('yamlEditor').value = yaml;
}

function syncYAMLToForm() {
  try {
    const yaml = document.getElementById('yamlEditor').value;
    const rules = JSON.parse(yaml);
    
    if (rules.time_window) {
      document.getElementById('startYear').value = rules.time_window.start_year || 2015;
      document.getElementById('endYear').value = rules.time_window.end_year || 2025;
    }
    
    if (rules.include_any) {
      document.getElementById('includeKeywords').value = rules.include_any.join('\n');
    }
    
    if (rules.exclude) {
      const container = document.getElementById('excludeList');
      container.innerHTML = '';
      rules.exclude.forEach(item => {
        addExcludeItemToDOM(item.keyword, item.reason);
      });
    }
    
    showToast('YAML 已同步到表单', 'success');
  } catch (e) {
    showToast('YAML 格式错误: ' + e.message, 'error');
  }
}

function getFormRules() {
  const excludeItems = [];
  document.querySelectorAll('.exclude-item').forEach(item => {
    const keyword = item.querySelector('.exclude-keyword').value.trim();
    const reason = item.querySelector('.exclude-reason').value.trim();
    if (keyword) {
      excludeItems.push({ keyword, reason });
    }
  });

  const languages = [];
  document.querySelectorAll('input[type="checkbox"][value="english"], input[type="checkbox"][value="chinese"]').forEach(cb => {
    if (cb.checked) languages.push(cb.value);
  });

  const requiredFields = [];
  document.querySelectorAll('.required-field:checked').forEach(cb => {
    requiredFields.push(cb.value);
  });

  return {
    time_window: {
      start_year: parseInt(document.getElementById('startYear').value),
      end_year: parseInt(document.getElementById('endYear').value)
    },
    include_any: document.getElementById('includeKeywords').value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s),
    exclude: excludeItems,
    language: {
      allow: languages
    },
    required_one_of: requiredFields,
    fulltext_exclude_ratio: parseFloat(document.getElementById('ftExcludeRatio').value)
  };
}

function displayRulesPreview() {
  const thead = document.getElementById('rulesPreviewHead');
  const tbody = document.getElementById('rulesPreviewBody');
  
  const columns = Object.keys(uploadedData[0] || {});
  thead.innerHTML = '<tr>' + columns.map(col => `<th>${col}</th>`).join('') + '</tr>';
  
  const preview = uploadedData.slice(0, 10);
  tbody.innerHTML = preview.map(row => 
    '<tr>' + columns.map(col => `<td>${truncate(row[col] || '', 40)}</td>`).join('') + '</tr>'
  ).join('');
}

function startScreening() {
  if (!uploadedData || uploadedData.length === 0) {
    showToast('请先上传文献数据', 'error');
    return;
  }

  showLoading('正在执行文献筛选...');
  
  setTimeout(() => {
    const rules = getFormRules();
    createProjectHistorySnapshot('screening_rerun', 'Before screening rerun');
    filterRules = rules;
    ensureProjectId();
    persistCurrentProjectState();
    
    // v3.0: Debug - check input data
    console.log('🔍 开始筛选调试：');
    console.log('- uploadedData 长度:', uploadedData.length);
    console.log('- 第一条数据:', uploadedData[0]);
    console.log('- 第一条数据的所有字段:', Object.keys(uploadedData[0]));
    console.log('- columnMapping:', columnMapping);
    console.log('- columnMapping.title 映射到:', columnMapping.title);
    console.log('- columnMapping.abstract 映射到:', columnMapping.abstract);
    console.log('- 第一条的title值:', uploadedData[0][columnMapping.title]);
    console.log('- 第一条的abstract值:', uploadedData[0][columnMapping.abstract]);
    console.log('- rules:', rules);
    
    const results = performScreening(uploadedData, rules);
    screeningResults = results;
    persistCurrentProjectState();
    hideLoading();
    
    // v3.0: Debug logging to diagnose filtering issues
    console.log('=== 文献筛选调试信息 ===');
    console.log('原始上传文献数:', uploadedData.length);
    console.log('筛选结果:', {
      identified_db: results.counts.identified_db,
      identified_other: results.counts.identified_other,
      duplicates: results.counts.duplicates,
      after_dupes: results.counts.after_dupes,
      screened: results.counts.screened,
      excluded_ta: results.counts.excluded_ta,
      fulltext: results.counts.fulltext,
      included: results.counts.included
    });
    console.log('待人工审核文献数:', results.included.length);
    console.log('======================');
    
    if (results.included.length === 0) {
      showToast('⚠️ 警告：没有文献进入人工审核阶段！请检查筛选规则', 'warning');
    }
    
    // v1.4: Go to Step 3 (Auto screening results) and scroll into view
    displayResults(screeningResults);
    goToStep3();
    scrollToStep(3);
    showToast('自动筛选完成：请在第3步查看初步结果', 'success');
  }, 1500);
}

function runDedupForScreening(data) {
  if (!globalThis.DedupEngine || typeof globalThis.DedupEngine.run !== 'function') {
    throw new Error('DedupEngine is not available in the current runtime');
  }

  function readField(row, field, fallbacks) {
    const mappedValue = getValue(row, field);
    if (mappedValue && mappedValue.trim()) {
      return mappedValue.trim();
    }

    for (const fallback of fallbacks || []) {
      const value = String(row[fallback] || '').trim();
      if (value) {
        return value;
      }
    }

    return '';
  }

  const prepared = data.map((row, index) => {
    const title = readField(row, 'title', ['title', 'TI']);
    const abstract = readField(row, 'abstract', ['abstract', 'AB']);
    const keywords = readField(row, 'keywords', ['keywords', 'KW']);
    const authors = readField(row, 'authors', ['authors', 'AU']);
    const year = readField(row, 'year', ['year', 'PY']);
    const journal = readField(row, 'journal', ['journal', 'JO']);
    const pages = readField(row, 'pages', ['pages']);
    const doi = readField(row, 'doi', ['doi', 'DOI']);
    const publicationType = readField(row, 'publication_type', ['publication_type']);
    const identifierRaw = String(row.identifier_raw || doi).trim();

    return {
      ...row,
      record_id: String(row.record_id || row.id || ('record-' + (index + 1))),
      title,
      abstract,
      keywords,
      authors,
      year,
      journal,
      pages,
      doi,
      identifier_raw: identifierRaw,
      publication_type: publicationType,
      _normalized_title: normalizeTitle(title),
      _lang: detectLanguage(title + ' ' + abstract),
    };
  });

  const result = globalThis.DedupEngine.run(prepared, { mode: 'default' });
  const deduped = result.retainedRecords.map((row) => ({
    ...row,
    _normalized_title: row._normalized_title || normalizeTitle(String(row.title || '')),
    _lang: row._lang || detectLanguage(String(row.title || '') + ' ' + String(row.abstract || '')),
  }));
  const duplicates = result.hardDuplicates.map((entry) => ({
    ...entry.duplicateRecord,
    _dedup_reason: entry.reason.message,
    _dedup_reason_code: entry.reason.code,
  }));
  const candidateDuplicates = result.candidateDuplicates.map((entry) => ({
    leftRecord: entry.leftRecord,
    rightRecord: entry.rightRecord,
    reason: entry.reason,
  }));

  if (typeof appendAuditEventsSafe === 'function') {
    const hardEvents = result.hardDuplicates.map((entry, index) => ({
        eventType: 'hard_duplicate_removed',
      recordId: getRecordAuditId(entry.duplicateRecord, index),
      before: {
        duplicateRecordId: getRecordAuditId(entry.duplicateRecord, index),
        retainedRecordId: getRecordAuditId(entry.keptRecord || entry.retainedRecord, index),
      },
      after: {
        decision: 'auto_removed',
        reason: 'duplicate',
      },
      reason: 'duplicate',
      source: 'system',
      metadata: {
        reasonCode: entry.reason?.code || '',
        reasonMessage: entry.reason?.message || '',
        retainedRecordId: getRecordAuditId(entry.keptRecord || entry.retainedRecord, index),
      },
    }));
    const candidateEvents = result.candidateDuplicates.map((entry, index) => ({
        eventType: 'candidate_duplicate_flagged',
      recordId: getRecordAuditId(entry.leftRecord, index),
      after: {
        decision: 'candidate_duplicate',
        leftRecordId: getRecordAuditId(entry.leftRecord, index),
        rightRecordId: getRecordAuditId(entry.rightRecord, index),
      },
      reason: 'duplicate',
      source: 'system',
      metadata: {
        reasonCode: entry.reason?.code || '',
        reasonMessage: entry.reason?.message || '',
        leftRecordId: getRecordAuditId(entry.leftRecord, index),
        rightRecordId: getRecordAuditId(entry.rightRecord, index),
      },
    }));
    appendAuditEventsSafe([...hardEvents, ...candidateEvents], { persist: false });
  }

  return {
    deduped,
    duplicates,
    candidateDuplicates,
    counts: {
      duplicates: duplicates.length,
      after_dupes: deduped.length,
      candidate_duplicates: candidateDuplicates.length,
    },
    engineResult: result,
  };
}

function performScreening(data, rules) {
  // v3.0: PRISMA identification stage - count BEFORE deduplication
  // Track source distribution for identification (from original data)
  const sourceDistribution = {};
  let identified_db = 0;
  let identified_other = 0;
  
  data.forEach(row => {
    const source = row._source || 'Unknown';
    if (!sourceDistribution[source]) {
      sourceDistribution[source] = 0;
    }
    sourceDistribution[source]++;
    
    // Count actual DB vs Other sources (not estimated ratio)
    if (source === 'Unknown' || source.includes('Gray') || source.includes('gray')) {
      identified_other++;
    } else {
      identified_db++;
    }
  });

  // vNext: route app-facing hard dedup through the shared engine
  const dedupSummary = runDedupForScreening(data);
  const deduped = dedupSummary.deduped;
  const duplicates = dedupSummary.duplicates;
  const candidateDuplicates = dedupSummary.candidateDuplicates;

  // Apply time window - v3.0: improved year parsing
  const inTimeWindow = deduped.filter(row => {
    const yearValue = getValue(row, 'year');
    
    // Try to extract year from various formats
    let year = null;
    if (yearValue) {
      // Try direct parsing
      year = parseInt(yearValue);
      
      // If failed, try to extract 4-digit year from string
      if (isNaN(year)) {
        const match = String(yearValue).match(/\b(19|20)\d{2}\b/);
        if (match) {
          year = parseInt(match[0]);
        }
      }
    }
    
    // Log records with invalid years for debugging
    if (!year || isNaN(year)) {
      console.log(`⚠️ 年份缺失或无法解析: "${yearValue}" - 标题: ${getValue(row, 'title').substring(0, 50)}...`);
      return false; // Exclude records with missing/invalid year
    }
    
    const inRange = year >= rules.time_window.start_year && year <= rules.time_window.end_year;
    if (!inRange) {
      console.log(`⏰ 年份超出范围: ${year} (范围: ${rules.time_window.start_year}-${rules.time_window.end_year}) - ${getValue(row, 'title').substring(0, 50)}...`);
    }
    return inRange;
  });

  // Apply include keywords - only filter if keywords are actually specified (not empty)
  let withIncludeKW = inTimeWindow;
  const validKeywords = (rules.include_any || []).filter(kw => kw && kw.trim());
  console.log('🔍 Keyword filtering debug:');
  console.log('  - Valid keywords:', validKeywords);
  console.log('  - Keywords count:', validKeywords.length);
  if (validKeywords.length > 0) {
    withIncludeKW = inTimeWindow.filter(row => {
      const text = (getValue(row, 'title') + ' ' + getValue(row, 'abstract') + ' ' + getValue(row, 'keywords')).toLowerCase();
      const matched = validKeywords.some(kw => {
        const normalized = kw.toLowerCase();
        const found = text.includes(normalized);
        if (found) {
          console.log(`  ✓ Matched keyword "${kw}" in: ${getValue(row, 'title').substring(0, 50)}...`);
        }
        return found;
      });
      return matched;
    });
    console.log(`  - After keyword filter: ${withIncludeKW.length} records (was ${inTimeWindow.length})`);
  }

  // Apply required fields - v3.0: very lenient
  // Only apply if fields are specified AND at least one field is mapped
  let withRequiredFields = withIncludeKW;
  const mappedRequiredFields = (rules.required_one_of || []).filter(field => columnMapping[field]);
  
  if (mappedRequiredFields.length > 0) {
    withRequiredFields = withIncludeKW.filter(row => {
      // At least one of the MAPPED required fields has a value
      return mappedRequiredFields.some(field => {
        const value = getValue(row, field);
        return value && value.trim().length > 0;
      });
    });
  } else {
    // If no required fields are mapped, keep all records
    console.log('💡 没有映射到必填字段，保留所有文献');
  }

  // Apply language filter - only filter if languages are actually selected
  let withLanguage = withRequiredFields;
  if (rules.language && rules.language.allow && rules.language.allow.length > 0) {
    withLanguage = withRequiredFields.filter(row => {
      return rules.language.allow.includes(row._lang);
    });
  }

  // v3.0: Debug - log filtering stages
  if (data.length > 50) {
    console.log('📊 筛选阶段日志:', {
      '原始': data.length,
      '去重后': deduped.length,
      '时间窗口': inTimeWindow.length,
      '包含关键词': withIncludeKW.length,
      '必填字段': withRequiredFields.length,
      '语言筛选': withLanguage.length,
      '规则.include_any': rules.include_any,
      '规则.required_one_of': rules.required_one_of,
      '规则.language.allow': rules.language.allow,
      '前5条的语言': withRequiredFields.slice(0, 5).map(r => ({ 
        title: r.title?.substring(0, 30), 
        lang: r._lang 
      }))
    });
    
    // Check why required fields might be failing
    if (withRequiredFields.length === 0 && withIncludeKW.length > 0) {
      console.warn('⚠️ 所有文献被必填字段过滤掉了！');
      console.log('检查前3条记录的字段:', withIncludeKW.slice(0, 3).map(r => ({
        title: getValue(r, 'title'),
        abstract: getValue(r, 'abstract'),
        columnMapping
      })));
    }
    
    // Check why language filter might be failing
    if (withLanguage.length === 0 && withRequiredFields.length > 0) {
      console.warn('⚠️ 所有文献被语言筛选过滤掉了！');
      console.log('检查前3条记录的语言:', withRequiredFields.slice(0, 3).map(r => ({
        title: r.title?.substring(0, 30),
        _lang: r._lang,
        allowed: rules.language.allow
      })));
    }
  }

  // Apply exclude keywords (title/abstract screening)
  const excluded_ta = [];
  const afterTA = [];

  withLanguage.forEach(row => {
    const text = (getValue(row, 'title') + ' ' + getValue(row, 'abstract') + ' ' + getValue(row, 'keywords')).toLowerCase();
    let excluded = false;
    let reason = '';

    for (const excl of rules.exclude) {
      if (text.includes(excl.keyword.toLowerCase())) {
        excluded = true;
        reason = excl.reason;
        break;
      }
    }

    if (excluded) {
      excluded_ta.push({ ...row, _exclude_reason: reason, _exclude_stage: 'title/abstract' });
    } else {
      afterTA.push(row);
    }
  });

  // v3.0: Fulltext stage - replaced with manual review tracking structure
  // This will be populated by user in Step 4
  const excluded_ft = [];
  const included = afterTA; // Default: all pass to fulltext stage for user review

  if (typeof upsertScreeningDecisionSafe === 'function' && typeof appendAuditEventsSafe === 'function') {
    const decisionEvents = [];
    excluded_ta.forEach((record, index) => {
      const recordId = getRecordAuditId(record, index);
      const exclusionReason = normalizeAuditExclusionReason(record._exclude_reason);
      upsertScreeningDecisionSafe({
        recordId,
        stage: 'title_abstract',
        decision: 'exclude',
        exclusionReason,
        reviewerId: 'system_rule',
        source: 'rule',
        notes: record._exclude_reason || '',
        metadata: {
          originalReason: record._exclude_reason || '',
        },
      }, { persist: false });
      decisionEvents.push({
        eventType: 'rule_screening_decision',
        recordId,
        after: {
          stage: 'title_abstract',
          decision: 'exclude',
          exclusionReason,
        },
        reason: exclusionReason || 'other',
        source: 'rule',
        metadata: {
          originalReason: record._exclude_reason || '',
        },
      });
    });
    included.forEach((record, index) => {
      const recordId = getRecordAuditId(record, index);
      upsertScreeningDecisionSafe({
        recordId,
        stage: 'title_abstract',
        decision: 'include',
        reviewerId: 'system_rule',
        source: 'rule',
      }, { persist: false });
      decisionEvents.push({
          eventType: 'rule_screening_decision',
        recordId,
        after: {
          stage: 'title_abstract',
          decision: 'include',
          exclusionReason: '',
        },
        source: 'rule',
      });
    });
    appendAuditEventsSafe(decisionEvents, { persist: false });
  }

  return {
    counts: {
      identified_db,
      identified_other,
      duplicates: dedupSummary.counts.duplicates,
      after_dupes: dedupSummary.counts.after_dupes,
      candidate_duplicates: dedupSummary.counts.candidate_duplicates,
      screened: withLanguage.length,
      excluded_ta: excluded_ta.length,
      fulltext: afterTA.length,
      excluded_ft: excluded_ft.length,
      included: included.length
    },
    sourceDistribution, // v3.0: For accurate PRISMA identification display
    included,
    excluded: [...excluded_ta, ...excluded_ft],
    duplicates,
    candidateDuplicates,
    rules
  };
}

function getValue(row, field) {
  if (!row) return '';

  const directValue = row[field];
  if (directValue !== undefined && directValue !== null && String(directValue).trim()) {
    return String(directValue);
  }

  const col = columnMapping[field];
  if (col) {
    const mappedValue = row[col];
    if (mappedValue !== undefined && mappedValue !== null && String(mappedValue).trim()) {
      return String(mappedValue);
    }
  }

  const fallbackMap = {
    title: ['TI', 'T1', 'dc:title', 'dcterms:title'],
    abstract: ['AB', 'dcterms:abstract', 'dc:description', 'Abstract Note', 'Notes'],
    year: ['PY', 'dc:date', 'dcterms:issued', 'Publication Year'],
    journal: ['JO', 'T2', 'bib:publicationTitle', 'dc:source', 'Publication Title'],
    authors: ['AU', 'dc:creator', 'dcterms:creator', 'Author'],
    doi: ['DO', 'DOI', 'dc:identifier'],
    keywords: ['KW', 'keyword', 'Manual Tags', 'Automatic Tags']
  };

  for (const fallback of fallbackMap[field] || []) {
    const value = row[fallback];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return '';
}

function getValue(row, field) {
  if (!row) return '';

  if (field === 'abstract') {
    return getPreferredAbstractValue(row);
  }

  const directValue = row[field];
  if (directValue !== undefined && directValue !== null && String(directValue).trim()) {
    return String(directValue);
  }

  const col = columnMapping[field];
  if (col) {
    const mappedValue = row[col];
    if (mappedValue !== undefined && mappedValue !== null && String(mappedValue).trim()) {
      return String(mappedValue);
    }
  }

  const fallbackMap = {
    title: ['TI', 'T1', 'dc:title', 'dcterms:title'],
    abstract: ['AB', 'dcterms:abstract', 'Abstract Note', 'Notes'],
    year: ['PY', 'dc:date', 'dcterms:issued', 'Publication Year'],
    journal: ['JO', 'T2', 'bib:publicationTitle', 'dc:source', 'Publication Title'],
    authors: ['AU', 'dc:creator', 'dcterms:creator', 'Author'],
    doi: ['DO', 'DOI', 'dc:identifier'],
    keywords: ['KW', 'keyword', 'Manual Tags', 'Automatic Tags']
  };

  for (const fallback of fallbackMap[field] || []) {
    const value = row[fallback];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return '';
}

function normalizeTitle(title) {
  return title.toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function detectLanguage(text) {
  // v3.0: Improved language detection with fallback
  if (!text || text.trim().length === 0) {
    return 'english'; // Default to english if no text
  }
  
  // Simple CJK detection
  const cjkPattern = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/;
  return cjkPattern.test(text) ? 'chinese' : 'english';
}

function getSelectedPrismaMode() {
  const el = document.querySelector('input[name="prismaMode"]:checked');
  const v = el ? String(el.value || '') : '';
  return v === 'simple' ? 'simple' : 'prisma2020';
}

function updateStep4EntryLock() {
  const btn = document.getElementById('btnGoStep4');
  if (!btn) return;

  const ready = !!screeningResults && Array.isArray(screeningResults.included);
  btn.disabled = !ready;
  btn.title = ready ? '' : '请先在第3步完成自动筛选';
}

function renderFilterRulesOverview(rules) {
  const container = document.getElementById('filterRulesOverview');
  if (!container) return;
  if (!rules) {
    container.innerHTML = '';
    return;
  }

  const time = rules.time_window || {};
  const includeAny = Array.isArray(rules.include_any) ? rules.include_any.filter(Boolean) : [];
  const excludeList = Array.isArray(rules.exclude) ? rules.exclude : [];
  const langAllow = rules.language?.allow || [];
  const required = Array.isArray(rules.required_one_of) ? rules.required_one_of : [];
  const ftRatio = typeof rules.fulltext_exclude_ratio === 'number' && !Number.isNaN(rules.fulltext_exclude_ratio)
    ? Math.round(rules.fulltext_exclude_ratio * 100) + '%'
    : '未设置';
  const ftRatioNote = '仅用于规划与说明，不会自动排除全文文献';

  const includeHtml = includeAny.length
    ? includeAny.map(kw => `<li>${escapeHTML(String(kw))}</li>`).join('')
    : '<li>（未设置：不进行包含关键词过滤）</li>';

  const excludeHtml = excludeList.length
    ? excludeList.map(ex => `<li><strong>${escapeHTML(String(ex.keyword || ''))}</strong>：${escapeHTML(String(ex.reason || ''))}</li>`).join('')
    : '<li>（未设置）</li>';

  const langHtml = (Array.isArray(langAllow) && langAllow.length)
    ? langAllow.map(x => `<li>${escapeHTML(String(x))}</li>`).join('')
    : '<li>（未设置）</li>';

  const reqHtml = required.length
    ? required.map(x => `<li>${escapeHTML(String(x))}</li>`).join('')
    : '<li>（未设置）</li>';

  container.innerHTML = `
    <div class="info-box" style="background: var(--color-bg-1); border-left: 4px solid var(--color-primary);">
      <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-12);">筛选规则概览</div>
      <div class="grid grid-2" style="gap: var(--space-16);">
        <div>
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">时间窗口</div>
          <div style="color: var(--color-text-secondary);">${escapeHTML(String(time.start_year ?? ''))} - ${escapeHTML(String(time.end_year ?? ''))}</div>
        </div>
        <div>
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">全文排除比例参数</div>
          <div style="color: var(--color-text-secondary);">${escapeHTML(String(ftRatio))}</div>
          <div style="margin-top: var(--space-6); font-size: var(--font-size-sm); color: var(--color-text-secondary);">${escapeHTML(ftRatioNote)}</div>
        </div>
      </div>
      <div class="grid grid-2" style="gap: var(--space-16); margin-top: var(--space-16);">
        <div>
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">包含关键词</div>
          <ul style="margin: 0; padding-left: var(--space-20); line-height: 1.7;">${includeHtml}</ul>
        </div>
        <div>
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">排除关键词（标题/摘要阶段）</div>
          <ul style="margin: 0; padding-left: var(--space-20); line-height: 1.7;">${excludeHtml}</ul>
        </div>
      </div>
      <div class="grid grid-2" style="gap: var(--space-16); margin-top: var(--space-16);">
        <div>
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">语言要求</div>
          <ul style="margin: 0; padding-left: var(--space-20); line-height: 1.7;">${langHtml}</ul>
        </div>
        <div>
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">必填字段（至少一个）</div>
          <ul style="margin: 0; padding-left: var(--space-20); line-height: 1.7;">${reqHtml}</ul>
        </div>
      </div>
    </div>
  `;
}

function renderScreeningDiagnostics(results) {
  const container = document.getElementById('screeningDiagnostics');
  if (!container) return;

  const stats = results?.diagnostics;
  if (!stats) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  const items = [
    ['时间窗口过滤', stats.excluded_time_window || 0],
    ['包含关键词未命中', stats.excluded_include_keywords || 0],
    ['必填字段缺失', stats.excluded_required_fields || 0],
    ['语言不匹配', stats.excluded_language || 0],
    ['命中排除关键词', stats.excluded_by_keyword || 0]
  ];

  container.style.display = '';
  container.innerHTML = `
    <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">标题/摘要阶段排除明细</div>
    <p style="margin-bottom: var(--space-12); color: var(--color-text-secondary);">这里展示的是第 3 步各类规则分别排除了多少文献。这样可以区分“命中排除关键词”和“年份/语言/字段要求未通过”。</p>
    <ul style="margin: 0; padding-left: var(--space-20); line-height: 1.8;">
      ${items.map(([label, value]) => `<li><strong>${escapeHTML(label)}</strong>：${escapeHTML(String(value))}</li>`).join('')}
    </ul>
  `;
}

function getCandidateReasonLabel(reason) {
  const code = typeof reason === 'string'
    ? String(reason || '').trim()
    : String(reason?.code || '').trim();

  switch (code) {
    case 'canonical_identifier_exact':
      return 'canonical_doi_match';
    case 'title_year_pages_overlap':
      return 'needs_review_identifier_mismatch';
    case 'title_year_author_overlap':
      return 'title_year_author_match';
    default:
      return code || 'needs_manual_review';
  }
}

function flattenCandidateDuplicatesForExport(candidateDuplicates) {
  return (Array.isArray(candidateDuplicates) ? candidateDuplicates : []).map((entry, index) => {
    const left = entry?.leftRecord || {};
    const right = entry?.rightRecord || {};
    const reasonCode = String(entry?.reason?.code || entry?.reason_code || '').trim();
    const reviewDecision = String(entry?.review_decision || entry?.reviewDecision || entry?.decision || 'needs_review').trim() || 'needs_review';

    return {
      candidate_pair_id: `candidate-${index + 1}`,
      reason_code: reasonCode || 'needs_manual_review',
      reason_label: getCandidateReasonLabel(reasonCode),
      review_decision: reviewDecision,
      reason_message: String(entry?.reason?.message || entry?.reason_message || '').trim(),
      left_record_id: String(left.record_id || left.id || ''),
      left_title: String(left.title || ''),
      left_authors: String(left.authors || ''),
      left_year: String(left.year || ''),
      left_journal: String(left.journal || ''),
      left_pages: String(left.pages || ''),
      left_identifier: String(left.identifier_raw || left.doi || ''),
      right_record_id: String(right.record_id || right.id || ''),
      right_title: String(right.title || ''),
      right_authors: String(right.authors || ''),
      right_year: String(right.year || ''),
      right_journal: String(right.journal || ''),
      right_pages: String(right.pages || ''),
      right_identifier: String(right.identifier_raw || right.doi || ''),
    };
  });
}

function renderDedupReviewSummary(results) {
  const containers = [
    document.getElementById('dedupReviewSummary'),
    document.getElementById('dedupReviewSummaryFinal'),
  ].filter(Boolean);

  if (containers.length === 0) return;
  if (!results || !results.counts) {
    containers.forEach((container) => {
      container.innerHTML = '';
    });
    return;
  }

  const hardCount = Number(results.counts.duplicates || 0);
  const candidateCount = Number(results.counts.candidate_duplicates || 0);
  const hasCandidates = candidateCount > 0;
  const panelBorder = hasCandidates ? 'var(--color-warning)' : 'var(--color-info)';
  const buttonDisabled = hasCandidates ? '' : 'disabled';
  const helperZh = hasCandidates
    ? '&#x7591;&#x4F3C;&#x91CD;&#x590D;&#x662F;&#x76F8;&#x4F3C;&#x5EA6;&#x8F83;&#x9AD8;&#x4F46;&#x8FD8;&#x4E0D;&#x8DB3;&#x4EE5;&#x76F4;&#x63A5;&#x5224;&#x5B9A;&#x4E3A;&#x540C;&#x4E00;&#x6761;&#x8BB0;&#x5F55;&#x7684;&#x6587;&#x732E;&#xFF0C;&#x4EC5;&#x63D0;&#x793A;&#x4EBA;&#x5DE5;&#x590D;&#x6838;&#xFF0C;&#x4E0D;&#x4F1A;&#x81EA;&#x52A8;&#x4ECE;&#x4FDD;&#x7559;&#x7ED3;&#x679C;&#x4E2D;&#x5220;&#x9664;&#x3002;'
    : '&#x672C;&#x8F6E;&#x672A;&#x68C0;&#x51FA;&#x9700;&#x8981;&#x4EBA;&#x5DE5;&#x590D;&#x6838;&#x7684;&#x7591;&#x4F3C;&#x91CD;&#x590D;&#x3002;';
  const helperEn = hasCandidates
    ? 'Possible duplicates stay in the retained set until a human reviews them.'
    : 'There are no candidate duplicates waiting for manual review.';

  const html = `
    <div class="info-box workspace-info-panel" style="margin-top: var(--space-20); background: var(--color-bg-1); border-left: 4px solid ${panelBorder};">
      <h3><span class="zh">&#x91CD;&#x590D;&#x8BB0;&#x5F55;&#x590D;&#x6838;</span><span class="en">Duplicate Review Summary</span></h3>
      <div class="grid-2" style="gap: var(--space-16); margin-top: var(--space-12);">
        <div class="surface-panel dedup-explainer-card">
          <strong><span class="zh">&#x660E;&#x786E;&#x91CD;&#x590D;&#xFF08;&#x5DF2;&#x81EA;&#x52A8;&#x79FB;&#x9664;&#xFF09;</span><span class="en">Confirmed duplicates auto-removed</span></strong>
          <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin-top: var(--space-8);">${hardCount}</div>
          <div class="muted-text" style="margin-top: var(--space-4);"><span class="zh">&#x6307; DOI / PMID / PMCID &#x6216;&#x6838;&#x5FC3;&#x6807;&#x8BC6;&#x4FE1;&#x606F;&#x5DF2;&#x8DB3;&#x591F;&#x786E;&#x8BA4;&#x662F;&#x540C;&#x4E00;&#x6761;&#x8BB0;&#x5F55;&#xFF0C;&#x7CFB;&#x7EDF;&#x5DF2;&#x4ECE;&#x540E;&#x7EED;&#x7B5B;&#x9009;&#x4E2D;&#x79FB;&#x9664;&#x3002;</span><span class="en">Records with strong identifier evidence are removed automatically from downstream screening.</span></div>
        </div>
        <div class="surface-panel dedup-explainer-card">
          <strong><span class="zh">&#x7591;&#x4F3C;&#x91CD;&#x590D;&#xFF08;&#x5F85;&#x4EBA;&#x5DE5;&#x590D;&#x6838;&#xFF09;</span><span class="en">Possible duplicates need review</span></strong>
          <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin-top: var(--space-8);">${candidateCount}</div>
          <div class="muted-text" style="margin-top: var(--space-4);"><span class="zh">&#x6307;&#x6807;&#x9898;&#x3001;&#x4F5C;&#x8005;&#x3001;&#x5E74;&#x4EFD;&#x7B49;&#x4FE1;&#x606F;&#x9AD8;&#x5EA6;&#x76F8;&#x4F3C;&#xFF0C;&#x4F46;&#x8FD8;&#x4E0D;&#x80FD;&#x76F4;&#x63A5;&#x8BA4;&#x5B9A;&#x4E3A;&#x91CD;&#x590D;&#xFF0C;&#x9700;&#x7531;&#x4EBA;&#x5DE5;&#x51B3;&#x5B9A;&#x662F;&#x5426;&#x5408;&#x5E76;&#x6216;&#x4FDD;&#x7559;&#x3002;</span><span class="en">Records look very similar, but still require a human decision before merge or retention.</span></div>
        </div>
      </div>
      <p class="muted-text" style="margin-top: var(--space-12);"><span class="zh">${helperZh}</span><span class="en">${helperEn}</span></p>
      <div class="button-group" style="margin-top: var(--space-12);">
        <button type="button" class="btn btn-secondary" onclick="downloadFile('candidate-duplicates')" ${buttonDisabled}><span class="zh">&#x5BFC;&#x51FA;&#x7591;&#x4F3C;&#x91CD;&#x590D;&#x6E05;&#x5355;</span><span class="en">Export Possible Duplicates</span></button>
      </div>
    </div>
  `;

  containers.forEach((container) => {
    container.innerHTML = html;
    container.style.display = 'block';
  });
}

function renderConservativeAiQueuePanel() {
  const container = document.getElementById('conservativeAiQueuePanel');
  if (!container) return;

  const entries = (Array.isArray(aiSuggestionEvents) ? aiSuggestionEvents : []).filter((entry) => {
    const stage = String(entry?.stage || '').trim();
    const metadata = entry?.metadata || {};
    return stage === 'title_abstract' && metadata.advisoryOnly === true;
  });

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="muted-text">
        <span class="zh">当前还没有 V2.6 conservative AI 队列。可在这里生成本地 advisory suggestions，再决定是否进入全文复核。</span>
        <span class="en">There is no V2.6 conservative AI queue yet. Generate local advisory suggestions here before moving to full-text review.</span>
      </div>
    `;
    return;
  }

  const buckets = [
    ['likely_relevant', '优先保留', 'Likely relevant'],
    ['needs_human_attention', '需要人工关注', 'Needs human attention'],
    ['needs_human_exclusion_check', '需要重点排除核查', 'Needs human exclusion check'],
  ];
  const queueSummary = getConservativeAiQueueSummary(entries);
  const bucketSummaryHtml = buckets.map(([bucketKey]) => `
    <span class="status-chip">${escapeHTML(getConservativeAiQueueLabel(bucketKey))}: ${escapeHTML(String(queueSummary.buckets[bucketKey] || 0))}</span>
  `).join('');
  const sortedEntries = getSortedConservativeAiQueueEntries(entries);

  const activeFilter = ['all', ...buckets.map(([bucketKey]) => bucketKey)].includes(conservativeAiQueueFilter)
    ? conservativeAiQueueFilter
    : 'all';
  const visibleBuckets = activeFilter === 'all'
    ? buckets
    : buckets.filter(([bucketKey]) => bucketKey === activeFilter);

  const filterHtml = [
    ['all', '全部建议', 'All suggestions'],
    ...buckets,
  ].map(([filterKey, zhLabel, enLabel]) => {
    const buttonClass = filterKey === activeFilter ? 'btn btn-primary' : 'btn btn-secondary';
    return `
      <button type="button" class="${buttonClass}" onclick="setConservativeAiQueueFilter('${filterKey}')">
        <span class="zh">${escapeHTML(zhLabel)}</span>
        <span class="en">${escapeHTML(enLabel)}</span>
      </button>
    `;
  }).join('');

  const sortHtml = [
    ['original', '原始顺序', 'Original order'],
    ['priority', '优先级分数', 'Priority score'],
  ].map(([sortMode, zhLabel, enLabel]) => {
    const buttonClass = sortMode === conservativeAiQueueSortMode ? 'btn btn-primary' : 'btn btn-secondary';
    return `
      <button type="button" class="${buttonClass}" onclick="setConservativeAiQueueSortMode('${sortMode}')">
        <span class="zh">${escapeHTML(zhLabel)}</span>
        <span class="en">${escapeHTML(enLabel)}</span>
      </button>
    `;
  }).join('');

  const bucketHtml = visibleBuckets.map(([bucketKey, zhLabel, enLabel]) => {
    const bucketEntries = sortedEntries.filter((entry) => (entry?.metadata?.recommendedQueue || '') === bucketKey);
    const rowHtml = bucketEntries.length > 0
      ? bucketEntries.map((entry) => {
          const uncertaintyFlags = Array.isArray(entry?.metadata?.uncertaintyFlags) ? entry.metadata.uncertaintyFlags : [];
          const encodedRecordId = encodeURIComponent(String(entry?.recordId || entry?.record_id || ''));
          return `
            <li>
              <strong>${escapeHTML(entry.inputSummary || entry.recordId || entry.suggestionId || 'Untitled')}</strong>
              <div class="muted-text">Recommended queue: ${escapeHTML(getConservativeAiQueueLabel(bucketKey))}</div>
              <div class="muted-text">Priority score: ${escapeHTML(String(entry?.metadata?.priorityScore ?? '-'))}</div>
              <div class="muted-text">Uncertainty flags: ${escapeHTML(uncertaintyFlags.length ? uncertaintyFlags.join(', ') : '-')}</div>
              <div style="margin-top: 8px;">
                <button type="button" class="btn btn-secondary" onclick="openConservativeAiQueueRecord(decodeURIComponent('${encodedRecordId}'))">
                  <span class="zh">跳转到全文复核</span>
                  <span class="en">Go to full-text review</span>
                </button>
              </div>
            </li>
          `;
        }).join('')
      : '<li class="muted-text">0</li>';

    return `
      <div class="surface-panel" style="padding: 12px;">
        <div style="font-weight: var(--font-weight-semibold); margin-bottom: 8px;">
          <span class="zh">${escapeHTML(zhLabel)}</span>
          <span class="en">${escapeHTML(enLabel)}</span>
          <span class="muted-text">(${bucketEntries.length})</span>
        </div>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.7;">${rowHtml}</ul>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="surface-panel" style="padding: 12px; margin-bottom: 12px;">
      <div style="font-weight: var(--font-weight-semibold); margin-bottom: 8px;">
        <span class="zh">队列摘要</span><span class="en">Queue summary</span>
      </div>
      <div class="grid grid-3" style="gap: var(--space-12); margin-bottom: 8px;">
        <div><span class="zh">建议总数</span><span class="en">Total suggestions</span>: <strong>${escapeHTML(String(queueSummary.total))}</strong></div>
        <div><span class="zh">待人工复核</span><span class="en">Pending review</span>: <strong>${escapeHTML(String(queueSummary.pending))}</strong></div>
        <div><span class="zh">已人工复核</span><span class="en">Reviewed</span>: <strong>${escapeHTML(String(queueSummary.reviewed))}</strong></div>
      </div>
      <div class="button-group" style="gap: var(--space-8);">${bucketSummaryHtml}</div>
    </div>
    <div class="button-group" style="margin-bottom: 12px;">
      ${filterHtml}
    </div>
    <div class="button-group" style="margin-bottom: 12px;">
      ${sortHtml}
    </div>
    <div class="muted-text" style="margin-bottom: 12px;">
      <span class="zh">先按建议队列聚焦，再直接打开对应全文复核记录。</span>
      <span class="en">Filter the advisory queue first, then open the matching full-text review record directly.</span>
    </div>
    <div class="grid grid-3" style="gap: var(--space-12);">
      ${bucketHtml}
    </div>
  `;
}

function displayResults(results) {
  if (!results || !results.counts) {
    showToast('没有可显示的结果，请先完成文献筛选', 'warning');
    return;
  }
  
  const counts = results.counts;
  
  // Update Step 3 stats
  document.getElementById('stat-identified-db').textContent = counts.identified_db || 0;
  document.getElementById('stat-identified-other').textContent = counts.identified_other || 0;
  document.getElementById('stat-after-dupes').textContent = counts.after_dupes || 0;
  document.getElementById('stat-screened').textContent = counts.screened || 0;
  document.getElementById('stat-excluded-ta').textContent = counts.excluded_ta || 0;
  document.getElementById('stat-fulltext').textContent = counts.fulltext || 0;
  document.getElementById('stat-excluded-ft').textContent = counts.excluded_ft || 0;
  document.getElementById('stat-included').textContent = counts.included || 0;

  // Update Step 5 stats (if exists)
  const step5Exists = document.getElementById('stat-identified-db-final');
  if (step5Exists) {
    document.getElementById('stat-identified-db-final').textContent = counts.identified_db || 0;
    document.getElementById('stat-identified-other-final').textContent = counts.identified_other || 0;
    document.getElementById('stat-after-dupes-final').textContent = counts.after_dupes || 0;
    document.getElementById('stat-screened-final').textContent = counts.screened || 0;
    document.getElementById('stat-excluded-ta-final').textContent = counts.excluded_ta || 0;
    document.getElementById('stat-fulltext-final').textContent = counts.fulltext || 0;
    document.getElementById('stat-excluded-ft-final').textContent = counts.excluded_ft || 0;
    document.getElementById('stat-included-final').textContent = counts.included || 0;
  }

  renderDedupReviewSummary(results);
  renderFilterRulesOverview(results.rules || filterRules);
  renderScreeningDiagnostics(results);
  renderConservativeAiQueuePanel();
  
  // Render rules overview in Step5 if exists
  const rulesOverviewFinal = document.getElementById('filterRulesOverviewFinal');
  if (rulesOverviewFinal) {
    // 暂时复用renderFilterRulesOverview的逻辑，直接设置innerHTML
    const tempContainer = document.createElement('div');
    tempContainer.id = 'filterRulesOverview';
    const originalContainer = document.getElementById('filterRulesOverview');
    if (originalContainer) {
      const parent = originalContainer.parentNode;
      parent.insertBefore(tempContainer, originalContainer);
      renderFilterRulesOverview(results.rules || filterRules);
      rulesOverviewFinal.innerHTML = tempContainer.innerHTML;
      parent.removeChild(tempContainer);
    }
  }
  
  updateStep4EntryLock();

  // Set default theme
  currentTheme = 'subtle';
  const svg = generatePRISMASVG(counts, currentTheme, getSelectedPrismaMode());
  document.getElementById('svgPreview').innerHTML = svg;
  
  // Update Step 5 preview if exists (use prisma2020 as default for Step5)
  const svgPreviewFinal = document.getElementById('svgPreviewFinal');
  if (svgPreviewFinal) {
    const modeFinal = document.querySelector('input[name="prismaModeFinal"]:checked')?.value || 'prisma2020';
    const svgFinal = generatePRISMASVG(counts, currentTheme, modeFinal);
    svgPreviewFinal.innerHTML = svgFinal;
  }
  
  // Setup theme change listeners
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentTheme = e.target.value;
      updateCurrentThemeLabel();
    });
  });

  // PRISMA mode change listeners
  document.querySelectorAll('input[name="prismaMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!screeningResults) return;
      const svg2 = generatePRISMASVG(screeningResults.counts, currentTheme, getSelectedPrismaMode());
      document.getElementById('svgPreview').innerHTML = svg2;
    });
  });

  // Step 5 PRISMA mode listeners
  document.querySelectorAll('input[name="prismaModeFinal"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!screeningResults) return;
      const mode = document.querySelector('input[name="prismaModeFinal"]:checked')?.value || 'prisma2020';
      const svg3 = generatePRISMASVG(screeningResults.counts, currentTheme, mode);
      const previewFinal = document.getElementById('svgPreviewFinal');
      if (previewFinal) previewFinal.innerHTML = svg3;
    });
  });

  // Step 5 theme listeners
  document.querySelectorAll('input[name="themeFinal"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentTheme = e.target.value;
      updateCurrentThemeLabel();
      const labelFinal = document.getElementById('currentThemeLabelFinal');
      if (labelFinal) labelFinal.textContent = colorThemes[currentTheme].name;
      // 更新 Step5 的 PRISMA 预览
      if (screeningResults) {
        const mode = document.querySelector('input[name="prismaModeFinal"]:checked')?.value || 'prisma2020';
        const svg = generatePRISMASVG(screeningResults.counts, currentTheme, mode);
        const previewFinal = document.getElementById('svgPreviewFinal');
        if (previewFinal) previewFinal.innerHTML = svg;
      }
    });
  });
  
  updateCurrentThemeLabel();
  renderQualityAssessmentShell();
  renderImportJobShell();
}

function updateThemePreview() {
  if (!screeningResults) return;
  
  const selectedTheme = document.querySelector('input[name="theme"]:checked')?.value || 'subtle';
  currentTheme = selectedTheme;
  
  const svg = generatePRISMASVG(screeningResults.counts, currentTheme, getSelectedPrismaMode());
  document.getElementById('svgPreview').innerHTML = svg;
  
  updateCurrentThemeLabel();
  showToast(`已切换到${colorThemes[currentTheme].name}主题`, 'success');
}

function updateCurrentThemeLabel() {
  const label = document.getElementById('currentThemeLabel');
  if (label) {
    label.textContent = colorThemes[currentTheme].name;
  }
  const labelFinal = document.getElementById('currentThemeLabelFinal');
  if (labelFinal) {
    labelFinal.textContent = colorThemes[currentTheme].name;
  }
}

function updateThemePreviewFinal() {
  if (!screeningResults) return;
  
  const selectedTheme = document.querySelector('input[name="themeFinal"]:checked')?.value || 'subtle';
  currentTheme = selectedTheme;
  
  const mode = document.querySelector('input[name="prismaModeFinal"]:checked')?.value || 'prisma2020';
  const svg = generatePRISMASVG(screeningResults.counts, currentTheme, mode);
  document.getElementById('svgPreviewFinal').innerHTML = svg;
  
  updateCurrentThemeLabel();
  showToast(`已切换到${colorThemes[currentTheme].name}主题`, 'success');
}

function getFulltextExclusionReasonStats(limit = 6) {
  if (!screeningResults || !Array.isArray(screeningResults.excluded)) return [];
  const map = {};
  screeningResults.excluded
    .filter(r => r && r._exclude_stage === 'fulltext' && r._exclude_reason)
    .forEach(r => {
      const key = String(r._exclude_reason).trim();
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });

  return Object.entries(map)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function generatePRISMASVG(counts, theme = 'subtle', mode = 'prisma2020') {
  const selectedMode = mode === 'simple' ? 'simple' : 'prisma2020';
  const colors = (colorThemes[theme] || colorThemes.subtle).colors;
  const themeName = (colorThemes[theme] || colorThemes.subtle).name;

  const reasons = getFulltextExclusionReasonStats(6);
  const reasonLines = reasons.length
    ? reasons.map((r, i) => ({
        text: `• ${r.reason}: ${r.count} 篇`,
        yOffset: i * 18
      }))
    : [{ text: '• （暂无全文排除统计）', yOffset: 0 }];

  if (selectedMode === 'simple') {
    const width = 800;
    const height = 1200;
    const boxWidth = 200;
    const boxHeight = 80;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="${colors.border}" />
          </marker>
        </defs>

        <!-- Identification -->
        <rect x="50" y="20" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.identified}" fill-opacity="0.3" stroke="${colors.border}" stroke-width="2"/>
        <text x="150" y="50" text-anchor="middle" font-size="14" font-weight="bold" fill="${colors.text}">识别: 数据库</text>
        <text x="150" y="70" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.identified_db}</text>

        <rect x="300" y="20" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.identified}" fill-opacity="0.3" stroke="${colors.border}" stroke-width="2"/>
        <text x="400" y="50" text-anchor="middle" font-size="14" font-weight="bold" fill="${colors.text}">识别: 其他来源</text>
        <text x="400" y="70" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.identified_other}</text>

        <!-- Duplicates removed -->
        <rect x="550" y="140" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.duplicates}" fill-opacity="0.3" stroke="${colors.border}" stroke-width="2"/>
        <text x="650" y="170" text-anchor="middle" font-size="14" font-weight="bold" fill="${colors.text}">去除重复</text>
        <text x="650" y="190" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.duplicates}</text>

        <line x1="275" y1="100" x2="275" y2="140" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>
        <line x1="275" y1="140" x2="650" y2="140" stroke="${colors.border}" stroke-width="2" stroke-dasharray="5,5"/>

        <!-- After deduplication -->
        <rect x="175" y="140" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.screened}" fill-opacity="0.3" stroke="${colors.border}" stroke-width="2"/>
        <text x="275" y="170" text-anchor="middle" font-size="14" font-weight="bold" fill="${colors.text}">去重后记录</text>
        <text x="275" y="190" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.after_dupes}</text>

        <!-- Screening -->
        <rect x="175" y="260" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.screened}" fill-opacity="0.3" stroke="${colors.border}" stroke-width="2"/>
        <text x="275" y="290" text-anchor="middle" font-size="14" font-weight="bold" fill="${colors.text}">标题/摘要筛选</text>
        <text x="275" y="310" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.screened}</text>

        <line x1="275" y1="220" x2="275" y2="260" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>

        <!-- TA Excluded -->
        <rect x="550" y="260" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.excluded}" fill-opacity="0.3" stroke="${colors.border}" stroke-width="2"/>
        <text x="650" y="280" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">标题/摘要排除</text>
        <text x="650" y="300" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.excluded_ta}</text>

        <line x1="375" y1="300" x2="550" y2="300" stroke="${colors.border}" stroke-width="2" stroke-dasharray="5,5"/>

        <!-- Fulltext -->
        <rect x="175" y="380" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.screened}" fill-opacity="0.3" stroke="${colors.border}" stroke-width="2"/>
        <text x="275" y="410" text-anchor="middle" font-size="14" font-weight="bold" fill="${colors.text}">全文评估</text>
        <text x="275" y="430" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.fulltext}</text>

        <line x1="275" y1="340" x2="275" y2="380" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>

        <!-- FT Excluded -->
        <rect x="550" y="380" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.excluded}" fill-opacity="0.3" stroke="${colors.border}" stroke-width="2"/>
        <text x="650" y="410" text-anchor="middle" font-size="14" font-weight="bold" fill="${colors.text}">全文排除</text>
        <text x="650" y="430" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.excluded_ft}</text>

        <line x1="375" y1="420" x2="550" y2="420" stroke="${colors.border}" stroke-width="2" stroke-dasharray="5,5"/>

        <!-- Included -->
        <rect x="175" y="500" width="${boxWidth}" height="${boxHeight}" rx="10" fill="${colors.included}" fill-opacity="0.4" stroke="${colors.border}" stroke-width="3"/>
        <text x="275" y="530" text-anchor="middle" font-size="14" font-weight="bold" fill="${colors.text}">✓ 最终纳入</text>
        <text x="275" y="550" text-anchor="middle" font-size="20" font-weight="bold" fill="${colors.text}">${counts.included}</text>

        <line x1="275" y1="460" x2="275" y2="500" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>

        <!-- Fulltext exclusion reasons (dynamic) -->
        <text x="50" y="620" font-size="12" font-weight="bold" fill="${colors.text}">全文排除原因（Top ${Math.min(6, reasons.length || 1)}）:</text>
        ${reasonLines.map((r, i) => `<text x="50" y="${645 + r.yOffset}" font-size="11" fill="${colors.text}">${escapeHTML(r.text)}</text>`).join('')}

        <!-- Title -->
        <text x="400" y="760" text-anchor="middle" font-size="16" font-weight="bold" fill="${colors.text}">PRISMA 流程图（简化版）</text>
        <text x="400" y="785" text-anchor="middle" font-size="12" fill="${colors.text}" opacity="0.7">主题: ${escapeHTML(themeName)} | 生成时间: ${escapeHTML(new Date().toLocaleDateString('zh-CN'))}</text>
      </svg>
    `;
  }

  // PRISMA 2020-like layout
  const width = 1120;
  const height = 1500;
  const boxW = 320;
  const boxH = 72;

  const xCenter = (width - boxW) / 2;
  const xRight = width - boxW - 40;
  const xLeft = 40;

  const y0 = 60;
  const gapY = 145;

  const yId = y0;
  const yRemoved = yId + gapY;
  const yScreened = yRemoved + gapY;
  const ySought = yScreened + gapY;
  const yAssessed = ySought + gapY;
  const yIncluded = yAssessed + gapY;

  // 右侧排除框的Y坐标应与对应的主流程框相同，确保虚线水平
  const yExcludedRecords = yScreened;
  const yNotRetrieved = ySought;
  const yReportsExcluded = yAssessed;

  const totalIdentified = (counts.identified_db || 0) + (counts.identified_other || 0);

  const reasonStartY = yReportsExcluded + boxH + 26;
  const reasonSvgLines = reasonLines.slice(0, 6).map((r, i) => {
    const y = reasonStartY + i * 18;
    return `<text x="${xRight}" y="${y}" font-size="11" fill="${colors.text}">${escapeHTML(r.text)}</text>`;
  }).join('');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="${colors.border}" />
        </marker>
      </defs>

      <!-- Title -->
      <text x="${width / 2}" y="20" text-anchor="middle" font-size="16" font-weight="bold" fill="${colors.text}">PRISMA 2020 文献筛选流程图</text>
      <text x="${width / 2}" y="42" text-anchor="middle" font-size="12" fill="${colors.text}" opacity="0.7">主题: ${escapeHTML(themeName)} | 生成时间: ${escapeHTML(new Date().toLocaleDateString('zh-CN'))}</text>

      <!-- Identification (center) -->
      <rect x="${xCenter}" y="${yId}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.identified}" fill-opacity="0.25" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xCenter + boxW / 2}" y="${yId + 26}" text-anchor="middle" font-size="13" font-weight="bold" fill="${colors.text}">识别的记录</text>
      <text x="${xCenter + boxW / 2}" y="${yId + 46}" text-anchor="middle" font-size="12" fill="${colors.text}">数据库: ${counts.identified_db || 0} | 其他来源: ${counts.identified_other || 0} | 合计: ${totalIdentified}</text>

      <!-- Records removed before screening (right) -->
      <rect x="${xRight}" y="${yRemoved}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.duplicates}" fill-opacity="0.25" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xRight + boxW / 2}" y="${yRemoved + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">筛选前移除的记录</text>
      <text x="${xRight + boxW / 2}" y="${yRemoved + 48}" text-anchor="middle" font-size="12" fill="${colors.text}">去重移除: ${counts.duplicates || 0} | 其他: 0</text>

      <!-- After dupes (center) -->
      <rect x="${xCenter}" y="${yRemoved}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.screened}" fill-opacity="0.25" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xCenter + boxW / 2}" y="${yRemoved + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">去重后记录</text>
      <text x="${xCenter + boxW / 2}" y="${yRemoved + 50}" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.after_dupes || 0}</text>

      <!-- Records screened (center) -->
      <rect x="${xCenter}" y="${yScreened}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.screened}" fill-opacity="0.25" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xCenter + boxW / 2}" y="${yScreened + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">记录筛选（标题/摘要）</text>
      <text x="${xCenter + boxW / 2}" y="${yScreened + 50}" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.screened || 0}</text>

      <!-- Records excluded (right) -->
      <rect x="${xRight}" y="${yExcludedRecords}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.excluded}" fill-opacity="0.25" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xRight + boxW / 2}" y="${yExcludedRecords + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">记录排除</text>
      <text x="${xRight + boxW / 2}" y="${yExcludedRecords + 50}" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.excluded_ta || 0}</text>

      <!-- Reports sought (center) -->
      <rect x="${xCenter}" y="${ySought}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.screened}" fill-opacity="0.25" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xCenter + boxW / 2}" y="${ySought + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">全文检索（报告获取）</text>
      <text x="${xCenter + boxW / 2}" y="${ySought + 50}" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.fulltext || 0}</text>

      <!-- Reports not retrieved (right) -->
      <rect x="${xRight}" y="${yNotRetrieved}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.excluded}" fill-opacity="0.15" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xRight + boxW / 2}" y="${yNotRetrieved + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">未能获取全文</text>
      <text x="${xRight + boxW / 2}" y="${yNotRetrieved + 50}" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">0</text>

      <!-- Reports assessed (center) -->
      <rect x="${xCenter}" y="${yAssessed}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.screened}" fill-opacity="0.25" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xCenter + boxW / 2}" y="${yAssessed + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">全文合格性评估</text>
      <text x="${xCenter + boxW / 2}" y="${yAssessed + 50}" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.fulltext || 0}</text>

      <!-- Reports excluded (right) -->
      <rect x="${xRight}" y="${yReportsExcluded}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.excluded}" fill-opacity="0.25" stroke="${colors.border}" stroke-width="2"/>
      <text x="${xRight + boxW / 2}" y="${yReportsExcluded + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">全文排除（含原因）</text>
      <text x="${xRight + boxW / 2}" y="${yReportsExcluded + 50}" text-anchor="middle" font-size="18" font-weight="bold" fill="${colors.text}">${counts.excluded_ft || 0}</text>

      <!-- Included (center) -->
      <rect x="${xCenter}" y="${yIncluded}" width="${boxW}" height="${boxH}" rx="10" fill="${colors.included}" fill-opacity="0.35" stroke="${colors.border}" stroke-width="3"/>
      <text x="${xCenter + boxW / 2}" y="${yIncluded + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="${colors.text}">最终纳入研究</text>
      <text x="${xCenter + boxW / 2}" y="${yIncluded + 52}" text-anchor="middle" font-size="20" font-weight="bold" fill="${colors.text}">${counts.included || 0}</text>

      <!-- Arrows -->
      <line x1="${xCenter + boxW / 2}" y1="${yId + boxH}" x2="${xCenter + boxW / 2}" y2="${yRemoved}" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>
      <line x1="${xCenter + boxW / 2}" y1="${yRemoved + boxH}" x2="${xCenter + boxW / 2}" y2="${yScreened}" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>
      <line x1="${xCenter + boxW / 2}" y1="${yScreened + boxH}" x2="${xCenter + boxW / 2}" y2="${ySought}" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>
      <line x1="${xCenter + boxW / 2}" y1="${ySought + boxH}" x2="${xCenter + boxW / 2}" y2="${yAssessed}" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>
      <line x1="${xCenter + boxW / 2}" y1="${yAssessed + boxH}" x2="${xCenter + boxW / 2}" y2="${yIncluded}" stroke="${colors.border}" stroke-width="2" marker-end="url(#arrowhead)"/>

      <line x1="${xCenter + boxW}" y1="${yRemoved + boxH / 2}" x2="${xRight}" y2="${yRemoved + boxH / 2}" stroke="${colors.border}" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrowhead)"/>
      <line x1="${xCenter + boxW}" y1="${yScreened + boxH / 2}" x2="${xRight}" y2="${yExcludedRecords + boxH / 2}" stroke="${colors.border}" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrowhead)"/>
      <line x1="${xCenter + boxW}" y1="${ySought + boxH / 2}" x2="${xRight}" y2="${yNotRetrieved + boxH / 2}" stroke="${colors.border}" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrowhead)"/>
      <line x1="${xCenter + boxW}" y1="${yAssessed + boxH / 2}" x2="${xRight}" y2="${yReportsExcluded + boxH / 2}" stroke="${colors.border}" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrowhead)"/>

      <!-- Exclusion reason list -->
      <text x="${xRight}" y="${reasonStartY - 10}" font-size="12" font-weight="bold" fill="${colors.text}">全文排除原因（Top ${Math.min(6, reasons.length || 1)}）:</text>
      ${reasonSvgLines}
    </svg>
  `;
}

// Download functions
function getCandidateDuplicateExportData() {
  if (!screeningResults || !Array.isArray(screeningResults.candidateDuplicates)) {
    return [];
  }

  return flattenCandidateDuplicatesForExport(screeningResults.candidateDuplicates);
}

function buildQualityAppraisalExportContent() {
  if (!QUALITY_ENGINE || typeof QUALITY_ENGINE.serializeQualityAppraisalCsv !== 'function') {
    return 'assessment_id,record_id,title,study_type,tool_family,template_id,domain,judgement,supporting_quote,reviewer_note,overall_judgement,status,updated_at\n';
  }

  qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments);
  return QUALITY_ENGINE.serializeQualityAppraisalCsv(qualityAssessments);
}

function buildEvidenceTableExportContent() {
  if (!QUALITY_ENGINE || typeof QUALITY_ENGINE.serializeEvidenceTableCsv !== 'function') {
    return 'record_id,title,authors,year,study_design,population,intervention,comparison,outcome,effect_measure,effect_estimate,quality_judgement,certainty_of_evidence,notes\n';
  }

  const includedRecords = Array.isArray(screeningResults?.included) ? screeningResults.included : [];
  qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments);
  return QUALITY_ENGINE.serializeEvidenceTableCsv(includedRecords, qualityAssessments);
}

function buildGradeSummaryExportContent() {
  if (!QUALITY_ENGINE || typeof QUALITY_ENGINE.serializeGradeSummaryCsv !== 'function') {
    return 'outcome,population,intervention,comparison,study_count,record_ids,study_designs,effect_summary,quality_judgement_summary,baseline_certainty,manual_grade_certainty,grade_status,downgrade_reasons,notes\n';
  }

  const includedRecords = Array.isArray(screeningResults?.included) ? screeningResults.included : [];
  qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments);
  return QUALITY_ENGINE.serializeGradeSummaryCsv(includedRecords, qualityAssessments);
}

function isAuditExportType(type) {
  return AUDIT_EXPORT_TYPES.includes(type);
}

function isDualReviewExportType(type) {
  return DUAL_REVIEW_EXPORT_TYPES.includes(type);
}

function buildDualReviewExportInput() {
  const state = refreshDualReviewConflictState();
  return {
    screeningDecisions,
    records: getFulltextReviewRecordsForConflictState(),
    qualityAssessments: getQualityReviewConflictInputs(),
    screeningPairs: state.screeningPairs || [],
    screeningConflicts: state.screeningConflicts || [],
    qualityConflicts: state.qualityConflicts || [],
    screeningAgreementMetrics: state.agreementMetrics || null,
    exportGate: state.exportGate || null,
  };
}

function buildDualReviewExportContent(type) {
  if (!DUAL_REVIEW_ENGINE) {
    return '';
  }

  const input = buildDualReviewExportInput();
  switch (type) {
    case 'dual_review_conflicts':
      return DUAL_REVIEW_ENGINE.serializeDualReviewConflictsCsv(input);
    case 'dual_review_agreement':
      return DUAL_REVIEW_ENGINE.serializeDualReviewAgreementJson(input);
    default:
      return '';
  }
}

function buildAuditExportContent(type) {
  if (!AUDIT_ENGINE) {
    return '';
  }

  const manifest = ensureProjectManifest();
  refreshDualReviewConflictState();

  switch (type) {
    case 'audit_manifest':
      return JSON.stringify(AUDIT_ENGINE.buildProjectManifestExport(manifest), null, 2);
    case 'audit_events':
      return AUDIT_ENGINE.serializeEventsJsonl(auditEvents);
    case 'audit_screening_decisions':
      return AUDIT_ENGINE.serializeScreeningDecisionsCsv(screeningDecisions);
    case 'audit_exclusion_reasons':
      return AUDIT_ENGINE.serializeExclusionReasonsCsv(screeningDecisions, AUDIT_ENGINE.EXCLUSION_REASONS);
    case 'audit_prisma_counts':
      return JSON.stringify(AUDIT_ENGINE.buildPrismaCountsJson(screeningDecisions, auditEvents), null, 2);
    case 'audit_summary':
      return AUDIT_ENGINE.buildAuditSummaryMarkdown(manifest, auditEvents, screeningDecisions, {
        language: typeof getAiSuggestionPanelLang === 'function' ? getAiSuggestionPanelLang() : 'en',
      });
    case 'ai_usage_registry':
      return JSON.stringify(AUDIT_ENGINE.buildAiUsageRegistryExport(manifest), null, 2);
    case 'ai_suggestions':
      return AUDIT_ENGINE.serializeAiSuggestionEventsJsonl(aiSuggestionEvents);
    case 'prisma_traice_report':
      return AUDIT_ENGINE.buildPrismaTraiceReportMarkdown(manifest, aiSuggestionEvents, {
        language: typeof getAiSuggestionPanelLang === 'function' ? getAiSuggestionPanelLang() : 'en',
      });
    default:
      return '';
  }
}

function downloadFile(type) {
  const isAuditExport = isAuditExportType(type);
  const isDualReviewExport = isDualReviewExportType(type);
  const finalExportTypes = new Set(V25_FINAL_CONFLICT_GATED_EXPORT_TYPES);

  if (!screeningResults && !isAuditExport && !isDualReviewExport) {
    showToast('没有可下载的结果', 'error');
    return;
  }

  if (!maybeWarnUnresolvedConflictsBeforeExport(type)) {
    return;
  }

  if (isAuditExport && !AUDIT_ENGINE) {
    showToast('审计导出模块尚未加载', 'error');
    return;
  }

  if (isDualReviewExport && !DUAL_REVIEW_ENGINE) {
    showToast('Dual-review export module is not loaded', 'error');
    return;
  }

  if (finalExportTypes.has(type)) {
    createProjectHistorySnapshot('before_export', `Before export ${type}`);
  }

  let content = '';
  let filename = '';
  let mimeType = '';

  switch (type) {
    case 'included':
      content = generateExcelUTF8BOM(screeningResults.included, 'included');
      filename = 'included_studies.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'excluded':
      // v3.0: Export all excluded records (both TA and FT stages)
      // Debug: log the data before filtering
      console.log('📥 下载排除文献调试：');
      console.log('- screeningResults.excluded 长度:', screeningResults.excluded.length);
      console.log('- 前3条数据:', screeningResults.excluded.slice(0, 3));
      
      const excludedData = screeningResults.excluded;
      if (excludedData.length === 0) {
        showToast('💡 当前没有被排除的文献。可在"第2步-配置筛选规则"中添加排除关键词，或在"第4步-人工审查"中手动排除文献。', 'info');
        return;
      }
      
      content = generateExcelUTF8BOM(excludedData, 'excluded');
      filename = 'excluded_studies.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'candidate-duplicates':
      const candidateData = getCandidateDuplicateExportData();
      if (candidateData.length === 0) {
        showToast('当前没有待复核的疑似重复。', 'info');
        return;
      }
      content = generateExcelUTF8BOM(candidateData, 'candidate_duplicates');
      filename = 'candidate_duplicates.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'svg-colorful':
      content = generatePRISMASVG(screeningResults.counts, 'colorful', getSelectedPrismaMode());
      filename = 'prisma_flow_colorful.svg';
      mimeType = 'image/svg+xml';
      break;
    case 'svg-blackwhite':
      content = generatePRISMASVG(screeningResults.counts, 'blackwhite', getSelectedPrismaMode());
      filename = 'prisma_flow_blackwhite.svg';
      mimeType = 'image/svg+xml';
      break;
    case 'svg-subtle':
      content = generatePRISMASVG(screeningResults.counts, 'subtle', getSelectedPrismaMode());
      filename = 'prisma_flow_subtle.svg';
      mimeType = 'image/svg+xml';
      break;
    case 'report':
      content = generateReport(screeningResults);
      filename = 'screening_report.md';
      mimeType = 'text/markdown';
      break;
    case 'quality_appraisal':
      content = buildQualityAppraisalExportContent();
      filename = 'quality_appraisal.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'evidence_table':
      content = buildEvidenceTableExportContent();
      filename = 'evidence_table.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'grade_summary':
      content = buildGradeSummaryExportContent();
      filename = 'grade_summary.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'dual_review_conflicts':
      filename = 'dual_review_conflicts.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'dual_review_agreement':
      filename = 'dual_review_agreement.json';
      mimeType = 'application/json;charset=utf-8';
      break;
    case 'audit_manifest':
      filename = 'project_manifest.json';
      mimeType = 'application/json;charset=utf-8';
      break;
    case 'audit_events':
      filename = 'events.jsonl';
      mimeType = 'application/x-ndjson;charset=utf-8';
      break;
    case 'audit_screening_decisions':
      filename = 'screening_decisions.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'audit_exclusion_reasons':
      filename = 'exclusion_reasons.csv';
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'audit_prisma_counts':
      filename = 'prisma_counts.json';
      mimeType = 'application/json;charset=utf-8';
      break;
    case 'audit_summary':
      filename = 'audit_summary.md';
      mimeType = 'text/markdown;charset=utf-8';
      break;
    case 'ai_usage_registry':
      filename = 'ai_usage_registry.json';
      mimeType = 'application/json;charset=utf-8';
      break;
    case 'ai_suggestions':
      filename = 'ai_suggestions.jsonl';
      mimeType = 'application/x-ndjson;charset=utf-8';
      break;
    case 'prisma_traice_report':
      filename = 'PRISMA_TRAICE_REPORT.md';
      mimeType = 'text/markdown;charset=utf-8';
      break;
  }

  if (filename && typeof appendAuditEventsSafe === 'function') {
    const eventType = type === 'quality_appraisal'
      ? 'quality_export_generated'
      : type === 'evidence_table'
        ? 'evidence_table_export_generated'
        : type === 'grade_summary'
          ? 'grade_summary_export_generated'
          : type === 'dual_review_conflicts' || type === 'dual_review_agreement'
            ? 'dual_review_export_generated'
            : 'export_generated';
    appendAuditEventsSafe({
      eventType,
      recordId: '',
      after: {
        exportType: type,
        filename,
      },
      source: 'system',
      metadata: {
        prismaMode: getSelectedPrismaMode(),
        countSource: screeningDecisions.length > 0 ? 'screening_decisions' : 'legacy_screening_results',
        includedCount: screeningResults?.counts?.included ?? 0,
        excludedCount: screeningResults?.excluded?.length ?? 0,
        qualityAssessmentCount: qualityAssessments.length,
        unresolvedConflictCount: dualReviewConflictState?.exportGate?.unresolvedConflictCount || 0,
        dualReviewSchemaVersion: DUAL_REVIEW_ENGINE?.DUAL_REVIEW_SCHEMA_VERSION || '',
      },
    }, { persist: true });
  }

  if (isAuditExport) {
    content = buildAuditExportContent(type);
  }

  if (isDualReviewExport) {
    content = buildDualReviewExportContent(type);
  }

  if (!filename) {
    showToast('未知的导出类型', 'error');
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast(`已下载 ${filename}`, 'success');
}

function downloadAllFiles() {
  if (!screeningResults) {
    showToast('没有可下载的结果', 'error');
    return;
  }

  createProjectHistorySnapshot('before_export', 'Before exporting all deliverables');
  
  showToast('正在下载所有文件...', 'success');
  
  const files = [
    'included',
    'excluded',
    'svg-colorful',
    'svg-blackwhite',
    'svg-subtle',
    'report',
    'quality_appraisal',
    'evidence_table',
    'grade_summary',
    'dual_review_conflicts',
    'dual_review_agreement',
    'audit_manifest',
    'audit_screening_decisions',
    'audit_exclusion_reasons',
    'audit_prisma_counts',
    'audit_summary',
    'audit_events',
    'ai_usage_registry',
    'ai_suggestions',
    'prisma_traice_report',
  ];
  
  files.forEach((fileType, index) => {
    setTimeout(() => {
      downloadFile(fileType);
    }, index * 300);
  });
}

function generateExcel(data, type) {
  if (data.length === 0) return '';
  
  const columns = Object.keys(data[0]).filter(k => !k.startsWith('_'));
  if (type === 'excluded') {
    columns.push('_exclude_stage', '_exclude_reason');
  }
  
  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const val = String(row[col] || '');
      return val.includes(',') ? `"${val}"` : val;
    }).join(',')
  );
  
  return [header, ...rows].join('\n');
}

// UTF-8 with BOM for Excel compatibility
function generateExcelUTF8BOM(data, type) {
  console.log('📝 生成Excel调试：');
  console.log('- 数据长度:', data.length);
  console.log('- 类型:', type);
  
  if (data.length === 0) {
    console.warn('⚠️ 数据为空，只返回BOM');
    return '\uFEFF'; // BOM only
  }
  
  console.log('- 第一条记录的字段:', Object.keys(data[0]));
  
  // v1.3: 定义导出字段顺序和中文列名
  const fieldMapping = {
    'title': '标题',
    'authors': '作者',
    'year': '年份',
    'journal': '期刊',
    'doi': 'DOI',
    'abstract': '摘要',
    'keywords': '关键词',
    'type': '文献类型',
    'database': '数据库来源',
        'studyDesign': '研究方法',
    'candidate_pair_id': 'Candidate Pair ID',
    'reason_code': 'Reason Code',
    'reason_label': 'Reason Label',
    'review_decision': 'Review Decision',
    'reason_message': 'Reason Message',
    'left_record_id': 'Left Record ID',
    'left_title': 'Left Title',
    'left_authors': 'Left Authors',
    'left_year': 'Left Year',
    'left_journal': 'Left Journal',
    'left_pages': 'Left Pages',
    'left_identifier': 'Left Identifier',
    'right_record_id': 'Right Record ID',
    'right_title': 'Right Title',
    'right_authors': 'Right Authors',
    'right_year': 'Right Year',
    'right_journal': 'Right Journal',
    'right_pages': 'Right Pages',
    'right_identifier': 'Right Identifier'
  };
  
  // 确定要导出的列（优先使用预定义顺序，然后包含其他字段）
  const predefinedFields = Object.keys(fieldMapping);
  const allFields = Object.keys(data[0]).filter(k => !k.startsWith('_'));
  const columns = [...predefinedFields.filter(f => allFields.includes(f)),
                    ...allFields.filter(f => !predefinedFields.includes(f))];
  
  if (type === 'excluded') {
    columns.push('_exclude_stage', '_exclude_reason');
  }
  
  console.log('- 输出列:', columns);
  
  // Escape values properly for CSV
  const escapeCSV = (val) => {
    val = String(val || '');
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return '"' + val.replace(/"/g, '""') + '"';
    }
    return val;
  };
  
  // v1.3: 使用中文列名
  const header = columns.map(col => {
    if (col === '_exclude_stage') return escapeCSV('排除阶段');
    if (col === '_exclude_reason') return escapeCSV('排除原因');
    return escapeCSV(fieldMapping[col] || col);
  }).join(',');
  
  const rows = data.map(row => 
    columns.map(col => {
      if (col === '_exclude_stage' || col === '_exclude_reason') {
        // v3.0: Include detailed exclusion information
        return escapeCSV(row[col] || '');
      }
      return escapeCSV(row[col]);
    }).join(',')
  );
  
  console.log('✅ 生成了', rows.length, '行数据');
  
  // Add UTF-8 BOM at the beginning
  return '\uFEFF' + [header, ...rows].join('\n');
}

function generateReport(results) {
  const timestamp = new Date().toLocaleString('zh-CN');
  
  // v3.0: Calculate exclusion reason statistics
  const exclusionStats = {};
  results.excluded.forEach(record => {
    if (record._exclude_reason) {
      exclusionStats[record._exclude_reason] = (exclusionStats[record._exclude_reason] || 0) + 1;
    }
  });

  const exclusionDetails = Object.entries(exclusionStats)
    .map(([reason, count]) => {
      const rate = results.excluded.length > 0 ? Math.round((count / results.excluded.length) * 100) : 0;
      return `- **${reason}**: ${count}篇 (${rate}%)`;
    })
    .join('\n');

  // v3.0: Source distribution
  const sourceStats = results.sourceDistribution || {};
  const sourceDetails = Object.entries(sourceStats)
    .map(([source, count]) => `- **${source}**: ${count}篇`)
    .join('\n');

  return `# 文献筛选报告

**生成时间:** ${timestamp}

## 1. 数据概况

- **上传文件总数:** ${uploadedFiles.length}
- **上传文献总数:** ${uploadedData.length}
- **去重后文献数:** ${results.counts.after_dupes}
- **最终纳入文献数:** ${results.counts.included}

## 2. 数据来源分布

${sourceDetails || '- 未记录源信息'}

## 3. 列名映射

${Object.entries(columnMapping).map(([std, col]) => `- **${std}** → ${col}`).join('\n')}

## 4. 筛选规则

### 时间窗口
- 起始年份: ${results.rules.time_window.start_year}
- 结束年份: ${results.rules.time_window.end_year}

### 包含关键词
${results.rules.include_any.map(kw => `- ${kw}`).join('\n')}

### 排除关键词
${results.rules.exclude.map(ex => `- **${ex.keyword}**: ${ex.reason}`).join('\n')}

### 语言要求
${results.rules.language.allow.map(lang => `- ${lang}`).join('\n')}

### 必填字段
${results.rules.required_one_of.map(f => `- ${f}`).join('\n')}

## 5. PRISMA 统计

| 阶段 | 数量 |
|------|------|
| 识别 (数据库) | ${results.counts.identified_db} |
| 识别 (其他来源) | ${results.counts.identified_other} |
| 总计识别 | ${results.counts.identified_db + results.counts.identified_other} |
| 去除重复 | ${results.counts.duplicates} |
| 去重后 | ${results.counts.after_dupes} |
| 标题/摘要筛选 | ${results.counts.screened} |
| 标题/摘要排除 | ${results.counts.excluded_ta} |
| 全文评估 | ${results.counts.fulltext} |
| 全文排除 | ${results.counts.excluded_ft} |
| **最终纳入** | **${results.counts.included}** |

## 6. v3.0 人工审核详情

### 排除原因统计

${exclusionDetails || '- 未排除任何文献'}

### 排除率计算

- 获取全文: ${results.counts.fulltext}篇
- 全文排除: ${results.counts.excluded_ft}篇
- **排除率**: ${results.counts.fulltext > 0 ? Math.round((results.counts.excluded_ft / results.counts.fulltext) * 100) : 0}%
- **保留率**: ${results.counts.fulltext > 0 ? Math.round((results.counts.included / results.counts.fulltext) * 100) : 0}%

## 7. 方法说明

### 去重方法
- 优先按 DOI 去重
- 其次按标题规范化（转小写、去标点、合并空格）去重
- v3.0 新增：跨源智能去重（同一文献若出现在多个数据库中，仅保留一条）

### 筛选流程
1. 时间窗口过滤
2. 包含关键词匹配（title/abstract/keywords）
3. 必填字段检查
4. 语言过滤
5. 排除关键词匹配（标题/摘要阶段）
6. v3.0 新增：全文人工审核阶段（记录详细排除原因）

### 注意事项
- 数据库来源比例基于上传文件来源实际计算
- 全文排除为人工审核结果，包含详细的排除原因

---

*本报告由文献快筛工具 v1.4 自动生成*
`;
}

// Progress bar utilities
function showProgress(message, percent) {
  let progressDiv = document.getElementById('uploadProgress');
  if (!progressDiv) {
    progressDiv = document.createElement('div');
    progressDiv.id = 'uploadProgress';
    progressDiv.className = 'upload-progress';
    document.getElementById('uploadArea').after(progressDiv);
  }
  
  progressDiv.innerHTML = `
    <div style="font-size: var(--font-size-sm); margin-bottom: var(--space-8);">${message}</div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percent}%"></div>
    </div>
    <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-4); text-align: right;">${percent}%</div>
  `;
}

function updateProgress(percent) {
  const progressDiv = document.getElementById('uploadProgress');
  if (progressDiv) {
    const fill = progressDiv.querySelector('.progress-fill');
    const percentText = progressDiv.querySelectorAll('div')[2];
    if (fill) fill.style.width = percent + '%';
    if (percentText) percentText.textContent = percent + '%';
  }
}

function hideProgress() {
  const progressDiv = document.getElementById('uploadProgress');
  if (progressDiv) {
    setTimeout(() => progressDiv.remove(), 500);
  }
}

function addSuccessAnimation() {
  const uploadInfo = document.getElementById('uploadInfo');
  if (uploadInfo) {
    uploadInfo.classList.add('success-animation');
    setTimeout(() => uploadInfo.classList.remove('success-animation'), 600);
  }
}

// YAML import/export
function exportYAML() {
  const yaml = document.getElementById('yamlEditor').value;
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'screening_rules.yaml';
  a.click();
  URL.revokeObjectURL(url);
  showToast('已导出YAML配置', 'success');
}

function importYAML() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.yaml,.yml';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('yamlEditor').value = e.target.result;
        showToast('已导入YAML配置', 'success');
        syncYAMLToForm();
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// UI utilities
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showLoading(message) {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-medium);">${message}</div>
    </div>
  `;
  overlay.id = 'loadingOverlay';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.remove();
}

function resetApp() {
  // v1.4: Clear current project snapshot
  try {
    const id = localStorage.getItem('prisma_current_project_id');
    if (id) localStorage.removeItem(getProjectStorageKey(id));
    localStorage.removeItem('prisma_current_project_id');
  } catch (_) {}

  uploadedData = [];
  uploadedFiles = []; // v3.0
  screeningResults = null;
  columnMapping = {};
  fileFormat = 'unknown';
  formatSource = 'Unknown';
  currentStep = 1;
  filterRules = null;
  exclusionReasons = [...DEFAULT_EXCLUSION_REASONS];
  currentProjectId = null;
  document.getElementById('uploadInfo').classList.add('hidden');
  document.getElementById('fileInput').value = '';
  hideProgress();
  setStep(1);
  renderExclusionTemplateButtons();
  renderExclusionTemplateEditor();
  updateStep4EntryLock();
  showToast('已重置应用', 'success');
}

function cloneSampleRecords(records) {
  return (Array.isArray(records) ? records : []).map((record) => ({ ...record }));
}

function getBuiltInSampleDataPayload() {
  return {
    description: 'Built-in sample literature records',
    format: 'json',
    data: cloneSampleRecords(sampleData),
    source: 'built_in_sample',
  };
}

function applySampleDataPayload(payload) {
  const records = cloneSampleRecords(payload?.data);
  if (records.length === 0) {
    throw new Error('示例数据为空');
  }

  const sourceFileName = payload?.source === 'sample-data.json' ? 'sample-data.json' : '内置示例数据.json';
  const sourceLabel = payload?.source === 'sample-data.json' ? '本地示例文件' : '系统内置';

  startNewProjectSession();
  uploadedData = records.map((record) => ({
    ...record,
    _source: record._source || sourceLabel,
    _sourceFile: record._sourceFile || sourceFileName,
  }));
  uploadedFiles = [{
    name: sourceFileName,
    format: 'JSON',
    recordCount: records.length,
    source: sourceLabel,
  }];
  fileFormat = 'JSON';
  formatSource = '示例数据';

  detectColumns();
  displayUploadInfo();
  setStep(2);
  syncFormToYAML();
  displayRulesPreview();
  createProjectHistorySnapshot('after_import', 'After import');
  persistCurrentProjectState();
  updateStep4EntryLock();

  showToast('✅ 示例数据加载成功！共 ' + uploadedData.length + ' 条记录', 'success');

  setTimeout(() => {
    const step2 = document.getElementById('step2');
    if (step2) step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);
}

async function fetchSampleDataPayload() {
  if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
    return getBuiltInSampleDataPayload();
  }

  const response = await fetch('sample-data.json');
  if (!response.ok) throw new Error('无法加载示例数据');
  const payload = await response.json();
  return {
    ...payload,
    source: 'sample-data.json',
  };
}

// v4.0: Load sample data for new users
function loadSampleData() {
  showLoading('正在加载示例数据...');

  fetchSampleDataPayload()
    .catch((error) => {
      console.warn('Falling back to built-in sample data:', error);
      return getBuiltInSampleDataPayload();
    })
    .then((payload) => {
      applySampleDataPayload(payload);
      hideLoading();
    })
    .catch(error => {
      hideLoading();
      showToast('❌ 加载示例数据失败：' + error.message, 'error');
      console.error(error);
    });
}

// v4.0: Toggle database export guide
function toggleDatabaseGuide() {
  const guide = document.getElementById('databaseGuide');
  if (guide.classList.contains('hidden')) {
    guide.classList.remove('hidden');
    guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    guide.classList.add('hidden');
  }
}

// v4.0: Show video tutorial
function showVideoTutorial() {
  const videoUrl = 'https://www.bilibili.com/video/BV1example'; // 待替换为实际视频链接
  showToast('🎬 视频教程功能即将上线，敬请期待！', 'info');
  // window.open(videoUrl, '_blank');
}

// v4.0: Enhanced error handling with detailed messages
function showDetailedError(errorType, details) {
  let message = '';
  let suggestions = '';
  
  switch(errorType) {
    case 'invalid_format':
      message = `❌ 文件格式错误：${details.fileName}`;
      suggestions = `
        <div style="margin-top: var(--space-12);">
          <strong>可能的原因：</strong>
          <ul style="padding-left: var(--space-20); margin-top: var(--space-8);">
            <li>文件不是支持的格式（RIS, CSV, BibTeX等）</li>
            <li>文件已损坏或不完整</li>
            <li>文件编码不正确</li>
          </ul>
          <strong>解决建议：</strong>
          <ul style="padding-left: var(--space-20); margin-top: var(--space-8);">
            <li>重新从数据库导出文件，推荐使用<strong>RIS格式</strong></li>
            <li>确保选择"完整记录"而非"仅标题"</li>
            <li>尝试使用Zotero等文献管理软件导出</li>
            <li>点击上方"📚 数据库导出教程"查看详细步骤</li>
          </ul>
        </div>
      `;
      break;
      
    case 'parsing_error':
      message = `❌ 解析错误：${details.message}`;
      suggestions = `
        <div style="margin-top: var(--space-12);">
          <strong>错误位置：</strong>第 ${details.line || '?'} 行
          <br><strong>错误内容：</strong>${details.content || '未知'}
          <br><br>
          <strong>解决建议：</strong>
          <ul style="padding-left: var(--space-20); margin-top: var(--space-8);">
            <li>检查文件是否完整（文件末尾是否有ER标记）</li>
            <li>尝试用文本编辑器打开，检查文件编码（应为UTF-8）</li>
            <li>重新导出文件</li>
          </ul>
        </div>
      `;
      break;
      
    case 'empty_file':
      message = '❌ 文件为空或无有效记录';
      suggestions = `
        <div style="margin-top: var(--space-12);">
          <strong>解决建议：</strong>
          <ul style="padding-left: var(--space-20); margin-top: var(--space-8);">
            <li>确认文件中包含文献记录</li>
            <li>导出时选择"完整记录"而非"仅引用"</li>
            <li>如果是CSV文件，确保包含表头行</li>
          </ul>
        </div>
      `;
      break;
      
    case 'missing_fields':
      message = '⚠️ 部分记录缺少重要字段';
      suggestions = `
        <div style="margin-top: var(--space-12);">
          <strong>缺失字段：</strong>${details.fields.join(', ')}
          <br><br>
          <strong>影响：</strong>这些记录可能在筛选时被过滤掉
          <br><br>
          <strong>解决建议：</strong>
          <ul style="padding-left: var(--space-20); margin-top: var(--space-8);">
            <li>在数据库导出时选择"包含摘要"</li>
            <li>或在第2步取消勾选"必填字段"</li>
            <li>您可以继续使用，但建议重新导出完整数据</li>
          </ul>
        </div>
      `;
      break;
  }
  
  const errorPanel = document.createElement('div');
  errorPanel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--color-surface);
    padding: var(--space-32);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    max-width: 600px;
    z-index: 1001;
    border: 3px solid var(--color-error);
  `;
  
  errorPanel.innerHTML = `
    <h3 style="color: var(--color-error); margin-bottom: var(--space-16);">${message}</h3>
    ${suggestions}
    <div style="margin-top: var(--space-24); display: flex; gap: var(--space-12);">
      <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">我知道了</button>
      <button class="btn btn-secondary" onclick="toggleDatabaseGuide(); this.parentElement.parentElement.remove();">查看教程</button>
      <button class="btn btn-secondary" onclick="loadSampleData(); this.parentElement.parentElement.remove();">加载示例</button>
    </div>
  `;
  
  document.body.appendChild(errorPanel);
}

// v3.0: Display fulltext review UI
function displayFulltextReviewUI() {
  if (!screeningResults) return;

  const fulltext = screeningResults.included;
  document.getElementById('fulltext-total').textContent = fulltext.length;
  document.getElementById('fulltext-obtained').textContent = fulltext.length;
  renderConservativeAiStep4ContextBanner();

  // Create review table
  const tableContainer = document.getElementById('fulltext-review-table');
  const table = document.createElement('table');
  
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th style="width: 3%;">
        <input type="checkbox" onchange="if(this.checked) selectAllRecords(); else deselectAllRecords();">
      </th>
      <th style="width: 5%;">序号</th>
      <th style="width: 32%;">标题</th>
      <th style="width: 32%;">摘要</th>
      <th style="width: 18%;">排除原因</th>
      <th style="width: 10%;">操作</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const template = sanitizeExclusionTemplate(exclusionReasons);
  const optionHTML = template.map(r => `<option value="${escapeHTML(r)}">${escapeHTML(r)}</option>`).join('');

  fulltext.forEach((record, idx) => {
    const tr = document.createElement('tr');
    const recordId = getRecordAuditId(record, idx);
    tr.id = `fulltext-review-row-${idx}`;
    tr.setAttribute('data-record-id', recordId);
    const excludeSelect = `
      <select id="exclude-${idx}" class="form-input" onchange="updateFulltextStats()" style="width: 100%; padding: var(--space-8);">
        <option value="">保留</option>
        <option value="__uncertain__">暂不确定</option>
        ${optionHTML}
      </select>
    `;

    const abstractText = getValue(record, 'abstract');
    const hasAbstract = String(abstractText || '').trim().length > 0;
    const sourceTruncatedBadge = isLikelySourceTruncatedAbstract(abstractText)
      ? `<div style="margin-bottom: var(--space-6);"><span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 12px; line-height: 1.4; background: rgba(245, 158, 11, 0.14); color: #b45309; border: 1px solid rgba(245, 158, 11, 0.25);">源摘要可能已截断</span></div>`
      : '';
    const abstractCell = `
      <div class="abstract-cell">
        ${sourceTruncatedBadge}
        <div class="abstract-snippet">${escapeHTML(abstractText || '（无摘要）')}</div>
        <div class="abstract-actions">
          <button class="btn-link" type="button" onclick="openAbstractModal(${idx})" ${hasAbstract ? '' : 'disabled'}>🔍 查看完整摘要</button>
        </div>
      </div>
    `;

    const fulltextInfo = getFulltextLinkInfo(record);
    const fulltextAction = fulltextInfo.url
      ? `<a class="btn-link" href="${escapeHTML(fulltextInfo.url)}" target="_blank" rel="noopener noreferrer">查看全文</a>`
      : `<button class="btn-link" type="button" disabled title="无可用全文链接">无可用全文链接</button>`;
    
    tr.innerHTML = `
      <td><input type="checkbox" class="review-checkbox" data-index="${idx}" onchange="if(this.checked) selectedRecords.add(${idx}); else selectedRecords.delete(${idx});"></td>
      <td>${idx + 1}</td>
      <td>${escapeHTML(truncate(getValue(record, 'title'), 80))}</td>
      <td>${abstractCell}</td>
      <td>${excludeSelect}</td>
      <td>${fulltextAction}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);

  // Restore existing selections (collaboration or single-review draft)
  const draft = screeningResults.manualReviewDraft && typeof screeningResults.manualReviewDraft === 'object'
    ? screeningResults.manualReviewDraft
    : {};
  fulltext.forEach((_, idx) => {
    const select = document.getElementById(`exclude-${idx}`);
    if (!select) return;

    // Collaboration: restore current role's decision if present
    if (currentUserSession && projectData && projectData.reviewDecisions) {
      const d = projectData.reviewDecisions[currentUserSession.role]?.[idx]?.decision;
      if (typeof d === 'string') {
        select.value = d;
        return;
      }
    }

    if (isDualReviewMode) {
      const decisionEntry = getReviewerDecisionEntry(currentReviewer, idx);
      if (decisionEntry) {
        select.value = decisionEntry.decision || getFulltextSelectValueFromDecision(decisionEntry);
        return;
      }
    }

    // Single-review draft
    const v = draft[idx];
    if (typeof v === 'string') {
      select.value = v;
    }
  });

  // Clear selection
  selectedRecords.clear();
  currentDefaultExclusion = '';

  updateExclusionStats();
  
  // v4.1: Add keyboard event listener for Step 4
  addKeyboardShortcuts();

  // Ensure template buttons are in sync
  renderExclusionTemplateButtons();
}

// v1.1: Cohen's Kappa Calculation
function calculateKappa(decisions1, decisions2) {
  if (!decisions1 || !decisions2 || decisions1.length !== decisions2.length) {
    throw new Error('决策数组必须存在且长度相等');
  }

  const n = decisions1.length;
  if (n === 0) return { kappa: 0, interpretation: '无数据', confusionMatrix: {} };

  // Create confusion matrix
  const categories = [...new Set([...decisions1, ...decisions2])];
  const matrix = {};
  categories.forEach(cat => {
    matrix[cat] = {};
    categories.forEach(cat2 => matrix[cat][cat2] = 0);
  });

  // Fill confusion matrix
  for (let i = 0; i < n; i++) {
    matrix[decisions1[i]][decisions2[i]]++;
  }

  // Calculate observed agreement (Po)
  let observed = 0;
  categories.forEach(cat => {
    observed += matrix[cat][cat] || 0;
  });
  const Po = observed / n;

  // Calculate expected agreement (Pe)
  let Pe = 0;
  categories.forEach(cat => {
    const row_sum = categories.reduce((sum, cat2) => sum + (matrix[cat][cat2] || 0), 0);
    const col_sum = categories.reduce((sum, cat1) => sum + (matrix[cat1][cat] || 0), 0);
    Pe += (row_sum * col_sum) / (n * n);
  });

  // Calculate Cohen's kappa
  const kappa = Pe === 1 ? 1 : (Po - Pe) / (1 - Pe);
  
  // Interpret kappa value
  let interpretation;
  if (kappa < 0) interpretation = '一致性极差';
  else if (kappa < 0.20) interpretation = '一致性轻微';
  else if (kappa < 0.40) interpretation = '一致性一般';
  else if (kappa < 0.60) interpretation = '一致性中等';
  else if (kappa < 0.80) interpretation = '一致性良好';
  else interpretation = '一致性极佳';

  return {
    kappa: Math.round(kappa * 1000) / 1000,
    observedAgreement: Math.round(Po * 1000) / 1000,
    expectedAgreement: Math.round(Pe * 1000) / 1000,
    interpretation,
    confusionMatrix: matrix,
    sampleSize: n,
    categories
  };
}

// v5.0: Calculate inter-reviewer reliability for different classification types
function calculateReliabilityStats(reviewerADecisions, reviewerBDecisions) {
  if (DUAL_REVIEW_ENGINE && typeof DUAL_REVIEW_ENGINE.calculateAgreementMetrics === 'function') {
    const metrics = DUAL_REVIEW_ENGINE.calculateAgreementMetrics(reviewerADecisions, reviewerBDecisions);
    return {
      binary: {
        kappa: metrics.kappa,
        observedAgreement: metrics.observedAgreement,
        expectedAgreement: metrics.expectedAgreement,
        interpretation: interpretKappa(metrics.kappa),
        confusionMatrix: metrics.confusionMatrix,
        sampleSize: metrics.sampleSize,
        categories: metrics.categories,
      },
      multiClass: {
        kappa: metrics.kappa,
        observedAgreement: metrics.observedAgreement,
        expectedAgreement: metrics.expectedAgreement,
        interpretation: interpretKappa(metrics.kappa),
        confusionMatrix: metrics.confusionMatrix,
        sampleSize: metrics.sampleSize,
        categories: metrics.categories,
      },
      totalRecords: metrics.sampleSize,
      agreements: metrics.agreementCount,
      disagreements: metrics.disagreementCount,
      percentAgreement: metrics.percentAgreement,
      agreementMetrics: metrics,
    };
  }

  // Binary classification (Include/Exclude)
  const binaryA = reviewerADecisions.map(d => d === '' ? 'include' : 'exclude');
  const binaryB = reviewerBDecisions.map(d => d === '' ? 'include' : 'exclude');
  const binaryKappa = calculateKappa(binaryA, binaryB);

  // Multi-class classification (Specific exclusion reasons)
  const multiA = reviewerADecisions.map(d => d === '' ? 'include' : d);
  const multiB = reviewerBDecisions.map(d => d === '' ? 'include' : d);
  const multiKappa = calculateKappa(multiA, multiB);

  return {
    binary: binaryKappa,
    multiClass: multiKappa,
    totalRecords: reviewerADecisions.length,
    agreements: reviewerADecisions.filter((d, i) => d === reviewerBDecisions[i]).length,
    disagreements: reviewerADecisions.filter((d, i) => d !== reviewerBDecisions[i]).length
  };
}

function interpretKappa(kappa) {
  if (kappa < 0) return '一致性极差';
  if (kappa < 0.20) return '一致性轻微';
  if (kappa < 0.40) return '一致性一般';
  if (kappa < 0.60) return '一致性中等';
  if (kappa < 0.80) return '一致性良好';
  return '一致性极佳';
}

// v4.1: Keyboard shortcuts handler
function addKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyboardShortcut);
}

function handleKeyboardShortcut(e) {
  if (currentStep !== 4) return;

  const key = e.key;
  
  // Number keys 1-6 for exclusion reasons
  if (key >= '1' && key <= '6') {
    const reasons = (Array.isArray(exclusionReasons) && exclusionReasons.length)
      ? exclusionReasons
      : DEFAULT_EXCLUSION_REASONS;
    const reason = (reasons[parseInt(key) - 1] || '').trim();
    if (reason) setDefaultExclusion(reason);
    e.preventDefault();
  }
  
  // Space to skip
  if (key === ' ') {
    const selects = document.querySelectorAll('select[id^="exclude-"]');
    for (let select of selects) {
      if (!select.value) {
        select.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
    e.preventDefault();
  }
  
  // Arrow keys for navigation
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const selects = Array.from(document.querySelectorAll('select[id^="exclude-"]'));
    const focused = document.activeElement;
    const currentIndex = selects.indexOf(focused);
    
    if (currentIndex !== -1) {
      const nextIndex = key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < selects.length) {
        selects[nextIndex].focus();
        selects[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    e.preventDefault();
  }
}

function updateFulltextStats() {
  if (!screeningResults) return;
  
  const fulltext = screeningResults.included;
  let excludedCount = 0;
  
  // Store current user's decisions
  if (isDualReviewMode) {
    const activeSelect = typeof document !== 'undefined' ? document.activeElement : null;
    const activeIndex = activeSelect && activeSelect.id && activeSelect.id.startsWith('exclude-')
      ? Number(activeSelect.id.replace('exclude-', ''))
      : null;
    const indexesToRecord = Number.isFinite(activeIndex)
      ? [activeIndex]
      : Array.from({ length: fulltext.length }, (_, index) => index);

    indexesToRecord.forEach((idx) => {
      const select = document.getElementById(`exclude-${idx}`);
      if (select) {
        const entry = recordFulltextReviewerDecision(idx, select.value || '', {
          slot: currentUserSession ? getReviewerSlotFromRole(currentUserSession.role) : currentReviewer,
          reviewerId: currentUserSession?.role === 'reviewer-b' ? 'reviewer_B' : `reviewer_${currentReviewer}`,
        });

        if (entry?.normalizedDecision === 'exclude') {
          excludedCount++;
        }
      }
    });
    
    // Auto-save decisions
    if (currentUserSession && projectData) saveProjectData();
    
    // Update collaboration status
    updateCollaborationStatus();
    
    refreshDualReviewConflictState({ auditNewConflicts: true });
    persistCurrentProjectState();

    // Check if both reviewers have completed and calculate kappa
    checkAndCalculateKappa();
  } else {
    // Fallback for non-collaborative mode
    fulltext.forEach((record, idx) => {
      const select = document.getElementById(`exclude-${idx}`);
      if (select) {
        setManualReviewDraftDecision(idx, select.value || '');
        const selection = normalizeFulltextSelection(select.value || '');
        if (selection.decision === 'exclude') excludedCount++;
      }
    });
  }
  
  if (isDualReviewMode) {
    excludedCount = fulltext.reduce((count, _record, idx) => {
      const entry = getReviewerDecisionEntry(currentReviewer, idx);
      return count + (entry?.normalizedDecision === 'exclude' ? 1 : 0);
    }, 0);
  }

  const includedCount = fulltext.length - excludedCount;
  const rate = fulltext.length > 0 ? Math.round((excludedCount / fulltext.length) * 100) : 0;
  
  document.getElementById('fulltext-excluded').textContent = excludedCount;
  document.getElementById('fulltext-included').textContent = includedCount;
  document.getElementById('fulltext-rate').textContent = rate + '%';

  if (isDualReviewMode) {
    updateDualReviewStats();
  }
}

// Update collaboration status in UI
function updateCollaborationStatus() {
  if (!projectData || !currentUserSession) return;
  
  const reviewerAStatus = document.getElementById('reviewer-a-status');
  const reviewerBStatus = document.getElementById('reviewer-b-status');
  
  if (!reviewerAStatus || !reviewerBStatus) return;
  
  const reviewerA = projectData.reviewers['reviewer-a'];
  const reviewerB = projectData.reviewers['reviewer-b'];
  const decisionsA = projectData.reviewDecisions['reviewer-a'] || {};
  const decisionsB = projectData.reviewDecisions['reviewer-b'] || {};
  
  const totalRecords = screeningResults ? screeningResults.included.length : 0;
  const completedA = Object.keys(decisionsA).length;
  const completedB = Object.keys(decisionsB).length;
  
  // Update reviewer A status
  if (reviewerA) {
    reviewerAStatus.innerHTML = `
      <strong>${reviewerA.username}</strong><br>
      <small>进度: ${completedA}/${totalRecords} (${Math.round((completedA/totalRecords)*100) || 0}%)</small>
    `;
  } else {
    reviewerAStatus.innerHTML = '<span style="opacity: 0.7;">等待加入...</span>';
  }
  
  // Update reviewer B status  
  if (reviewerB) {
    reviewerBStatus.innerHTML = `
      <strong>${reviewerB.username}</strong><br>
      <small>进度: ${completedB}/${totalRecords} (${Math.round((completedB/totalRecords)*100) || 0}%)</small>
    `;
  } else {
    reviewerBStatus.innerHTML = '<span style="opacity: 0.7;">等待加入...</span>';
  }
}

// Check if both reviewers completed and calculate kappa
function checkAndCalculateKappa() {
  if (!projectData || !screeningResults) return;
  
  const decisionsA = projectData.reviewDecisions['reviewer-a'] || {};
  const decisionsB = projectData.reviewDecisions['reviewer-b'] || {};
  const totalRecords = screeningResults.included.length;
  
  const completedA = Object.keys(decisionsA).length === totalRecords;
  const completedB = Object.keys(decisionsB).length === totalRecords;
  
  if (completedA && completedB) {
    // Both reviewers completed, calculate kappa
    const reviewerADecisions = [];
    const reviewerBDecisions = [];
    
    for (let i = 0; i < totalRecords; i++) {
      const decisionA = decisionsA[i] ? decisionsA[i].decision : '';
      const decisionB = decisionsB[i] ? decisionsB[i].decision : '';
      reviewerADecisions.push(decisionA);
      reviewerBDecisions.push(decisionB);
    }
    
    try {
      const stats = calculateReliabilityStats(reviewerADecisions, reviewerBDecisions);
      displayKappaResults(stats);
      document.getElementById('kappa-analysis').classList.remove('hidden');
      applyModeGating(runtimeMode);
      
      // Show notification
      showToast('🎉 双人审查已完成！一致性分析已生成。', 'success');
    } catch (error) {
      console.error('Kappa calculation error:', error);
      showToast('⚠️ 一致性计算出现错误，请检查数据完整性。', 'warning');
    }
  }
}

// v3.0: Update exclusion statistics
function updateExclusionStats() {
  if (!screeningResults) return;

  const fulltext = screeningResults.included;
  const reasonCounts = {};
  let excludedCount = 0;

  // Collect all selected reasons
  fulltext.forEach((record, idx) => {
    const select = document.getElementById(`exclude-${idx}`);
    if (select) {
      const reason = select.value;
      if (reason) {
        excludedCount++;
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    }
  });

  const includedCount = fulltext.length - excludedCount;
  const excludeRate = fulltext.length > 0 ? Math.round((excludedCount / fulltext.length) * 100) : 0;

  document.getElementById('fulltext-excluded').textContent = excludedCount;
  document.getElementById('fulltext-included').textContent = includedCount;
  document.getElementById('fulltext-rate').textContent = excludeRate + '%';

  // Display reason summary
  const summaryDiv = document.getElementById('exclusion-reasons-summary');
  if (excludedCount > 0) {
    const reasons = Object.entries(reasonCounts)
      .map(([reason, count]) => `<div style="margin-bottom: var(--space-8);"><strong>${reason}:</strong> ${count}篇 (${Math.round((count/excludedCount)*100)}%)</div>`)
      .join('');
    
    summaryDiv.innerHTML = `
      <div class="info-box" style="background: var(--color-bg-4);">
        <h4 style="margin-bottom: var(--space-12);">排除原因详细统计</h4>
        ${reasons}
      </div>
    `;
  } else {
    summaryDiv.innerHTML = '';
  }
}

// v3.0: Finalize fulltext review and generate final results
function finalizeFulltextReview() {
  if (!screeningResults) return;

  const fulltext = screeningResults.included;
  const excluded_ft = [];
  const included = [];

  fulltext.forEach((record, idx) => {
    const select = document.getElementById(`exclude-${idx}`);
    const selection = normalizeFulltextSelection(select ? select.value : '');
    if (selection.decision === 'exclude') {
      excluded_ft.push({
        ...record,
        _exclude_reason: selection.exclusionReason,
        _exclude_stage: 'fulltext'
      });
    } else if (selection.decision === 'include') {
      included.push(record);
    }
  });

  if (typeof upsertScreeningDecisionSafe === 'function' && typeof appendAuditEventsSafe === 'function') {
    const reviewEvents = [];
    fulltext.forEach((record, idx) => {
      const select = document.getElementById(`exclude-${idx}`);
      const recordId = getRecordAuditId(record, idx);
      const selection = normalizeFulltextSelection(select ? select.value : '');
      const isExcluded = selection.decision === 'exclude';
      const exclusionReason = isExcluded ? normalizeAuditExclusionReason(selection.exclusionReason) : '';
      const decision = selection.decision;

      upsertScreeningDecisionSafe({
        recordId,
        stage: 'full_text',
        decision,
        exclusionReason,
        reviewerId: getCurrentReviewerId(),
        source: 'human',
        notes: isExcluded ? selection.exclusionReason : '',
        metadata: {
          originalReason: isExcluded ? selection.exclusionReason : '',
          originalSelection: selection.originalValue,
          reviewIndex: idx,
        },
      }, { persist: false });
      reviewEvents.push({
      eventType: 'manual_screening_decision',
        recordId,
        after: {
          stage: 'full_text',
          decision,
          exclusionReason,
        },
        reason: exclusionReason,
        source: 'human',
        metadata: {
          originalReason: isExcluded ? selection.exclusionReason : '',
          originalSelection: selection.originalValue,
          reviewIndex: idx,
        },
      });
    });
    appendAuditEventsSafe(reviewEvents, { persist: false });
  }

  console.log('📋 完成人工审核调试：');
  console.log('- 全文评估文献数:', fulltext.length);
  console.log('- 人工排除文献数:', excluded_ft.length);
  console.log('- 最终纳入文献数:', included.length);
  console.log('- 原有TA排除文献数:', screeningResults.excluded.length);

  // Update screening results with manual review data
  screeningResults.included = included;
  screeningResults.excluded = [...screeningResults.excluded, ...excluded_ft];
  screeningResults.counts.excluded_ft = excluded_ft.length;
  screeningResults.counts.included = included.length;

  console.log('- 更新后总排除文献数:', screeningResults.excluded.length);

  // v2.2: Go to Step 5 (Quality Assessment)
  persistCurrentProjectState();
  if (FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT) {
    prepareQualityAssessmentShell({ silent: true });
  }
  goToStep5();
  scrollToStep(5);
  createProjectHistorySnapshot('fulltext_finalized', 'After fulltext review finalized');
  showToast('✅ 全文复核完成，已进入质量评价步骤', 'success');
}

// v1.4: View fulltext in a new tab (DOI preferred)
function normalizeDoi(doi) {
  const s = String(doi || '').trim();
  if (!s) return '';
  return s.replace(/^https?:\/\/doi\.org\//i, '').trim();
}

function looksLikeHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function getFulltextLinkInfo(record) {
  const candidateFields = [
    { value: record.pdfUrl, source: 'pdf' },
    { value: record.pdf_url, source: 'pdf' },
    { value: record.fulltextUrl, source: 'fulltext' },
    { value: record.fulltext_url, source: 'fulltext' },
    { value: record.sourceUrl, source: 'source' },
    { value: record.source_url, source: 'source' },
    { value: record.cnkiUrl, source: 'cnki' },
    { value: record.cnki_url, source: 'cnki' },
    { value: record.url, source: 'url' },
    { value: record.link, source: 'url' }
  ];
  const urlEntry = candidateFields.find((entry) => looksLikeHttpUrl(entry.value));
  if (urlEntry) return { url: String(urlEntry.value).trim(), source: urlEntry.source };

  const doi = normalizeDoi(getValue(record, 'doi') || record.doi);
  if (doi) {
    return { url: `https://doi.org/${encodeURIComponent(doi)}`, source: 'doi' };
  }

  const pmid = String(record.pmid || record.PMID || '').trim();
  if (pmid && /^\d+$/.test(pmid)) {
    return { url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, source: 'pmid' };
  }

  return { url: '', source: 'none' };
}

function viewFulltext(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const info = getFulltextLinkInfo(record);
  if (!info.url) {
    showToast('无可用全文链接（缺少 DOI/外部链接）', 'warning');
    return;
  }

  window.open(info.url, '_blank', 'noopener,noreferrer');
}

function openAbstractModal(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const title = escapeHTML(getValue(record, 'title'));
  const journal = escapeHTML(getValue(record, 'journal'));
  const year = escapeHTML(getValue(record, 'year'));
  const authors = escapeHTML(getValue(record, 'authors'));
  const doi = escapeHTML(getValue(record, 'doi'));
  const studyDesign = escapeHTML(record.studyDesign || '未标注');
  const abstractText = escapeHTML(getValue(record, 'abstract'));
  const fulltextInfo = getFulltextLinkInfo(record);

  const modalHTML = `
    <div style="background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-24); max-width: 820px; width: calc(100% - 48px); box-shadow: var(--shadow-lg);">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-12);">
        <div style="flex: 1;">
          <div style="font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); margin-bottom: var(--space-8);">${title || '（无标题）'}</div>
          <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.6;">
            ${journal ? `期刊：${journal}<br>` : ''}
            ${year ? `年份：${year}<br>` : ''}
            ${authors ? `作者：${authors}<br>` : ''}
            ${doi ? `DOI：${doi}<br>` : ''}
            ${studyDesign ? `研究方法：${studyDesign}` : ''}
          </div>
        </div>
        <button class="btn btn-secondary" type="button" onclick="closeModal()">关闭</button>
      </div>
      <div style="margin-top: var(--space-16);">
        <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">摘要（完整）</div>
        <div style="max-height: 55vh; overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: var(--color-background); white-space: pre-wrap; line-height: 1.7;">
          ${abstractText || '（无摘要）'}
        </div>
      </div>
      <div style="margin-top: var(--space-16); display: flex; justify-content: flex-end; gap: var(--space-8);">
        <button class="btn btn-secondary" type="button" onclick="translateRecordToChinese(${idx})">翻译本条文献</button>
        <button class="btn btn-primary" type="button" onclick="viewFulltext(${idx})">查看全文（新标签）</button>
      </div>
    </div>
  `;

  showModal(modalHTML);
}

function translateRecordToChinese(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const titleText = String(getValue(record, 'title') || '').trim();
  const abstractText = String(getValue(record, 'abstract') || '').trim();
  const parts = [];

  if (titleText) {
    parts.push(`Title:\n${titleText}`);
  }
  if (abstractText) {
    parts.push(`Abstract:\n${abstractText}`);
  }

  if (parts.length === 0) {
    showToast('当前记录没有可翻译的标题或摘要', 'warning');
    return;
  }

  const payload = parts.join('\n\n').slice(0, 4500);
  const translateUrl = 'https://translate.google.com/?sl=auto&tl=zh-CN&text=' + encodeURIComponent(payload) + '&op=translate';
  window.open(translateUrl, '_blank', 'noopener,noreferrer');
}

function openRecordTranslationInNewTab(payload) {
  const translateUrl = 'https://translate.google.com/?sl=auto&tl=zh-CN&text=' + encodeURIComponent(payload) + '&op=translate';
  window.open(translateUrl, '_blank', 'noopener,noreferrer');
}

function parseInlineTranslationResult(data) {
  if (!Array.isArray(data)) return '';
  const sentenceGroups = Array.isArray(data[0]) ? data[0] : [];
  return sentenceGroups
    .map((item) => Array.isArray(item) ? item[0] : '')
    .join('')
    .trim();
}

function openAbstractModal(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const title = escapeHTML(getValue(record, 'title'));
  const journal = escapeHTML(getValue(record, 'journal'));
  const year = escapeHTML(getValue(record, 'year'));
  const authors = escapeHTML(getValue(record, 'authors'));
  const doi = escapeHTML(getValue(record, 'doi'));
  const studyDesign = escapeHTML(record.studyDesign || 'æœªæ ‡æ³¨');
  const abstractText = escapeHTML(getValue(record, 'abstract'));
  const fulltextInfo = getFulltextLinkInfo(record);

  const modalHTML = `
    <div style="background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-24); max-width: 820px; width: calc(100% - 48px); box-shadow: var(--shadow-lg);">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-12);">
        <div style="flex: 1;">
          <div style="font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); margin-bottom: var(--space-8);">${title || 'ï¼ˆæ— æ ‡é¢˜ï¼‰'}</div>
          <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.6;">
            ${journal ? `æœŸåˆŠï¼š${journal}<br>` : ''}
            ${year ? `å¹´ä»½ï¼š${year}<br>` : ''}
            ${authors ? `ä½œè€…ï¼š${authors}<br>` : ''}
            ${doi ? `DOIï¼š${doi}<br>` : ''}
            ${studyDesign ? `ç ”ç©¶æ–¹æ³•ï¼š${studyDesign}` : ''}
          </div>
        </div>
        <button class="btn btn-secondary" type="button" onclick="closeModal()">å…³é—­</button>
      </div>
      <div style="margin-top: var(--space-16);">
        <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">æ‘˜è¦ï¼ˆå®Œæ•´ï¼‰</div>
        <div style="max-height: 55vh; overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: var(--color-background); white-space: pre-wrap; line-height: 1.7;">
          ${abstractText || 'ï¼ˆæ— æ‘˜è¦ï¼‰'}
        </div>
      </div>
      <div id="record-translation-panel" style="display: none; margin-top: var(--space-16);">
        <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">ä¸­æ–‡ç¿»è¯‘ï¼ˆæœºå™¨ç»“æžœï¼‰</div>
        <div id="record-translation-content" style="max-height: 32vh; overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: #f8fafc; white-space: pre-wrap; line-height: 1.7;"></div>
      </div>
      <div style="margin-top: var(--space-16); display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-8);">
        <button class="btn btn-secondary" id="translate-record-btn-${idx}" type="button" onclick="translateRecordToChinese(${idx})">é¡µå†…ç¿»è¯‘æœ¬æ¡æ–‡çŒ®</button>
        <button class="btn btn-primary" type="button" onclick="viewFulltext(${idx})" ${fulltextInfo.url ? '' : 'disabled'}>æŸ¥çœ‹å…¨æ–‡${fulltextInfo.source === 'pdf' ? 'ï¼ˆPDFï¼‰' : 'ï¼ˆæ–°æ ‡ç­¾ï¼‰'}</button>
      </div>
    </div>
  `;

  showModal(modalHTML);
}

async function translateRecordToChinese(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const titleText = String(getValue(record, 'title') || '').trim();
  const abstractText = String(getValue(record, 'abstract') || '').trim();
  const parts = [];

  if (titleText) {
    parts.push(`Title:\n${titleText}`);
  }
  if (abstractText) {
    parts.push(`Abstract:\n${abstractText}`);
  }

  if (parts.length === 0) {
    showToast('å½“å‰è®°å½•æ²¡æœ‰å¯ç¿»è¯‘çš„æ ‡é¢˜æˆ–æ‘˜è¦', 'warning');
    return;
  }

  const payload = parts.join('\n\n').slice(0, 4500);
  const panel = document.getElementById('record-translation-panel');
  const content = document.getElementById('record-translation-content');
  const button = document.getElementById(`translate-record-btn-${idx}`);
  const originalLabel = button ? button.textContent : '';

  if (panel && content) {
    panel.style.display = 'block';
    content.textContent = 'æ­£åœ¨ç¿»è¯‘...';
  }
  if (button) {
    button.disabled = true;
    button.textContent = 'ç¿»è¯‘ä¸­...';
  }

  try {
    const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=' + encodeURIComponent(payload));
    if (!response.ok) {
      throw new Error('translation_http_' + response.status);
    }

    const data = await response.json();
    const translatedText = parseInlineTranslationResult(data);
    if (!translatedText) {
      throw new Error('translation_empty');
    }

    if (content) {
      content.textContent = translatedText;
    }
    showToast('å·²ç”Ÿæˆé¡µå†…ä¸­æ–‡ç¿»è¯‘', 'success');
  } catch (error) {
    if (content) {
      content.textContent = 'é¡µå†…ç¿»è¯‘æš‚æ—¶ä¸å¯ç”¨ï¼Œå·²ä¸ºä½ æ‰“å¼€æ–°æ ‡ç­¾ç¿»è¯‘ã€‚';
    }
    openRecordTranslationInNewTab(payload);
    showToast('é¡µå†…ç¿»è¯‘å¤±è´¥ï¼Œå·²è‡ªåŠ¨åˆ‡æ¢ä¸ºæ–°æ ‡ç­¾ç¿»è¯‘', 'warning');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || 'é¡µå†…ç¿»è¯‘æœ¬æ¡æ–‡çŒ®';
    }
  }
}

function openAbstractModal(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const uiText = {
    untitled: '\uFF08\u65E0\u6807\u9898\uFF09',
    journal: '\u671F\u520A',
    year: '\u5E74\u4EFD',
    authors: '\u4F5C\u8005',
    doi: 'DOI',
    method: '\u7814\u7A76\u65B9\u6CD5',
    untagged: '\u672A\u6807\u6CE8',
    close: '\u5173\u95ED',
    abstract: '\u6458\u8981\uFF08\u5B8C\u6574\uFF09',
    noAbstract: '\uFF08\u65E0\u6458\u8981\uFF09',
    translation: '\u4E2D\u6587\u7FFB\u8BD1\uFF08\u673A\u5668\u7ED3\u679C\uFF09',
    translateButton: '\u9875\u5185\u7FFB\u8BD1\u672C\u6761\u6587\u732E',
    viewFulltextPdf: '\u67E5\u770B\u5168\u6587\uFF08PDF\uFF09',
    viewFulltextNewTab: '\u67E5\u770B\u5168\u6587\uFF08\u65B0\u6807\u7B7E\uFF09'
  };

  const title = escapeHTML(getValue(record, 'title'));
  const journal = escapeHTML(getValue(record, 'journal'));
  const year = escapeHTML(getValue(record, 'year'));
  const authors = escapeHTML(getValue(record, 'authors'));
  const doi = escapeHTML(getValue(record, 'doi'));
  const studyDesign = escapeHTML(record.studyDesign || uiText.untagged);
  const abstractText = escapeHTML(getValue(record, 'abstract'));
  const fulltextInfo = getFulltextLinkInfo(record);

  const modalHTML = `
    <div style="background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-24); max-width: 820px; width: calc(100% - 48px); box-shadow: var(--shadow-lg);">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-12);">
        <div style="flex: 1;">
          <div style="font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); margin-bottom: var(--space-8);">${title || uiText.untitled}</div>
          <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.6;">
            ${journal ? `${uiText.journal}：${journal}<br>` : ''}
            ${year ? `${uiText.year}：${year}<br>` : ''}
            ${authors ? `${uiText.authors}：${authors}<br>` : ''}
            ${doi ? `${uiText.doi}：${doi}<br>` : ''}
            ${studyDesign ? `${uiText.method}：${studyDesign}` : ''}
          </div>
        </div>
        <button class="btn btn-secondary" type="button" onclick="closeModal()">${uiText.close}</button>
      </div>
      <div style="margin-top: var(--space-16);">
        <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">${uiText.abstract}</div>
        <div style="max-height: 55vh; overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: var(--color-background); white-space: pre-wrap; line-height: 1.7;">
          ${abstractText || uiText.noAbstract}
        </div>
      </div>
      <div id="record-translation-panel" style="display: none; margin-top: var(--space-16);">
        <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">${uiText.translation}</div>
        <div id="record-translation-content" style="max-height: 32vh; overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: #f8fafc; white-space: pre-wrap; line-height: 1.7;"></div>
      </div>
      <div style="margin-top: var(--space-16); display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-8);">
        <button class="btn btn-secondary" id="translate-record-btn-${idx}" type="button" onclick="translateRecordToChinese(${idx})">${uiText.translateButton}</button>
        <button class="btn btn-primary" type="button" onclick="viewFulltext(${idx})" ${fulltextInfo.url ? '' : 'disabled'}>${fulltextInfo.source === 'pdf' ? uiText.viewFulltextPdf : uiText.viewFulltextNewTab}</button>
      </div>
    </div>
  `;

  showModal(modalHTML);
}

async function translateRecordToChinese(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const titleText = String(getValue(record, 'title') || '').trim();
  const abstractText = String(getValue(record, 'abstract') || '').trim();
  const parts = [];

  if (titleText) parts.push(`Title:\n${titleText}`);
  if (abstractText) parts.push(`Abstract:\n${abstractText}`);

  if (parts.length === 0) {
    showToast('\u5F53\u524D\u8BB0\u5F55\u6CA1\u6709\u53EF\u7FFB\u8BD1\u7684\u6807\u9898\u6216\u6458\u8981', 'warning');
    return;
  }

  const payload = parts.join('\n\n').slice(0, 4500);
  const panel = document.getElementById('record-translation-panel');
  const content = document.getElementById('record-translation-content');
  const button = document.getElementById(`translate-record-btn-${idx}`);
  const originalLabel = button ? button.textContent : '';

  if (panel && content) {
    panel.style.display = 'block';
    content.textContent = '\u6B63\u5728\u7FFB\u8BD1...';
  }
  if (button) {
    button.disabled = true;
    button.textContent = '\u7FFB\u8BD1\u4E2D...';
  }

  try {
    const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=' + encodeURIComponent(payload));
    if (!response.ok) throw new Error('translation_http_' + response.status);

    const data = await response.json();
    const translatedText = parseInlineTranslationResult(data);
    if (!translatedText) throw new Error('translation_empty');

    if (content) content.textContent = translatedText;
    showToast('\u5DF2\u751F\u6210\u9875\u5185\u4E2D\u6587\u7FFB\u8BD1', 'success');
  } catch (error) {
    if (content) {
      content.textContent = '\u9875\u5185\u7FFB\u8BD1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u5DF2\u4E3A\u4F60\u6253\u5F00\u65B0\u6807\u7B7E\u7FFB\u8BD1\u3002';
    }
    openRecordTranslationInNewTab(payload);
    showToast('\u9875\u5185\u7FFB\u8BD1\u5931\u8D25\uFF0C\u5DF2\u81EA\u52A8\u5207\u6362\u4E3A\u65B0\u6807\u7B7E\u7FFB\u8BD1', 'warning');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || '\u9875\u5185\u7FFB\u8BD1\u672C\u6761\u6587\u732E';
    }
  }
}

// v3.0: Add exclusion reason to UI
function addExclusionReason(reasonName, description) {
  const fulltext = screeningResults.included;
  const firstEmpty = Array.from(document.querySelectorAll('select[id^="exclude-"]'))
    .findIndex(select => !select.value);
  
  if (firstEmpty >= 0) {
    document.getElementById(`exclude-${firstEmpty}`).value = reasonName;
    updateExclusionStats();
    showToast(`已为第${firstEmpty + 1}篇添加排除原因: ${reasonName}`, 'success');
  } else {
    showToast('未找到可用的记录位置', 'warning');
  }
}

// v4.1: Project Save/Load Functions
let autoSaveEnabled = false;
let autoSaveInterval = null;

function saveProject() {
  if (!uploadedData || uploadedData.length === 0) {
    showToast('没有可保存的数据', 'warning');
    return;
  }

  ensureProjectId();
  const safeTemplate = sanitizeExclusionTemplate(exclusionReasons);

  const project = {
    version: APP_RELEASE_VERSION,
    timestamp: new Date().toISOString(),
    projectId: currentProjectId,
    uploadedData: uploadedData,
    uploadedFiles: uploadedFiles,
    screeningResults: screeningResults,
    columnMapping: columnMapping,
    fileFormat: fileFormat,
    formatSource: formatSource,
    currentStep: currentStep,
    exclusionReasons: safeTemplate,
    filterRules: filterRules || null,
    qualityAssessments: qualityAssessments,
    importJobs: importJobs,
    projectManifest: projectManifest,
    auditEvents: auditEvents,
    screeningDecisions: screeningDecisions,
    aiSuggestionEvents: aiSuggestionEvents,
    projectHistory: projectHistory,
    dualReviewResults: dualReviewResults,
    dualReviewConflictState: dualReviewConflictState
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PRISMA-Project-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  const now = new Date().toLocaleString('zh-CN');
  document.getElementById('lastSaveTime').textContent = `上次保存：${now}`;
  localStorage.setItem('lastSaveTime', now);
  
  showToast('✅ 项目已保存', 'success');
}

function loadProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project = JSON.parse(event.target.result);
        
        if (!project.version) {
          showToast('⚠️ 这不是有效的项目文件', 'warning');
          return;
        }

        // Start a fresh local project session so different projects don't interfere
        startNewProjectSession();

        uploadedData = project.uploadedData || [];
        uploadedFiles = project.uploadedFiles || [];
        screeningResults = project.screeningResults || null;
        columnMapping = project.columnMapping || {};
        fileFormat = project.fileFormat || 'unknown';
        formatSource = project.formatSource || 'Unknown';
        currentStep = project.currentStep || 1;
        filterRules = project.filterRules || null;
        qualityAssessments = normalizeQualityAssessmentsState(project.qualityAssessments || []);
        importJobs = normalizeImportJobsState(project.importJobs || []);
        projectManifest = project.projectManifest || projectManifest || null;
        auditEvents = Array.isArray(project.auditEvents) ? project.auditEvents : [];
        screeningDecisions = Array.isArray(project.screeningDecisions) ? project.screeningDecisions : [];
        aiSuggestionEvents = Array.isArray(project.aiSuggestionEvents) ? project.aiSuggestionEvents : [];
        projectHistory = Array.isArray(project.projectHistory) ? project.projectHistory : [];
        dualReviewResults = project.dualReviewResults || { A: {}, B: {}, final: {} };
        dualReviewConflictState = project.dualReviewConflictState || dualReviewConflictState;

        // Backward compatible: old versions may store exclusionReasons as an object map
        let templateFromFile = project.exclusionReasons;
        if (!Array.isArray(templateFromFile) && templateFromFile && typeof templateFromFile === 'object') {
          templateFromFile = Object.keys(templateFromFile);
        }
        setExclusionReasonsTemplate(templateFromFile);

        // Restore project id if provided (otherwise keep the newly generated one)
        if (project.projectId && typeof project.projectId === 'string') {
          currentProjectId = project.projectId;
          localStorage.setItem('prisma_current_project_id', currentProjectId);
        }

        if (screeningResults) {
          displayResults(screeningResults);
          if (currentStep >= 5 && FEATURE_FLAGS.ENABLE_QUALITY_ASSESSMENT) {
            prepareQualityAssessmentShell({ persist: false, silent: true });
          }
          setStep(Math.min(currentStep || 3, WORKFLOW_STEP_COUNT));
          if (currentStep >= 4) {
            displayFulltextReviewUI();
          }
        } else if (uploadedData.length > 0) {
          displayUploadInfo();
          setStep(2);
        }

        if (filterRules) {
          setFormRules(filterRules);
        }

        persistCurrentProjectState();

        const savedTime = new Date(project.timestamp).toLocaleString('zh-CN');
        document.getElementById('lastSaveTime').textContent = `上次保存：${savedTime}`;
        
        showToast(`✅ 项目已加载（保存于 ${savedTime}）`, 'success');
      } catch (error) {
        showToast('❌ 项目文件格式错误', 'error');
        console.error(error);
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

function autoSaveToggle() {
  autoSaveEnabled = !autoSaveEnabled;
  const statusEl = document.getElementById('autoSaveStatus');
  
  if (autoSaveEnabled) {
    statusEl.textContent = '开启';
    statusEl.style.color = 'var(--color-success)';
    
    autoSaveInterval = setInterval(() => {
      if (uploadedData && uploadedData.length > 0) {
        localStorage.setItem('prisma_autosave', JSON.stringify({
          version: APP_RELEASE_VERSION,
          timestamp: new Date().toISOString(),
          projectId: currentProjectId || null,
          uploadedData: uploadedData,
          uploadedFiles: uploadedFiles,
          screeningResults: screeningResults,
          columnMapping: columnMapping,
          fileFormat: fileFormat,
          formatSource: formatSource,
          currentStep: currentStep,
          exclusionReasons: sanitizeExclusionTemplate(exclusionReasons),
          filterRules: filterRules || null,
          qualityAssessments: qualityAssessments,
          importJobs: importJobs,
          projectManifest: projectManifest,
          auditEvents: auditEvents,
          screeningDecisions: screeningDecisions,
          aiSuggestionEvents: aiSuggestionEvents,
          projectHistory: projectHistory,
          dualReviewResults: dualReviewResults,
          dualReviewConflictState: dualReviewConflictState
        }));
        
        const now = new Date().toLocaleString('zh-CN');
        document.getElementById('lastSaveTime').textContent = `自动保存于：${now}`;
        console.log('🔄 自动保存完成');
      }
    }, 300000);
    
    showToast('✅ 自动保存已开启（每5分钟）', 'success');
  } else {
    statusEl.textContent = '关闭';
    statusEl.style.color = 'var(--color-text-secondary)';
    
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
    
    showToast('自动保存已关闭', 'info');
  }
}

// v4.1: Batch Operations for Step 4
let selectedRecords = new Set();
let currentDefaultExclusion = '';

function selectAllRecords() {
  const checkboxes = document.querySelectorAll('.review-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = true;
    selectedRecords.add(parseInt(cb.dataset.index));
  });
  showToast(`已选中 ${selectedRecords.size} 条记录`, 'info');
}

function deselectAllRecords() {
  const checkboxes = document.querySelectorAll('.review-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
  selectedRecords.clear();
  showToast('已取消全选', 'info');
}

function batchExclude() {
  if (selectedRecords.size === 0) {
    showToast('请先选择要排除的文献', 'warning');
    return;
  }

  if (!currentDefaultExclusion) {
    showToast('请先点击排除理由按钮（1-6）', 'warning');
    return;
  }

  let count = 0;
  selectedRecords.forEach(idx => {
    const select = document.getElementById(`exclude-${idx}`);
    if (select && !select.value) {
      select.value = currentDefaultExclusion;
      count++;
    }
  });

  selectedRecords.clear();
  const checkboxes = document.querySelectorAll('.review-checkbox');
  checkboxes.forEach(cb => cb.checked = false);

  showToast(`✅ 已批量设置 ${count} 条排除理由为"${currentDefaultExclusion}"`, 'success');
  updateFulltextStats();
}

function setDefaultExclusion(reason) {
  currentDefaultExclusion = reason;
  
  const buttons = document.querySelectorAll('[data-key]');
  buttons.forEach(btn => {
    btn.style.borderColor = '';
    btn.style.borderWidth = '';
  });
  
  const activeBtn = Array.from(buttons).find(btn => btn.textContent.includes(reason));
  if (activeBtn) {
    activeBtn.style.borderColor = 'var(--color-primary)';
    activeBtn.style.borderWidth = '3px';
  }
  
  showToast(`✅ 当前排除理由：${reason}`, 'info');
}

// v1.1: Dual-reviewer mode functions
function setReviewMode(mode) {
  isDualReviewMode = (mode === 'dual');
  
  // Update button styles
  const singleBtn = document.getElementById('single-mode-btn');
  const dualBtn = document.getElementById('dual-mode-btn');
  
  if (isDualReviewMode) {
    singleBtn.style.background = 'rgba(255,255,255,0.2)';
    singleBtn.style.color = 'white';
    singleBtn.style.border = '2px solid white';
    singleBtn.style.fontWeight = 'normal';
    
    dualBtn.style.background = 'white';
    dualBtn.style.color = '#667eea';
    dualBtn.style.border = 'none';
    dualBtn.style.fontWeight = 'bold';
    
    document.getElementById('dual-review-setup').classList.remove('hidden');
  } else {
    singleBtn.style.background = 'white';
    singleBtn.style.color = '#667eea';
    singleBtn.style.border = 'none';
    singleBtn.style.fontWeight = 'bold';
    
    dualBtn.style.background = 'rgba(255,255,255,0.2)';
    dualBtn.style.color = 'white';
    dualBtn.style.border = '2px solid white';
    dualBtn.style.fontWeight = 'normal';
    
    document.getElementById('dual-review-setup').classList.add('hidden');
    document.getElementById('kappa-analysis').classList.add('hidden');
  }
  
  // Refresh review UI if already displayed
  if (screeningResults) {
    displayFulltextReviewUI();
  }
}

function switchReviewer(reviewer) {
  currentReviewer = reviewer;
  
  // Update reviewer names from input
  const aName = document.getElementById('reviewer-a-name').value || '审查员A';
  const bName = document.getElementById('reviewer-b-name').value || '审查员B';
  reviewerNames.A = aName;
  reviewerNames.B = bName;
  
  // Update button styles
  const aBtn = document.getElementById('reviewer-a-btn');
  const bBtn = document.getElementById('reviewer-b-btn');
  
  if (reviewer === 'A') {
    aBtn.classList.remove('btn-secondary');
    aBtn.classList.add('btn-primary');
    aBtn.innerHTML = '🔵 ' + aName;
    
    bBtn.classList.remove('btn-primary');
    bBtn.classList.add('btn-secondary');
    bBtn.innerHTML = '⚪ ' + bName;
  } else {
    bBtn.classList.remove('btn-secondary');
    bBtn.classList.add('btn-primary');
    bBtn.innerHTML = '🔵 ' + bName;
    
    aBtn.classList.remove('btn-primary');
    aBtn.classList.add('btn-secondary');
    aBtn.innerHTML = '⚪ ' + aName;
  }
  
  // Load reviewer's previous decisions
  loadReviewerDecisions();
  
  // Update title to show current reviewer
  const currentReviewerName = reviewerNames[reviewer];
  showToast(`已切换到${currentReviewerName}的审查界面`, 'info');
}

function loadReviewerDecisions() {
  if (!screeningResults || !isDualReviewMode) return;
  syncDualReviewResultsFromDecisions();
  
  const fulltext = screeningResults.included;
  fulltext.forEach((record, idx) => {
    const select = document.getElementById(`exclude-${idx}`);
    if (select && dualReviewResults[currentReviewer][idx]) {
      select.value = dualReviewResults[currentReviewer][idx].decision || '';
    }
  });
}

function updateDualReviewStats() {
  if (!isDualReviewMode) return;
  syncDualReviewResultsFromDecisions();
  
  const fulltext = screeningResults.included;
  const reviewerADecisions = [];
  const reviewerBDecisions = [];
  
  // Collect decisions from both reviewers
  fulltext.forEach((record, idx) => {
    const aDecision = dualReviewResults.A[idx] ? (dualReviewResults.A[idx].decision || '') : null;
    const bDecision = dualReviewResults.B[idx] ? (dualReviewResults.B[idx].decision || '') : null;
    reviewerADecisions.push(aDecision);
    reviewerBDecisions.push(bDecision);
  });
  
  // Check if both reviewers have made decisions for all records
  const aCompleted = reviewerADecisions.every(d => d !== null);
  const bCompleted = reviewerBDecisions.every(d => d !== null);
  
  if (aCompleted && bCompleted) {
    // Calculate reliability statistics
    const stats = calculateReliabilityStats(reviewerADecisions, reviewerBDecisions);
    displayKappaResults(stats);
    document.getElementById('kappa-analysis').classList.remove('hidden');
  }
}

function displayKappaResults(stats) {
  const resultsDiv = document.getElementById('kappa-results');
  const disagreementCount = document.getElementById('disagreement-count');
  
  resultsDiv.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">二分类Kappa值</div>
      <div class="stat-value">${stats.binary.kappa}</div>
      <div class="stat-sublabel">${stats.binary.interpretation}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">多分类Kappa值</div>
      <div class="stat-value">${stats.multiClass.kappa}</div>
      <div class="stat-sublabel">${stats.multiClass.interpretation}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">总体一致性</div>
      <div class="stat-value">${Math.round((stats.agreements / stats.totalRecords) * 100)}%</div>
      <div class="stat-sublabel">${stats.agreements}/${stats.totalRecords}篇</div>
    </div>
  `;
  
  disagreementCount.textContent = stats.disagreements;
}

function showDisagreements() {
  if (runtimeMode !== RUNTIME_MODE.DUAL_MAIN) {
    showToast('仅主审查员可查看并处理意见分歧', 'warning');
    return;
  }

  if (!isDualReviewMode || !screeningResults) return;

  syncDualReviewResultsFromDecisions();
  const state = refreshDualReviewConflictState({ auditNewConflicts: true });
  const indexMap = getAuditRecordIndexMap(screeningResults.included || []);
  const disagreements = state.screeningConflicts
    .filter((conflict) => conflict.status !== 'resolved')
    .map((conflict) => ({
      index: indexMap.get(conflict.recordId),
      record: conflict.record || (screeningResults.included || [])[indexMap.get(conflict.recordId)] || {},
      reviewerA: getFulltextSelectValueFromDecision(conflict.reviewerA),
      reviewerB: getFulltextSelectValueFromDecision(conflict.reviewerB),
      reviewerADecision: conflict.reviewerA,
      reviewerBDecision: conflict.reviewerB,
      conflict,
    }))
    .filter((item) => Number.isFinite(item.index));
  
  displayDisagreementResolution(disagreements);
}

function displayDisagreementResolution(disagreements) {
  if (runtimeMode !== RUNTIME_MODE.DUAL_MAIN) {
    showToast('仅主审查员可处理分歧协商', 'warning');
    return;
  }

  if (disagreements.length === 0) {
    showToast('🎉 恭喜！所有文献审查结果一致，无需协商！', 'success');
    return;
  }
  
  // Create disagreement resolution modal
  const modalHTML = `
    <div id="disagreement-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; border-radius: 12px; padding: var(--space-24); max-width: 95%; max-height: 90%; overflow-y: auto; width: 900px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
        <h3 style="margin-bottom: var(--space-16); color: var(--color-primary);">🤝 分歧协商解决 (${disagreements.length}篇需要讨论)</h3>
        <div id="disagreement-list">
          ${disagreements.map((item, idx) => `
            <div class="info-box" style="margin-bottom: var(--space-16); border-left: 4px solid var(--color-warning);">
              <h4 style="margin-bottom: var(--space-8); color: var(--color-text-primary);">文献 ${item.index + 1}: ${getValue(item.record, 'title').substring(0, 100)}...</h4>
              <div class="grid grid-2" style="margin-bottom: var(--space-12);">
                <div style="padding: var(--space-8); background: #f8f9fa; border-radius: 6px;">
                  <strong>${reviewerNames.A}的决定:</strong><br>
                  <span style="color: ${item.reviewerA === '' ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: bold;">
                    ${item.reviewerA === '' ? '✅ 纳入' : '❌ ' + item.reviewerA}
                  </span>
                </div>
                <div style="padding: var(--space-8); background: #f8f9fa; border-radius: 6px;">
                  <strong>${reviewerNames.B}的决定:</strong><br>
                  <span style="color: ${item.reviewerB === '' ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: bold;">
                    ${item.reviewerB === '' ? '✅ 纳入' : '❌ ' + item.reviewerB}
                  </span>
                </div>
              </div>
              <label class="form-label" style="font-weight: bold;">协商后的最终决定:</label>
              <select id="final-decision-${item.index}" class="form-input" style="margin-bottom: var(--space-8);">
                <option value="">纳入</option>
                <option value="__uncertain__">暂不确定</option>
                <option value="人群不符">人群不符</option>
                <option value="干预不符">干预不符</option>
                <option value="对照不符">对照不符</option>
                <option value="缺乏结局">缺乏结局</option>
                <option value="数据不完整">数据不完整</option>
                <option value="研究设计不合适">研究设计不合适</option>
                <option value="其他">其他</option>
              </select>
              <label class="form-label">讨论记录（建议记录分歧原因和协商过程）:</label>
              <textarea id="discussion-${item.index}" class="form-input" placeholder="例如：审查员A认为人群不符合纳入标准，审查员B认为符合。经讨论后认为..." rows="3" style="resize: vertical;"></textarea>
            </div>
          `).join('')}
        </div>
        <div class="alert alert-info" style="margin: var(--space-16) 0;">
          <strong>提示:</strong> 请仔细讨论每个分歧，确保最终决定基于充分的证据和一致的标准。讨论记录有助于提高审查的透明度和可重复性。
        </div>
        <div style="text-align: right; margin-top: var(--space-16);">
          <button class="btn btn-secondary" onclick="closeDisagreementModal()" style="margin-right: var(--space-8);">取消</button>
          <button class="btn btn-primary" onclick="applyFinalDecisions()">✅ 应用最终决定</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Store disagreements in a global variable for applyFinalDecisions
  window.currentDisagreements = disagreements;
}

function closeDisagreementModal() {
  const modal = document.getElementById('disagreement-modal');
  if (modal) {
    modal.remove();
  }
  window.currentDisagreements = null;
}

function applyFinalDecisions() {
  const disagreements = window.currentDisagreements;
  if (!disagreements) return;
  
  let resolvedCount = 0;
  disagreements.forEach(item => {
    const finalDecision = document.getElementById(`final-decision-${item.index}`).value;
    const discussion = document.getElementById(`discussion-${item.index}`).value;
    const selection = normalizeFulltextSelection(finalDecision);
    let resolverDecision = null;
    
    // Apply final decision to the select element
    const select = document.getElementById(`exclude-${item.index}`);
    if (select) {
      select.value = finalDecision;
      resolvedCount++;
    }
    
    // Store discussion notes
    if (!dualReviewResults.final) {
      dualReviewResults.final = {};
    }
    dualReviewResults.final[item.index] = {
      finalDecision: finalDecision,
      decision: selection.decision,
      exclusionReason: selection.exclusionReason,
      discussion: discussion,
      reviewerAOriginal: item.reviewerA,
      reviewerBOriginal: item.reviewerB,
      resolvedBy: 'consensus',
      timestamp: new Date().toISOString()
    };

    if (DUAL_REVIEW_ENGINE && item.conflict) {
      resolverDecision = DUAL_REVIEW_ENGINE.createResolverScreeningDecision(item.conflict, {
        projectId: ensureProjectId(),
        selection: finalDecision,
        resolverId: currentUserSession?.username || 'resolver_1',
        notes: discussion,
      });
      upsertScreeningDecisionSafe(resolverDecision, { persist: false });
      appendAuditEventsSafe(
        {
          ...DUAL_REVIEW_ENGINE.createResolverAuditEvent(item.conflict, resolverDecision, { discussion }),
          eventType: 'review_conflict_resolved',
        },
        { persist: false }
      );
    }
  });
  
  refreshDualReviewConflictState();
  createProjectHistorySnapshot('conflict_resolved', `After resolving ${resolvedCount} screening conflicts`);
  persistCurrentProjectState();
  updateFulltextStats();
  closeDisagreementModal();
  
  showToast(`✅ 已成功解决 ${resolvedCount} 个分歧！最终决定已应用。`, 'success');
  
  // Update kappa analysis after resolution
  setTimeout(() => {
    const stats = calculatePostResolutionStats();
    if (stats) {
      showToast(`📊 解决分歧后，总体一致性提升至 ${Math.round(stats.finalAgreementRate * 100)}%`, 'info');
    }
  }, 1000);
}

function calculatePostResolutionStats() {
  if (!isDualReviewMode || !screeningResults) return null;
  
  const fulltext = screeningResults.included;
  let totalAgreements = 0;
  let totalRecords = fulltext.length;
  
  fulltext.forEach((record, idx) => {
    const aDecision = dualReviewResults.A[idx] ? (dualReviewResults.A[idx].normalizedDecision || normalizeFulltextSelection(dualReviewResults.A[idx].decision || '').decision) : '';
    const bDecision = dualReviewResults.B[idx] ? (dualReviewResults.B[idx].normalizedDecision || normalizeFulltextSelection(dualReviewResults.B[idx].decision || '').decision) : '';
    const finalDecision = dualReviewResults.final && dualReviewResults.final[idx] ? 
      dualReviewResults.final[idx].finalDecision : null;
    
    // If there was a final decision (disagreement resolved), count as agreement
    // If no final decision needed (original agreement), count as agreement
    if (finalDecision !== null || aDecision === bDecision) {
      totalAgreements++;
    }
  });
  
  return {
    finalAgreementRate: totalAgreements / totalRecords,
    resolvedDisagreements: Object.keys(dualReviewResults.final || {}).length
  };
}

// Load project data from shared storage
function loadProjectData() {
  if (!currentUserSession) return;
  
  const projects = JSON.parse(localStorage.getItem(COLLAB_PROJECTS_KEY) || '{}');
  projectData = projects[currentUserSession.projectId];
  
  if (!projectData) {
    // Check if this is a valid scenario
    if (currentUserSession.role === 'reviewer-b') {
      // Deputy reviewer joining non-existent project - show waiting message
      showProjectWaitingMessage();
      return;
    }
    
    // Main reviewer creating new project
    projectData = {
      id: currentUserSession.projectId,
      name: '未命名项目',
      creator: currentUserSession.username,
      createdAt: new Date().toISOString(),
      reviewers: {},
      uploadedData: [],
      uploadedFiles: [],
      screeningResults: null,
      reviewDecisions: {},
      dualReviewResults: { A: {}, B: {}, final: {} },
      dualReviewConflictState: getEmptyDualReviewConflictState(),
      columnMapping: {},
      fileFormat: 'unknown',
      formatSource: 'Unknown',
      currentStep: 1,
      filterRules: null,
      exclusionReasons: [...DEFAULT_EXCLUSION_REASONS],
      qualityAssessments: [],
      importJobs: [],
      projectManifest: null,
      auditEvents: [],
      screeningDecisions: [],
      aiSuggestionEvents: [],
    };
    
    // Register current user
    projectData.reviewers[currentUserSession.role] = {
      username: currentUserSession.username,
      joinedAt: new Date().toISOString(),
      status: 'active'
    };
    
    saveProjectData();
  } else {
    // Load existing data into global variables before any save,
    // so a newly joined reviewer does not overwrite project state with empty locals.
    if (projectData.uploadedData) {
      uploadedData = projectData.uploadedData;
    }
    if (projectData.uploadedFiles) {
      uploadedFiles = projectData.uploadedFiles;
    }
    if (projectData.screeningResults) {
      screeningResults = projectData.screeningResults;
    }
    columnMapping = projectData.columnMapping || {};
    fileFormat = projectData.fileFormat || 'unknown';
    formatSource = projectData.formatSource || 'Unknown';
    currentStep = projectData.currentStep || inferCollaborativeStep();
    filterRules = projectData.filterRules || null;
    exclusionReasons = sanitizeExclusionTemplate(projectData.exclusionReasons);
    qualityAssessments = normalizeQualityAssessmentsState(projectData.qualityAssessments || []);
    importJobs = normalizeImportJobsState(projectData.importJobs || []);
    projectManifest = projectData.projectManifest || projectManifest || null;
    auditEvents = Array.isArray(projectData.auditEvents) ? projectData.auditEvents : [];
    screeningDecisions = Array.isArray(projectData.screeningDecisions) ? projectData.screeningDecisions : [];
    aiSuggestionEvents = Array.isArray(projectData.aiSuggestionEvents) ? projectData.aiSuggestionEvents : [];
    dualReviewResults = projectData.dualReviewResults || dualReviewResults || { A: {}, B: {}, final: {} };
    dualReviewConflictState = projectData.dualReviewConflictState || dualReviewConflictState || null;

    // Existing project - register current user
    if (!projectData.reviewers[currentUserSession.role]) {
      projectData.reviewers[currentUserSession.role] = {
        username: currentUserSession.username,
        joinedAt: new Date().toISOString(),
        status: 'active'
      };
      saveProjectData();
    }
  }
}

// Show waiting message for deputy reviewer when project doesn't exist
function showProjectWaitingMessage() {
  const existing = document.getElementById('project-waiting');
  if (existing) existing.remove();

  const waitingHTML = `
    <div id="project-waiting" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      color: white;
      text-align: center;
    ">
      <div style="max-width: 500px; padding: var(--space-32);">
        <div style="font-size: 4rem; margin-bottom: var(--space-24);">⏳</div>
        <h2 style="margin-bottom: var(--space-16);">等待项目创建</h2>
        <p style="margin-bottom: var(--space-24); opacity: 0.9;">
          项目 <strong>${currentUserSession.projectId}</strong> 尚未创建。<br>
          请联系主审查员确认项目已创建，然后刷新此页面。
        </p>
        <div style="margin-bottom: var(--space-24);">
          <button onclick="refreshProjectCheck()" style="
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            color: white;
            padding: var(--space-12) var(--space-24);
            border-radius: var(--radius-lg);
            cursor: pointer;
            margin-right: var(--space-12);
            font-weight: bold;
          ">🔄 刷新检查</button>
          <button onclick="logout()" style="
            background: rgba(255,255,255,0.9);
            border: none;
            color: #667eea;
            padding: var(--space-12) var(--space-24);
            border-radius: var(--radius-lg);
            cursor: pointer;
            font-weight: bold;
          ">🚪 重新登录</button>
        </div>
        <p style="font-size: var(--font-size-sm); opacity: 0.7;">
          💡 提示：主审查员需要先创建项目并上传数据，副审查员才能加入进行协作审查。
        </p>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', waitingHTML);
}

// Refresh project check
function refreshProjectCheck() {
  const waitingDiv = document.getElementById('project-waiting');
  if (waitingDiv) {
    waitingDiv.remove();
  }
  
  // Reload project data
  loadProjectData();
  
  if (!projectData) {
    // Still not found, show waiting message again
    showProjectWaitingMessage();
  } else {
    // Project found, initialize normally
    applyCollaborativeProjectState();
    startCollaborationSync();
    showToast('✅ 项目已找到！欢迎加入协作审查。', 'success');
  }
}

// Save project data to shared storage
function saveProjectData() {
  if (!currentUserSession || !projectData) return;
  
  // Update project data with current global state
  projectData.uploadedData = uploadedData && uploadedData.length > 0
    ? uploadedData
    : (projectData.uploadedData || []);
  projectData.uploadedFiles = uploadedFiles && uploadedFiles.length > 0
    ? uploadedFiles
    : (projectData.uploadedFiles || []);
  projectData.screeningResults = screeningResults || projectData.screeningResults || null;
  projectData.columnMapping = Object.keys(columnMapping || {}).length > 0
    ? columnMapping
    : (projectData.columnMapping || {});
  projectData.fileFormat = fileFormat !== 'unknown'
    ? fileFormat
    : (projectData.fileFormat || 'unknown');
  projectData.formatSource = formatSource !== 'Unknown'
    ? formatSource
    : (projectData.formatSource || 'Unknown');
  projectData.currentStep = Math.max(
    currentStep || 1,
    projectData.currentStep || 1,
    inferCollaborativeStep()
  );
  projectData.filterRules = filterRules || projectData.filterRules || null;
  projectData.exclusionReasons = sanitizeExclusionTemplate(exclusionReasons);
  projectData.qualityAssessments = normalizeQualityAssessmentsState(qualityAssessments);
  projectData.importJobs = normalizeImportJobsState(importJobs);
  projectData.projectManifest = ensureProjectManifest();
  projectData.auditEvents = auditEvents;
  projectData.screeningDecisions = screeningDecisions;
  projectData.aiSuggestionEvents = aiSuggestionEvents;
  projectData.projectHistory = projectHistory;
  projectData.dualReviewResults = dualReviewResults;
  projectData.dualReviewConflictState = dualReviewConflictState;
  projectData.lastSync = new Date().toISOString();
  
  // Save to shared storage
  const projects = JSON.parse(localStorage.getItem(COLLAB_PROJECTS_KEY) || '{}');
  projects[currentUserSession.projectId] = projectData;
  localStorage.setItem(COLLAB_PROJECTS_KEY, JSON.stringify(projects));
}

// Logout function
function logout() {
  if (confirm('确定要退出登录吗？未保存的更改可能会丢失。')) {
    // Save current work
    saveProjectData();
    
    // Clear session
    if (collaborationSyncInterval) {
      clearInterval(collaborationSyncInterval);
      collaborationSyncInterval = null;
    }
    window.removeEventListener('storage', handleCollaborationStorageEvent);

    sessionStorage.removeItem(USER_SESSION_KEY);
    
    // Redirect to login
    window.location.href = 'login.html';
  }
}

// Show project status
function showProjectStatus() {
  if (!projectData) return;
  
  const reviewerA = projectData.reviewers['reviewer-a'];
  const reviewerB = projectData.reviewers['reviewer-b'];
  
  const statusHTML = `
    <div style="padding: var(--space-20); background: white; border-radius: 8px; max-width: 500px; margin: 20px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      <h3 style="margin-bottom: var(--space-16); color: var(--color-primary);">📊 项目协作状态</h3>
      
      <div style="margin-bottom: var(--space-16);">
        <h4>项目信息</h4>
        <p><strong>项目ID:</strong> ${projectData.id}</p>
        <p><strong>创建时间:</strong> ${new Date(projectData.createdAt).toLocaleString('zh-CN')}</p>
        <p><strong>最后同步:</strong> ${projectData.lastSync ? new Date(projectData.lastSync).toLocaleString('zh-CN') : '从未同步'}</p>
      </div>
      
      <div style="margin-bottom: var(--space-16);">
        <h4>审查员状态</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-12);">
          <div style="padding: var(--space-12); border: 1px solid var(--color-border); border-radius: 6px; ${reviewerA ? 'background: rgba(34, 197, 94, 0.05)' : 'background: rgba(239, 68, 68, 0.05)'};">
            <div><strong>👨‍🔬 主审查员</strong></div>
            <div>${reviewerA ? reviewerA.username : '未加入'}</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
              ${reviewerA ? `加入于 ${new Date(reviewerA.joinedAt).toLocaleDateString('zh-CN')}` : '等待加入'}
            </div>
          </div>
          <div style="padding: var(--space-12); border: 1px solid var(--color-border); border-radius: 6px; ${reviewerB ? 'background: rgba(34, 197, 94, 0.05)' : 'background: rgba(239, 68, 68, 0.05)'};">
            <div><strong>👩‍🔬 副审查员</strong></div>
            <div>${reviewerB ? reviewerB.username : '未加入'}</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
              ${reviewerB ? `加入于 ${new Date(reviewerB.joinedAt).toLocaleDateString('zh-CN')}` : '等待加入'}
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <button onclick="closeModal()" class="btn btn-primary">关闭</button>
      </div>
    </div>
  `;
  
  showModal(statusHTML);
}

// Show modal helper
function showModal(htmlContent) {
  const modal = document.createElement('div');
  modal.id = 'status-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 2000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 24px 16px;
    box-sizing: border-box;
  `;
  modal.innerHTML = htmlContent;
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
  document.body.appendChild(modal);
}

// Close modal helper
function closeModal() {
  const modal = document.getElementById('status-modal');
  if (modal) modal.remove();
}

// v1.2: Show deduplication settings
function showDeduplicationSettings() {
  const modalHTML = `
    <div id="status-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; border-radius: 12px; padding: var(--space-24); max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
        <h3 style="margin-bottom: var(--space-16); color: var(--color-primary);">⚙️ 去重功能说明</h3>
        
        <div style="margin-bottom: var(--space-16); padding: var(--space-12); background: #f8f9fa; border-radius: 6px;">
          <h4 style="margin-bottom: var(--space-8);">当前去重方式：</h4>
          <ul style="padding-left: var(--space-20); line-height: 1.8;">
            <li><strong>严格匹配</strong>：根据标题精确匹配</li>
            <li><strong>格式标准化</strong>：忽略大小写和标点符号</li>
            <li><strong>年份差异</strong>：默认忽略（可能是预印本vs正式发表）</li>
          </ul>
        </div>
        
        <div class="info-box" style="background: #fff3cd; border-color: #ffc107;">
          <p style="margin: 0;"><strong>💡 提示：</strong> 如果需要手动查看并选择保留哪些重复文献，您可以：</p>
          <ol style="padding-left: var(--space-20); margin: var(--space-8) 0 0 0; line-height: 1.6;">
            <li>导出"去重后"的数据</li>
            <li>在Excel中使用"条件格式"标记可疑重复项</li>
            <li>手动筛选后重新导入</li>
          </ol>
        </div>
        
        <div style="text-align: right; margin-top: var(--space-16);">
          <button class="btn btn-primary" onclick="closeModal()">知道了</button>
        </div>
      </div>
    </div>
  `;
  
  showModal(modalHTML);
}

// Enhanced save/load functions for multi-user projects
function saveProjectFile() {
  if (runtimeMode !== RUNTIME_MODE.DUAL_MAIN) {
    showToast('仅主审查员可导出协作项目', 'warning');
    return;
  }

  saveProjectData();
  
  const projectExport = {
    ...projectData,
    exportedBy: currentUserSession.username,
    exportedAt: new Date().toISOString(),
    version: '1.1'
  };
  
  const blob = new Blob([JSON.stringify(projectExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `PRISMA-Project-${projectData.id}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
  showToast('✅ 项目已导出到本地文件', 'success');
}


// Final override: clean modal copy and inline translation UX.
function openAbstractModal(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const uiText = {
    untitled: '\uFF08\u65E0\u6807\u9898\uFF09',
    journal: '\u671F\u520A',
    year: '\u5E74\u4EFD',
    authors: '\u4F5C\u8005',
    doi: 'DOI',
    method: '\u7814\u7A76\u65B9\u6CD5',
    untagged: '\u672A\u6807\u6CE8',
    close: '\u5173\u95ED',
    abstract: '\u6458\u8981\uFF08\u5B8C\u6574\uFF09',
    noAbstract: '\uFF08\u65E0\u6458\u8981\uFF09',
    translation: '\u4E2D\u6587\u7FFB\u8BD1\uFF08\u673A\u5668\u7ED3\u679C\uFF09',
    translateButton: '\u9875\u5185\u7FFB\u8BD1\u672C\u6761\u6587\u732E',
    viewFulltextPdf: '\u67E5\u770B\u5168\u6587\uFF08PDF\uFF09',
    viewFulltextNewTab: '\u67E5\u770B\u5168\u6587\uFF08\u65B0\u6807\u7B7E\uFF09'
  };

  const title = escapeHTML(getValue(record, 'title'));
  const journal = escapeHTML(getValue(record, 'journal'));
  const year = escapeHTML(getValue(record, 'year'));
  const authors = escapeHTML(getValue(record, 'authors'));
  const doi = escapeHTML(getValue(record, 'doi'));
  const studyDesign = escapeHTML(record.studyDesign || uiText.untagged);
  const abstractText = escapeHTML(getValue(record, 'abstract'));
  const fulltextInfo = getFulltextLinkInfo(record);

  const modalHTML = `
    <div onclick="event.stopPropagation()" style="background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-24); max-width: 820px; width: min(820px, 100%); max-height: calc(100vh - 48px); overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-lg);">
      <div style="position: sticky; top: 0; z-index: 2; background: var(--color-surface); display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-12); padding-bottom: var(--space-12);">
        <div style="flex: 1;">
          <div style="font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); margin-bottom: var(--space-8);">${title || uiText.untitled}</div>
          <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.6;">
            ${journal ? `${uiText.journal}\uFF1A${journal}<br>` : ''}
            ${year ? `${uiText.year}\uFF1A${year}<br>` : ''}
            ${authors ? `${uiText.authors}\uFF1A${authors}<br>` : ''}
            ${doi ? `${uiText.doi}\uFF1A${doi}<br>` : ''}
            ${studyDesign ? `${uiText.method}\uFF1A${studyDesign}` : ''}
          </div>
        </div>
        <button class="btn btn-secondary" type="button" onclick="closeModal()">${uiText.close}</button>
      </div>
      <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px;">
        <div style="margin-top: var(--space-4);">
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">${uiText.abstract}</div>
          <div style="max-height: min(38vh, 420px); overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: var(--color-background); white-space: pre-wrap; line-height: 1.7;">
            ${abstractText || uiText.noAbstract}
          </div>
        </div>
        <div id="record-translation-panel" style="display: none; margin-top: var(--space-16);">
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">${uiText.translation}</div>
          <div id="record-translation-content" style="max-height: min(28vh, 300px); overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: #f8fafc; white-space: pre-wrap; line-height: 1.7;"></div>
        </div>
      </div>
      <div style="position: sticky; bottom: 0; z-index: 2; background: var(--color-surface); margin-top: var(--space-16); padding-top: var(--space-12); border-top: 1px solid var(--color-border); display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-8);">
        <button class="btn btn-secondary" id="translate-record-btn-${idx}" type="button" onclick="translateRecordToChinese(${idx})">${uiText.translateButton}</button>
        <button class="btn btn-primary" type="button" onclick="viewFulltext(${idx})" ${fulltextInfo.url ? '' : 'disabled'}>${fulltextInfo.source === 'pdf' ? uiText.viewFulltextPdf : uiText.viewFulltextNewTab}</button>
      </div>
    </div>
  `;

  showModal(modalHTML);
}

async function translateRecordToChinese(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const titleText = String(getValue(record, 'title') || '').trim();
  const abstractText = String(getValue(record, 'abstract') || '').trim();
  const parts = [];

  if (titleText) parts.push(`Title:\n${titleText}`);
  if (abstractText) parts.push(`Abstract:\n${abstractText}`);

  if (parts.length === 0) {
    showToast('\u5F53\u524D\u8BB0\u5F55\u6CA1\u6709\u53EF\u7FFB\u8BD1\u7684\u6807\u9898\u6216\u6458\u8981', 'warning');
    return;
  }

  const payload = parts.join('\n\n').slice(0, 4500);
  const panel = document.getElementById('record-translation-panel');
  const content = document.getElementById('record-translation-content');
  const button = document.getElementById(`translate-record-btn-${idx}`);
  const originalLabel = button ? button.textContent : '';

  if (panel && content) {
    panel.style.display = 'block';
    content.textContent = '\u6B63\u5728\u7FFB\u8BD1...';
  }
  if (button) {
    button.disabled = true;
    button.textContent = '\u7FFB\u8BD1\u4E2D...';
  }

  try {
    const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=' + encodeURIComponent(payload));
    if (!response.ok) throw new Error('translation_http_' + response.status);

    const data = await response.json();
    const translatedText = parseInlineTranslationResult(data);
    if (!translatedText) throw new Error('translation_empty');

    if (content) content.textContent = translatedText;
    showToast('\u5DF2\u751F\u6210\u9875\u5185\u4E2D\u6587\u7FFB\u8BD1', 'success');
  } catch (error) {
    if (content) {
      content.textContent = '\u9875\u5185\u7FFB\u8BD1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u5DF2\u4E3A\u4F60\u6253\u5F00\u65B0\u6807\u7B7E\u7FFB\u8BD1\u3002';
    }
    openRecordTranslationInNewTab(payload);
    showToast('\u9875\u5185\u7FFB\u8BD1\u5931\u8D25\uFF0C\u5DF2\u81EA\u52A8\u5207\u6362\u4E3A\u65B0\u6807\u7B7E\u7FFB\u8BD1', 'warning');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || '\u9875\u5185\u7FFB\u8BD1\u672C\u6761\u6587\u732E';
    }
  }
}

// Final override: robust abstract cleanup for CNKI exports and source-truncation hint.
function sanitizeAbstractText(value) {
  let text = String(value || '').replace(/\u00a0/g, ' ').trim();
  if (!text) return '';

  text = String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s*(?:\u66F4\u591A\s*\u8FD8\u539F\s*)?AbstractFilter\([^)]*\)\s*;?\s*$/i, '')
    .replace(/\s*\u66F4\u591A\s*\u8FD8\u539F\s*$/i, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function isLikelySourceTruncatedAbstract(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  return /(?:\.\s*\.\s*\.\s*|…\s*)$/.test(text);
}

function openAbstractModal(idx) {
  if (!screeningResults) return;
  const record = screeningResults.included?.[idx];
  if (!record) return;

  const uiText = {
    untitled: '\uFF08\u65E0\u6807\u9898\uFF09',
    journal: '\u671F\u520A',
    year: '\u5E74\u4EFD',
    authors: '\u4F5C\u8005',
    doi: 'DOI',
    method: '\u7814\u7A76\u65B9\u6CD5',
    untagged: '\u672A\u6807\u6CE8',
    close: '\u5173\u95ED',
    abstract: '\u6458\u8981\uFF08\u5B8C\u6574\uFF09',
    noAbstract: '\uFF08\u65E0\u6458\u8981\uFF09',
    translation: '\u4E2D\u6587\u7FFB\u8BD1\uFF08\u673A\u5668\u7ED3\u679C\uFF09',
    translateButton: '\u9875\u5185\u7FFB\u8BD1\u672C\u6761\u6587\u732E',
    viewFulltextPdf: '\u67E5\u770B\u5168\u6587\uFF08PDF\uFF09',
    viewFulltextNewTab: '\u67E5\u770B\u5168\u6587\uFF08\u65B0\u6807\u7B7E\uFF09',
    sourceNotice: '\u6CE8\uFF1A\u8BE5\u6458\u8981\u53EF\u80FD\u5728\u539F\u59CB\u6570\u636E\u6E90\u4E2D\u5DF2\u88AB\u622A\u65AD\u3002'
  };

  const title = escapeHTML(getValue(record, 'title'));
  const journal = escapeHTML(getValue(record, 'journal'));
  const year = escapeHTML(getValue(record, 'year'));
  const authors = escapeHTML(getValue(record, 'authors'));
  const doi = escapeHTML(getValue(record, 'doi'));
  const studyDesign = escapeHTML(record.studyDesign || uiText.untagged);
  const abstractRaw = getValue(record, 'abstract');
  const abstractText = escapeHTML(abstractRaw);
  const fulltextInfo = getFulltextLinkInfo(record);
  const truncatedHint = isLikelySourceTruncatedAbstract(abstractRaw)
    ? `<div style="margin-top: var(--space-8); color: #b45309; font-size: var(--font-size-sm);">${uiText.sourceNotice}</div>`
    : '';

  const modalHTML = `
    <div onclick="event.stopPropagation()" style="background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-24); max-width: 820px; width: min(820px, 100%); max-height: calc(100vh - 48px); overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-lg);">
      <div style="position: sticky; top: 0; z-index: 2; background: var(--color-surface); display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-12); padding-bottom: var(--space-12);">
        <div style="flex: 1;">
          <div style="font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); margin-bottom: var(--space-8);">${title || uiText.untitled}</div>
          <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.6;">
            ${journal ? `${uiText.journal}\uFF1A${journal}<br>` : ''}
            ${year ? `${uiText.year}\uFF1A${year}<br>` : ''}
            ${authors ? `${uiText.authors}\uFF1A${authors}<br>` : ''}
            ${doi ? `${uiText.doi}\uFF1A${doi}<br>` : ''}
            ${studyDesign ? `${uiText.method}\uFF1A${studyDesign}` : ''}
          </div>
        </div>
        <button class="btn btn-secondary" type="button" onclick="closeModal()">${uiText.close}</button>
      </div>
      <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px;">
        <div style="margin-top: var(--space-4);">
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">${uiText.abstract}</div>
          <div style="max-height: min(38vh, 420px); overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: var(--color-background); white-space: pre-wrap; line-height: 1.7;">
            ${abstractText || uiText.noAbstract}
          </div>
          ${truncatedHint}
        </div>
        <div id="record-translation-panel" style="display: none; margin-top: var(--space-16);">
          <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">${uiText.translation}</div>
          <div id="record-translation-content" style="max-height: min(28vh, 300px); overflow-y: auto; padding: var(--space-12); border: 1px solid var(--color-border); border-radius: var(--radius-base); background: #f8fafc; white-space: pre-wrap; line-height: 1.7;"></div>
        </div>
      </div>
      <div style="position: sticky; bottom: 0; z-index: 2; background: var(--color-surface); margin-top: var(--space-16); padding-top: var(--space-12); border-top: 1px solid var(--color-border); display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-8);">
        <button class="btn btn-secondary" id="translate-record-btn-${idx}" type="button" onclick="translateRecordToChinese(${idx})">${uiText.translateButton}</button>
        <button class="btn btn-primary" type="button" onclick="viewFulltext(${idx})" ${fulltextInfo.url ? '' : 'disabled'}>${fulltextInfo.source === 'pdf' ? uiText.viewFulltextPdf : uiText.viewFulltextNewTab}</button>
      </div>
    </div>
  `;

  showModal(modalHTML);
}

function buildTruncatedAbstractBadgeHTML() {
  return `<div class="source-truncated-badge" style="margin-bottom: var(--space-6);"><span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 12px; line-height: 1.4; background: rgba(245, 158, 11, 0.14); color: #b45309; border: 1px solid rgba(245, 158, 11, 0.25);">\u6E90\u6458\u8981\u53EF\u80FD\u5DF2\u622A\u65AD</span></div>`;
}

const __originalDisplayFulltextReviewUI = displayFulltextReviewUI;
displayFulltextReviewUI = function () {
  __originalDisplayFulltextReviewUI();

  if (!screeningResults || !Array.isArray(screeningResults.included)) return;

  const rows = document.querySelectorAll('#fulltext-review-table tbody tr');
  rows.forEach((row, idx) => {
    const abstractCell = row.querySelector('.abstract-cell');
    if (!abstractCell) return;

    abstractCell.querySelectorAll('.source-truncated-badge').forEach((node) => node.remove());
    Array.from(abstractCell.children).forEach((node) => {
      if (!node.classList || (!node.classList.contains('abstract-snippet') && !node.classList.contains('abstract-actions'))) {
        node.remove();
      }
    });
    const record = screeningResults.included[idx];
    const abstractText = getValue(record, 'abstract');
    if (!isLikelySourceTruncatedAbstract(abstractText)) return;

    abstractCell.insertAdjacentHTML('afterbegin', buildTruncatedAbstractBadgeHTML());
  });
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


