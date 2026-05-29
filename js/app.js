/**
 * 寻找生活中的莫奈配色 — 主应用逻辑
 */

const STORAGE_KEY = 'monet_palette_works';

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
const cancelBtn = document.getElementById('cancelBtn');
const gallery = document.getElementById('gallery');
const galleryEmpty = document.getElementById('galleryEmpty');
const filterTabs = document.querySelectorAll('.filter-tab');
const workModal = document.getElementById('workModal');
const modalClose = document.getElementById('modalClose');

let currentImageData = null;
let currentPalette = [];
let currentTone = 'all';
let works = loadWorks();

// ===== 本地存储 =====
function loadWorks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWorks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
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
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
  );
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ===== 色调分类 =====
function classifyTone(palette) {
  let warm = 0, cool = 0, pastel = 0, earth = 0;

  palette.forEach(({ r, g, b }) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const light = (r + g + b) / 3;

    if (light > 180 && sat < 0.35) pastel++;
    if (r > g && r > b && r - Math.min(g, b) > 20) warm++;
    if (b > r && b > g && b - Math.min(r, g) > 15) cool++;
    if (r > 100 && g > 80 && b < 120 && r - b > 30) earth++;
  });

  const scores = { warm, cool, pastel, earth };
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'pastel';
  return Object.entries(scores).find(([, v]) => v === maxScore)[0];
}

// ===== 情绪描述 =====
const moodMap = {
  warm: ['晨曦微光', '落日余晖', '暖茶时光', '秋日私语', '金色记忆'],
  cool: ['雨后清蓝', '湖面倒影', '薄雾清晨', '水色梦境', '静谧时光'],
  pastel: ['柔光絮语', '棉花糖云', '浅梦浮生', '花瓣轻落', '温柔午后'],
  earth: ['大地低语', '林间小径', '泥土芬芳', '原木温度', '自然之息'],
};

function getMoodText(tone) {
  const moods = moodMap[tone] || moodMap.pastel;
  return moods[Math.floor(Math.random() * moods.length)];
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
      const tone = classifyTone(currentPalette);
      renderPalette(paletteColors, currentPalette);
      paletteMood.textContent = `「${getMoodText(tone)}」· ${toneLabel(tone)}`;
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

function toneLabel(tone) {
  const labels = { warm: '暖调', cool: '冷调', pastel: '柔彩', earth: '大地' };
  return labels[tone] || '柔彩';
}

function resetUpload() {
  currentImageData = null;
  currentPalette = [];
  previewPanel.hidden = true;
  uploadZone.style.display = '';
  fileInput.value = '';
}

// ===== 发布作品 =====
function publishWork(e) {
  e.preventDefault();
  if (!currentImageData || !currentPalette.length) return;

  const title = workTitle.value.trim() || '未命名色彩';
  const desc = workDesc.value.trim() || '一抹来自生活的莫奈配色';
  const tone = classifyTone(currentPalette);

  const work = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    desc,
    image: currentImageData,
    palette: currentPalette,
    tone,
    mood: getMoodText(tone),
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
function renderGallery() {
  const filtered = currentTone === 'all'
    ? works
    : works.filter(w => w.tone === currentTone);

  gallery.querySelectorAll('.gallery-card').forEach(el => el.remove());

  if (filtered.length === 0) {
    galleryEmpty.style.display = '';
    galleryEmpty.querySelector('p').textContent =
      currentTone === 'all' ? '画廊尚空，等待第一抹色彩' : '该色调下暂无作品';
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
  document.getElementById('modalMood').textContent = `「${work.mood}」· ${toneLabel(work.tone)}`;
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

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    currentTone = tab.dataset.filter;
    renderGallery();
  });
});

modalClose.addEventListener('click', () => workModal.close());
workModal.addEventListener('click', (e) => {
  if (e.target === workModal) workModal.close();
});

// ===== 初始化 =====
renderGallery();
