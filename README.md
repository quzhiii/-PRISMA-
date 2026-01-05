# 📚 PRISMA文献筛选助手 v1.5


















































































































































































































































































































































































</html></body>  </script>    };      }        }, 2000);          updateStat('statMemory', memMB + 'MB');          const memMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);        setInterval(() => {      if (performance.memory) {      // 监控内存（如果支持）            initWorkers();    window.onload = () => {    // 初始化    }      document.getElementById(id).textContent = value;    function updateStat(id, value) {    }      document.getElementById(barId).textContent = Math.floor(progress) + '%';      document.getElementById(barId).style.width = progress + '%';      const progress = (current / total) * 100;    function updateProgress(progressId, barId, current, total) {    }      `;        </div>          提示：只渲染可见的 100 条，内存占用极低          ✅ 虚拟列表已启动！尝试快速滚动查看性能<br/>        <div class="result success">      document.getElementById('result4').innerHTML = `            });        }          lastTime = now;          frameCount = 0;          updateStat('statFPS', frameCount);        if (now - lastTime > 1000) {        const now = performance.now();        frameCount++;      wrapper.addEventListener('scroll', () => {      const wrapper = container.querySelector('.virtual-list-wrapper');            let lastTime = performance.now();      let frameCount = 0;      // 测试滚动帧率            });        }          `;            </div>              <small style="color: #666;">${record.authors || 'No authors'} (${record.year || 'N/A'})</small>              <strong>${index + 1}. ${record.title || 'No title'}</strong><br/>            <div style="padding: 10px; border-bottom: 1px solid #eee;">          return `        renderItem: (record, index) => {        },          });            dbWorker.addEventListener('message', handler);                        };              }                resolve(e.data.paged);                dbWorker.removeEventListener('message', handler);              if (e.data.type === 'PAGED_RESULT') {            const handler = (e) => {                        });              data: { pageNum, pageSize: 100 }              type: 'GET_PAGED',            dbWorker.postMessage({          return new Promise((resolve) => {        fetchPage: async (pageNum) => {        pageSize: 100,        itemHeight: 60,      virtualList = new VirtualList(container, {            const container = document.getElementById('virtualListDemo');    async function testVirtualList() {    // 测试虚拟列表    }      };        }          btn.textContent = '重新测试';          btn.disabled = false;                    `;            </div>              查询耗时：${duration} 秒 (${duration * 1000}ms)              返回记录数：${e.data.paged.records.length}<br/>              ✅ 分页查询完成！<br/>            <div class="result success">          document.getElementById('result3').innerHTML = `                    const duration = ((endTime - startTime) / 1000).toFixed(3);          const endTime = performance.now();        if (e.data.type === 'PAGED_RESULT') {      dbWorker.onmessage = (e) => {            });        data: { pageNum: 0, pageSize: 100 }        type: 'GET_PAGED',      dbWorker.postMessage({      // 模拟分页查询（实际应该发消息给 Worker）            const startTime = performance.now();            btn.textContent = '查询中...';      btn.disabled = true;      const btn = document.getElementById('btnQuery');    async function testPaging() {    // 测试分页查询    }      }, 100);        });          data: { records: testData, batchSize: 500 }          type: 'IMPORT_RECORDS',        dbWorker.postMessage({      setTimeout(() => {            dbWorker.postMessage({ type: 'CLEAR_DATA' });      // 清空数据库            window.importStartTime = performance.now();      document.getElementById('progress2').style.display = 'block';            btn.textContent = '导入中...';      btn.disabled = true;      const btn = document.getElementById('btnImport');            if (!dbWorker) initWorkers();    async function testImport() {    // 测试导入    }      URL.revokeObjectURL(url);      a.click();      a.download = 'test_data_30000.csv';      a.href = url;      const a = document.createElement('a');      const url = URL.createObjectURL(blob);      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });            ].join('\n');        )          `"${r.title}","${r.authors}",${r.year},"${r.journal}","${r.doi}","${r.keywords}","${r.abstract}"`        ...testData.map(r =>         'Title,Authors,Year,Journal,DOI,Keywords,Abstract',      const csv = [            if (testData.length === 0) return;    function downloadTestData() {    // 下载测试数据    }      return keywords.slice(0, 3 + Math.floor(Math.random() * 3)).join(', ');      const keywords = ['treatment', 'efficacy', 'safety', 'randomized', 'placebo', 'double-blind', 'intervention'];    function generateRandomKeywords() {    }      ).join('; ');        surnames[Math.floor(Math.random() * surnames.length)] + ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26))      return Array.from({length: count}, () =>       const surnames = ['Smith', 'Johnson', 'Zhang', 'Wang', 'Kim', 'Garcia', 'Martinez', 'Lee'];      const count = 2 + Math.floor(Math.random() * 4);    function generateRandomAuthors() {    }      return `This is a randomized controlled trial investigating the efficacy of treatment in patients with various conditions. Methods: We enrolled ${100 + Math.floor(Math.random() * 900)} patients. Results: Significant improvements were observed. Conclusion: Further research is needed.`;    function generateRandomAbstract() {    }      return `${topics[Math.floor(Math.random() * topics.length)]} ${methods[Math.floor(Math.random() * methods.length)]}`;      const methods = ['RCT', 'Cohort Study', 'Meta-Analysis', 'Systematic Review', 'Case-Control'];      const topics = ['Cancer', 'Diabetes', 'Cardiovascular', 'Mental Health', 'Infectious Disease', 'Neurology', 'Pediatrics'];    function generateRandomTitle() {    }      generateBatch();            }        }          updateStat('statTime', duration + 's');          updateStat('statTotal', count);                    progress.style.display = 'none';          document.getElementById('btnImport').disabled = false;          document.getElementById('btnDownload').disabled = false;          btn.disabled = false;          btn.textContent = '重新生成';                    `;            </div>              平均：${(count / duration).toFixed(0)} 条/秒              耗时：${duration} 秒<br/>              ✅ 成功生成 ${count} 条测试数据！<br/>            <div class="result success">          document.getElementById('result1').innerHTML = `                    const duration = ((endTime - startTime) / 1000).toFixed(2);          const endTime = performance.now();        } else {          setTimeout(generateBatch, 10);        if (testData.length < count) {                progressBar.textContent = Math.floor(progress) + '%';        progressBar.style.width = progress + '%';        const progress = (testData.length / count) * 100;                }          });            keywords: generateRandomKeywords()            doi: `10.1000/${Math.floor(Math.random() * 100000)}`,            journal: `Journal ${Math.floor(Math.random() * 100) + 1}`,            year: 2000 + Math.floor(Math.random() * 25),            authors: generateRandomAuthors(),            abstract: generateRandomAbstract(),            title: `Literature Study ${idx + 1}: ${generateRandomTitle()}`,          testData.push({          const idx = testData.length;        for (let i = 0; i < batchSize && testData.length < count; i++) {      function generateBatch() {            const batchSize = 1000;      let currentBatch = 0;      // 分批生成，避免阻塞            const startTime = performance.now();            testData = [];      const count = 30000;      progress.style.display = 'block';      const progressBar = document.getElementById('progressBar1');      const progress = document.getElementById('progress1');            btn.textContent = '生成中...';      btn.disabled = true;      const btn = document.getElementById('btnGenerate');    function generateTestData() {    // 生成测试数据    }      }          break;          updateStat('statTotal', data.result.imported);          document.getElementById('progress2').style.display = 'none';          document.getElementById('btnRender').disabled = false;          document.getElementById('btnQuery').disabled = false;          `;            </div>              耗时：${((performance.now() - window.importStartTime) / 1000).toFixed(2)} 秒              ✅ 导入完成！共导入 ${data.result.imported} 条记录<br/>            <div class="result success">          document.getElementById('result2').innerHTML = `        case 'IMPORT_COMPLETE':          break;          updateProgress('progress2', 'progressBar2', data.inserted, data.total);        case 'IMPORT_PROGRESS':      switch (type) {            const { type } = data;    function handleWorkerMessage(data) {    }      };        console.log('Parser Worker:', e.data);      parserWorker.onmessage = (e) => {      };        handleWorkerMessage(e.data);        console.log('DB Worker:', e.data);      dbWorker.onmessage = (e) => {      parserWorker = new Worker('parser-worker.js');      dbWorker = new Worker('db-worker.js');    function initWorkers() {    // 初始化 Worker    let virtualList = null;    let parserWorker = null;    let dbWorker = null;    let testData = [];  <script>  <script src="virtual-list.js"></script>  </div>    </div>      </div>        <div class="stat-label">滚动帧率</div>        <div class="stat-value" id="statFPS">0</div>      <div class="stat-card">      </div>        <div class="stat-label">内存占用</div>        <div class="stat-value" id="statMemory">0MB</div>      <div class="stat-card">      </div>        <div class="stat-label">总耗时</div>        <div class="stat-value" id="statTime">0s</div>      <div class="stat-card">      </div>        <div class="stat-label">总记录数</div>        <div class="stat-value" id="statTotal">0</div>      <div class="stat-card">    <div class="stats">    </div>      <div id="result4"></div>      <div id="virtualListDemo"></div>      <button id="btnRender" onclick="testVirtualList()" disabled>启动虚拟列表</button>      <h3>测试 4: 虚拟滚动渲染</h3>    <div class="test-section">    </div>      <div id="result3"></div>      <button id="btnQuery" onclick="testPaging()" disabled>分页查询测试</button>      <h3>测试 3: 分页查询性能</h3>    <div class="test-section">    </div>      <div id="result2"></div>      </div>        <div class="progress-bar" id="progressBar2">0%</div>      <div class="progress" id="progress2" style="display:none;">      <button id="btnImport" onclick="testImport()" disabled>导入到 IndexedDB</button>      <h3>测试 2: IndexedDB 导入性能</h3>    <div class="test-section">    </div>      <div id="result1"></div>      </div>        <div class="progress-bar" id="progressBar1">0%</div>      <div class="progress" id="progress1" style="display:none;">      <button id="btnDownload" onclick="downloadTestData()" disabled>下载为 CSV</button>      <button id="btnGenerate" onclick="generateTestData()">生成测试数据</button>      <h3>测试 1: 生成 30000 条模拟文献数据</h3>    <div class="test-section">        <h1>🧪 V1.5 性能测试：30000 条文献处理</h1>  <div class="container"><body></head>  </style>    #virtualListDemo { height: 500px; border: 1px solid #ddd; margin-top: 20px; overflow: hidden; }    .stat-label { font-size: 12px; color: #7f8c8d; margin-top: 5px; }    .stat-value { font-size: 28px; font-weight: bold; color: #3498db; }    .stat-card { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }    .error { border-left-color: #e74c3c; color: #e74c3c; }    .success { border-left-color: #2ecc71; }    .result { margin: 10px 0; padding: 10px; background: #fff; border-left: 4px solid #3498db; }    .progress-bar { height: 100%; background: linear-gradient(90deg, #3498db, #2ecc71); transition: width 0.3s; text-align: center; line-height: 30px; color: white; font-weight: bold; }    .progress { width: 100%; height: 30px; background: #ddd; border-radius: 5px; overflow: hidden; margin: 10px 0; }    button:disabled { background: #95a5a6; cursor: not-allowed; }    button:hover { background: #2980b9; }    button { padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 10px; }    .test-section { margin: 20px 0; padding: 20px; background: #ecf0f1; border-radius: 5px; }    h1 { color: #2c3e50; }    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }  <style>  <title>V1.5 性能测试 - 30000 条文献</title>  <meta charset="UTF-8"><head>一个强大的文献筛选和 PRISMA 2020 流程图生成工具，帮助研究者高效完成系统综述和荟萃分析的文献筛选工作。**v1.5 支持处理 3 万篇文献，采用 IndexedDB + Web Worker 架构，性能大幅提升。**

## ✨ 核心功能

### 🚀 v1.5 重大升级（大规模处理版）
- 🗄️ **IndexedDB 数据层**：支持 30000+ 篇文献存储，突破 localStorage 限制
- ⚡ **Web Worker 并行处理**：文件解析和去重在后台线程执行，主线程不卡顿
- 📜 **虚拟滚动列表**：只渲染可见的 100 条记录，内存占用降低 50%
- 📊 **流式进度汇报**：导入和解析过程实时显示进度条
- 🔍 **分页查询 API**：按需加载数据，滚动流畅达到 60fps
- 💾 **事务安全机制**：IndexedDB 事务保证数据不丢失

### 🎉 v1.4 核心功能
- ✏️ **自定义排除原因模板**：支持项目级别的排除原因定制，不同项目互不干扰
- ⌨️ **快捷键支持**：前6条排除原因可用数字键1-6快速选择，提升审核效率
- 💾 **人工审核草稿持久化**：审核进度自动保存到localStorage，刷新页面不丢失
- 🔄 **规则修改重跑**：Step3支持"修改规则重跑"按钮，确认后重置人工审核数据
- 📊 **PRISMA 2020标准流程图**：支持简化版和PRISMA 2020标准版两种导出模式
- 📋 **规则概览展示**：结果页面显示所有应用的筛选规则，方便审计和报告
- 📑 **Step5最终结果页**：人工审核完成后进入独立的最终结果页，流程更清晰

### 🚀 v1.3 核心功能
- 📄 **完整摘要导出**：导出Excel时自动包含文献摘要，方便全文筛选和引用
- 🤖 **智能研究方法识别**：基于标题和摘要自动识别研究设计类型（RCT、队列研究、Meta分析等）
- ✏️ **人工修正支持**：自动识别结果可手动审核修改，确保准确性
- 🏷️ **中文列名优化**：导出文件使用中文表头，更符合国内使用习惯

### 🎯 v1.2 优化改进
- 🎨 **折叠面板优化**：数据库导出教程默认折叠，减少首屏空间占用
- 📍 **吸顶导航**：步骤导航栏滚动时吸顶，方便快速切换步骤
- 🛡️ **隐私声明**：醒目标注本地离线处理，数据不上传服务器
- ⚙️ **去重功能说明**：添加去重设置选项，说明去重规则和自定义方法

### 🎉 v1.1 核心功能（双人协作审查）
- 👥 **真正的双用户登录系统**：独立登录页面，每个审查员拥有独立会话
- 🤝 **项目协作机制**：主审查员创建项目，副审查员通过项目ID加入
- 📊 **Cohen's Kappa一致性分析**：自动计算审查员间一致性指标
- 🔍 **智能分歧识别**：自动标记意见不一致的文献并提供协商界面
- 💾 **实时数据同步**：双方决策自动保存，支持跨浏览器协作
- 📈 **完整学术流程**：独立审查→一致性计算→分歧协商→最终结果

### v1.0 基础功能
- 🎯 **多文件上传**：支持同时上传多个文献数据库导出文件
- 🔄 **跨来源去重**：自动识别不同数据库的重复文献
- 📊 **真实数据统计**：准确追踪各数据库文献数量（识别阶段）
- 👁️ **人工全文审查**：新增第4步，支持逐篇审查并记录排除理由
- 📝 **详细排除记录**：导出包含排除阶段和理由的完整数据

### 通用功能
- 📁 **多格式支持**：CSV, TSV, RIS, BibTeX, Endnote, RDF, TXT等8种格式
- 🎨 **智能字段映射**：自动识别Zotero、Endnote、PubMed等导出格式
- 🔍 **灵活筛选规则**：
  - 时间窗口过滤（默认2000-2030），可调整
  - 包含关键词（OR逻辑，支持多个）
  - 排除关键词（自定义理由）
  - 语言筛选（中文/英文）
  - 必填字段检查
- 🎨 **PRISMA 2020流程图**：3种配色方案（彩色/黑白/淡雅）
- 📊 **导出功能**：
  - 纳入文献 (Excel/CSV)
  - 排除文献 (Excel/CSV，含排除理由和阶段)
  - PRISMA流程图 (SVG)
  - 筛选报告 (Markdown)

## 🚀 在线使用

**GitHub Pages:** https://quzhiii.github.io/-PRISMA-/

## 💻 本地运行

1. 克隆仓库：
```bash
git clone https://github.com/[quzhiii]/literature-screening-v30.git
cd literature-screening-v30
```

2. 启动本地服务器：
```bash
# Python 3
python -m http.server 8000

# 或使用其他HTTP服务器
npx http-server -p 8000
```

3. 在浏览器打开：`http://localhost:8000`

## 📖 使用指南

### 第1步：上传文献数据
- 支持多文件上传（可同时选择PubMed、Web of Science、CNKI等多个来源）
- 自动检测文件格式和字段映射
- 显示上传文件数量和总记录数

### 第2步：配置筛选规则
1. **时间窗口**：设置发表年份范围（默认2000-2030）
2. **包含关键词**：
   - 每行一个关键词
   - 任一命中即通过（OR逻辑）
   - 留空则不进行关键词过滤
3. **排除关键词**：
   - 点击"+ 添加排除规则"
   - 输入关键词和排除理由
4. **语言和必填字段**：
   - 默认允许中英文
   - 可选择必须包含标题或摘要

### 第3步：查看初步结果
- 查看PRISMA流程图
- 查看筛选统计数据
- 下载纳入/排除文献列表
- 进入第4步进行人工审查

### 第4步：人工全文审查
- 逐篇审查通过标题/摘要筛选的文献
- 为需要排除的文献选择理由：
  - 人群不符
  - 干预不符
  - 对照不符
  - 缺乏结局
  - 数据不完整
  - 研究设计不合适
- 完成审查后返回第3步查看最终结果

## 🎯 支持的文献格式

| 格式 | 来源 | 扩展名 |
|------|------|--------|
| RIS | Zotero, Endnote, RefWorks | .ris |
| BibTeX | LaTeX, JabRef | .bib |
| CSV/TSV | 通用表格 | .csv, .tsv |
| Endnote | Endnote | .enw |
| RDF | Zotero | .rdf |
| TXT | PubMed, 自定义 | .txt |

## 🔧 技术栈

- **纯前端**：HTML + CSS + Vanilla JavaScript
- **无需后端**：所有处理在浏览器本地完成
- **隐私保护**：数据不上传服务器
- **依赖**：
  - js-yaml: YAML格式解析（用于部分BibTeX处理）

## 🎨 设计特色

- **Perplexity风格**：采用Perplexity设计系统的颜色和排版规范
- **响应式设计**：适配桌面和移动设备
- **高对比度**：确保良好的可读性
- **流畅动画**：CSS过渡和加载动画

## 📝 更新日志

### v1.1 (2025-11-25) - 👥 双人协作审查版
**目标：让科研小白也能轻松上手**

✅ **已完成（第1优先级）：**
- 新增"加载示例数据"按钮 - 一键体验完整流程
- 新增数据库导出教程面板 - 包含PubMed、知网、WoS、Cochrane详细步骤
- 增强错误提示系统 - 详细的错误原因分析和解决建议
- 新增新手引导面板 - 醒目的入门帮助

🚧 **规划中（第2优先级）：**
- 项目保存/加载功能 - 防止数据丢失
- 批量操作优化 - 提高第4步人工审查效率
- 快捷键支持 - 快速排除文献

📋 **未来计划（第3优先级）：**
- 双人审查模式 - 符合高质量系统综述标准
- Kappa一致性计算 - 自动计算审查员间一致性
- 移动端优化 - 支持手机/平板使用

### v1.0 (2025-10-24)
- ✅ 新增多文件上传功能
- ✅ 实现跨来源自动去重
- ✅ 新增第4步人工全文审查界面
- ✅ 修复真实数据统计（识别阶段）
- ✅ 优化关键词过滤（支持多关键词OR逻辑）
- ✅ 增强Zotero字段兼容性
- ✅ 改进排除文献导出（包含排除阶段和理由）
- ✅ 添加友好的空数据提示

### v0.8
- 基础筛选功能
- PRISMA流程图生成
- 多格式导入支持

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- PRISMA 2020指南
- Perplexity设计系统
- 开源社区

---

**开发者**: [quzhiii]  
**问题反馈**: [GitHub Issues](https://github.com/[quzhiii]/literature-screening-v30/issues)  
**最后更新**: 2025-11-24
