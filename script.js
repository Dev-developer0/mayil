// script.js — Local admin panel + site bindings using localStorage

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const adminToggle = $('#admin_toggle');
const adminPanel = $('#admin_panel');
const adminNav = $('#admin_nav');
const navLogout = $('#nav_logout');

const adminLoginBtn = $('#admin_login_btn');
const adminPassInput = $('#admin_pass');
const adminCloseBtn = $('#admin_close_btn');
const adminPanelCloseBtn = $('#admin_panel_close_btn');

const photoInput = $('#photo_input');
const photoThumbs = $('#photo_thumbs');
const photoClear = $('#photo_clear');

const locationPhotoInput = $('#location_photo_input');
const locationPhotoThumbs = $('#location_photo_thumbs');
const locationPhotoClear = $('#location_photo_clear');

const heroPhotoInput = $('#hero_photo_input');
const heroPhotoThumbs = $('#hero_photo_thumbs');
const heroPhotoClear = $('#hero_photo_clear');

const featuredPhotoInput = $('#featured_photo_input');
const featuredPhotoThumbs = $('#featured_photo_thumbs');
const featuredPhotoClear = $('#featured_photo_clear');

const clientPhotoInput = $('#client_photo_input');
const clientPhotoThumbs = $('#client_photo_thumbs');
const clientPhotoClear = $('#client_photo_clear');

const saveContentBtn = $('#save_content');
const saveContactBtn = $('#save_contact');
const addOccasionBtn = $('#add_occasion');
const saveAboutBtn = $('#save_about');

const galleryGrid = $('#gallery_grid');
const locationPictures = $('#location_pictures');
const occasionsList = $('#occasions_list');

const ADMIN_PASSWORD = 'mayil2024';
const LS_KEYS = {
  content: 'mayil_content',
  contact: 'mayil_contact',
  occasions: 'mayil_occasions',
  gallery: 'mayil_gallery',
  location: 'mayil_location',
  hero: 'mayil_hero_slides',
  featured: 'mayil_featured_images',
  clients: 'mayil_client_images',
  about: 'mayil_about'
};

let adminLoggedIn = false;

function getLocal(key, defaultValue = null) {
  const value = localStorage.getItem(key);
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn('Could not parse localStorage item', key, err);
    return defaultValue;
  }
}

function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showTab(tab) {
  document.querySelectorAll('.admin-subsection').forEach((section) => {
    section.style.display = section.id === 'admin_' + tab ? 'block' : 'none';
  });
  $$('#admin_nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
}

function openAdmin() {
  adminPanel.style.display = 'flex';
  if (!adminLoggedIn) showTab('login');
}

function closeAdmin() {
  adminPanel.style.display = 'none';
}

function requireLogin() {
  if (!adminLoggedIn) {
    alert('Please login first using password: mayil2024');
    showTab('login');
    return false;
  }
  return true;
}

adminToggle.addEventListener('click', openAdmin);
adminCloseBtn.addEventListener('click', closeAdmin);
adminPanelCloseBtn?.addEventListener('click', closeAdmin);
adminNav.addEventListener('click', (e) => {
  if (!e.target.dataset?.tab) return;
  const tab = e.target.dataset.tab;
  if (tab !== 'login' && !requireLogin()) return;
  showTab(tab);
});

adminLoginBtn.addEventListener('click', () => {
  const password = adminPassInput.value.trim();
  if (password === ADMIN_PASSWORD) {
    adminLoggedIn = true;
    adminPassInput.value = '';
    navLogout.style.display = 'inline-block';
    document.getElementById('nav_login').style.display = 'none';
    showTab('photos');
    refreshAdminLists();
    loadSiteContent();
    loadContact();
    loadAbout();
    renderOccasionsOnSite();
    alert('Admin unlocked');
  } else {
    alert('Invalid password. Use mayil2024');
  }
});

navLogout.addEventListener('click', () => {
  adminLoggedIn = false;
  navLogout.style.display = 'none';
  document.getElementById('nav_login').style.display = 'inline-block';
  showTab('login');
  alert('Logged out');
});

async function uploadFilesToCollection(files, collectionName) {
  if (!requireLogin()) return;
  if (!files || files.length === 0) return;
  const stored = getLocal(LS_KEYS[collectionName], []);
  for (const file of Array.from(files)) {
    try {
      const url = await readFileAsDataURL(file);
      stored.unshift({
        id: generateId(),
        url,
        name: file.name,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error('File read error', err);
      alert('Unable to read ' + file.name);
    }
  }
  setLocal(LS_KEYS[collectionName], stored);
  refreshAdminLists();
  renderGalleryOnSite();
}

photoInput.addEventListener('change', (event) => uploadFilesToCollection(event.target.files, 'gallery'));
locationPhotoInput.addEventListener('change', (event) => uploadFilesToCollection(event.target.files, 'location'));
heroPhotoInput.addEventListener('change', (event) => uploadFilesToCollection(event.target.files, 'hero'));
featuredPhotoInput.addEventListener('change', (event) => uploadFilesToCollection(event.target.files, 'featured'));
clientPhotoInput.addEventListener('change', (event) => uploadFilesToCollection(event.target.files, 'clients'));

heroPhotoClear.addEventListener('click', () => {
  if (!confirm('Delete all slideshow images?')) return;
  setLocal(LS_KEYS.hero, []);
  refreshAdminLists();
  renderHeroSlides();
});

featuredPhotoClear.addEventListener('click', () => {
  if (!confirm('Delete all featured images?')) return;
  setLocal(LS_KEYS.featured, []);
  refreshAdminLists();
  renderFeaturedCollection();
});

clientPhotoClear.addEventListener('click', () => {
  if (!confirm('Delete all client images?')) return;
  setLocal(LS_KEYS.clients, []);
  refreshAdminLists();
  renderClientTransformations();
});

function refreshAdminLists() {
  renderAdminThumbs('gallery', photoThumbs);
  renderAdminThumbs('location', locationPhotoThumbs);
  renderAdminThumbs('hero', heroPhotoThumbs);
  renderAdminThumbs('featured', featuredPhotoThumbs);
  renderAdminThumbs('clients', clientPhotoThumbs);
  renderOccasionsAdmin();
  renderHeroSlides();
  renderFeaturedCollection();
  renderClientTransformations();
}

function renderAdminThumbs(collectionName, containerEl) {
  if (!containerEl) return;
  const items = getLocal(LS_KEYS[collectionName], []);
  containerEl.innerHTML = '';
  items.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerHTML = `
      <img src="${item.url}" alt="${item.name}" loading="lazy">
      <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">
        <button data-id="${item.id}" data-collection="${collectionName}" class="btn btn-replace">Replace</button>
        <button data-id="${item.id}" data-collection="${collectionName}" class="btn btn-delete">Delete</button>
      </div>
    `;
    containerEl.appendChild(div);
  });

  containerEl.querySelectorAll('.btn-replace').forEach((button) => {
    button.addEventListener('click', () => {
      const collection = button.dataset.collection;
      const id = button.dataset.id;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        await replaceImageItem(collection, id, file);
        refreshAdminLists();
        renderGalleryOnSite();
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    });
  });

  containerEl.querySelectorAll('.btn-delete').forEach((button) => {
    button.addEventListener('click', () => {
      const collection = button.dataset.collection;
      const id = button.dataset.id;
      if (!confirm('Delete this photo?')) return;
      deleteImageItem(collection, id);
      renderAdminThumbs(collection, containerEl);
      renderGalleryOnSite();
    });
  });
}

function deleteImageItem(collectionName, itemId) {
  const items = getLocal(LS_KEYS[collectionName], []);
  const updated = items.filter((item) => item.id !== itemId);
  setLocal(LS_KEYS[collectionName], updated);
}

async function replaceImageItem(collectionName, itemId, file) {
  const items = getLocal(LS_KEYS[collectionName], []);
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) return;
  try {
    const url = await readFileAsDataURL(file);
    items[index].url = url;
    items[index].name = file.name;
    items[index].createdAt = Date.now();
    setLocal(LS_KEYS[collectionName], items);
    alert('Image replaced successfully');
  } catch (err) {
    console.error('Replace image error', err);
    alert('Could not replace image');
  }
}

photoClear.addEventListener('click', () => {
  if (!confirm('Delete all gallery images?')) return;
  setLocal(LS_KEYS.gallery, []);
  refreshAdminLists();
  renderGalleryOnSite();
});

locationPhotoClear.addEventListener('click', () => {
  if (!confirm('Delete all location images?')) return;
  setLocal(LS_KEYS.location, []);
  refreshAdminLists();
  renderGalleryOnSite();
});

function renderGalleryOnSite() {
  if (galleryGrid) galleryGrid.innerHTML = '';
  if (locationPictures) locationPictures.innerHTML = '';

  const galleryItems = getLocal(LS_KEYS.gallery, []);
  galleryItems.forEach((item) => {
    if (galleryGrid) {
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.innerHTML = `<img src="${item.url}" loading="lazy" alt="${item.name}">`;
      galleryGrid.appendChild(a);
    }
  });

  const locationItems = getLocal(LS_KEYS.location, []);
  locationItems.forEach((item) => {
    if (locationPictures) {
      const div = document.createElement('div');
      div.className = 'picture-item';
      div.innerHTML = `<img src="${item.url}" loading="lazy" alt="${item.name}">`;
      locationPictures.appendChild(div);
    }
  });
  renderHeroSlides();
  renderFeaturedCollection();
}

function renderHeroSlides() {
  const slides = getLocal(LS_KEYS.hero, []);
  const slideContainer = document.querySelector('.hero-slides');
  const dotContainer = document.querySelector('.hero-dots');
  if (!slideContainer || !dotContainer) return;
  if (!slides.length) return;
  slideContainer.innerHTML = '';
  dotContainer.innerHTML = '';
  slides.forEach((item, index) => {
    const slide = document.createElement('div');
    slide.className = `hero-slide${index === 0 ? ' active' : ''}`;
    slide.style.backgroundImage = `url('${item.url}')`;
    slideContainer.appendChild(slide);

    const dot = document.createElement('span');
    dot.className = `hero-dot${index === 0 ? ' active' : ''}`;
    dot.dataset.index = index;
    dotContainer.appendChild(dot);
  });
}

function renderFeaturedCollection() {
  const featuredItems = getLocal(LS_KEYS.featured, []);
  const featuredImages = document.querySelectorAll('.collection-grid .collection-image img');
  if (!featuredImages.length || !featuredItems.length) return;
  featuredImages.forEach((img, index) => {
    if (featuredItems[index]) {
      img.src = featuredItems[index].url;
      img.alt = featuredItems[index].name || img.alt;
    }
  });
}

function renderClientTransformations() {
  const clientItems = getLocal(LS_KEYS.clients, []);
  if (!clientItems.length) return;
  const clientImages = document.querySelectorAll('.gallery-grid .gallery-item img');
  clientImages.forEach((img, index) => {
    if (clientItems[index]) {
      img.src = clientItems[index].url;
      img.alt = clientItems[index].name || img.alt;
    }
  });
}

saveContentBtn.addEventListener('click', () => {
  if (!requireLogin()) return;
  const payload = {
    hero_title: $('#edit_hero_title').value || $('#hero_title').innerHTML,
    hero_sub: $('#edit_hero_sub').value || $('#hero_sub').innerText,
    hero_text: $('#edit_hero_text').value || $('#hero_text').innerText,
    service1_title: $('#edit_service1_title').value || $('#service1_title').innerText,
    service1_desc: $('#edit_service1_desc').value || $('#service1_desc').innerText,
    service2_title: $('#edit_service2_title').value || $('#service2_title').innerText,
    service2_desc: $('#edit_service2_desc').value || $('#service2_desc').innerText,
    service3_title: $('#edit_service3_title').value || $('#service3_title').innerText,
    service3_desc: $('#edit_service3_desc').value || $('#service3_desc').innerText,
    service4_title: $('#edit_service4_title').value || $('#service4_title').innerText,
    service4_desc: $('#edit_service4_desc').value || $('#service4_desc').innerText
  };
  setLocal(LS_KEYS.content, payload);
  loadSiteContent();
  alert('Content saved locally');
});

function loadSiteContent() {
  const data = getLocal(LS_KEYS.content, {});
  if (!data) return;
  if (data.hero_title) $('#hero_title').innerHTML = data.hero_title;
  if (data.hero_sub) $('#hero_sub').innerText = data.hero_sub;
  if (data.hero_text) $('#hero_text').innerText = data.hero_text;
  if (data.service1_title) $('#service1_title').innerText = data.service1_title;
  if (data.service1_desc) $('#service1_desc').innerText = data.service1_desc;
  if (data.service2_title) $('#service2_title').innerText = data.service2_title;
  if (data.service2_desc) $('#service2_desc').innerText = data.service2_desc;
  if (data.service3_title) $('#service3_title').innerText = data.service3_title;
  if (data.service3_desc) $('#service3_desc').innerText = data.service3_desc;
  if (data.service4_title) $('#service4_title').innerText = data.service4_title;
  if (data.service4_desc) $('#service4_desc').innerText = data.service4_desc;

  if ($('#edit_hero_title')) $('#edit_hero_title').value = data.hero_title || '';
  if ($('#edit_hero_sub')) $('#edit_hero_sub').value = data.hero_sub || '';
  if ($('#edit_hero_text')) $('#edit_hero_text').value = data.hero_text || '';
  if ($('#edit_service1_title')) $('#edit_service1_title').value = data.service1_title || '';
  if ($('#edit_service1_desc')) $('#edit_service1_desc').value = data.service1_desc || '';
  if ($('#edit_service2_title')) $('#edit_service2_title').value = data.service2_title || '';
  if ($('#edit_service2_desc')) $('#edit_service2_desc').value = data.service2_desc || '';
  if ($('#edit_service3_title')) $('#edit_service3_title').value = data.service3_title || '';
  if ($('#edit_service3_desc')) $('#edit_service3_desc').value = data.service3_desc || '';
  if ($('#edit_service4_title')) $('#edit_service4_title').value = data.service4_title || '';
  if ($('#edit_service4_desc')) $('#edit_service4_desc').value = data.service4_desc || '';
}

saveContactBtn.addEventListener('click', () => {
  if (!requireLogin()) return;
  const payload = {
    phone: $('#edit_contact_phone').value || $('#contact_phone').innerText,
    address: $('#edit_contact_address').value || $('#contact_address').innerHTML,
    insta: $('#edit_contact_insta').value || $('#contact_insta_text').innerText,
    stat1: $('#edit_stat1').value || $('#stat1').innerText,
    stat2: $('#edit_stat2').value || $('#stat2').innerText,
    stat3: $('#edit_stat3').value || $('#stat3').innerText,
    stat4: $('#edit_stat4').value || $('#stat4').innerText
  };
  setLocal(LS_KEYS.contact, payload);
  loadContact();
  alert('Contact settings saved locally');
});

function loadContact() {
  const data = getLocal(LS_KEYS.contact, {});
  if (!data) return;
  if (data.phone) {
    $('#contact_phone').innerText = data.phone;
    $('#contact_phone').href = 'tel:' + data.phone.replace(/\s+/g, '');
  }
  if (data.address) $('#contact_address').innerHTML = data.address;
  if (data.insta) {
    const instaText = data.insta;
    $('#contact_insta_text').innerText = instaText;
    $('#contact_insta_link').href = instaText.startsWith('http') ? instaText : `https://instagram.com/${instaText.replace(/^@/, '')}`;
  }
  if (data.stat1) $('#stat1').innerText = data.stat1;
  if (data.stat2) $('#stat2').innerText = data.stat2;
  if (data.stat3) $('#stat3').innerText = data.stat3;
  if (data.stat4) $('#stat4').innerText = data.stat4;

  if ($('#edit_contact_phone')) $('#edit_contact_phone').value = data.phone || '';
  if ($('#edit_contact_address')) $('#edit_contact_address').value = data.address || '';
  if ($('#edit_contact_insta')) $('#edit_contact_insta').value = data.insta || '';
  if ($('#edit_stat1')) $('#edit_stat1').value = data.stat1 || '';
  if ($('#edit_stat2')) $('#edit_stat2').value = data.stat2 || '';
  if ($('#edit_stat3')) $('#edit_stat3').value = data.stat3 || '';
  if ($('#edit_stat4')) $('#edit_stat4').value = data.stat4 || '';
}

addOccasionBtn.addEventListener('click', () => {
  if (!requireLogin()) return;
  const val = $('#new_occasion_input').value.trim();
  if (!val) return alert('Enter an occasion name');
  const occasions = getLocal(LS_KEYS.occasions, []);
  occasions.unshift({ id: generateId(), name: val });
  setLocal(LS_KEYS.occasions, occasions);
  $('#new_occasion_input').value = '';
  renderOccasionsAdmin();
  renderOccasionsOnSite();
});

function renderOccasionsAdmin() {
  const list = $('#occasions_admin_list');
  if (!list) return;
  const occasions = getLocal(LS_KEYS.occasions, []);
  list.innerHTML = '';
  occasions.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'occasion-item';
    div.innerHTML = `
      <span>${item.name}</span>
      <button data-id="${item.id}" class="btn btn-delete">Delete</button>
    `;
    list.appendChild(div);
  });
  list.querySelectorAll('.btn-delete').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      if (!confirm('Delete occasion?')) return;
      const filtered = getLocal(LS_KEYS.occasions, []).filter((item) => item.id !== id);
      setLocal(LS_KEYS.occasions, filtered);
      renderOccasionsAdmin();
      renderOccasionsOnSite();
    });
  });
}

function renderOccasionsOnSite() {
  if (!occasionsList) return;
  const occasions = getLocal(LS_KEYS.occasions, []);
  occasionsList.innerHTML = '';
  occasions.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'occasion-card';
    card.innerHTML = `<h4>${item.name}</h4>`;
    occasionsList.appendChild(card);
  });
}

saveAboutBtn.addEventListener('click', () => {
  if (!requireLogin()) return;
  const value = $('#edit_footer_copy').value.trim();
  setLocal(LS_KEYS.about, { footer_copy: value });
  loadAbout();
  alert('Footer saved locally');
});

function loadAbout() {
  const data = getLocal(LS_KEYS.about, {});
  if (!data) return;
  if (data.footer_copy) {
    const footerCopy = $('#footer_copy');
    if (footerCopy) footerCopy.innerText = data.footer_copy;
    if ($('#edit_footer_copy')) $('#edit_footer_copy').value = data.footer_copy;
  }
}

function sendWhatsApp() {
  const name = $('#fname').value.trim();
  const phone = $('#fphone').value.trim();
  const occasion = $('#foccasion').value || '';
  const message = $('#fmsg').value.trim();
  let text = 'Hi! I would like to book a trial at Mayil Designer Studio.';
  if (name) text = `Hi, my name is ${name}.`;
  if (occasion) text += ` Occasion: ${occasion}.`;
  if (phone) text += ` Phone: ${phone}.`;
  if (message) text += ` Message: ${message}`;
  const url = `https://wa.me/918074797081?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

window.sendWhatsApp = sendWhatsApp;

document.addEventListener('DOMContentLoaded', () => {
  renderGalleryOnSite();
  renderOccasionsOnSite();
  loadSiteContent();
  loadContact();
  loadAbout();
  showTab('login');
});
