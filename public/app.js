// Simple SPA Router
const API = '/api';
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
const token = () => localStorage.getItem('token');

const appEl = document.getElementById('app');

// Helper to fetch with auth
async function api(url, options = {}) {
  const headers = { ...options.headers };
  if (token()) headers['Authorization'] = `Bearer ${token()}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// Router based on hash
function router() {
  const hash = location.hash.slice(1) || 'home';
  renderLoading();
  switch (true) {
    case hash === 'home': renderHome(); break;
    case hash === 'login': renderLogin(); break;
    case hash === 'register': renderRegister(); break;
    case hash === 'verify': renderVerify(); break;
    case hash === 'forgot': renderForgot(); break;
    case hash.startsWith('reset'): renderReset(); break;
    case hash === 'dashboard': renderDashboard(); break;
    case hash.startsWith('batch/'): renderBatch(); break;
    case hash.startsWith('subject/'): renderSubject(); break;
    default: renderNotFound();
  }
}
window.addEventListener('hashchange', router);
window.addEventListener('load', router);

function renderLoading() { appEl.innerHTML = '<div class="glass" style="text-align:center; padding:40px;">Loading...</div>'; }

// Auth helper
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  location.hash = 'home';
}

// ----- Home View -----
async function renderHome() {
  try {
    const courses = await api('/api/courses');
    let html = `<div class="nav glass"><h1 style="color:white;">PW Pro</h1><div class="nav-links">`;
    if (currentUser) {
      html += `<a href="#dashboard">Dashboard</a><a onclick="logout()" style="cursor:pointer;">Logout</a>`;
    } else {
      html += `<a href="#login">Login</a><a href="#register">Register</a>`;
    }
    html += `</div></div><h2 style="color:white; margin:20px 0;">Popular Courses</h2><div class="grid">`;
    courses.forEach(c => {
      html += `<div class="card glass animate-in" onclick="location.href='#batch/${c._id}'">
        <img src="${c.thumbnail || 'https://via.placeholder.com/400x200?text=Course'}" alt="${c.title}">
        <div class="card-title">${c.title}</div>
        <div class="card-text">${c.description || ''}</div>
      </div>`;
    });
    html += `</div>`;
    appEl.innerHTML = html;
  } catch (e) { appEl.innerHTML = '<div class="glass">Failed to load courses.</div>'; }
}

// ----- Batch Listing (inside a course) -----
async function renderBatch() {
  const courseId = location.hash.split('/')[1];
  try {
    const batches = await api(`/api/courses/${courseId}/batches`);
    let html = `<button class="btn btn-outline" onclick="location.href='#home'">← Back</button>
      <h2 style="color:white;">Batches</h2><div class="grid">`;
    batches.forEach(b => {
      html += `<div class="card glass animate-in" onclick="location.href='#subject/${b._id}'">
        <img src="${b.thumbnail || 'https://via.placeholder.com/400x200?text=Batch'}" alt="${b.title}">
        <div class="card-title">${b.title}</div>
        <button class="btn btn-accent" style="margin-top:10px;" onclick="event.stopPropagation(); addToCollection('${b._id}')">+ Study</button>
      </div>`;
    });
    html += `</div>`;
    appEl.innerHTML = html;
  } catch (e) { appEl.innerHTML = '<div class="glass">Error loading batches.</div>'; }
}

// ----- Subject Listing (inside a batch) -----
async function renderSubject() {
  const batchId = location.hash.split('/')[1];
  try {
    const subjects = await api(`/api/batches/${batchId}/subjects`);
    let html = `<button class="btn btn-outline" onclick="history.back()">← Back</button>
      <h2 style="color:white;">Subjects</h2><div class="grid">`;
    subjects.forEach(s => {
      html += `<div class="card glass animate-in" onclick="location.href='#chapter/${s._id}'">
        <img src="${s.thumbnail || 'https://via.placeholder.com/400x200?text=Subject'}" alt="${s.title}">
        <div class="card-title">${s.title}</div>
      </div>`;
    });
    html += `</div>`;
    appEl.innerHTML = html;
  } catch (e) { appEl.innerHTML = '<div class="glass">Error loading subjects.</div>'; }
}

// ----- Chapter Listing (inside a subject) -----
async function renderChapter() {
  const subjectId = location.hash.split('/')[1];
  try {
    const chapters = await api(`/api/subjects/${subjectId}/chapters`);
    let html = `<button class="btn btn-outline" onclick="history.back()">← Back</button>
      <h2 style="color:white;">Chapters</h2><div class="grid">`;
    chapters.forEach(c => {
      html += `<div class="card glass animate-in" onclick="location.href='#lecture/${c._id}'">
        <img src="${c.thumbnail || 'https://via.placeholder.com/400x200?text=Chapter'}" alt="${c.title}">
        <div class="card-title">${c.title}</div>
      </div>`;
    });
    html += `</div>`;
    appEl.innerHTML = html;
  } catch (e) { appEl.innerHTML = '<div class="glass">Error loading chapters.</div>'; }
}

// ----- Lecture View (inside a chapter) -----
async function renderLecture() {
  const chapterId = location.hash.split('/')[1];
  try {
    const lectures = await api(`/api/chapters/${chapterId}/lectures`);
    let html = `<button class="btn btn-outline" onclick="history.back()">← Back</button>
      <h2 style="color:white;">Lectures</h2><div class="grid">`;
    lectures.forEach(l => {
      html += `<div class="card glass animate-in">
        <img src="${l.thumbnail || 'https://via.placeholder.com/400x200?text=Lecture'}" alt="${l.title}">
        <div class="card-title">${l.title}</div>
        <div class="card-text">Order: ${l.order}</div>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <a href="${l.videoUrl}" target="_blank" class="btn btn-primary">▶ Watch</a>
          <a href="${l.notesUrl || '#'}" target="_blank" class="btn btn-outline">📝 Notes</a>
          <a href="${l.dppUrl || '#'}" target="_blank" class="btn btn-outline">📄 DPP</a>
        </div>
      </div>`;
    });
    html += `</div>`;
    appEl.innerHTML = html;
  } catch (e) { appEl.innerHTML = '<div class="glass">Error loading lectures.</div>'; }
}

// ----- Student Dashboard -----
async function renderDashboard() {
  if (!currentUser) return location.hash = 'login';
  try {
    const user = await api('/api/me');
    let html = `<div class="nav glass"><h1 style="color:white;">Student Dashboard</h1>
      <button class="btn btn-outline" onclick="logout()">Logout</button></div>
      <h2 style="color:white;">Your Study Collection</h2><div class="grid">`;
    if (user.collections && user.collections.length) {
      user.collections.forEach(b => {
        html += `<div class="card glass" onclick="location.href='#subject/${b._id}'">
          <img src="${b.thumbnail || 'https://via.placeholder.com/400x200?text=Batch'}" alt="${b.title}">
          <div class="card-title">${b.title}</div>
          <button class="btn btn-accent" onclick="event.stopPropagation(); removeFromCollection('${b._id}')">Remove</button>
        </div>`;
      });
    } else {
      html += '<p style="color:white;">No collections yet. Explore courses to add batches!</p>';
    }
    html += `</div><button class="btn btn-primary" onclick="location.href='#home'">Explore Courses</button>`;
    appEl.innerHTML = html;
  } catch (e) { logout(); }
}

// Collection helpers
async function addToCollection(batchId) {
  if (!currentUser) return alert('Please login first');
  await api(`/api/collection/${batchId}`, { method: 'POST' });
  alert('Added to Study');
}
async function removeFromCollection(batchId) {
  await api(`/api/collection/${batchId}`, { method: 'DELETE' });
  renderDashboard();
}

// ----- Auth Views (login, register, verify, forgot, reset) -----
// I'll include basic forms. For brevity, these are implemented with simple HTML strings.

function renderLogin() {
  appEl.innerHTML = `<div class="glass" style="max-width:400px; margin:40px auto;">
    <h2>Login</h2>
    <input id="loginEmail" placeholder="Email" style="width:100%; padding:10px; margin:10px 0; border-radius:8px; border:1px solid #ccc;">
    <input type="password" id="loginPassword" placeholder="Password" style="width:100%; padding:10px; margin:10px 0; border-radius:8px; border:1px solid #ccc;">
    <button class="btn btn-primary" onclick="loginUser()">Login</button>
    <p style="margin-top:10px;"><a href="#forgot">Forgot Password?</a> | <a href="#register">Register</a></p>
  </div>`;
}
async function loginUser() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const data = await api('/api/login', { method:'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type':'application/json' } });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    location.hash = 'dashboard';
  } catch (e) { alert(e.message); }
}

// Similar for register, verify, forgot, reset... (implemented similarly with fetch to respective endpoints)
// I'll include a concise version in final code.
