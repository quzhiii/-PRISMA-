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
    NON_RANDOMIZED_INTERVENTION: 'non_randomized_intervention',
    CASE_REPORT: 'case_report',
    CASE_SERIES: 'case_series',
    OTHER: 'other',
  });

  const TOOL_FAMILIES = Object.freeze({
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
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
  });

  const EVIDENCE_ORDER = [
    EVIDENCE_LEVELS.VERY_LOW,
    EVIDENCE_LEVELS.LOW,
    EVIDENCE_LEVELS.MODERATE,
    EVIDENCE_LEVELS.HIGH,
  ];

  function getAssessmentRecordId(record, fallbackIndex) {
    const candidate = pickFirstNonEmpty(
      record && record.record_id,
      record && record.id,
      record && record._engine_record_id,
      record && record.doi,
      record && record.title
    );

    if (candidate) {
      return String(candidate).trim();
    }

    return `record-${Number.isFinite(fallbackIndex) ? fallbackIndex + 1 : Date.now()}`;
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
        return TOOL_FAMILIES.ROB2_LITE;
      case STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW:
        return TOOL_FAMILIES.AMSTAR2_LITE;
      case STUDY_DESIGN_FAMILIES.COHORT:
      case STUDY_DESIGN_FAMILIES.CASE_CONTROL:
      case STUDY_DESIGN_FAMILIES.CROSS_SECTIONAL:
        return TOOL_FAMILIES.JBI_NOS_LITE;
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
      case STUDY_DESIGN_FAMILIES.NON_RANDOMIZED_INTERVENTION:
        return EVIDENCE_LEVELS.LOW;
      case STUDY_DESIGN_FAMILIES.CASE_REPORT:
      case STUDY_DESIGN_FAMILIES.CASE_SERIES:
      case STUDY_DESIGN_FAMILIES.OTHER:
      default:
        return EVIDENCE_LEVELS.VERY_LOW;
    }
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
    const studyDesignFamily = options.studyDesignFamily || detectStudyDesignFamily(record);
    const evidence = buildEvidenceAssessment({
      record,
      studyDesignFamily,
      toolFamily: options.toolFamily,
      overallRisk: options.overallRisk,
      adjustments: options.evidenceAdjustments,
      reviewerOverride: options.overrideReason ? options.evidenceFinal : null,
      overrideReason: options.overrideReason,
    });

    return {
      id: options.id || `qa-${recordId}`,
      project_id: options.projectId || null,
      record_id: recordId,
      title: record && record.title ? record.title : '',
      abstract: record && record.abstract ? record.abstract : '',
      publication_type: record && record.publication_type ? record.publication_type : '',
      status: options.status || ASSESSMENT_STATUS.NOT_STARTED,
      study_design: studyDesignFamily,
      tool_family: evidence.toolFamily,
      domain_scores: options.domainScores || [],
      overall_risk: evidence.overallRisk,
      evidence_initial: evidence.initial,
      evidence_adjustments: evidence.adjustments,
      evidence_final: evidence.final,
      override_reason: options.overrideReason || '',
      notes: options.notes || '',
      updated_at: options.updatedAt || new Date().toISOString(),
    };
  }

  function summarizeQualityAssessments(assessments, includedRecords) {
    const list = Array.isArray(assessments) ? assessments : [];
    const totalIncluded = Array.isArray(includedRecords) ? includedRecords.length : list.length;
    const byStatus = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
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
      completedAssessments: byStatus.completed,
      byStatus,
      byToolFamily,
      byEvidence,
    };
  }

  function buildSearchText(recordOrText) {
    if (typeof recordOrText === 'string') {
      return normalizeText(recordOrText);
    }

    const record = recordOrText || {};
    return normalizeText([
      record.title,
      record.abstract,
      record.keywords,
      record.publication_type,
      record.study_design,
    ].filter(Boolean).join(' '));
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

  return {
    STUDY_DESIGN_FAMILIES,
    TOOL_FAMILIES,
    EVIDENCE_LEVELS,
    ASSESSMENT_STATUS,
    detectStudyDesignFamily,
    suggestToolFamily,
    getInitialEvidenceLevel,
    buildEvidenceAssessment,
    createQualityAssessment,
    summarizeQualityAssessments,
    getAssessmentRecordId,
  };
});
