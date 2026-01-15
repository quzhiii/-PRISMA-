/**
 * PRISMA文献筛选助手 v1.7 核心补丁
 * 包含：关键词优先级机制 + 去重增强UI
 */

// Global State Enhancement
let dedupStats = {
  originalCount: 0,
  afterDedupCount: 0,
  doiDuplicates: 0,
  titleDuplicates: 0,
  duplicates: [] // Store detailed duplicate info
};

/**
 * 核心功能 1: 增强的筛选逻辑（关键词优先级）
 * 替换原 performScreening 函数
 */
function performScreeningV17(data, rulesParam) {
  // Handle both old calling convention (data, rules) and new (no params)
  const inputData = data || uploadedData;
  let rules = rulesParam;
  
  if (!rules) {
    try {
      rules = jsyaml.load(document.getElementById('yamlEditor').value);
      filterRules = rules;
    } catch (e) {
      console.error('YAML 格式错误:', e);
      showToast('YAML 格式错误: ' + e.message, 'error');
      return null;
    }
  }
  
  if (!inputData || inputData.length === 0) {
    showToast('没有数据可筛选', 'error');
    return null;
  }
  
  // 1. Pre-processing
  const processedData = inputData.map(row => {
      // Normalize fields
      const yearStr = (row.year || row.PY || row.publication_year || '').toString();
      
      // Determine language
      let lang = 'unknown';
      const text = (row.title + ' ' + row.abstract).toLowerCase();
      if (/[\u4e00-\u9fa5]/.test(text)) {
        lang = 'chinese';
      } else {
        lang = 'english'; // Default to English for non-Chinese
      }

      return {
        ...row,
        _normalized_title: normalizeTitle(row.title || ''),
        _year_str: yearStr,
        _lang: lang
      };
    });

    // 2. Deduplication (Step 1)
    const deduped = [];
    const duplicates = [];
    const doiMap = {};
    const titleMap = {}; // Changed from Set to Object to track original

    // Reset stats
    dedupStats = {
      originalCount: processedData.length,
      afterDedupCount: 0,
      doiDuplicates: 0,
      titleDuplicates: 0,
      duplicates: []
    };

    processedData.forEach(row => {
      const doi = getValue(row, 'doi');
      const title = row._normalized_title;
      
      // Strategy 1: Exact DOI match (highest priority)
      if (doi && doi.trim()) {
        const doiKey = `doi:${doi.toLowerCase().trim()}`;
        if (doiMap[doiKey]) {
          duplicates.push({ ...row, _dedup_reason: 'DOI Duplicate' });
          dedupStats.doiDuplicates++;
          dedupStats.duplicates.push({
            original: doiMap[doiKey],
            duplicate: row,
            reason: 'DOI'
          });
          return;
        } else {
          doiMap[doiKey] = row; // Store ref
          deduped.push(row);
          return;
        }
      }
      
      // Strategy 2: Normalized title match
      const titleKey = `title:${title}`;
      if (titleMap[titleKey]) {
        duplicates.push({ ...row, _dedup_reason: 'Title Duplicate' });
        dedupStats.titleDuplicates++;
        dedupStats.duplicates.push({
          original: titleMap[titleKey],
          duplicate: row,
          reason: 'Title'
        });
      } else {
        titleMap[titleKey] = row;
        deduped.push(row);
      }
    });

    dedupStats.afterDedupCount = deduped.length;

    // 3. Time window filter
    const inTimeWindow = deduped.filter(row => {
      // Logic for year extraction
      const yearValue = row._year_str;
      if (!yearValue) return false;
      
      let year = parseInt(yearValue);
      // Try extracting 4-digit year if parseInt fails or returns weird value
      if (isNaN(year) || year < 1000 || year > 3000) {
        const match = yearValue.match(/\d{4}/);
        if (match) year = parseInt(match[0]);
      }
      
      return year >= rules.time_window.start_year && year <= rules.time_window.end_year;
    });

    // 4. Include keywords filter (Step 2)
    let withIncludeKW = inTimeWindow;
    const validKeywords = (rules.include_any || []).filter(kw => kw && kw.trim());
    
    // v1.7 Feature: Include Priority
    const includePriority = document.getElementById('includePriorityToggle')?.checked ?? true;

    if (validKeywords.length > 0) {
      withIncludeKW = inTimeWindow.filter(row => {
        const text = (
          (row.title || '') + ' ' + 
          (row.abstract || '') + ' ' + 
          (row.keywords || '')
        ).toLowerCase();
        
        // Check if matches ANY include keyword
        const matches = validKeywords.some(kw => text.includes(kw.toLowerCase()));
        
        // Mark for priority protection if enabled
        if (matches) {
          row._matches_include = true;
        }
        
        return matches;
      });
    } else {
      // If no include keywords, mark all as matching (implicitly)
      // But for priority logic, we only protect if EXPLICITLY matched
      inTimeWindow.forEach(row => row._matches_include = false);
    }

    // 5. Required fields filter
    let withRequiredFields = withIncludeKW;
    const mappedRequiredFields = (rules.required_one_of || []).filter(field => columnMapping[field]);

    if (mappedRequiredFields.length > 0) {
      withRequiredFields = withIncludeKW.filter(row => {
        return mappedRequiredFields.some(field => {
          const value = getValue(row, field);
          return value && value.trim().length > 0;
        });
      });
    }

    // 6. Language filter
    let withLanguage = withRequiredFields;
    if (rules.language?.allow?.length > 0) {
      withLanguage = withRequiredFields.filter(row => {
        return rules.language.allow.includes(row._lang);
      });
    }

    // 7. Exclude keywords (Title/Abstract screening)
    const excluded_ta = [];
    const afterTA = [];
    let protectedCount = 0; // v1.7 Stat

    withLanguage.forEach(row => {
      const title = row.title || '';
      const abstract = row.abstract || '';
      const keywords = row.keywords || '';
      const text = (title + ' ' + abstract + ' ' + keywords).toLowerCase();
      
      let excluded = false;
      let reason = '';

      // Check exclude keywords
      if (rules.exclude && rules.exclude.length > 0) {
        for (const excl of rules.exclude) {
          if (text.includes(excl.keyword.toLowerCase())) {
            excluded = true;
            reason = excl.reason;
            break;
          }
        }
      }

      // v1.7 Priority Logic: If excluded BUT matches include keyword + priority enabled
      if (excluded && row._matches_include && includePriority) {
        // PROTECT: Do not exclude
        row._include_protected = true;
        row._would_exclude_reason = reason;
        afterTA.push(row);
        protectedCount++;
      } else if (excluded) {
        // EXCLUDE
        excluded_ta.push({ 
          ...row, 
          _exclude_reason: reason, 
          _exclude_stage: 'title/abstract' 
        });
      } else {
        // KEEP
        afterTA.push(row);
      }
    });
// Save results (but don't display yet - let caller handle that)
  const results = {
    counts: {
      identified_db: dedupStats.originalCount,
      identified_other: 0,
      duplicates: duplicates.length,
      after_dupes: deduped.length,
      screened: deduped.length,
      excluded_ta: deduped.length - afterTA.length,
      fulltext: afterTA.length,
      excluded_ft: 0,
      included: afterTA.length,
      protected: protectedCount
    },
    duplicates: duplicates,
    included: afterTA,
    excluded: excluded_ta,
    rules: rules,
    sourceDistribution: {} // Placeholder for v3.0 compatibility
  };

  // Auto-identify study designs (v1.3)
  results.included.forEach(record => {
    if (!record.studyDesign) {
      record.studyDesign = guessStudyDesign(record);
    }
  });

  // Initialize fulltext review state if empty
  if (!results.excluded_fulltext) {
    results.excluded_fulltext = [];
  }

  // Store globally
  screeningResults = results;
  
  // Show protection message if applicable
  if (protectedCount > 0) {
    console.log(`✨ ${protectedCount} 篇包含关键词的文献已被保护`);
  }

  return rngResults for compatibility
  return screeningResults;
}

/**
 * 核心功能 2: Step 1 增强 (显示去重统计 + 导出按钮)
 * 替换 displayUploadInfo 函数
 */
function displayUploadInfoV17() {
  const infoDiv = document.getElementById('uploadInfo');
  if (!infoDiv) return;

  // Run a quick pre-deduplication to get stats
  const quickStats = runQuickDedupStats();

  infoDiv.innerHTML = `
    <div class="info-box">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; font-size: var(--font-size-lg);">📊 导入概览</h3>
        <span class="format-tag">${fileFormat}</span>
      </div>
      
      <div class="grid grid-3" style="margin-top:var(--space-16);">
        <div class="stat-card bg-1">
          <div class="stat-label">原始记录</div>
          <div class="stat-value">${uploadedData.length}</div>
        </div>
        <div class="stat-card bg-2">
          <div class="stat-label">重复文献</div>
          <div class="stat-value" style="color:var(--color-warning)">${quickStats.duplicates}</div>
          <div style="font-size:10px; color:var(--color-text-secondary)">DOI: ${quickStats.doiDupes} | Title: ${quickStats.titleDupes}</div>
        </div>
        <div class="stat-card bg-3">
          <div class="stat-label">去重后</div>
          <div class="stat-value" style="color:var(--color-success)">${quickStats.unique}</div>
        </div>
      </div>

      <div style="margin-top:var(--space-16); padding-top:var(--space-12); border-top:1px solid var(--color-border); display:flex; gap:var(--space-12);">
        <button class="btn btn-secondary btn-sm" onclick="showDedupDetails()">🔍 查看去重详情</button>
        <button class="btn btn-secondary btn-sm" onclick="exportDedupedData()">📥 仅去重导出 (CSV)</button>
      </div>
      
      <div style="margin-top:var(--space-8); font-size:var(--font-size-sm); color:var(--color-text-secondary);">
        <strong>去重策略：</strong> 1. DOI精确匹配 (优先) &nbsp; 2. 标题归一化匹配 (忽略标点/大小写)
      </div>
    </div>

    <h3 style="margin: var(--space-24) 0 var(--space-12); font-size: var(--font-size-lg);">数据预览 (前 50 行)</h3>
    <div class="table-container">
      <table id="previewTable">
        <thead id="previewTableHead"></thead>
        <tbody id="previewTableBody"></tbody>
      </table>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" onclick="resetApp()">重新上传</button>
      <button class="btn btn-primary" onclick="goToStep2()">下一步: 配置规则 →</button>
    </div>
  `;

  displayPreviewTable();
  infoDiv.classList.remove('hidden');
}

// Helper: Quick Dedup Stats
function runQuickDedupStats() {
  let uniqueCount = 0;
  let doiDupes = 0;
  let titleDupes = 0;
  const doiSet = new Set();
  const titleSet = new Set();

  uploadedData.forEach(row => {
    const doi = getValue(row, 'doi');
    const title = normalizeTitle(row.title || '');
    
    let isDupe = false;

    if (doi && doi.trim()) {
      const doiKey = `doi:${doi.toLowerCase().trim()}`;
      if (doiSet.has(doiKey)) {
        doiDupes++;
        isDupe = true;
      } else {
        doiSet.add(doiKey);
      }
    }

    if (!isDupe) {
      const titleKey = `title:${title}`;
      if (titleSet.has(titleKey)) {
        titleDupes++;
        isDupe = true;
      } else {
        titleSet.add(titleKey);
      }
    }
    
    if (!isDupe) uniqueCount++;
  });

  return {
    unique: uniqueCount,
    duplicates: uploadedData.length - uniqueCount,
    doiDupes,
    titleDupes
  };
}

/**
 * 核心功能 2.2: 仅去重导出
 */
function exportDedupedData() {
  showLoading('正在生成去重数据...');
  
  setTimeout(() => {
    // Perform actual deduplication
    const deduped = [];
    const seen = new Set();
    
    uploadedData.forEach(row => {
      const doi = getValue(row, 'doi');
      const title = normalizeTitle(row.title || '');
      let isUnique = true;
      
      if (doi && doi.trim()) {
        const doiKey = `doi:${doi.toLowerCase().trim()}`;
        if (seen.has(doiKey)) isUnique = false;
        else seen.add(doiKey);
      }
      
      if (isUnique) {
        const titleKey = `title:${title}`;
        if (seen.has(titleKey)) isUnique = false;
        else seen.add(titleKey);
      }
      
      if (isUnique) deduped.push(row);
    });
    
    // Export to CSV
    const csvContent = convertToCSV(deduped);
    downloadFile(csvContent, 'deduped_records.csv', 'text/csv');
    
    hideLoading();
    showToast(`已导出去重数据 (${deduped.length}条)`, 'success');
  }, 100);
}

// v1.7 Step 2 UI Injection
function injectStep2PriorityToggle() {
  const kwSection = document.getElementById('includeKeywords')?.parentElement;
  if (kwSection && !document.getElementById('includePriorityToggle')) {
    const toggleDiv = document.createElement('div');
    toggleDiv.style.marginTop = '8px';
    toggleDiv.innerHTML = `
      <label class="checkbox-label" style="font-weight:bold; color:var(--color-primary);">
        <input type="checkbox" id="includePriorityToggle" checked>
        🛡️ 启用保护机制：包含关键词优先于排除关键词
      </label>
      <p style="font-size:12px; color:var(--color-text-secondary); margin-left:24px; margin-top:4px;">
        开启后，如果文章同时命中"包含关键词"和"排除关键词"，将被保留（不会被误杀）。
      </p>
    `;
    kwSection.appendChild(toggleDiv);
  }
}

// Hook into Step 2 transition
// Override original functions
window.performScreening = performScreeningV17;
window.displayUploadInfo = displayUploadInfoV17;

const originalGoToStep2 = window.goToStep2;
window.goToStep2 = function() {
  if (typeof setStep === 'function') {
    setStep(2);
  } else {
    // Fallback if setStep not available
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('step2').classList.remove('hidden');
    updateStepIndicator(2);
  }
  injectStep2PriorityToggle();
};

console.log('✅ v1.7 Patch Loaded: 关键词优先级 + 去重增强UI 已就绪');
