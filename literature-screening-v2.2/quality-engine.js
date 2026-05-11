(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.QualityEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STUDY_DESIGN_FAMILIES = Object.freeze({
    RCT: 'rct',
    SYSTEMATIC_REVIEW: 'systematic_review',
    COHORT: 'cohort',
    CASE_CONTROL: 'case_control',
    CROSS_SECTIONAL: 'cross_sectional',
    DIAGNOSTIC_ACCURACY: 'diagnostic_accuracy',
    NON_RANDOMIZED_INTERVENTION: 'non_randomized_intervention',
    CASE_REPORT: 'case_report',
    CASE_SERIES: 'case_series',
    OTHER: 'other',
  });

  const TOOL_FAMILIES = Object.freeze({
    ROB2: 'rob2',
    ROBINS_I: 'robins_i',
    NEWCASTLE_OTTAWA_SCALE: 'newcastle_ottawa_scale',
    JBI: 'jbi',
    QUADAS_2: 'quadas_2',
    AMSTAR_2: 'amstar_2',
    ROB2_LITE: 'rob2_lite',
    AMSTAR2_LITE: 'amstar2_lite',
    JBI_NOS_LITE: 'jbi_nos_lite',
    ROBINS_I_LITE: 'robins_i_lite',
    CASE_REPORT_LITE: 'case_report_lite',
    GENERIC: 'generic_quality_shell',
  });

  const EVIDENCE_LEVELS = Object.freeze({
    HIGH: 'high',
    MODERATE: 'moderate',
    LOW: 'low',
    VERY_LOW: 'very_low',
  });

  const ASSESSMENT_STATUS = Object.freeze({
    NOT_STARTED: 'not_started',
    QUEUED: 'queued',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete',
    COMPLETED: 'completed',
    NEEDS_FULL_TEXT: 'needs_full_text',
  });

  const QUALITY_APPRAISAL_SCHEMA_VERSION = 'quality_appraisal.v2.4-alpha';
  const QUALITY_TEMPLATE_VERSION = 'v2.4-alpha';
  const QUALITY_JUDGEMENT_OPTIONS = Object.freeze([
    'low_risk',
    'some_concerns',
    'high_risk',
    'unclear',
    'not_applicable',
    'not_assessed',
  ]);
  const QUALITY_EXPORT_COLUMNS = Object.freeze([
    'assessment_id',
    'record_id',
    'title',
    'study_type',
    'tool_family',
    'template_id',
    'domain',
    'judgement',
    'supporting_quote',
    'reviewer_note',
    'overall_judgement',
    'status',
    'updated_at',
  ]);

  const EVIDENCE_ORDER = [
    EVIDENCE_LEVELS.VERY_LOW,
    EVIDENCE_LEVELS.LOW,
    EVIDENCE_LEVELS.MODERATE,
    EVIDENCE_LEVELS.HIGH,
  ];

  const QUALITY_APPRAISAL_TEMPLATES = Object.freeze({
    [STUDY_DESIGN_FAMILIES.RCT]: createQualityTemplate({
      template_id: 'rct_rob2_v24_alpha',
      study_type: STUDY_DESIGN_FAMILIES.RCT,
      recommended_tool_family: TOOL_FAMILIES.ROB2,
      alternative_tool_families: [],
      required_fields: [
        'randomization',
        'allocation_concealment',
        'blinding',
        'missing_data',
        'outcome_measurement',
        'selective_reporting',
      ],
      domains: [
        ['randomization', 'Randomization process'],
        ['allocation_concealment', 'Allocation concealment'],
        ['blinding', 'Blinding of participants, personnel, or assessors'],
        ['missing_data', 'Missing outcome data'],
        ['outcome_measurement', 'Outcome measurement'],
        ['selective_reporting', 'Selective reporting'],
      ],
      notes: 'Use for randomized trials. Do not assign final risk automatically from title or abstract alone.',
      export_format: QUALITY_EXPORT_COLUMNS,
    }),
    [STUDY_DESIGN_FAMILIES.COHORT]: createQualityTemplate({
      template_id: 'cohort_robins_i_nos_v24_alpha',
      study_type: STUDY_DESIGN_FAMILIES.COHORT,
      recommended_tool_family: TOOL_FAMILIES.ROBINS_I,
      alternative_tool_families: [TOOL_FAMILIES.NEWCASTLE_OTTAWA_SCALE],
      required_fields: [
        'cohort_selection',
        'exposure_measurement',
        'comparability',
        'outcome_assessment',
        'follow_up_adequacy',
      ],
      domains: [
        ['cohort_selection', 'Cohort selection'],
        ['exposure_measurement', 'Exposure measurement'],
        ['comparability', 'Comparability and confounding'],
        ['outcome_assessment', 'Outcome assessment'],
        ['follow_up_adequacy', 'Follow-up adequacy'],
      ],
      notes: 'Use for prospective or retrospective cohort studies. Record design direction in reviewer notes.',
      export_format: QUALITY_EXPORT_COLUMNS,
    }),
    [STUDY_DESIGN_FAMILIES.CASE_CONTROL]: createQualityTemplate({
      template_id: 'case_control_nos_jbi_v24_alpha',
      study_type: STUDY_DESIGN_FAMILIES.CASE_CONTROL,
      recommended_tool_family: TOOL_FAMILIES.NEWCASTLE_OTTAWA_SCALE,
      alternative_tool_families: [TOOL_FAMILIES.JBI],
      required_fields: [
        'case_definition',
        'control_selection',
        'exposure_ascertainment',
        'matching_or_comparability',
        'non_response',
      ],
      domains: [
        ['case_definition', 'Case definition'],
        ['control_selection', 'Control selection'],
        ['exposure_ascertainment', 'Exposure ascertainment'],
        ['matching_or_comparability', 'Matching or comparability'],
        ['non_response', 'Non-response'],
      ],
      notes: 'Use for case-control studies. Record case and control source details before final judgement.',
      export_format: QUALITY_EXPORT_COLUMNS,
    }),
    [STUDY_DESIGN_FAMILIES.CROSS_SECTIONAL]: createQualityTemplate({
      template_id: 'cross_sectional_jbi_axis_v24_alpha',
      study_type: STUDY_DESIGN_FAMILIES.CROSS_SECTIONAL,
      recommended_tool_family: TOOL_FAMILIES.JBI,
      alternative_tool_families: ['axis'],
      required_fields: [
        'sampling_frame',
        'sample_size',
        'measurement_validity',
        'confounders',
        'response_rate',
      ],
      domains: [
        ['sampling_frame', 'Sampling frame'],
        ['sample_size', 'Sample size and representativeness'],
        ['measurement_validity', 'Measurement validity'],
        ['confounders', 'Confounders'],
        ['response_rate', 'Response rate'],
      ],
      notes: 'Use for surveys, prevalence studies, and cross-sectional association studies.',
      export_format: QUALITY_EXPORT_COLUMNS,
    }),
    [STUDY_DESIGN_FAMILIES.DIAGNOSTIC_ACCURACY]: createQualityTemplate({
      template_id: 'diagnostic_accuracy_quadas2_v24_alpha',
      study_type: STUDY_DESIGN_FAMILIES.DIAGNOSTIC_ACCURACY,
      recommended_tool_family: TOOL_FAMILIES.QUADAS_2,
      alternative_tool_families: [],
      required_fields: [
        'patient_selection',
        'index_test',
        'reference_standard',
        'flow_and_timing',
        'applicability_concerns',
      ],
      domains: [
        ['patient_selection', 'Patient selection'],
        ['index_test', 'Index test'],
        ['reference_standard', 'Reference standard'],
        ['flow_and_timing', 'Flow and timing'],
        ['applicability_concerns', 'Applicability concerns'],
      ],
      notes: 'Use for diagnostic accuracy studies. Separate risk of bias from applicability concerns.',
      export_format: QUALITY_EXPORT_COLUMNS,
    }),
    [STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW]: createQualityTemplate({
      template_id: 'systematic_review_amstar2_robis_v24_alpha',
      study_type: STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW,
      recommended_tool_family: TOOL_FAMILIES.AMSTAR_2,
      alternative_tool_families: ['robis'],
      required_fields: [
        'protocol',
        'search_strategy',
        'study_selection',
        'data_extraction',
        'risk_of_bias',
        'synthesis_method',
        'publication_bias',
      ],
      domains: [
        ['protocol', 'Protocol registered or justified'],
        ['search_strategy', 'Search strategy'],
        ['study_selection', 'Study selection'],
        ['data_extraction', 'Data extraction'],
        ['risk_of_bias', 'Risk of bias appraisal'],
        ['synthesis_method', 'Synthesis method'],
        ['publication_bias', 'Publication bias'],
      ],
      notes: 'Use for systematic reviews, meta-analyses, and umbrella-review source reviews.',
      export_format: QUALITY_EXPORT_COLUMNS,
    }),
  });

  function createQualityTemplate(input) {
    const template = input || {};
    return Object.freeze({
      template_id: template.template_id,
      study_type: template.study_type,
      recommended_tool_family: template.recommended_tool_family,
      alternative_tool_families: Object.freeze((template.alternative_tool_families || []).slice()),
      required_fields: Object.freeze((template.required_fields || []).slice()),
      judgement_options: QUALITY_JUDGEMENT_OPTIONS,
      domains: Object.freeze((template.domains || []).map((domain, index) => Object.freeze({
        domain_id: domain[0],
        label: domain[1],
        required: true,
        order: index + 1,
      }))),
      notes: template.notes || '',
      export_format: Object.freeze((template.export_format || QUALITY_EXPORT_COLUMNS).slice()),
      version: QUALITY_TEMPLATE_VERSION,
      schema_version: QUALITY_APPRAISAL_SCHEMA_VERSION,
    });
  }

  const GENERIC_QUALITY_TEMPLATE = createQualityTemplate({
    template_id: 'generic_quality_shell_v24_alpha',
    study_type: STUDY_DESIGN_FAMILIES.OTHER,
    recommended_tool_family: TOOL_FAMILIES.GENERIC,
    alternative_tool_families: [],
    required_fields: [
      'general_quality_notes',
    ],
    domains: [
      ['general_quality_notes', 'General quality notes'],
    ],
    notes: 'Use only when the study design is not yet confirmed. Replace with a study-design template before final reporting when possible.',
    export_format: QUALITY_EXPORT_COLUMNS,
  });

  function getAssessmentRecordId(record, fallbackIndex) {
    const candidate = pickFirstNonEmpty(
      record && record.record_id,
      record && record.id,
      record && record._engine_record_id,
      getRecordDoi(record),
      getRecordTitle(record)
    );

    if (candidate) {
      return String(candidate).trim();
    }

    return `record-${Number.isFinite(fallbackIndex) ? fallbackIndex + 1 : Date.now()}`;
  }

  function getRecordTitle(record) {
    return readRecordField(record, ['title', 'TI', 'T1', 'dc:title', 'dcterms:title']);
  }

  function getRecordAbstract(record) {
    return readRecordField(record, ['abstract', 'AB', 'N2', 'dcterms:abstract', 'dc:description', 'Abstract Note', 'Notes']);
  }

  function getRecordKeywords(record) {
    return readRecordField(record, ['keywords', 'KW', 'OT', 'keyword', 'Manual Tags', 'Automatic Tags']);
  }

  function getRecordPublicationType(record) {
    return readRecordField(record, ['publication_type', 'type', 'TY', 'PT', 'z:itemType']);
  }

  function getRecordStudyDesign(record) {
    return readRecordField(record, ['study_design', 'studyDesign']);
  }

  function getRecordDoi(record) {
    return readRecordField(record, ['doi', 'DOI', 'DO', 'identifier_raw']);
  }

  function detectStudyDesignFamily(recordOrText) {
    const text = buildSearchText(recordOrText);

    if (/systematic review|meta-analysis|meta analysis|systematic literature review|系统综述|荟萃分析|meta分析/.test(text)) {
      return STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW;
    }

    if (/case series|病例系列/.test(text)) {
      return STUDY_DESIGN_FAMILIES.CASE_SERIES;
    }

    if (/case report|病例报告/.test(text)) {
      return STUDY_DESIGN_FAMILIES.CASE_REPORT;
    }

    if (/randomi[sz]ed|double blind|single blind|triple blind|\brct\b|随机.{0,4}对照|双盲|单盲|三盲/.test(text)) {
      return STUDY_DESIGN_FAMILIES.RCT;
    }

    if (/diagnostic accuracy|sensitivity|specificity|index test|reference standard|quadas|roc curve|area under the curve|\bauc\b/.test(text)) {
      return STUDY_DESIGN_FAMILIES.DIAGNOSTIC_ACCURACY;
    }

    if (/non-randomized|nonrandomized|quasi-experiment|quasi experimental|interrupted time series|difference-in-differences|did\b|instrumental variable|propensity score/.test(text)) {
      return STUDY_DESIGN_FAMILIES.NON_RANDOMIZED_INTERVENTION;
    }

    if (/cohort|prospective|retrospective cohort|队列研究|前瞻性|回顾性队列/.test(text)) {
      return STUDY_DESIGN_FAMILIES.COHORT;
    }

    if (/case[-\s]?control|病例对照/.test(text)) {
      return STUDY_DESIGN_FAMILIES.CASE_CONTROL;
    }

    if (/cross[-\s]?sectional|survey study|横断面/.test(text)) {
      return STUDY_DESIGN_FAMILIES.CROSS_SECTIONAL;
    }

    return STUDY_DESIGN_FAMILIES.OTHER;
  }

  function suggestToolFamily(studyDesignFamily) {
    switch (studyDesignFamily) {
      case STUDY_DESIGN_FAMILIES.RCT:
        return TOOL_FAMILIES.ROB2;
      case STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW:
        return TOOL_FAMILIES.AMSTAR_2;
      case STUDY_DESIGN_FAMILIES.COHORT:
        return TOOL_FAMILIES.ROBINS_I;
      case STUDY_DESIGN_FAMILIES.CASE_CONTROL:
        return TOOL_FAMILIES.NEWCASTLE_OTTAWA_SCALE;
      case STUDY_DESIGN_FAMILIES.CROSS_SECTIONAL:
        return TOOL_FAMILIES.JBI;
      case STUDY_DESIGN_FAMILIES.DIAGNOSTIC_ACCURACY:
        return TOOL_FAMILIES.QUADAS_2;
      case STUDY_DESIGN_FAMILIES.NON_RANDOMIZED_INTERVENTION:
        return TOOL_FAMILIES.ROBINS_I_LITE;
      case STUDY_DESIGN_FAMILIES.CASE_REPORT:
      case STUDY_DESIGN_FAMILIES.CASE_SERIES:
        return TOOL_FAMILIES.CASE_REPORT_LITE;
      default:
        return TOOL_FAMILIES.GENERIC;
    }
  }

  function getInitialEvidenceLevel(studyDesignFamily) {
    switch (studyDesignFamily) {
      case STUDY_DESIGN_FAMILIES.RCT:
      case STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW:
        return EVIDENCE_LEVELS.HIGH;
      case STUDY_DESIGN_FAMILIES.COHORT:
      case STUDY_DESIGN_FAMILIES.CASE_CONTROL:
      case STUDY_DESIGN_FAMILIES.CROSS_SECTIONAL:
      case STUDY_DESIGN_FAMILIES.DIAGNOSTIC_ACCURACY:
      case STUDY_DESIGN_FAMILIES.NON_RANDOMIZED_INTERVENTION:
        return EVIDENCE_LEVELS.LOW;
      case STUDY_DESIGN_FAMILIES.CASE_REPORT:
      case STUDY_DESIGN_FAMILIES.CASE_SERIES:
      case STUDY_DESIGN_FAMILIES.OTHER:
      default:
        return EVIDENCE_LEVELS.VERY_LOW;
    }
  }

  function getQualityTemplate(studyDesignFamily) {
    const normalized = normalizeStudyDesignFamily(studyDesignFamily);
    return QUALITY_APPRAISAL_TEMPLATES[normalized] || GENERIC_QUALITY_TEMPLATE;
  }

  function listQualityTemplates() {
    return Object.keys(QUALITY_APPRAISAL_TEMPLATES)
      .sort()
      .map((key) => QUALITY_APPRAISAL_TEMPLATES[key]);
  }

  function normalizeStudyDesignFamily(value) {
    const normalized = normalizeText(value);
    return Object.keys(STUDY_DESIGN_FAMILIES)
      .map((key) => STUDY_DESIGN_FAMILIES[key])
      .includes(normalized)
      ? normalized
      : STUDY_DESIGN_FAMILIES.OTHER;
  }

  function normalizeAssessmentStatus(value) {
    const normalized = normalizeText(value);
    if (Object.keys(ASSESSMENT_STATUS).map((key) => ASSESSMENT_STATUS[key]).includes(normalized)) {
      return normalized;
    }

    return ASSESSMENT_STATUS.NOT_STARTED;
  }

  function normalizeJudgement(value) {
    const normalized = normalizeText(value);
    return QUALITY_JUDGEMENT_OPTIONS.includes(normalized) ? normalized : 'not_assessed';
  }

  function createTemplateDomainAssessments(template, existingDomains) {
    const existing = Array.isArray(existingDomains) ? existingDomains : [];
    const byId = new Map(existing.map((domain) => [
      normalizeText(domain && (domain.domain_id || domain.domain || domain.id || domain.name)),
      domain,
    ]));

    return template.domains.map((domain) => {
      const previous = byId.get(domain.domain_id) || {};
      return {
        domain_id: domain.domain_id,
        label: domain.label,
        judgement: normalizeJudgement(previous.judgement || previous.score || previous.value),
        supporting_quote: normalizeStringValue(previous.supporting_quote || previous.supportingQuote || previous.quote),
        reviewer_note: normalizeStringValue(previous.reviewer_note || previous.reviewerNote || previous.note || previous.notes),
      };
    });
  }

  function buildEvidenceAssessment(input) {
    const payload = input || {};
    const studyDesignFamily = payload.studyDesignFamily || detectStudyDesignFamily(payload.record || payload.text || '');
    const toolFamily = payload.toolFamily || suggestToolFamily(studyDesignFamily);
    const initial = payload.initial || getInitialEvidenceLevel(studyDesignFamily);
    const overallRisk = normalizeOverallRisk(payload.overallRisk);
    const adjustments = [];
    let final = initial;

    if (overallRisk === 'high') {
      final = lowerEvidence(final, 1);
      adjustments.push({
        direction: 'downgrade',
        reason: 'overall_risk_high',
        steps: 1,
      });
    }

    if (overallRisk === 'critical') {
      final = lowerEvidence(final, 2);
      adjustments.push({
        direction: 'downgrade',
        reason: 'overall_risk_critical',
        steps: 2,
      });
    }

    const extraAdjustments = Array.isArray(payload.adjustments) ? payload.adjustments : [];
    extraAdjustments.forEach((entry) => {
      const direction = entry && entry.direction === 'downgrade' ? 'downgrade' : 'note';
      const steps = Number.isFinite(entry && entry.steps) ? Math.max(0, entry.steps) : 0;

      if (direction === 'downgrade' && steps > 0) {
        final = lowerEvidence(final, steps);
      }

      adjustments.push({
        direction,
        reason: String((entry && entry.reason) || 'manual_note').trim() || 'manual_note',
        steps,
      });
    });

    if (payload.reviewerOverride) {
      final = payload.reviewerOverride;
      adjustments.push({
        direction: 'override',
        reason: String(payload.overrideReason || 'reviewer_override'),
        steps: 0,
      });
    }

    return {
      studyDesignFamily,
      toolFamily,
      overallRisk,
      initial,
      adjustments,
      final,
      rationale: adjustments.map((entry) => entry.reason),
    };
  }

  function createQualityAssessment(record, overrides) {
    const options = overrides || {};
    const recordId = options.recordId || getAssessmentRecordId(record, options.fallbackIndex);
    const studyDesignFamily = normalizeStudyDesignFamily(options.studyDesignFamily || detectStudyDesignFamily(record));
    const template = getQualityTemplate(studyDesignFamily);
    const evidence = buildEvidenceAssessment({
      record,
      studyDesignFamily,
      toolFamily: options.toolFamily || template.recommended_tool_family,
      overallRisk: options.overallRisk,
      adjustments: options.evidenceAdjustments,
      reviewerOverride: options.overrideReason ? options.evidenceFinal : null,
      overrideReason: options.overrideReason,
    });
    const domainScores = createTemplateDomainAssessments(template, options.domainScores || options.domains);
    const status = normalizeAssessmentStatus(options.status);

    return {
      id: options.id || `qa-${recordId}`,
      assessment_id: options.assessmentId || options.assessment_id || options.id || `qa-${recordId}`,
      project_id: options.projectId || null,
      record_id: recordId,
      title: getRecordTitle(record),
      abstract: getRecordAbstract(record),
      publication_type: getRecordPublicationType(record),
      status,
      study_design: studyDesignFamily,
      study_type: studyDesignFamily,
      tool_family: evidence.toolFamily,
      template_id: options.templateId || options.template_id || template.template_id,
      template_version: template.version,
      schema_version: QUALITY_APPRAISAL_SCHEMA_VERSION,
      required_fields: template.required_fields.slice(),
      judgement_options: QUALITY_JUDGEMENT_OPTIONS.slice(),
      domain_scores: domainScores,
      domains: domainScores,
      overall_risk: evidence.overallRisk,
      overall_judgement: normalizeJudgement(options.overallJudgement || options.overall_judgement || evidence.overallRisk),
      evidence_initial: evidence.initial,
      evidence_adjustments: evidence.adjustments,
      evidence_final: evidence.final,
      override_reason: options.overrideReason || '',
      reviewer_id: normalizeStringValue(options.reviewerId || options.reviewer_id || ''),
      notes: options.notes || '',
      updated_at: options.updatedAt || new Date().toISOString(),
    };
  }

  function summarizeQualityAssessments(assessments, includedRecords) {
    const list = Array.isArray(assessments) ? assessments : [];
    const totalIncluded = Array.isArray(includedRecords) ? includedRecords.length : list.length;
    const byStatus = {
      not_started: 0,
      queued: 0,
      in_progress: 0,
      complete: 0,
      completed: 0,
      needs_full_text: 0,
    };
    const byToolFamily = {};
    const byEvidence = {};

    list.forEach((assessment) => {
      const status = assessment && assessment.status ? assessment.status : ASSESSMENT_STATUS.NOT_STARTED;
      if (Object.prototype.hasOwnProperty.call(byStatus, status)) {
        byStatus[status] += 1;
      }

      const toolFamily = assessment && assessment.tool_family ? assessment.tool_family : TOOL_FAMILIES.GENERIC;
      byToolFamily[toolFamily] = (byToolFamily[toolFamily] || 0) + 1;

      const evidence = assessment && assessment.evidence_final ? assessment.evidence_final : EVIDENCE_LEVELS.VERY_LOW;
      byEvidence[evidence] = (byEvidence[evidence] || 0) + 1;
    });

    return {
      totalIncluded,
      totalAssessments: list.length,
      missingAssessments: Math.max(totalIncluded - list.length, 0),
      completedAssessments: byStatus.completed + byStatus.complete,
      byStatus,
      byToolFamily,
      byEvidence,
    };
  }

  function serializeQualityAppraisalCsv(assessments) {
    const rows = flattenQualityAppraisalRows(assessments);
    const header = QUALITY_EXPORT_COLUMNS.join(',');
    const body = rows.map((row) => QUALITY_EXPORT_COLUMNS.map((column) => csvCell(row[column])).join(','));
    return [header, ...body].join('\n');
  }

  function flattenQualityAppraisalRows(assessments) {
    const list = Array.isArray(assessments) ? assessments : [];
    const rows = [];

    list.forEach((assessmentInput, index) => {
      const assessment = normalizeQualityAssessmentForExport(assessmentInput, index);
      const domains = assessment.domain_scores.length > 0
        ? assessment.domain_scores
        : createTemplateDomainAssessments(getQualityTemplate(assessment.study_design), []);

      domains.forEach((domain) => {
        rows.push({
          assessment_id: assessment.assessment_id,
          record_id: assessment.record_id,
          title: assessment.title,
          study_type: assessment.study_design,
          tool_family: assessment.tool_family,
          template_id: assessment.template_id,
          domain: domain.domain_id || domain.domain || domain.label || '',
          judgement: normalizeJudgement(domain.judgement || domain.score || domain.value),
          supporting_quote: domain.supporting_quote || domain.supportingQuote || domain.quote || '',
          reviewer_note: domain.reviewer_note || domain.reviewerNote || domain.note || domain.notes || '',
          overall_judgement: assessment.overall_judgement,
          status: assessment.status,
          updated_at: assessment.updated_at,
        });
      });
    });

    return rows;
  }

  function normalizeQualityAssessmentForExport(assessmentInput, index) {
    const assessment = assessmentInput && typeof assessmentInput === 'object' ? assessmentInput : {};
    const studyDesignFamily = normalizeStudyDesignFamily(assessment.study_design || assessment.study_type || assessment.studyDesignFamily);
    const template = getQualityTemplate(studyDesignFamily);
    const recordId = normalizeStringValue(assessment.record_id || assessment.recordId || `record-${index + 1}`);
    const assessmentId = normalizeStringValue(assessment.assessment_id || assessment.assessmentId || assessment.id || `qa-${recordId}`);
    const domainScores = createTemplateDomainAssessments(template, assessment.domain_scores || assessment.domains || assessment.domainScores);

    return {
      assessment_id: assessmentId,
      record_id: recordId,
      title: normalizeStringValue(assessment.title),
      status: normalizeAssessmentStatus(assessment.status),
      study_design: studyDesignFamily,
      tool_family: normalizeStringValue(assessment.tool_family || assessment.toolFamily || template.recommended_tool_family),
      template_id: normalizeStringValue(assessment.template_id || assessment.templateId || template.template_id),
      domain_scores: domainScores,
      overall_judgement: normalizeJudgement(assessment.overall_judgement || assessment.overallJudgement || assessment.overall_risk || assessment.overallRisk),
      updated_at: normalizeStringValue(assessment.updated_at || assessment.updatedAt),
    };
  }

  function buildSearchText(recordOrText) {
    if (typeof recordOrText === 'string') {
      return normalizeText(recordOrText);
    }

    const record = recordOrText || {};
    return normalizeText([
      getRecordTitle(record),
      getRecordAbstract(record),
      getRecordKeywords(record),
      getRecordPublicationType(record),
      getRecordStudyDesign(record),
    ].filter(Boolean).join(' '));
  }

  function readRecordField(record, fields) {
    if (!record || typeof record !== 'object') {
      return '';
    }

    for (let index = 0; index < fields.length; index += 1) {
      const value = normalizeRecordFieldValue(record[fields[index]]);
      if (value) {
        return value;
      }
    }

    return '';
  }

  function normalizeRecordFieldValue(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item === undefined || item === null ? '' : item).trim())
        .filter(Boolean)
        .join('; ');
    }

    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'object') {
      return '';
    }

    return String(value).trim();
  }

  function normalizeStringValue(value) {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value).trim();
  }

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeOverallRisk(value) {
    const normalized = normalizeText(value);
    if (normalized === 'high') return 'high';
    if (normalized === 'critical') return 'critical';
    if (normalized === 'low') return 'low';
    return 'unclear';
  }

  function lowerEvidence(level, steps) {
    const currentIndex = Math.max(EVIDENCE_ORDER.indexOf(level), 0);
    const nextIndex = Math.max(currentIndex - steps, 0);
    return EVIDENCE_ORDER[nextIndex];
  }

  function pickFirstNonEmpty() {
    for (let index = 0; index < arguments.length; index += 1) {
      const candidate = arguments[index];
      if (candidate === undefined || candidate === null) continue;
      if (String(candidate).trim()) return candidate;
    }

    return '';
  }

  function csvCell(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  return {
    STUDY_DESIGN_FAMILIES,
    TOOL_FAMILIES,
    EVIDENCE_LEVELS,
    ASSESSMENT_STATUS,
    QUALITY_APPRAISAL_SCHEMA_VERSION,
    QUALITY_TEMPLATE_VERSION,
    QUALITY_JUDGEMENT_OPTIONS,
    QUALITY_EXPORT_COLUMNS,
    QUALITY_APPRAISAL_TEMPLATES,
    getQualityTemplate,
    listQualityTemplates,
    detectStudyDesignFamily,
    suggestToolFamily,
    getInitialEvidenceLevel,
    buildEvidenceAssessment,
    createQualityAssessment,
    summarizeQualityAssessments,
    flattenQualityAppraisalRows,
    serializeQualityAppraisalCsv,
    getAssessmentRecordId,
  };
});
