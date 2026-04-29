let token = localStorage.getItem('adminToken') || '';
const BASE = '/api/admin';

// Auth headers
function headers() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

// ---------- Login / Logout ----------
function renderLogin() {
  document.getElementById('adminApp').innerHTML = `
    <div class="glass" style="max-width:400px; margin:60px auto; padding:30px;">
      <h2>🔐 Admin Login</h2>
      <input type="password" id="adminPass" placeholder="Enter admin password" style="width:100%; padding:12px; margin:12px 0; border-radius:10px; border:1px solid #ccc;">
      <button class="btn btn-primary" onclick="login()">Login</button>
      <p id="loginError" style="color:red; margin-top:10px;"></p>
    </div>
  `;
}

function login() {
  const pass = document.getElementById('adminPass').value;
  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pass })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        token = data.token;
        renderDashboard();
      } else {
        document.getElementById('loginError').textContent = 'Wrong password!';
      }
    });
}

function logout() {
  localStorage.removeItem('adminToken');
  token = '';
  location.reload();
}

// ---------- Dashboard UI ----------
async function renderDashboard() {
  document.getElementById('adminApp').innerHTML = `
    <div class="nav glass" style="display:flex; justify-content:space-between; padding:15px 25px;">
      <h1 style="color:white;">⚙️ Admin Panel</h1>
      <button class="btn btn-outline" onclick="logout()">Logout</button>
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap:20px; margin-top:20px;">
      <div id="coursesSection" class="glass"></div>
      <div id="batchesSection" class="glass"></div>
      <div id="subjectsSection" class="glass"></div>
      <div id="chaptersSection" class="glass"></div>
      <div id="lecturesSection" class="glass"></div>
    </div>
  `;

  loadAll();
}

// ---------- Load all data ----------
async function loadAll() {
  await loadCourses();
  await loadBatches();
  await loadSubjects();
  await loadChapters();
  await loadLectures();
}

// ---------- Courses ----------
async function loadCourses() {
  const container = document.getElementById('coursesSection');
  const courses = await fetch(`${BASE}/courses`, { headers: headers() }).then(res => res.json());
  let html = `<h3>📚 Courses</h3>
    <div style="max-height:200px; overflow-y:auto;">${courses.map(c => `<div class="list-item">${c.title} <button class="btn btn-sm btn-danger" onclick="deleteCourse('${c._id}')">×</button></div>`).join('')}</div>
    <input type="text" id="newCourseTitle" placeholder="Course title" style="width:100%; margin:5px 0; padding:8px;">
    <input type="text" id="newCourseDesc" placeholder="Description">
    <input type="text" id="newCourseThumb" placeholder="Thumbnail URL">
    <button class="btn btn-primary" onclick="addCourse()">+ Add Course</button>`;
  container.innerHTML = html;
}

async function addCourse() {
  const title = document.getElementById('newCourseTitle').value;
  if (!title) return alert('Title required');
  const desc = document.getElementById('newCourseDesc').value;
  const thumb = document.getElementById('newCourseThumb').value;
  await fetch(`${BASE}/courses`, { method: 'POST', headers: headers(), body: JSON.stringify({ title, description: desc, thumbnail: thumb }) });
  loadAll();
}

async function deleteCourse(id) {
  if (!confirm('Delete course and all its nested data?')) return;
  await fetch(`${BASE}/courses/${id}`, { method: 'DELETE', headers: headers() });
  loadAll();
}

// ---------- Batches ----------
let selectedCourseId = null;
async function loadBatches() {
  const container = document.getElementById('batchesSection');
  const courses = await fetch(`${BASE}/courses`, { headers: headers() }).then(r => r.json());
  const batches = selectedCourseId ? await fetch(`${BASE}/batches?courseId=${selectedCourseId}`, { headers: headers() }).then(r => r.json()) : [];
  let html = `<h3>📦 Batches</h3>
    <select id="batchCourseSelect" onchange="setCourse(this.value)" style="width:100%; padding:8px; margin:5px 0;">
      <option value="">-- Select course --</option>
      ${courses.map(c => `<option value="${c._id}" ${c._id===selectedCourseId?'selected':''}>${c.title}</option>`).join('')}
    </select>`;
  if (selectedCourseId) {
    html += `<div style="max-height:150px; overflow-y:auto;">${batches.map(b => `<div class="list-item">${b.title} <button class="btn btn-sm btn-danger" onclick="deleteBatch('${b._id}')">×</button></div>`).join('')}</div>
      <input type="text" id="newBatchTitle" placeholder="Batch title" style="width:100%; margin:5px 0; padding:8px;">
      <input type="text" id="newBatchDesc" placeholder="Description">
      <input type="text" id="newBatchThumb" placeholder="Thumbnail URL">
      <button class="btn btn-primary" onclick="addBatch()">+ Add Batch</button>`;
  }
  container.innerHTML = html;
}

function setCourse(courseId) {
  selectedCourseId = courseId;
  loadBatches();
  loadSubjects(); // refresh subjects list because subjects need batchId
  loadChapters();
  loadLectures();
}

async function addBatch() {
  if (!selectedCourseId) return alert('Select a course first');
  const title = document.getElementById('newBatchTitle').value;
  if (!title) return alert('Title required');
  const desc = document.getElementById('newBatchDesc').value;
  const thumb = document.getElementById('newBatchThumb').value;
  await fetch(`${BASE}/batches`, { method: 'POST', headers: headers(), body: JSON.stringify({ courseId: selectedCourseId, title, description: desc, thumbnail: thumb }) });
  loadAll();
}

async function deleteBatch(id) {
  if (!confirm('Delete batch and its nested data?')) return;
  await fetch(`${BASE}/batches/${id}`, { method: 'DELETE', headers: headers() });
  loadAll();
}

// ---------- Subjects ----------
let selectedBatchId = null;
async function loadSubjects() {
  const container = document.getElementById('subjectsSection');
  // Get all batches for dropdown (we need batches under selectedCourse)
  const batches = selectedCourseId ? await fetch(`${BASE}/batches?courseId=${selectedCourseId}`, { headers: headers() }).then(r => r.json()) : [];
  const subjects = selectedBatchId ? await fetch(`${BASE}/subjects?batchId=${selectedBatchId}`, { headers: headers() }).then(r => r.json()) : [];
  let html = `<h3>📖 Subjects</h3>
    <select id="subjectBatchSelect" onchange="setBatch(this.value)" style="width:100%; padding:8px; margin:5px 0;">
      <option value="">-- Select batch --</option>
      ${batches.map(b => `<option value="${b._id}" ${b._id===selectedBatchId?'selected':''}>${b.title}</option>`).join('')}
    </select>`;
  if (selectedBatchId) {
    html += `<div style="max-height:150px; overflow-y:auto;">${subjects.map(s => `<div class="list-item">${s.title} <button class="btn btn-sm btn-danger" onclick="deleteSubject('${s._id}')">×</button></div>`).join('')}</div>
      <input type="text" id="newSubjectTitle" placeholder="Subject title" style="width:100%; margin:5px 0; padding:8px;">
      <input type="text" id="newSubjectThumb" placeholder="Thumbnail URL">
      <button class="btn btn-primary" onclick="addSubject()">+ Add Subject</button>`;
  }
  container.innerHTML = html;
}

function setBatch(batchId) {
  selectedBatchId = batchId;
  loadSubjects();
  loadChapters();
  loadLectures();
}

async function addSubject() {
  if (!selectedBatchId) return alert('Select a batch first');
  const title = document.getElementById('newSubjectTitle').value;
  if (!title) return alert('Title required');
  const thumb = document.getElementById('newSubjectThumb').value;
  await fetch(`${BASE}/subjects`, { method: 'POST', headers: headers(), body: JSON.stringify({ batchId: selectedBatchId, title, thumbnail: thumb }) });
  loadAll();
}

async function deleteSubject(id) {
  if (!confirm('Delete subject and its chapters?')) return;
  await fetch(`${BASE}/subjects/${id}`, { method: 'DELETE', headers: headers() });
  loadAll();
}

// ---------- Chapters ----------
let selectedSubjectId = null;
async function loadChapters() {
  const container = document.getElementById('chaptersSection');
  // Get all subjects under selectedBatch
  const subjects = selectedBatchId ? await fetch(`${BASE}/subjects?batchId=${selectedBatchId}`, { headers: headers() }).then(r => r.json()) : [];
  const chapters = selectedSubjectId ? await fetch(`${BASE}/chapters?subjectId=${selectedSubjectId}`, { headers: headers() }).then(r => r.json()) : [];
  let html = `<h3>📘 Chapters</h3>
    <select id="chapterSubjectSelect" onchange="setSubject(this.value)" style="width:100%; padding:8px; margin:5px 0;">
      <option value="">-- Select subject --</option>
      ${subjects.map(s => `<option value="${s._id}" ${s._id===selectedSubjectId?'selected':''}>${s.title}</option>`).join('')}
    </select>`;
  if (selectedSubjectId) {
    html += `<div style="max-height:150px; overflow-y:auto;">${chapters.map(c => `<div class="list-item">${c.title} <button class="btn btn-sm btn-danger" onclick="deleteChapter('${c._id}')">×</button></div>`).join('')}</div>
      <input type="text" id="newChapterTitle" placeholder="Chapter title" style="width:100%; margin:5px 0; padding:8px;">
      <input type="text" id="newChapterThumb" placeholder="Thumbnail URL">
      <button class="btn btn-primary" onclick="addChapter()">+ Add Chapter</button>`;
  }
  container.innerHTML = html;
}

function setSubject(subjectId) {
  selectedSubjectId = subjectId;
  loadChapters();
  loadLectures();
}

async function addChapter() {
  if (!selectedSubjectId) return alert('Select a subject first');
  const title = document.getElementById('newChapterTitle').value;
  if (!title) return alert('Title required');
  const thumb = document.getElementById('newChapterThumb').value;
  await fetch(`${BASE}/chapters`, { method: 'POST', headers: headers(), body: JSON.stringify({ subjectId: selectedSubjectId, title, thumbnail: thumb }) });
  loadAll();
}

async function deleteChapter(id) {
  if (!confirm('Delete chapter and its lectures?')) return;
  await fetch(`${BASE}/chapters/${id}`, { method: 'DELETE', headers: headers() });
  loadAll();
}

// ---------- Lectures ----------
let selectedChapterId = null;
async function loadLectures() {
  const container = document.getElementById('lecturesSection');
  // Get all chapters under selectedSubject
  const chapters = selectedSubjectId ? await fetch(`${BASE}/chapters?subjectId=${selectedSubjectId}`, { headers: headers() }).then(r => r.json()) : [];
  const lectures = selectedChapterId ? await fetch(`${BASE}/lectures?chapterId=${selectedChapterId}`, { headers: headers() }).then(r => r.json()) : [];
  let html = `<h3>🎥 Lectures</h3>
    <select id="lectureChapterSelect" onchange="setChapter(this.value)" style="width:100%; padding:8px; margin:5px 0;">
      <option value="">-- Select chapter --</option>
      ${chapters.map(c => `<option value="${c._id}" ${c._id===selectedChapterId?'selected':''}>${c.title}</option>`).join('')}
    </select>`;
  if (selectedChapterId) {
    html += `<div style="max-height:150px; overflow-y:auto;">${lectures.map(l => `<div class="list-item">
      <span>${l.title} (order:${l.order})</span>
      <button class="btn btn-sm" onclick="editLecture('${l._id}')">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="deleteLecture('${l._id}')">×</button>
    </div>`).join('')}</div>
    <input type="text" id="newLecTitle" placeholder="Lecture title" style="width:100%; margin:5px 0; padding:8px;">
    <input type="text" id="newLecVideo" placeholder="Video URL *">
    <input type="text" id="newLecNotes" placeholder="Notes URL">
    <input type="text" id="newLecDPP" placeholder="DPP URL">
    <input type="number" id="newLecOrder" placeholder="Order number" value="0">
    <input type="text" id="newLecThumb" placeholder="Thumbnail URL">
    <button class="btn btn-primary" onclick="addLecture()">+ Add Lecture</button>
    <!— Edit form -->
    <div id="editForm" class="hidden" style="margin-top:10px; background:#fff3cd; padding:10px; border-radius:8px;">
      <h4>Edit Lecture</h4>
      <input type="hidden" id="editLecId">
      <input type="text" id="editTitle" placeholder="Title">
      <input type="text" id="editVideo" placeholder="Video URL">
      <input type="text" id="editNotes" placeholder="Notes URL">
      <input type="text" id="editDPP" placeholder="DPP URL">
      <input type="number" id="editOrder" placeholder="Order">
      <input type="text" id="editThumb" placeholder="Thumbnail URL">
      <button class="btn btn-primary" onclick="updateLecture()">Update</button>
      <button class="btn btn-outline" onclick="hideEdit()">Cancel</button>
    </div>`;
  }
  container.innerHTML = html;
}

function setChapter(chapterId) {
  selectedChapterId = chapterId;
  loadLectures();
}

async function addLecture() {
  if (!selectedChapterId) return alert('Select a chapter first');
  const title = document.getElementById('newLecTitle').value;
  const video = document.getElementById('newLecVideo').value;
  if (!title || !video) return alert('Title & video URL required');
  const notes = document.getElementById('newLecNotes').value;
  const dpp = document.getElementById('newLecDPP').value;
  const order = parseInt(document.getElementById('newLecOrder').value) || 0;
  const thumb = document.getElementById('newLecThumb').value;
  await fetch(`${BASE}/lectures`, { method: 'POST', headers: headers(), body: JSON.stringify({ chapterId: selectedChapterId, title, videoUrl: video, notesUrl: notes, dppUrl: dpp, order, thumbnail: thumb }) });
  loadAll();
}

async function deleteLecture(id) {
  if (!confirm('Delete lecture?')) return;
  await fetch(`${BASE}/lectures/${id}`, { method: 'DELETE', headers: headers() });
  loadAll();
}

// Edit lecture (pre-fill form)
async function editLecture(id) {
  const lectures = await fetch(`${BASE}/lectures?chapterId=${selectedChapterId}`, { headers: headers() }).then(r => r.json());
  const lec = lectures.find(l => l._id === id);
  if (!lec) return;
  document.getElementById('editLecId').value = lec._id;
  document.getElementById('editTitle').value = lec.title;
  document.getElementById('editVideo').value = lec.videoUrl;
  document.getElementById('editNotes').value = lec.notesUrl || '';
  document.getElementById('editDPP').value = lec.dppUrl || '';
  document.getElementById('editOrder').value = lec.order;
  document.getElementById('editThumb').value = lec.thumbnail || '';
  document.getElementById('editForm').classList.remove('hidden');
}

async function updateLecture() {
  const id = document.getElementById('editLecId').value;
  const data = {
    title: document.getElementById('editTitle').value,
    videoUrl: document.getElementById('editVideo').value,
    notesUrl: document.getElementById('editNotes').value,
    dppUrl: document.getElementById('editDPP').value,
    order: parseInt(document.getElementById('editOrder').value) || 0,
    thumbnail: document.getElementById('editThumb').value
  };
  await fetch(`${BASE}/lectures/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) });
  loadAll();
  hideEdit();
}

function hideEdit() {
  document.getElementById('editForm')?.classList.add('hidden');
}

// ---------- Init ----------
if (token) {
  renderDashboard();
} else {
  renderLogin();
}
