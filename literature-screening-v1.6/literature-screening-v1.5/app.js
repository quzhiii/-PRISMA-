// Global state
let uploadedData = [];
let uploadedFiles = []; // v3.0: Track multiple file sources
let currentStep = 1;
let columnMapping = {};
let screeningResults = null;
let fileFormat = 'unknown';
let formatSource = 'Unknown';
let currentTheme = 'subtle';
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
  
  showToast(`✅ 已自动识别 ${identifiedCount}/${screeningResults.included.length} 篇文献的研究方法（建议人工核对）`, 'success');
}

// Initialize
function init() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');

  if (!uploadArea || !fileInput) {
    console.error('Upload elements not found');
    return;
  }

  uploadArea.addEventListener('click', () => fileInput.click());
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
    // v3.0: Support multiple files
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleMultipleFiles(files);
  });

  // v3.0: Change fileInput to support multiple files
  fileInput.multiple = true;
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) handleMultipleFiles(files);
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

  // v1.4: Restore last opened project (per-project persistence)
  const restored = loadCurrentProjectStateFromLocalStorage();
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
      setStep(3);
    } else if (uploadedData && uploadedData.length > 0) {
      setStep(2);
      try { syncFormToYAML(); } catch (_) {}
      try { displayRulesPreview(); } catch (_) {}
    } else {
      setStep(1);
    }
  }

  // v1.4: Ensure Step4 entry button reflects readiness
  updateStep4EntryLock();
}

// v3.0: Handle multiple file uploads
function handleMultipleFiles(files) {
  const validExts = ['.csv', '.tsv', '.ris', '.bib', '.bibtex', '.txt', '.enw', '.rdf'];
  const validFiles = files.filter(file => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    return validExts.includes(ext);
  });

  if (validFiles.length === 0) {
    // v4.0: Enhanced error message
    showDetailedError('invalid_format', {
      fileName: files[0].name,
      supportedFormats: validExts
    });
    return;
  }

  if (validFiles.length !== files.length) {
    showToast(`仅${validFiles.length}个文件格式有效，其他文件已跳过`, 'warning');
  }

  showLoading(`正在处理${validFiles.length}个文件...`);
  showProgress(`正在上传文件...`, 0);

  let processedCount = 0;
  let allRecords = [];
  let uploadedFilesInfo = [];

  const processFile = (index) => {
    if (index >= validFiles.length) {
      // All files processed
      if (allRecords.length === 0) {
        hideProgress();
        hideLoading();
        showDetailedError('empty_file', { fileCount: validFiles.length });
        return;
      }
      
      uploadedData = allRecords;
      uploadedFiles = uploadedFilesInfo;
      startNewProjectSession();
      hideProgress();
      setTimeout(() => {
        detectColumns();
        displayUploadInfo();
        persistCurrentProjectState();
        hideLoading();
        showToast(`✅ 成功上传${validFiles.length}个文件，共${allRecords.length}条记录`, 'success');
        addSuccessAnimation();
      }, 500);
      return;
    }

    const file = validFiles[index];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const progress = Math.round((index / validFiles.length) * 100);
    updateProgress(progress);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const fileData = {
          name: file.name,
          format: ext,
          recordCount: 0,
          source: 'Unknown'
        };

        // Parse file and get records
        const records = parseFileContent(text, ext);
        
        if (!records || records.length === 0) {
          console.warn(`文件 ${file.name} 解析结果为空`);
        }
        
        fileData.recordCount = records.length;
        
        // Detect source from format
        switch (ext) {
          case '.ris':
            fileData.source = 'PubMed/Scopus/Endnote';
            break;
          case '.enw':
            fileData.source = 'CNKI';
            break;
        case '.rdf':
          fileData.source = 'Zotero';
          break;
        case '.csv':
        case '.tsv':
          fileData.source = 'Excel/Generic';
          break;
        case '.bib':
        case '.bibtex':
          fileData.source = 'Google Scholar/arXiv';
          break;
        default:
          fileData.source = 'Unknown';
      }

      uploadedFilesInfo.push(fileData);
      
      // Mark records with source for PRISMA identification stage
      records.forEach(record => {
        record._source = fileData.source;
        record._sourceFile = file.name;
      });

      allRecords = allRecords.concat(records);
      processFile(index + 1);
      
      } catch (error) {
        hideProgress();
        hideLoading();
        showDetailedError('parsing_error', {
          fileName: file.name,
          message: error.message,
          line: error.line || '未知',
          content: error.content || '未知'
        });
        console.error(`解析文件 ${file.name} 时出错:`, error);
      }
    };

    reader.onerror = () => {
      hideProgress();
      hideLoading();
      showDetailedError('invalid_format', {
        fileName: file.name,
        message: '文件读取失败，可能是文件已损坏或编码不正确'
      });
    };

    reader.readAsText(file);
  };

  processFile(0);
}

// File handling
function handleFile(file) {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const validExts = ['.csv', '.tsv', '.ris', '.bib', '.bibtex', '.txt', '.enw', '.rdf'];
  
  if (!validExts.includes(ext)) {
    showToast('不支持的文件格式，请上传 CSV, TSV, RIS, BibTeX, TXT, ENW 或 RDF 文件', 'error');
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
      parseFile(text, ext);
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
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    // Use parseCSVLine for proper CSV parsing (handles quoted fields)
    const values = parseCSVLine(line);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      data.push(row);
    } else if (values.length > 0) {
      // v3.0: More lenient - allow mismatched column counts
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      data.push(row);
    }
  }

  return data;
}

// Similar extraction for other formats...
function parseTSVContent(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

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

  return data.length > 0 ? data : [];
}

function parseRISContent(text) {
  const records = [];
  const lines = text.split('\n');
  let currentRecord = {};
  
  const fieldMap = {
    'TY': 'type', 'T1': 'title', 'TI': 'title', 'AU': 'authors', 'T2': 'journal',
    'JO': 'journal', 'PY': 'year', 'DO': 'doi', 'AB': 'abstract', 'KW': 'keywords',
    'VL': 'volume', 'IS': 'issue'
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
  const records = [];
  const lines = text.split('\n');
  let currentRecord = {};
  
  const fieldMap = {
    'TY': 'type', 'AU': 'authors', 'T1': 'title', 'T2': 'journal', 'PY': 'year',
    'DO': 'doi', 'AB': 'abstract', 'KW': 'keywords', 'VL': 'volume', 'IS': 'issue',
    'SP': 'start_page', 'EP': 'end_page', 'PB': 'publisher', 'SN': 'issn'
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

  return records.length > 0 ? records : [];
}

function parseRDFContent(text) {
  const records = [];
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    return [];
  }
  
  const items = xmlDoc.getElementsByTagName('bib:Article');
  const alternativeItems = xmlDoc.getElementsByTagName('bib:Book');
  const allItems = [...items, ...alternativeItems];
  
  if (allItems.length === 0) {
    const descriptions = xmlDoc.getElementsByTagName('rdf:Description');
    for (let item of descriptions) {
      const record = parseRDFItem(item);
      if (record.title || record.authors) {
        records.push(record);
      }
    }
  } else {
    for (let item of allItems) {
      const record = parseRDFItem(item);
      if (record.title || record.authors) {
        records.push(record);
      }
    }
  }

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
function parseFile(text, ext) {
  switch (ext) {
    case '.csv':
      fileFormat = 'CSV';
      formatSource = 'Excel, Google Sheets';
      parseCSV(text);
      break;
    case '.tsv':
      fileFormat = 'TSV';
      formatSource = 'Excel (Tab-delimited)';
      parseTSV(text);
      break;
    case '.ris':
      fileFormat = 'RIS';
      formatSource = 'Endnote, Zotero, Mendeley';
      parseRIS(text);
      break;
    case '.bib':
    case '.bibtex':
      fileFormat = 'BibTeX';
      formatSource = 'Google Scholar, arXiv';
      parseBibTeX(text);
      break;
    case '.txt':
      fileFormat = 'TXT';
      formatSource = '简单文本';
      parseTXT(text);
      break;
    case '.enw':
      fileFormat = 'ENW';
      formatSource = '知网导出';
      parseENW(text);
      break;
    case '.rdf':
      fileFormat = 'RDF';
      formatSource = 'Zotero导出';
      parseRDF(text);
      break;
    default:
      showToast('不支持的文件格式', 'error');
  }
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
  const records = [];
  const lines = text.split('\n');
  let currentRecord = {};
  
  const fieldMap = {
    'TY': 'type',
    'AU': 'authors',
    'T1': 'title',
    'T2': 'journal',
    'PY': 'year',
    'DO': 'doi',
    'AB': 'abstract',
    'KW': 'keywords',
    'VL': 'volume',
    'IS': 'issue',
    'SP': 'start_page',
    'EP': 'end_page',
    'PB': 'publisher',
    'SN': 'issn'
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
  const records = [];
  
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
  
  // Find all items (different RDF structures possible)
  const items = xmlDoc.getElementsByTagName('bib:Article');
  const alternativeItems = xmlDoc.getElementsByTagName('bib:Book');
  const allItems = [...items, ...alternativeItems];
  
  if (allItems.length === 0) {
    // Try generic RDF:Description
    const descriptions = xmlDoc.getElementsByTagName('rdf:Description');
    for (let item of descriptions) {
      const record = parseRDFItem(item);
      if (record.title || record.authors) {
        records.push(record);
      }
    }
  } else {
    for (let item of allItems) {
      const record = parseRDFItem(item);
      if (record.title || record.authors) {
        records.push(record);
      }
    }
  }

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

function parseRDFItem(item) {
  const record = {};
  
  // Field mapping for RDF
  const fieldMap = {
    'dc:title': 'title',
    'dcterms:title': 'title',
    'dc:creator': 'authors',
    'dcterms:creator': 'authors',
    'dcterms:issued': 'year',
    'dc:date': 'year',
    'dcterms:abstract': 'abstract',
    'dc:description': 'abstract',
    'bib:publicationTitle': 'journal',
    'dc:source': 'journal',
    'bib:volume': 'volume',
    'bib:issue': 'issue',
    'dc:identifier': 'doi',
    'bib:pages': 'pages'
  };
  
  // Try to get values from child elements
  for (let child of item.children) {
    const tagName = child.tagName;
    const mappedField = fieldMap[tagName];
    
    if (mappedField) {
      let value = child.textContent.trim();
      
      // Handle special cases
      if (mappedField === 'year') {
        // Extract year from date string
        const yearMatch = value.match(/\d{4}/);
        if (yearMatch) value = yearMatch[0];
      }
      
      if (mappedField === 'authors') {
        if (!record[mappedField]) {
          record[mappedField] = value;
        } else {
          record[mappedField] += '; ' + value;
        }
      } else {
        record[mappedField] = value;
      }
    }
  }
  
  // Also check attributes
  for (let i = 0; i < item.attributes.length; i++) {
    const attr = item.attributes[i];
    if (attr.name === 'rdf:about') {
      record.id = attr.value;
    }
  }
  
  return record;
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
      inQuotes = !inQuotes;
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
  const savedId = localStorage.getItem('prisma_current_project_id');
  if (savedId) {
    currentProjectId = savedId;
    return currentProjectId;
  }
  currentProjectId = generateProjectId();
  localStorage.setItem('prisma_current_project_id', currentProjectId);
  return currentProjectId;
}

function startNewProjectSession() {
  currentProjectId = generateProjectId();
  localStorage.setItem('prisma_current_project_id', currentProjectId);

  // Reset project-scoped pieces
  exclusionReasons = [...DEFAULT_EXCLUSION_REASONS];
  filterRules = null;
  screeningResults = null;

  persistCurrentProjectState();
  renderExclusionTemplateButtons();
  renderExclusionTemplateEditor();
  updateStep4EntryLock();
}

function persistCurrentProjectState() {
  const projectId = ensureProjectId();
  const snapshot = {
    version: '1.4',
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
    exclusionReasons
  };
  try {
    localStorage.setItem(getProjectStorageKey(projectId), JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Failed to persist project state:', e);
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

  // v1.4: template
  if (Array.isArray(snapshot.exclusionReasons) && snapshot.exclusionReasons.length > 0) {
    exclusionReasons = snapshot.exclusionReasons.map(s => String(s)).filter(Boolean);
  } else {
    exclusionReasons = [...DEFAULT_EXCLUSION_REASONS];
  }
}

function loadCurrentProjectStateFromLocalStorage() {
  const savedId = localStorage.getItem('prisma_current_project_id');
  if (!savedId) return false;
  const raw = localStorage.getItem(getProjectStorageKey(savedId));
  if (!raw) return false;

  try {
    const snapshot = JSON.parse(raw);
    if (!snapshot || !snapshot.projectId) return false;
    currentProjectId = snapshot.projectId;
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
function goToStep4() {
  if (!screeningResults) {
    showToast('请先完成文献筛选', 'warning');
    return;
  }
  setStep(4);
  displayFulltextReviewUI();
}

// v1.4: Step 5 for final results
function goToStep5() {
  if (!screeningResults) {
    showToast('请先完成文献筛选', 'warning');
    return;
  }
  setStep(5);
  displayResults(screeningResults);
}

function setStep(step) {
  currentStep = step;
  
  // Hide all steps
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('step3').classList.add('hidden');
  const step4 = document.getElementById('step4');
  if (step4) step4.classList.add('hidden');
  const step5 = document.getElementById('step5');
  if (step5) step5.classList.add('hidden');
  
  // Show current step
  document.getElementById('step' + step).classList.remove('hidden');
  
  // Update indicators
  for (let i = 1; i <= 5; i++) {
    const indicator = document.getElementById('step-indicator-' + i);
    if (indicator) {
      indicator.classList.remove('active', 'completed');
      if (i < step) {
        indicator.classList.add('completed');
      } else if (i === step) {
        indicator.classList.add('active');
      }
    }
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

  // v3.0: Improved deduplication with source tracking
  // Normalize titles for deduplication
  const normalized = data.map(row => ({
    ...row,
    _normalized_title: normalizeTitle(getValue(row, 'title')),
    _lang: detectLanguage(getValue(row, 'title') + ' ' + getValue(row, 'abstract'))
  }));

  // v3.0: Enhanced deduplication - cross-source intelligent deduplication
  const seen = new Set();
  const deduped = [];
  const duplicates = [];
  const doiMap = {}; // Track DOI duplicates

  normalized.forEach(row => {
    const doi = getValue(row, 'doi');
    const title = row._normalized_title;
    
    // Strategy 1: Exact DOI match (highest priority)
    if (doi && doi.trim()) {
      const doiKey = `doi:${doi.toLowerCase().trim()}`;
      if (doiMap[doiKey]) {
        duplicates.push(row);
        return;
      } else {
        doiMap[doiKey] = true;
        deduped.push(row);
        seen.add(doiKey);
        return;
      }
    }
    
    // Strategy 2: Normalized title match (Jaccard similarity for fuzzy matching)
    const titleKey = `title:${title}`;
    if (seen.has(titleKey)) {
      duplicates.push(row);
    } else {
      seen.add(titleKey);
      deduped.push(row);
    }
  });

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

  return {
    counts: {
      identified_db,
      identified_other,
      duplicates: duplicates.length,
      after_dupes: deduped.length,
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
    rules
  };
}

function getValue(row, field) {
  const col = columnMapping[field];
  return col ? String(row[col] || '') : '';
}

function normalizeTitle(title) {
  return title.toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

// Display results
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

  renderFilterRulesOverview(results.rules || filterRules);
  
  // Render rules overview in Step5 if exists
  const rulesOverviewFinal = document.getElementById('filterRulesOverviewFinal');
  if (rulesOverviewFinal) {
    rulesOverviewFinal.innerHTML = renderFilterRulesHTML(results.rules || filterRules);
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
  const width = 900;
  const height = 1400;
  const boxW = 360;
  const boxH = 72;

  const xCenter = (width - boxW) / 2;
  const xRight = width - boxW - 40;
  const xLeft = 40;

  const y0 = 60;
  const gapY = 115;

  const yId = y0;
  const yRemoved = yId + gapY;
  const yScreened = yRemoved + gapY;
  const ySought = yScreened + gapY;
  const yAssessed = ySought + gapY;
  const yIncluded = yAssessed + gapY;

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
function downloadFile(type) {
  if (!screeningResults) {
    showToast('没有可下载的结果', 'error');
    return;
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
  
  showToast('正在下载所有文件...', 'success');
  
  const files = [
    'included',
    'excluded',
    'svg-colorful',
    'svg-blackwhite',
    'svg-subtle',
    'report'
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
    'studyDesign': '研究方法'
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

// v4.0: Load sample data for new users
function loadSampleData() {
  showLoading('正在加载示例数据...');
  
  fetch('sample-data.json')
    .then(response => {
      if (!response.ok) throw new Error('无法加载示例数据');
      return response.json();
    })
    .then(sampleData => {
      uploadedData = sampleData.data;
      uploadedFiles = [{
        name: '示例数据.json',
        format: 'JSON',
        recordCount: sampleData.data.length,
        source: '系统内置'
      }];
      startNewProjectSession();
      fileFormat = 'JSON';
      formatSource = '示例数据（中医治疗高血压）';
      
      detectColumns();
      displayUploadInfo();
      persistCurrentProjectState();
      updateStep4EntryLock();
      hideLoading();
      
      showToast('✅ 示例数据加载成功！共 ' + uploadedData.length + ' 条记录', 'success');
      
      // Auto scroll to preview
      setTimeout(() => {
        document.getElementById('uploadInfo').scrollIntoView({ behavior: 'smooth' });
      }, 300);
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
    const excludeSelect = `
      <select id="exclude-${idx}" class="form-input" onchange="updateFulltextStats()" style="width: 100%; padding: var(--space-8);">
        <option value="">保留</option>
        ${optionHTML}
      </select>
    `;

    const abstractText = getValue(record, 'abstract');
    const hasAbstract = String(abstractText || '').trim().length > 0;
    const abstractCell = `
      <div class="abstract-cell">
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
  if (currentUserSession && projectData) {
    if (!projectData.reviewDecisions[currentUserSession.role]) {
      projectData.reviewDecisions[currentUserSession.role] = {};
    }
    
    fulltext.forEach((record, idx) => {
      const select = document.getElementById(`exclude-${idx}`);
      if (select) {
        projectData.reviewDecisions[currentUserSession.role][idx] = {
          decision: select.value || '',
          timestamp: new Date().toISOString(),
          reviewer: currentUserSession.username
        };
        
        if (select.value) {
          excludedCount++;
        }
      }
    });
    
    // Auto-save decisions
    saveProjectData();
    
    // Update collaboration status
    updateCollaborationStatus();
    
    // Check if both reviewers have completed and calculate kappa
    checkAndCalculateKappa();
  } else {
    // Fallback for non-collaborative mode
    fulltext.forEach((record, idx) => {
      const select = document.getElementById(`exclude-${idx}`);
      if (select) {
        setManualReviewDraftDecision(idx, select.value || '');
        if (select.value) excludedCount++;
      }
    });
  }
  
  const includedCount = fulltext.length - excludedCount;
  const rate = fulltext.length > 0 ? Math.round((excludedCount / fulltext.length) * 100) : 0;
  
  document.getElementById('fulltext-excluded').textContent = excludedCount;
  document.getElementById('fulltext-included').textContent = includedCount;
  document.getElementById('fulltext-rate').textContent = rate + '%';
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
    if (select && select.value) {
      excluded_ft.push({
        ...record,
        _exclude_reason: select.value,
        _exclude_stage: 'fulltext'
      });
    } else {
      included.push(record);
    }
  });

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

  // v1.4: Go to Step 5 (Final Results)
  persistCurrentProjectState();
  goToStep5();
  scrollToStep(5);
  showToast('✅ 人工审核完成，已生成最终结果', 'success');
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
  const doi = normalizeDoi(getValue(record, 'doi') || record.doi);
  if (doi) {
    return { url: `https://doi.org/${encodeURIComponent(doi)}`, source: 'doi' };
  }

  const pmid = String(record.pmid || record.PMID || '').trim();
  if (pmid && /^\d+$/.test(pmid)) {
    return { url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, source: 'pmid' };
  }

  const candidateFields = [
    record.url,
    record.link,
    record.fulltextUrl,
    record.fulltext_url,
    record.sourceUrl,
    record.source_url,
    record.cnkiUrl,
    record.cnki_url,
    record.pdfUrl,
    record.pdf_url
  ];
  const url = candidateFields.find(looksLikeHttpUrl);
  if (url) return { url: String(url).trim(), source: 'url' };

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
        <button class="btn btn-primary" type="button" onclick="viewFulltext(${idx})">查看全文（新标签）</button>
      </div>
    </div>
  `;

  showModal(modalHTML);
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
    version: '1.4',
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
    filterRules: filterRules || null
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
          setStep(3);
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
          version: '1.4',
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
          filterRules: filterRules || null
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
  if (!isDualReviewMode || !screeningResults) return;
  
  const fulltext = screeningResults.included;
  const disagreements = [];
  
  fulltext.forEach((record, idx) => {
    const aDecision = dualReviewResults.A[idx] ? (dualReviewResults.A[idx].decision || '') : '';
    const bDecision = dualReviewResults.B[idx] ? (dualReviewResults.B[idx].decision || '') : '';
    
    if (aDecision !== bDecision) {
      disagreements.push({
        index: idx,
        record: record,
        reviewerA: aDecision,
        reviewerB: bDecision
      });
    }
  });
  
  displayDisagreementResolution(disagreements);
}

function displayDisagreementResolution(disagreements) {
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
      discussion: discussion,
      reviewerAOriginal: item.reviewerA,
      reviewerBOriginal: item.reviewerB,
      resolvedBy: 'consensus',
      timestamp: new Date().toISOString()
    };
  });
  
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
    const aDecision = dualReviewResults.A[idx] ? (dualReviewResults.A[idx].decision || '') : '';
    const bDecision = dualReviewResults.B[idx] ? (dualReviewResults.B[idx].decision || '') : '';
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

// Enhanced exclusion stats update to handle dual-reviewer mode
function updateExclusionStatsWithDualReview() {
  if (isDualReviewMode) {
    // Store current reviewer's decision
    const fulltext = screeningResults.included;
    fulltext.forEach((record, idx) => {
      const select = document.getElementById(`exclude-${idx}`);
      if (select) {
        if (!dualReviewResults[currentReviewer][idx]) {
          dualReviewResults[currentReviewer][idx] = {};
        }
        dualReviewResults[currentReviewer][idx].decision = select.value;
      }
    });
    
    // Update dual review statistics
    updateDualReviewStats();
  }
}

// Override the original updateExclusionStats in dual-review mode
const originalUpdateExclusionStats = updateFulltextStats;
function updateFulltextStats() {
  originalUpdateExclusionStats();
  if (isDualReviewMode) {
    updateExclusionStatsWithDualReview();
  }
}

// Load project data from shared storage
function loadProjectData() {
  if (!currentUserSession) return;
  
  const projects = JSON.parse(localStorage.getItem('prisma_projects') || '{}');
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
      uploadedData: null,
      screeningResults: null,
      reviewDecisions: {}
    };
    
    // Register current user
    projectData.reviewers[currentUserSession.role] = {
      username: currentUserSession.username,
      joinedAt: new Date().toISOString(),
      status: 'active'
    };
    
    saveProjectData();
  } else {
    // Existing project - register current user
    if (!projectData.reviewers[currentUserSession.role]) {
      projectData.reviewers[currentUserSession.role] = {
        username: currentUserSession.username,
        joinedAt: new Date().toISOString(),
        status: 'active'
      };
      saveProjectData();
    }
    
    // Load existing data into global variables
    if (projectData.uploadedData) {
      uploadedData = projectData.uploadedData;
    }
    if (projectData.screeningResults) {
      screeningResults = projectData.screeningResults;
    }
  }
}

// Show waiting message for deputy reviewer when project doesn't exist
function showProjectWaitingMessage() {
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
    showToast('✅ 项目已找到！欢迎加入协作审查。', 'success');
  }
}

// Save project data to shared storage
function saveProjectData() {
  if (!currentUserSession || !projectData) return;
  
  // Update project data with current global state
  projectData.uploadedData = uploadedData;
  projectData.screeningResults = screeningResults;
  projectData.lastSync = new Date().toISOString();
  
  // Save to shared storage
  const projects = JSON.parse(localStorage.getItem('prisma_projects') || '{}');
  projects[currentUserSession.projectId] = projectData;
  localStorage.setItem('prisma_projects', JSON.stringify(projects));
}

// Logout function
function logout() {
  if (confirm('确定要退出登录吗？未保存的更改可能会丢失。')) {
    // Save current work
    saveProjectData();
    
    // Clear session
    sessionStorage.removeItem('prisma_user_session');
    
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
    align-items: center;
    justify-content: center;
  `;
  modal.innerHTML = htmlContent;
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


// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

