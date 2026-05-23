// script.js — Firebase-powered admin and site bindings (vanilla JS)
// Comments included for beginner-friendly guidance.

import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  db,
  storage,
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  getDoc,
  query,
  orderBy,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  deleteObject,
  deleteDoc
} from "./firebase.js";

// Simple selector helper
const $ = sel => document.querySelector(sel);

// Admin elements
const adminToggle = $('#admin_toggle');
const adminPanel = $('#admin_panel');
const adminNav = $('#admin_nav');
const navLogout = $('#nav_logout');

// Inputs / buttons
const adminLoginBtn = $('#admin_login_btn');
const adminPassInput = $('#admin_pass');
const adminCloseBtn = $('#admin_close_btn');

const photoInput = $('#photo_input');
const photoThumbs = $('#photo_thumbs');
const photoClear = $('#photo_clear');

const locationPhotoInput = $('#location_photo_input');
const locationPhotoThumbs = $('#location_photo_thumbs');
const locationPhotoClear = $('#location_photo_clear');

const saveContentBtn = $('#save_content');
const saveContactBtn = $('#save_contact');
const addOccasionBtn = $('#add_occasion');

// Site containers to populate
const galleryGrid = $('#gallery_grid');
const locationPictures = $('#location_pictures');
const occasionsList = $('#occasions_list');

// Toggle admin panel (keeps UI same)
adminToggle.addEventListener('click', () => {
  adminPanel.style.display = adminPanel.style.display === 'block' ? 'none' : 'block';
});

adminCloseBtn.addEventListener('click', () => { adminPanel.style.display = 'none'; });

// Admin navigation (tabs)
adminNav.addEventListener('click', (e) => {
  if (!e.target.dataset || !e.target.dataset.tab) return;
  const tab = e.target.dataset.tab;
  document.querySelectorAll('.admin-subsection').forEach(s => s.style.display = 'none');
  document.querySelectorAll('#admin_nav button').forEach(b => b.style.opacity = '1');
  document.getElementById('admin_' + tab).style.display = 'block';
});

// ---- Authentication ----
// The UI has only a password input — to keep the UI unchanged we ask for email via prompt.
// Instruction for admin: create an admin user in Firebase Console, then use that email here.
adminLoginBtn.addEventListener('click', async () => {
  const email = window.prompt('Enter admin email (your Firebase admin user)');
  const password = adminPassInput.value.trim();
  if (!email || !password) { alert('Provide email and password'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    adminPassInput.value = '';
    alert('Logged in');
  } catch (err) {
    console.error('Login error', err);
    alert('Login failed: ' + err.message);
  }
});

navLogout.addEventListener('click', async () => {
  await signOut(auth);
  alert('Logged out');
});

// React to auth state changes to show/hide admin functions
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // show admin controls
    navLogout.style.display = 'inline-block';
    document.getElementById('nav_login').style.display = 'none';
    document.getElementById('nav_logout').style.display = 'inline-block';
    // load admin data
    await refreshAdminLists();
    await loadSiteContent();
    await loadContact();
  } else {
    // hide admin controls
    navLogout.style.display = 'none';
    document.getElementById('nav_login').style.display = 'inline-block';
    document.getElementById('nav_logout').style.display = 'none';
  }
});

// ---- Upload helpers ----
// Upload files to Storage, save metadata to Firestore collection with same name.
async function uploadFilesToCollection(files, collectionName) {
  if (!files || files.length === 0) return;
  for (const file of Array.from(files)) {
    try {
      const uid = (auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : 'public';
      const storagePath = `${collectionName}/${uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      // upload
      await new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTask.on('state_changed', null, reject, resolve);
      });
      // get URL
      const url = await getDownloadURL(storageRef);
      // save to Firestore
      await addDoc(collection(db, collectionName), {
        url,
        name: file.name,
        storagePath,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Upload error', err);
      alert('Error uploading ' + file.name + ': ' + err.message);
    }
  }
  // refresh admin lists and site views
  await refreshAdminLists();
  await renderGalleryOnSite();
}

photoInput.addEventListener('change', (e) => uploadFilesToCollection(e.target.files, 'gallery'));
locationPhotoInput.addEventListener('change', (e) => uploadFilesToCollection(e.target.files, 'location'));

// ---- Admin list rendering and delete ----
async function refreshAdminLists() {
  await renderAdminThumbs('gallery', photoThumbs);
  await renderAdminThumbs('location', locationPhotoThumbs);
  await renderOccasionsAdmin();
}

async function renderAdminThumbs(collectionName, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  try {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    const snaps = await getDocs(q);
    snaps.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement('div');
      div.className = 'thumb';
      div.innerHTML = `
        <img src="${data.url}" alt="${data.name}" loading="lazy">
        <div style="display:flex; gap:6px; margin-top:6px;">
          <button data-id="${docSnap.id}" data-path="${data.storagePath}" class="btn btn-delete">Delete</button>
        </div>
      `;
      containerEl.appendChild(div);
    });
    // attach delete handlers
    containerEl.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.id;
        const path = btn.dataset.path;
        if (!confirm('Delete this image?')) return;
        await deleteImageDocument(collectionName, id, path);
        await refreshAdminLists();
        await renderGalleryOnSite();
      });
    });
  } catch (err) {
    console.error('renderAdminThumbs error', err);
  }
}

async function deleteImageDocument(collectionName, docId, storagePath) {
  try {
    // delete storage object first
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    // log but continue to attempt to delete firestore doc
    console.warn('Storage delete error (maybe missing):', err.message);
  }
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (err) {
    console.error('Firestore delete error', err);
  }
}

photoClear.addEventListener('click', async () => {
  if (!confirm('Delete all gallery images?')) return;
  await clearCollection('gallery');
  await refreshAdminLists();
  await renderGalleryOnSite();
});

locationPhotoClear.addEventListener('click', async () => {
  if (!confirm('Delete all location images?')) return;
  await clearCollection('location');
  await refreshAdminLists();
  await renderGalleryOnSite();
});

async function clearCollection(collectionName) {
  try {
    const snaps = await getDocs(collection(db, collectionName));
    for (const docSnap of snaps.docs) {
      const data = docSnap.data();
      // try delete storage
      try { await deleteObject(ref(storage, data.storagePath)); } catch (e) { console.warn(e); }
      // delete doc
      try { await deleteDoc(doc(db, collectionName, docSnap.id)); } catch (e) { console.warn(e); }
    }
  } catch (err) {
    console.error('clearCollection error', err);
  }
}

// ---- Render site gallery and location pictures ----
async function renderGalleryOnSite() {
  // gallery grid (instagram section)
  if (galleryGrid) galleryGrid.innerHTML = '';
  if (locationPictures) locationPictures.innerHTML = '';
  try {
    const gQ = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const gallerySnaps = await getDocs(gQ);
    gallerySnaps.forEach(docSnap => {
      const data = docSnap.data();
      if (galleryGrid) {
        const a = document.createElement('a');
        a.href = data.url;
        a.target = '_blank';
        a.innerHTML = `<img src="${data.url}" loading="lazy">`;
        galleryGrid.appendChild(a);
      }
    });

    const lQ = query(collection(db, 'location'), orderBy('createdAt', 'desc'));
    const locSnaps = await getDocs(lQ);
    locSnaps.forEach(docSnap => {
      const data = docSnap.data();
      if (locationPictures) {
        const div = document.createElement('div');
        div.className = 'picture-item';
        div.innerHTML = `<img src="${data.url}" loading="lazy">`;
        locationPictures.appendChild(div);
      }
    });
  } catch (err) {
    console.error('renderGalleryOnSite error', err);
  }
}

// ---- Content (hero, services) ----
saveContentBtn.addEventListener('click', async () => {
  const payload = {
    hero_title: document.getElementById('edit_hero_title').value || document.getElementById('hero_title').innerHTML,
    hero_sub: document.getElementById('edit_hero_sub').value || document.getElementById('hero_sub').innerText,
    hero_text: document.getElementById('edit_hero_text').value || document.getElementById('hero_text').innerText,
    service1_title: document.getElementById('edit_service1_title').value || document.getElementById('service1_title').innerText,
    service1_desc: document.getElementById('edit_service1_desc').value || document.getElementById('service1_desc').innerText,
    service2_title: document.getElementById('edit_service2_title').value || document.getElementById('service2_title').innerText,
    service2_desc: document.getElementById('edit_service2_desc').value || document.getElementById('service2_desc').innerText,
    service3_title: document.getElementById('edit_service3_title').value || document.getElementById('service3_title').innerText,
    service3_desc: document.getElementById('edit_service3_desc').value || document.getElementById('service3_desc').innerText,
    service4_title: document.getElementById('edit_service4_title').value || document.getElementById('service4_title').innerText,
    service4_desc: document.getElementById('edit_service4_desc').value || document.getElementById('service4_desc').innerText,
    updatedAt: serverTimestamp()
  };
  try {
    // Save content to Firestore collection `content`, document `main`
    await setDoc(doc(db, 'content', 'main'), payload, { merge: true });
    alert('Content saved');
    await loadSiteContent();
  } catch (err) {
    console.error('saveContent error', err);
    alert('Error saving content: ' + err.message);
  }
});

async function loadSiteContent() {
  try {
    // Read content from Firestore collection `content`, document `main`
    const snap = await getDoc(doc(db, 'content', 'main'));
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.hero_title) document.getElementById('hero_title').innerHTML = data.hero_title;
    if (data.hero_sub) document.getElementById('hero_sub').innerText = data.hero_sub;
    if (data.hero_text) document.getElementById('hero_text').innerText = data.hero_text;
    if (data.service1_title) document.getElementById('service1_title').innerText = data.service1_title;
    if (data.service1_desc) document.getElementById('service1_desc').innerText = data.service1_desc;
    if (data.service2_title) document.getElementById('service2_title').innerText = data.service2_title;
    if (data.service2_desc) document.getElementById('service2_desc').innerText = data.service2_desc;
    if (data.service3_title) document.getElementById('service3_title').innerText = data.service3_title;
    if (data.service3_desc) document.getElementById('service3_desc').innerText = data.service3_desc;
    if (data.service4_title) document.getElementById('service4_title').innerText = data.service4_title;
    if (data.service4_desc) document.getElementById('service4_desc').innerText = data.service4_desc;
    // also populate admin inputs if present
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
  } catch (err) {
    console.error('loadSiteContent error', err);
  }
}

// ---- Contact ----
saveContactBtn.addEventListener('click', async () => {
  const payload = {
    phone: $('#edit_contact_phone').value || $('#contact_phone').innerText,
    address: $('#edit_contact_address').value || $('#contact_address').innerHTML,
    insta: $('#edit_contact_insta').value || ($('#contact_insta_text' && $('#contact_insta_text').innerText) || ''),
    stat1: $('#edit_stat1').value || $('#stat1').innerText,
    stat2: $('#edit_stat2').value || $('#stat2').innerText,
    stat3: $('#edit_stat3').value || $('#stat3').innerText,
    stat4: $('#edit_stat4').value || $('#stat4').innerText,
    updatedAt: serverTimestamp()
  };
  try {
    // Save contact and settings to Firestore collection `settings`, document `main`
    await setDoc(doc(db, 'settings', 'main'), payload, { merge: true });
    alert('Contact saved');
    await loadContact();
  } catch (err) {
    console.error('saveContact error', err);
    alert('Error saving contact: ' + err.message);
  }
});

async function loadContact() {
  try {
    // Read contact and settings from Firestore collection `settings`, document `main`
    const snap = await getDoc(doc(db, 'settings', 'main'));
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.phone) { $('#contact_phone').innerText = data.phone; $('#contact_phone').href = 'tel:' + data.phone.replace(/\s+/g, ''); }
    if (data.address) $('#contact_address').innerHTML = data.address;
    if (data.insta) { $('#contact_insta_text').innerText = data.insta; $('#contact_insta_link').href = data.insta.startsWith('http') ? data.insta : 'https://instagram.com/' + data.insta.replace(/^@/, ''); }
    if (data.stat1) $('#stat1').innerText = data.stat1;
    if (data.stat2) $('#stat2').innerText = data.stat2;
    if (data.stat3) $('#stat3').innerText = data.stat3;
    if (data.stat4) $('#stat4').innerText = data.stat4;
    // admin inputs
    if ($('#edit_contact_phone')) $('#edit_contact_phone').value = data.phone || '';
    if ($('#edit_contact_address')) $('#edit_contact_address').value = data.address || '';
    if ($('#edit_contact_insta')) $('#edit_contact_insta').value = data.insta || '';
    if ($('#edit_stat1')) $('#edit_stat1').value = data.stat1 || '';
    if ($('#edit_stat2')) $('#edit_stat2').value = data.stat2 || '';
    if ($('#edit_stat3')) $('#edit_stat3').value = data.stat3 || '';
    if ($('#edit_stat4')) $('#edit_stat4').value = data.stat4 || '';
  } catch (err) {
    console.error('loadContact error', err);
  }
}

// ---- Occasions ----
addOccasionBtn.addEventListener('click', async () => {
  const val = $('#new_occasion_input').value.trim();
  if (!val) return alert('Enter an occasion name');
  try {
    await addDoc(collection(db, 'occasions'), { name: val, createdAt: serverTimestamp() });
    $('#new_occasion_input').value = '';
    await renderOccasionsAdmin();
    await renderOccasionsOnSite();
  } catch (err) {
    console.error('addOccasion error', err);
  }
});

async function renderOccasionsAdmin() {
  const list = $('#occasions_admin_list');
  if (!list) return;
  list.innerHTML = '';
  try {
    const snaps = await getDocs(query(collection(db, 'occasions'), orderBy('createdAt', 'desc')));
    snaps.forEach(s => {
      const d = s.data();
      const div = document.createElement('div');
      div.innerHTML = `${d.name} <button data-id="${s.id}" class="btn btn-delete">Delete</button>`;
      list.appendChild(div);
    });
    list.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete occasion?')) return;
      await deleteDoc(doc(db, 'occasions', b.dataset.id));
      await renderOccasionsAdmin();
      await renderOccasionsOnSite();
    }));
  } catch (err) { console.error('renderOccasionsAdmin', err); }
}

async function renderOccasionsOnSite() {
  if (!occasionsList) return;
  occasionsList.innerHTML = '';
  try {
    const snaps = await getDocs(query(collection(db, 'occasions'), orderBy('createdAt', 'desc')));
    snaps.forEach(s => {
      const d = s.data();
      const card = document.createElement('div');
      card.className = 'occasion-card';
      card.innerHTML = `<h4>${d.name}</h4>`;
      occasionsList.appendChild(card);
    });
  } catch (err) { console.error('renderOccasionsOnSite', err); }
}

// ---- Initialize on load ----
document.addEventListener('DOMContentLoaded', async () => {
  // initial data population for public site
  await renderGalleryOnSite();
  await renderOccasionsOnSite();
  await loadSiteContent();
  await loadContact();
  // ensure admin lists are loaded if already signed in
  if (auth.currentUser) await refreshAdminLists();
});

// Export nothing — this file runs the integration in the browser when imported as a module.
