// script.js — Firebase-powered site renderer for Mayil Designer Studio
// Admin panel is now at admin.html — all content managed from there

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── FIREBASE CONFIG ──────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyChoHOzb3nbZ0BNcWr5X28ttHpXEexTLW0",
  authDomain: "mayil-studio.firebaseapp.com",
  projectId: "mayil-studio",
  storageBucket: "mayil-studio.firebasestorage.app",
  messagingSenderId: "929821476998",
  appId: "1:929821476998:web:b3a759759dfee5006ee907"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── HELPERS ──────────────────────────────────────────────
const $ = sel => document.querySelector(sel);

// ── NAV TOGGLE ───────────────────────────────────────────
const navToggleBtn = $('#nav_toggle');
const navMenu = document.querySelector('nav ul');

navToggleBtn?.addEventListener('click', () => {
  navMenu?.classList.toggle('open');
  navToggleBtn.classList.toggle('open');
});
navMenu?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    navToggleBtn?.classList.remove('open');
  });
});

// ── ADMIN BUTTON → redirect to admin.html ────────────────
$('#admin_toggle')?.addEventListener('click', () => {
  window.location.href = 'admin.html';
});

// ── HERO SLIDESHOW ────────────────────────────────────────
let currentSlide = 0;
let slideItems = [];
let slideTimer = null;

function renderHeroSlides(items) {
  const slideContainer = $('.hero-slides');
  const dotContainer = $('.hero-dots');
  if (!slideContainer || !dotContainer || !items.length) return;

  slideItems = items;
  currentSlide = 0;
  slideContainer.innerHTML = '';
  dotContainer.innerHTML = '';

  items.forEach((item, index) => {
    const slide = document.createElement('div');
    slide.className = `hero-slide${index === 0 ? ' active' : ''}`;
    slide.style.backgroundImage = `url('${item.url}')`;
    slideContainer.appendChild(slide);

    const dot = document.createElement('span');
    dot.className = `hero-dot${index === 0 ? ' active' : ''}`;
    dot.dataset.index = index;
    dot.addEventListener('click', () => { goToSlide(index); resetTimer(); });
    dotContainer.appendChild(dot);
  });

  resetTimer();
}

function goToSlide(index) {
  const slideEls = document.querySelectorAll('.hero-slide');
  const dotEls = document.querySelectorAll('.hero-dot');
  if (!slideEls.length) return;
  slideEls[currentSlide]?.classList.remove('active');
  dotEls[currentSlide]?.classList.remove('active');
  currentSlide = ((index % slideItems.length) + slideItems.length) % slideItems.length;
  slideEls[currentSlide]?.classList.add('active');
  dotEls[currentSlide]?.classList.add('active');
}

function resetTimer() {
  clearInterval(slideTimer);
  if (slideItems.length > 1) {
    slideTimer = setInterval(() => goToSlide(currentSlide + 1), 4500);
  }
}

$('.hero-next')?.addEventListener('click', () => { goToSlide(currentSlide + 1); resetTimer(); });
$('.hero-prev')?.addEventListener('click', () => { goToSlide(currentSlide - 1); resetTimer(); });

// ── DRESS GALLERY ─────────────────────────────────────────
function renderGallery(items) {
  const grid = $('#gallery_grid');
  if (!grid) return;
  
  // Store gallery photos for full collection modal
  allGalleryPhotos = items;
  
  grid.innerHTML = items.length === 0 ? '' : items.map(item => `
    <a href="${item.url}" target="_blank">
      <img src="${item.url}" loading="lazy" alt="${item.name || 'dress photo'}"
        style="opacity:0;transition:opacity 0.4s;"
        onload="this.style.opacity='1'">
    </a>`).join('');
}

// ── LOCATION PHOTOS ───────────────────────────────────────
function renderLocationPhotos(items) {
  const container = $('#location_pictures');
  if (!container) return;
  container.innerHTML = items.map(item => `
    <div class="picture-item">
      <img src="${item.url}" loading="lazy" alt="${item.name || 'studio photo'}"
        style="opacity:0;transition:opacity 0.4s;"
        onload="this.style.opacity='1'">
    </div>`).join('');
}

// ── FEATURED COLLECTION ───────────────────────────────────
function renderFeatured(items) {
  if (!items.length) return;
  const imgs = document.querySelectorAll('.collection-grid .collection-image img');
  imgs.forEach((img, i) => {
    if (items[i]) {
      img.onload = () => { img.style.opacity = '1'; };
      img.src = items[i].url;
      img.alt = items[i].name || img.alt;
      // In case image is cached and onload already fired
      if (img.complete) img.style.opacity = '1';
    }
  });
}

// ── CLIENT TRANSFORMATIONS ────────────────────────────────
function renderClients(items) {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;
  if (items.length === 0) {
    // Hide all demo images — don't show placeholder content
    grid.querySelectorAll('.gallery-item img').forEach(img => {
      img.style.opacity = '0';
    });
    return;
  }
  // Show real images
  const imgEls = grid.querySelectorAll('.gallery-item img');
  imgEls.forEach((img, i) => {
    if (items[i]) {
      img.style.opacity = '0';
      img.onload = () => { img.style.transition = 'opacity 0.4s'; img.style.opacity = '1'; };
      img.src = items[i].url;
      img.alt = items[i].name || img.alt;
    } else {
      img.style.opacity = '0'; // hide unused demo slots
    }
  });
}

// ── OCCASIONS ─────────────────────────────────────────────
function renderOccasions(items) {
  const list = $('#occasions_list');
  if (!list) return;
  list.innerHTML = items.map(item => `
    <div class="occasion-card">
      <h4>${item.icon || '✦'} ${item.name}</h4>
    </div>`).join('');
}

// ── TEXT CONTENT ──────────────────────────────────────────
function applyContent(data) {
  if (!data) return;
  const map = {
    heroTitle: '#hero_title',
    heroSub:   '#hero_sub',
    heroText:  '#hero_text'
  };
  Object.entries(map).forEach(([key, sel]) => {
    const el = $(sel);
    if (el && data[key]) el.innerHTML = data[key];
  });
}

// ── CONTACT & STATS ───────────────────────────────────────
function applyContact(data) {
  if (!data) return;

  if (data.phone) {
    const el = $('#contact_phone');
    if (el) { el.innerText = data.phone; el.href = 'tel:' + data.phone.replace(/\s+/g, ''); }
  }
  if (data.address) {
    const el = $('#contact_address');
    if (el) el.innerHTML = data.address;
  }
  if (data.insta) {
    const t = $('#contact_insta_text');
    const l = $('#contact_insta_link');
    if (t) t.innerText = data.insta;
    if (l) l.href = data.insta.startsWith('http')
      ? data.insta
      : `https://instagram.com/${data.insta.replace(/^@/, '')}`;
  }
  if (data.mapUrl) {
    const iframe = document.querySelector('.location-map iframe');
    if (iframe) iframe.src = data.mapUrl;
  }

  ['stat1','stat2','stat3','stat4'].forEach(key => {
    const el = $(`#${key}`);
    if (el && data[key]) el.innerText = data[key];
  });
}

// ── WHATSAPP FORM ─────────────────────────────────────────
function sendWhatsApp() {
  const name     = $('#fname')?.value.trim() || '';
  const phone    = $('#fphone')?.value.trim() || '';
  const occasion = $('#foccasion')?.value || '';
  const message  = $('#fmsg')?.value.trim() || '';

  let text = 'Hi! I would like to book a trial at Mayil Designer Studio.';
  if (name)     text = `Hi, my name is ${name}.`;
  if (occasion) text += ` Occasion: ${occasion}.`;
  if (phone)    text += ` Phone: ${phone}.`;
  if (message)  text += ` Message: ${message}`;

  window.open(`https://wa.me/918074797081?text=${encodeURIComponent(text)}`, '_blank');
}
window.sendWhatsApp = sendWhatsApp;

// ── LIGHTBOX ──────────────────────────────────────────────
const lightbox = $('#lightbox');
const lightboxImg = $('#lightbox_img');
const lightboxClose = $('#lightbox_close');

document.addEventListener('click', e => {
  const img = e.target.closest('#gallery_grid a img');
  if (img && lightbox) {
    e.preventDefault();
    lightboxImg.src = img.src;
    lightbox.style.display = 'flex';
    lightbox.setAttribute('aria-hidden', 'false');
  }
});
lightboxClose?.addEventListener('click', () => {
  if (lightbox) { lightbox.style.display = 'none'; lightbox.setAttribute('aria-hidden', 'true'); }
});
lightbox?.addEventListener('click', e => {
  if (e.target === lightbox) { lightbox.style.display = 'none'; lightbox.setAttribute('aria-hidden', 'true'); }
});

// ── COLLECTION CATEGORIES (DYNAMIC) ─────────────────────
const collectionPhotos = {};

function loadCollections() {
  const grid = document.getElementById('collectionGrid');
  if (!grid) return;

  onSnapshot(collection(db, 'categories'), snap => {
    const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));

    if (cats.length === 0) { grid.innerHTML = ''; return; }

    grid.innerHTML = cats.map(cat => `
      <div class="collection-item"
        data-catid="${cat.id}"
        data-title="${(cat.title||'').replace(/"/g,'&quot;')}"
        data-desc="${(cat.desc||'').replace(/"/g,'&quot;')}"
        style="cursor:pointer">
        <div class="collection-image" style="background:#1a0a1a;">
          <img src="${cat.coverUrl||''}" alt="${cat.title||''}" loading="lazy"
            style="width:100%;height:100%;object-fit:cover;${cat.coverUrl?'':'display:none'}">
          <div class="collection-overlay">
            <h3>${cat.title||''}</h3>
            <p>${cat.desc||''}</p>
            <span class="view-gallery-btn">View Gallery →</span>
          </div>
        </div>
      </div>`).join('');

    cats.forEach(cat => {
      onSnapshot(collection(db, 'collection_photos', cat.id, 'items'), photoSnap => {
        collectionPhotos[cat.id] = photoSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
      });
    });
  });

  // Event delegation — one listener handles all cards reliably
  grid.addEventListener('click', e => {
    const item = e.target.closest('.collection-item[data-catid]');
    if (!item) return;
    openCollectionModal(
      item.dataset.catid,
      item.dataset.title,
      item.dataset.desc
    );
  });
}

// Collection modal open/close
let currentModalPhotos = [];
let currentPhotoIndex = 0;

function openCollectionModal(catId, title, desc) {
  const modal = document.getElementById('collectionModal');
  if (!modal) { console.error('Modal not found'); return; }

  document.getElementById('modalTitle').textContent = title || '';
  document.getElementById('modalDesc').textContent  = desc  || '';

  const photos = collectionPhotos[catId] || [];
  currentModalPhotos = photos;

  const gallery = document.getElementById('modalGallery');
  gallery.innerHTML = photos.length === 0
    ? '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px;font-family:\'DM Sans\',sans-serif;">No photos in this category yet.</p>'
    : photos.map((p, i) => `<img src="${p.url}" alt="photo" loading="lazy" onclick="openPhotoViewer(${i})" style="cursor:pointer">`).join('');

  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

window.closeCollectionModal = function() {
  document.getElementById('collectionModal').style.display = 'none';
  document.body.style.overflow = '';
};

// Close modal on backdrop click
document.getElementById('collectionModal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('collectionModal')) window.closeCollectionModal();
});

// Photo viewer (full screen)
window.openPhotoViewer = function(index) {
  currentPhotoIndex = index;
  const viewer = document.getElementById('photoViewer');
  viewer.style.display = 'flex';
  updatePhotoViewer();
};

window.closePhotoViewer = function() {
  document.getElementById('photoViewer').style.display = 'none';
};

window.navigatePhoto = function(dir) {
  currentPhotoIndex = (currentPhotoIndex + dir + currentModalPhotos.length) % currentModalPhotos.length;
  updatePhotoViewer();
};

function updatePhotoViewer() {
  const photo = currentModalPhotos[currentPhotoIndex];
  if (!photo) return;
  document.getElementById('viewerImg').src = photo.url;
  document.getElementById('viewerCount').textContent =
    `${currentPhotoIndex + 1} / ${currentModalPhotos.length}`;
}

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (document.getElementById('photoViewer').style.display === 'flex') {
    if (e.key === 'ArrowRight') window.navigatePhoto(1);
    if (e.key === 'ArrowLeft')  window.navigatePhoto(-1);
    if (e.key === 'Escape') window.closePhotoViewer();
  } else if (document.getElementById('collectionModal').style.display === 'block') {
    if (e.key === 'Escape') window.closeCollectionModal();
  } else if (document.getElementById('fullCollectionModal').classList.contains('open')) {
    if (e.key === 'Escape') window.closeFullCollectionModal();
  }
});

// ── FULL COLLECTION MODAL ──────────────────────────────────
let allGalleryPhotos = [];

window.openFullCollectionModal = function() {
  const modal = document.getElementById('fullCollectionModal');
  if (!modal) return;
  
  const gallery = document.getElementById('fullGalleryGrid');
  if (!gallery) return;

  gallery.innerHTML = allGalleryPhotos.length === 0
    ? '<p style="grid-column:1/-1;text-align:center;color:#ccc;padding:60px;font-family:\'DM Sans\',sans-serif;font-size:1.1rem;">No images uploaded yet. Visit the admin panel to upload dress photos.</p>'
    : allGalleryPhotos.map((photo, i) => `<img src="${photo.url}" alt="dress photo" loading="lazy" onclick="openCollectionPhotoViewer(${i}, window.allGalleryPhotos, ${i})" style="cursor:pointer">`).join('');

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeFullCollectionModal = function() {
  const modal = document.getElementById('fullCollectionModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
};

// Photo viewer for full collection
window.openCollectionPhotoViewer = function(index, photos, fromSource) {
  currentModalPhotos = photos;
  currentPhotoIndex = index;
  const viewer = document.getElementById('photoViewer');
  viewer.style.display = 'flex';
  updatePhotoViewer();
};

// ── FIREBASE REALTIME LISTENERS ───────────────────────────
function sortByDate(docs) {
  return docs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
}

function listenImages(sectionKey, renderFn) {
  onSnapshot(
    collection(db, 'images', sectionKey, 'items'),
    snap => renderFn(sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.warn(`[Mayil] ${sectionKey} listener error:`, err)
  );
}

function initListeners() {
  listenImages('slideshow',       renderHeroSlides);
  listenImages('gallery',         renderGallery);
  listenImages('location-photos', renderLocationPhotos);
  listenImages('featured',        renderFeatured);
  listenImages('clients',         renderClients);

  loadCollections();

  onSnapshot(collection(db, 'occasions'), snap => {
    renderOccasions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  onSnapshot(doc(db, 'content', 'main'), d => {
    if (d.exists()) applyContent(d.data());
  });

  onSnapshot(doc(db, 'content', 'contact'), d => {
    if (d.exists()) applyContact(d.data());
  });
}

// ── START ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initListeners);
