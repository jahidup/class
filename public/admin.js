let token = localStorage.getItem('adminToken') || '';
const BASE = '/api/admin';

function getHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

// ---------- Login ----------
function login() {
  const pwd = document.getElementById('adminPassword').value;
  fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        token = data.token;
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        loadCourses();
        loadBatchCourseOptions();
      } else {
        document.getElementById('loginMsg').textContent = data.message || 'Login failed';
      }
    });
}

function logout() {
  localStorage.removeItem('adminToken');
  token = '';
  location.reload();
}

// Auto‑check token
if (token) {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadCourses();
  loadBatchCourseOptions();
}

// ---------- Courses ----------
async function loadCourses() {
  const res = await fetch(`${BASE}/courses`, { headers: getHeaders() });
  const courses = await res.json();
  const list = document.getElementById('courseList');
  list.innerHTML = courses.map(c => `
    <div class="list-item">
      <span>${c.title}</span>
      <button class="btn btn-danger btn-sm" onclick="deleteCourse('${c._id}')">Delete</button>
    </div>
  `).join('');
  // update batch dropdown
  const select = document.getElementById('batchCourseSelect');
  select.innerHTML = '<option value="">-- Select Course --</option>' + courses.map(c => `<option value="${c._id}">${c.title}</option>`).join('');
}

async function addCourse() {
  const title = document.getElementById('newCourseTitle').value;
  const description = document.getElementById('newCourseDesc').value;
  const thumbnail = document.getElementById('newCourseThumb').value;
  if (!title) return alert('Title required');
  await fetch(`${BASE}/courses`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ title, description, thumbnail }) });
  loadCourses();
}

async function deleteCourse(id) {
  if (!confirm('Delete this course and all its data?')) return;
  await fetch(`${BASE}/courses/${id}`, { method: 'DELETE', headers: getHeaders() });
  loadCourses();
  loadBatches(); // refresh
}

// ---------- Batches ----------
function loadBatchCourseOptions() {
  fetch(`${BASE}/courses`, { headers: getHeaders() }).then(res => res.json()).then(courses => {
    const select = document.getElementById('batchCourseSelect');
    select.innerHTML = '<option value="">-- Select Course --</option>' + courses.map(c => `<option value="${c._id}">${c.title}</option>`).join('');
    const lecSelect = document.getElementById('lectureBatchSelect');
    lecSelect.innerHTML = '<option value="">-- Select Batch --</option>';
  });
}

async function loadBatches() {
  const courseId = document.getElementById('batchCourseSelect').value;
  if (!courseId) return;
  const res = await fetch(`${BASE}/batches/${courseId}`, { headers: getHeaders() });
  const batches = await res.json();
  const list = document.getElementById('batchList');
  list.innerHTML = batches.map(b => `
    <div class="list-item">
      <span>${b.title}</span>
      <button class="btn btn-danger btn-sm" onclick="deleteBatch('${b._id}')">Delete</button>
    </div>
  `).join('');
  // update lecture dropdown
  const lecSelect = document.getElementById('lectureBatchSelect');
  lecSelect.innerHTML = '<option value="">-- Select Batch --</option>' + batches.map(b => `<option value="${b._id}">${b.title}</option>`).join('');
  loadLectures(); // if any
}

async function addBatch() {
  const courseId = document.getElementById('batchCourseSelect').value;
  const title = document.getElementById('newBatchTitle').value;
  const thumbnail = document.getElementById('newBatchThumb').value;
  const description = document.getElementById('newBatchDesc').value;
  if (!courseId || !title) return alert('Please select a course and enter a title');
  await fetch(`${BASE}/batches`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ courseId, title, thumbnail, description }) });
  loadBatches();
}

async function deleteBatch(id) {
  if (!confirm('Delete this batch and its lectures?')) return;
  await fetch(`${BASE}/batches/${id}`, { method: 'DELETE', headers: getHeaders() });
  loadBatches();
}

// ---------- Lectures ----------
async function loadLectures() {
  const batchId = document.getElementById('lectureBatchSelect').value;
  if (!batchId) return;
  const res = await fetch(`${BASE}/lectures/${batchId}`, { headers: getHeaders() });
  const lectures = await res.json();
  const list = document.getElementById('lectureList');
  list.innerHTML = lectures.map(l => `
    <div class="list-item">
      <span>${l.title} (Order: ${l.order})</span>
      <div>
        <button class="btn btn-sm" onclick="editLecture('${l._id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteLecture('${l._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function addLecture() {
  const batchId = document.getElementById('lectureBatchSelect').value;
  const title = document.getElementById('newLecTitle').value;
  const thumbnail = document.getElementById('newLecThumb').value;
  const videoUrl = document.getElementById('newLecVideo').value;
  const notesUrl = document.getElementById('newLecNotes').value;
  const dppUrl = document.getElementById('newLecDPP').value;
  const order = parseInt(document.getElementById('newLecOrder').value) || 0;
  if (!batchId || !title || !videoUrl) return alert('batchId, title, videoUrl required');
  await fetch(`${BASE}/lectures`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ batchId, title, thumbnail, videoUrl, notesUrl, dppUrl, order }) });
  loadLectures();
}

async function deleteLecture(id) {
  if (!confirm('Delete this lecture?')) return;
  await fetch(`${BASE}/lectures/${id}`, { method: 'DELETE', headers: getHeaders() });
  loadLectures();
}

// Edit Lecture (pre-fill form)
async function editLecture(id) {
  // Fetch all lectures to find the one (not ideal, but works)
  const batchId = document.getElementById('lectureBatchSelect').value;
  const res = await fetch(`${BASE}/lectures/${batchId}`, { headers: getHeaders() });
  const lectures = await res.json();
  const lec = lectures.find(l => l._id === id);
  if (!lec) return;
  document.getElementById('editLecId').value = lec._id;
  document.getElementById('editLecTitle').value = lec.title;
  document.getElementById('editLecThumb').value = lec.thumbnail || '';
  document.getElementById('editLecVideo').value = lec.videoUrl;
  document.getElementById('editLecNotes').value = lec.notesUrl || '';
  document.getElementById('editLecDPP').value = lec.dppUrl || '';
  document.getElementById('editLecOrder').value = lec.order;
  document.getElementById('editForm').classList.remove('hidden');
}

async function updateLecture() {
  const id = document.getElementById('editLecId').value;
  const data = {
    title: document.getElementById('editLecTitle').value,
    thumbnail: document.getElementById('editLecThumb').value,
    videoUrl: document.getElementById('editLecVideo').value,
    notesUrl: document.getElementById('editLecNotes').value,
    dppUrl: document.getElementById('editLecDPP').value,
    order: parseInt(document.getElementById('editLecOrder').value) || 0
  };
  await fetch(`${BASE}/lectures/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
  loadLectures();
  hideEdit();
}

function hideEdit() {
  document.getElementById('editForm').classList.add('hidden');
}
