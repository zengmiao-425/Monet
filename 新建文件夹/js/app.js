/**
 * 寻找生活中的莫奈配色 — 主应用逻辑
 */

const STORAGE_KEY = 'monet_palette_works';

// ===== 作品分区配置 =====
const MAIN_CATEGORIES = [
  { id: 'soft-light', label: '印象柔光', desc: '浅米·淡蓝·柔绿' },
  { id: 'lakeside', label: '湖畔水光', desc: '蓝绿·水面倒影' },
  { id: 'sunset-gold', label: '落日鎏金', desc: '暖橙·黄昏光影' },
  { id: 'flower-dream', label: '花野绮梦', desc: '柔粉紫·浪漫淡彩' },
  { id: 'misty-gray', label: '雾影沉灰', desc: '低饱和·朦胧复古' },
  { id: 'vivid-summer', label: '浓彩盛夏', desc: '高饱和·鲜活夏日' },
];

const EXTRA_CATEGORIES = [
  { id: 'church-light', label: '教堂光影', desc: '同场景不同时段' },
  { id: 'four-seasons', label: '四季风物', desc: '春夏秋冬摄影' },
  { id: 'impression-homage', label: '仿绘印象', desc: '莫奈风格创作' },
];

const SEASONS = [
  { id: 'spring', label: '春' },
  { id: 'summer', label: '夏' },
  { id: 'autumn', label: '秋' },
  { id: 'winter', label: '冬' },
];

const ALL_CATEGORY_IDS = [...MAIN_CATEGORIES, ...EXTRA_CATEGORIES].map(c => c.id);

const LEGACY_TONE_MAP = {
  warm: 'sunset-gold',
  cool: 'lakeside',
  pastel: 'soft-light',
  earth: 'misty-gray',
};

const moodMap = {
  'soft-light': ['柔光絮语', '浅梦浮生', '朦胧晨光', '棉花糖云', '温柔午后'],
  lakeside: ['雨后清蓝', '湖面倒影', '水色梦境', '静谧时光', '碧波轻漾'],
  'sunset-gold': ['落日余晖', '晨曦微光', '暖茶时光', '金色记忆', '鎏金时刻'],
  'flower-dream': ['花瓣轻落', '花野低语', '绮梦浮生', '淡紫花语', '浪漫絮语'],
  'misty-gray': ['雾影迷离', '沉灰时光', '阴天絮语', '复古朦胧', '烟色记忆'],
  'vivid-summer': ['盛夏光年', '浓彩瞬间', '鲜活色彩', '强光之舞', '热烈夏日'],
  'church-light': ['光影流转', '时辰之变', '圣光斑驳', '时刻印记', '光迹记录'],
  'four-seasons': ['四季如歌', '风物长宜', '时节印记', '自然轮回', '岁时记'],
  'impression-homage': ['印象之触', '仿绘心象', '色彩致敬', '创意调色', '莫奈之思'],
};

// DOM 元素
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const previewPanel = document.getElementById('previewPanel');
const previewImage = document.getElementById('previewImage');
const paletteColors = document.getElementById('paletteColors');
const paletteMood = document.getElementById('paletteMood');
const workForm = document.getElementById('workForm');
const workTitle = document.getElementById('workTitle');
const workDesc = document.getElementById('workDesc');
const categoryChips = document.getElementById('categoryChips');
const seasonChips = document.getElementById('seasonChips');
const cancelBtn = document.getElementById('cancelBtn');
const gallery = document.getElementById('gallery');
const galleryEmpty = document.getElementById('galleryEmpty');
const filterTabsMain = document.getElementById('filterTabsMain');
const filterTabsExtra = document.getElementById('filterTabsExtra');
const filterMoreToggle = document.getElementById('filterMoreToggle');
const seasonFilter = document.getElementById('seasonFilter');
const seasonFilterTabs = document.getElementById('seasonFilterTabs');
const workModal = document.getElementById('workModal');
const modalClose = document.getElementById('modalClose');

let currentImageData = null;
let currentPalette = [];
let currentFilter = 'all';
let currentSeasonFilter = 'all';
let selectedCategory = 'soft-light';
let selectedSeason = null;
let works = loadWorks();

// ===== 本地存储 =====
function loadWorks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return data.map(normalizeWork);
  } catch {
    return [];
  }
}

function normalizeWork(work) {
  const category = work.category || LEGACY_TONE_MAP[work.tone] || 'soft-light';
  return {
    ...work,
    category: ALL_CATEGORY_IDS.includes(category) ? category : 'soft-light',
    season: work.season || null,
  };
}

function saveWorks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
}

function getCategoryMeta(id) {
  return [...MAIN_CATEGORIES, ...EXTRA_CATEGORIES].find(c => c.id === id);
}

function categoryLabel(id) {
  return getCategoryMeta(id)?.label || '印象柔光';
}

function seasonLabel(id) {
  return SEASONS.find(s => s.id === id)?.label || '';
}

function getMoodText(category) {
  const moods = moodMap[category] || moodMap['soft-light'];
  return moods[Math.floor(Math.random() * moods.length)];
}

// ===== 配色提取 =====
function extractPalette(img, count = 5) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = 80;
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(img, 0, 0, size, size);

  const data = ctx.getImageData(0, 0, size, size).data;
  const colorMap = {};

  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 24) * 24;
    const g = Math.round(data[i + 1] / 24) * 24;
    const b = Math.round(data[i + 2] / 24) * 24;
    const a = data[i + 3];
    if (a < 128) continue;

    const key = `${r},${g},${b}`;
    colorMap[key] = (colorMap[key] || 0) + 1;
  }

  const sorted = Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return { r, g, b, hex: rgbToHex(r, g, b) };
    });

  return pickDiverseColors(sorted, count);
}

function pickDiverseColors(colors, count) {
  if (colors.length <= count) return colors;

  const selected = [colors[0]];
  const used = new Set([colors[0].hex]);

  for (let i = 1; i < colors.length && selected.length < count; i++) {
    const c = colors[i];
    if (used.has(c.hex)) continue;

    const minDist = selected.reduce((min, s) => {
      const d = colorDistance(c, s);
      return d < min ? d : min;
    }, Infinity);

    if (minDist > 40) {
      selected.push(c);
      used.add(c.hex);
    }
  }

  while (selected.length < count && colors.length > selected.length) {
    for (const c of colors) {
      if (!used.has(c.hex)) {
        selected.push(c);
        used.add(c.hex);
        break;
      }
    }
  }

  return selected;
}

function colorDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ===== 主分区自动分类 =====
function classifyCategory(palette) {
  const scores = {
    'soft-light': 0,
    lakeside: 0,
    'sunset-gold': 0,
    'flower-dream': 0,
    'misty-gray': 0,
    'vivid-summer': 0,
  };

  palette.forEach(({ r, g, b }) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const light = (r + g + b) / 3;

    if (light > 175 && sat < 0.38) scores['soft-light'] += 2;
    if (light > 160 && sat < 0.3 && Math.abs(r - g) < 35) scores['soft-light'] += 1;

    if (g >= r && b >= r && (g + b) / 2 > r + 15 && sat >= 0.15) scores.lakeside += 2;
    if (b > g && g > r && sat > 0.2) scores.lakeside += 1;

    if (r > g + 20 && r > b + 15 && g > b - 30) scores['sunset-gold'] += 2;
    if (r > 140 && g > 90 && b < 120 && r - b > 40) scores['sunset-gold'] += 1;

    if (r > 130 && (r > g || b > 100) && light > 130 && sat < 0.5) {
      if (b > g || (r > g && b > 80)) scores['flower-dream'] += 2;
    }

    if (sat < 0.22 && light > 90 && light < 200) scores['misty-gray'] += 2;
    if (sat < 0.15) scores['misty-gray'] += 1;

    if (sat > 0.45 && light > 80 && max > 120) scores['vivid-summer'] += 2;
    if (sat > 0.55) scores['vivid-summer'] += 1;
  });

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top[1] > 0 ? top[0] : 'soft-light';
}

// ===== 渲染配色 =====
function renderPalette(container, palette) {
  container.innerHTML = '';
  palette.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'palette-swatch';
    swatch.style.backgroundColor = color.hex;
    swatch.dataset.hex = color.hex;
    swatch.title = color.hex;
    swatch.addEventListener('click', () => {
      navigator.clipboard?.writeText(color.hex);
      showToast(`已复制 ${color.hex}`);
    });
    container.appendChild(swatch);
  });
}

function updatePreviewMood(category) {
  paletteMood.textContent = `「${getMoodText(category)}」· ${categoryLabel(category)}`;
}

// ===== 发布分类选择 =====
function renderCategoryChips() {
  categoryChips.innerHTML = '';

  const mainLabel = document.createElement('p');
  mainLabel.className = 'category-chip-group-label';
  mainLabel.textContent = '主作品分区';
  categoryChips.appendChild(mainLabel);

  MAIN_CATEGORIES.forEach(cat => {
    categoryChips.appendChild(createCategoryChip(cat, false));
  });

  const extraLabel = document.createElement('p');
  extraLabel.className = 'category-chip-group-label';
  extraLabel.textContent = '特色专区';
  categoryChips.appendChild(extraLabel);

  EXTRA_CATEGORIES.forEach(cat => {
    categoryChips.appendChild(createCategoryChip(cat, true));
  });

  renderSeasonChips();
}

function createCategoryChip(cat, isExtra) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `category-chip${isExtra ? ' category-chip-extra' : ''}${selectedCategory === cat.id ? ' active' : ''}`;
  btn.textContent = cat.label;
  btn.title = cat.desc;
  btn.dataset.category = cat.id;
  btn.addEventListener('click', () => {
    selectedCategory = cat.id;
    categoryChips.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    updateSeasonChipsVisibility();
    updatePreviewMood(selectedCategory);
  });
  return btn;
}

function renderSeasonChips() {
  seasonChips.innerHTML = '';
  SEASONS.forEach(season => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `category-chip${selectedSeason === season.id ? ' active' : ''}`;
    btn.textContent = season.label;
    btn.dataset.season = season.id;
    btn.addEventListener('click', () => {
      selectedSeason = selectedSeason === season.id ? null : season.id;
      seasonChips.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      if (selectedSeason) btn.classList.add('active');
    });
    seasonChips.appendChild(btn);
  });
  updateSeasonChipsVisibility();
}

function updateSeasonChipsVisibility() {
  const show = selectedCategory === 'four-seasons';
  seasonChips.hidden = !show;
  if (!show) selectedSeason = null;
}

// ===== 筛选标签 =====
function renderFilterTabs() {
  filterTabsMain.innerHTML = '';
  filterTabsExtra.innerHTML = '';

  const allMain = createFilterTab('all', '全部', filterTabsMain, false);
  allMain.classList.add('active');
  allMain.setAttribute('aria-selected', 'true');

  MAIN_CATEGORIES.forEach(cat => {
    createFilterTab(cat.id, cat.label, filterTabsMain, false);
  });

  EXTRA_CATEGORIES.forEach(cat => {
    createFilterTab(cat.id, cat.label, filterTabsExtra, true);
  });

  seasonFilterTabs.innerHTML = '';
  createSeasonFilterTab('all', '全部季节');
  SEASONS.forEach(s => createSeasonFilterTab(s.id, s.label));
}

function createFilterTab(id, label, container, isExtra) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `filter-tab${isExtra ? ' filter-tab-extra' : ''}`;
  btn.dataset.filter = id;
  btn.textContent = label;
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', 'false');
  btn.addEventListener('click', () => setActiveFilter(id, isExtra));
  container.appendChild(btn);
  return btn;
}

function createSeasonFilterTab(id, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `season-tab${id === currentSeasonFilter ? ' active' : ''}`;
  btn.dataset.season = id;
  btn.textContent = label;
  btn.setAttribute('role', 'tab');
  btn.addEventListener('click', () => {
    currentSeasonFilter = id;
    seasonFilterTabs.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderGallery();
  });
  seasonFilterTabs.appendChild(btn);
}

function setActiveFilter(id, fromExtra) {
  currentFilter = id;
  currentSeasonFilter = 'all';

  document.querySelectorAll('.filter-tab').forEach(tab => {
    const active = tab.dataset.filter === id;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  seasonFilterTabs.querySelectorAll('.season-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === 0);
  });

  const showSeason = id === 'four-seasons';
  seasonFilter.hidden = !showSeason;

  if (fromExtra && filterTabsExtra.hidden) {
    filterTabsExtra.hidden = false;
    filterMoreToggle.setAttribute('aria-expanded', 'true');
  }

  renderGallery();
}

// ===== 上传处理 =====
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('请选择图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      currentImageData = e.target.result;
      previewImage.src = currentImageData;
      currentPalette = extractPalette(img);
      selectedCategory = classifyCategory(currentPalette);
      selectedSeason = null;
      renderPalette(paletteColors, currentPalette);
      renderCategoryChips();
      updatePreviewMood(selectedCategory);
      previewPanel.hidden = false;
      uploadZone.style.display = 'none';
      workTitle.value = '';
      workDesc.value = '';
      workTitle.focus();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  currentImageData = null;
  currentPalette = [];
  selectedCategory = 'soft-light';
  selectedSeason = null;
  previewPanel.hidden = true;
  uploadZone.style.display = '';
  fileInput.value = '';
}

// ===== 发布作品 =====
function publishWork(e) {
  e.preventDefault();
  if (!currentImageData || !currentPalette.length) return;

  if (selectedCategory === 'four-seasons' && !selectedSeason) {
    showToast('请选择季节标签');
    return;
  }

  const title = workTitle.value.trim() || '未命名色彩';
  const desc = workDesc.value.trim() || '一抹来自生活的莫奈配色';

  const work = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    desc,
    image: currentImageData,
    palette: currentPalette,
    category: selectedCategory,
    season: selectedCategory === 'four-seasons' ? selectedSeason : null,
    mood: getMoodText(selectedCategory),
    date: new Date().toISOString(),
  };

  works.unshift(work);
  saveWorks();
  resetUpload();
  renderGallery();
  showToast('作品已发布到画廊 ✨');
  document.querySelector('.gallery-section').scrollIntoView({ behavior: 'smooth' });
}

// ===== 画廊渲染 =====
function getFilteredWorks() {
  let list = works;

  if (currentFilter !== 'all') {
    list = list.filter(w => w.category === currentFilter);
  }

  if (currentFilter === 'four-seasons' && currentSeasonFilter !== 'all') {
    list = list.filter(w => w.season === currentSeasonFilter);
  }

  return list;
}

function getEmptyMessage() {
  if (currentFilter === 'all') return '画廊尚空，等待第一抹色彩';
  const label = categoryLabel(currentFilter);
  if (currentFilter === 'four-seasons' && currentSeasonFilter !== 'all') {
    return `${label} · ${seasonLabel(currentSeasonFilter)}季暂无作品`;
  }
  return `${label}分区暂无作品`;
}

function formatCategoryBadge(work) {
  let text = categoryLabel(work.category);
  if (work.category === 'four-seasons' && work.season) {
    text += ` · ${seasonLabel(work.season)}`;
  }
  return text;
}

function renderGallery() {
  const filtered = getFilteredWorks();

  gallery.querySelectorAll('.gallery-card').forEach(el => el.remove());

  if (filtered.length === 0) {
    galleryEmpty.style.display = '';
    galleryEmpty.querySelector('p').textContent = getEmptyMessage();
    return;
  }

  galleryEmpty.style.display = 'none';

  filtered.forEach((work, i) => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <img class="gallery-card-image" src="${work.image}" alt="${work.title}" loading="lazy">
      <div class="gallery-card-body">
        <h3 class="gallery-card-title">${escapeHtml(work.title)}</h3>
        <div class="gallery-card-palette">
          ${work.palette.map(c => `<span style="background:${c.hex}"></span>`).join('')}
        </div>
        <span class="gallery-card-category">${escapeHtml(formatCategoryBadge(work))}</span>
        <p class="gallery-card-mood">${escapeHtml(work.mood)}</p>
      </div>
    `;
    card.addEventListener('click', () => openModal(work));
    gallery.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== 弹窗 =====
function openModal(work) {
  document.getElementById('modalImage').src = work.image;
  document.getElementById('modalTitle').textContent = work.title;
  document.getElementById('modalDesc').textContent = work.desc;
  document.getElementById('modalCategory').textContent = formatCategoryBadge(work);
  document.getElementById('modalMood').textContent = `「${work.mood}」`;
  document.getElementById('modalDate').textContent = formatDate(work.date);
  renderPalette(document.getElementById('modalPalette'), work.palette);
  workModal.showModal();
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ===== Toast =====
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ===== 事件绑定 =====
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

workForm.addEventListener('submit', publishWork);
cancelBtn.addEventListener('click', resetUpload);

filterMoreToggle.addEventListener('click', () => {
  const expanded = filterMoreToggle.getAttribute('aria-expanded') === 'true';
  filterMoreToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  filterTabsExtra.hidden = expanded;
  if (expanded && EXTRA_CATEGORIES.some(c => c.id === currentFilter)) {
    setActiveFilter('all', false);
  }
});

// ===== 初始化 =====
renderFilterTabs();
renderGallery();
