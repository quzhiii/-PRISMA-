/**
 * P0 改造：虚拟滚动列表（Virtual List）
 * 支持 3 万条数据的高性能列表渲染
 * 
 * 用法：
 * const list = new VirtualList(container, {
 *   items: [],
 *   itemHeight: 60,
 *   pageSize: 100,
 *   fetchPage: async (pageNum) => { ... }
 * });
 */

class VirtualList {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: options.itemHeight || 60,
      pageSize: options.pageSize || 100,
      bufferSize: options.bufferSize || 3, // 上下缓冲区页数
      fetchPage: options.fetchPage || null,
      renderItem: options.renderItem || ((item) => item.toString()),
      ...options
    };
    
    this.items = options.items || [];
    this.totalCount = 0;
    this.currentPage = 0;
    this.cachedPages = new Map(); // 页码 -> 数据缓存
    
    this.setupDOM();
    this.setupScroll();
  }
  
  setupDOM() {
    this.container.innerHTML = `
      <div class="virtual-list-wrapper" style="position: relative; overflow-y: auto; height: 100%;">
        <div class="virtual-list-spacer" style="height: 0;"></div>
        <div class="virtual-list-content"></div>
      </div>
    `;
    
    this.wrapper = this.container.querySelector('.virtual-list-wrapper');
    this.spacer = this.container.querySelector('.virtual-list-spacer');
    this.content = this.container.querySelector('.virtual-list-content');
  }
  
  setupScroll() {
    this.wrapper.addEventListener('scroll', () => this.onScroll());
  }
  
  async setData(items, total) {
    this.items = items;
    this.totalCount = total;
    this.cachedPages.clear();
    this.currentPage = 0;
    await this.renderCurrentPage();
  }
  
  onScroll() {
    const scrollTop = this.wrapper.scrollTop;
    const viewportHeight = this.wrapper.clientHeight;
    const pageNum = Math.floor(scrollTop / (this.options.pageSize * this.options.itemHeight));
    
    if (pageNum !== this.currentPage) {
      this.currentPage = pageNum;
      this.renderCurrentPage();
    }
  }
  
  async renderCurrentPage() {
    const pageNum = this.currentPage;
    const { pageSize, bufferSize, itemHeight } = this.options;
    
    // 加载当前页和缓冲区页面
    const pagesToLoad = [];
    for (let i = Math.max(0, pageNum - bufferSize); i <= pageNum + bufferSize; i++) {
      if (!this.cachedPages.has(i)) {
        pagesToLoad.push(i);
      }
    }
    
    // 并行加载多个页面
    if (pagesToLoad.length > 0 && this.options.fetchPage) {
      const promises = pagesToLoad.map(p => this.loadPage(p));
      await Promise.all(promises);
    }
    
    this.render();
  }
  
  async loadPage(pageNum) {
    if (this.cachedPages.has(pageNum)) return;
    
    try {
      const pageData = await this.options.fetchPage(pageNum);
      this.cachedPages.set(pageNum, pageData.records || []);
    } catch (error) {
      console.error(`Failed to load page ${pageNum}:`, error);
      this.cachedPages.set(pageNum, []);
    }
  }
  
  render() {
    const { pageSize, itemHeight } = this.options;
    const pageNum = this.currentPage;
    const page = this.cachedPages.get(pageNum) || [];
    
    // 计算偏移量
    const topOffset = pageNum * pageSize * itemHeight;
    
    // 更新 spacer 高度
    const unusedHeight = Math.max(0, topOffset);
    this.spacer.style.height = unusedHeight + 'px';
    
    // 渲染当前页面的项
    this.content.innerHTML = page
      .map((item, idx) => {
        const html = this.options.renderItem(item, pageNum * pageSize + idx);
        return `<div class="virtual-list-item" style="height: ${itemHeight}px; overflow: hidden;">
          ${html}
        </div>`;
      })
      .join('');
  }
  
  // 更新单个项
  updateItem(index, updates) {
    const pageNum = Math.floor(index / this.options.pageSize);
    const pageData = this.cachedPages.get(pageNum);
    if (pageData) {
      const localIdx = index % this.options.pageSize;
      if (pageData[localIdx]) {
        Object.assign(pageData[localIdx], updates);
        if (pageNum === this.currentPage) {
          this.render();
        }
      }
    }
  }
  
  // 清空缓存
  clearCache() {
    this.cachedPages.clear();
    this.currentPage = 0;
  }
  
  // 滚到顶部
  scrollToTop() {
    this.wrapper.scrollTop = 0;
  }
  
  // 获取当前可见的项索引范围
  getVisibleRange() {
    const scrollTop = this.wrapper.scrollTop;
    const viewportHeight = this.wrapper.clientHeight;
    const itemHeight = this.options.itemHeight;
    
    const startIdx = Math.floor(scrollTop / itemHeight);
    const endIdx = Math.ceil((scrollTop + viewportHeight) / itemHeight);
    
    return { startIdx, endIdx };
  }
}
