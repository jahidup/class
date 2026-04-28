let token = localStorage.getItem('adminToken') || '';
const BASE = '/api/admin';

function headers() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }; }

// Auto-check login
if (token) {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadCourses();
}

async function login() {
  const pwd = document.getElementById('adminPassword').value;
  const res = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd }) });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('adminToken', data.token);
    token = data.token;
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadCourses();
  } else {
    document.getElementById('loginMsg').textContent = data.message || 'Wrong password';
  }
}
function logout() { localStorage.removeItem('adminToken'); location.reload(); }

// Courses
async function loadCourses() {
  const res = await fetch(`${BASE}/courses`, { headers: headers() });
  const courses = await res.json();
  document.getElementById('courseList').innerHTML = courses.map(c => `
    <div class="list-item"><span>${c.title}</span><button class="btn btn-danger" onclick="deleteCourse('${c._id}')">🗑</button></div>
  `).join('');
  const select = document.getElementById('batchCourseSelect');
  select.innerHTML = '<option value="">-- Select Course --</option>' + courses.map(c => `<option value="${c._id}">${c.title}</option>`).join('');
  document.getElementById('lecBatchSelect').innerHTML = '<option value="">-- Select Batch --</option>';
}
async function addCourse() {
  const title = document.getElementById('courseTitle').value;
  if (!title) return alert('Title required');
  const thumbnail = document.getElementById('courseThumb').value;
  const description = document.getElementById('courseDesc').value;
  await fetch(`${BASE}/courses`, { method:'POST', headers:headers(), body: JSON.stringify({ title, thumbnail, description }) });
  loadCourses();
}
async function deleteCourse(id) {
  if (!confirm('Delete course and all content?')) return;
  await fetch(`${BASE}/courses/${id}`, { method:'DELETE', headers:headers() });
  loadCourses();
}

// Batches
async function loadBatches() {
  const courseId = document.getElementById('batchCourseSelect').value;
  if (!courseId) return;
  const res = await fetch(`${BASE}/batches/${courseId}`, { headers:headers() });
  const batches = await res.json();
  document.getElementById('batchList').innerHTML = batches.map(b => `
    <div class="list-item"><span>${b.title}</span><button class="btn btn-danger" onclick="deleteBatch('${b._id}')">🗑</button></div>
  `).join('');
  document.getElementById('lecBatchSelect').innerHTML = '<option value="">-- Select Batch --</option>' + batches.map(b => `<option value="${b._id}">${b.title}</option>`).join('');
  loadLectures();
}
async function addBatch() {
  const courseId = document.getElementById('batchCourseSelect').value;
  const title = document.getElementById('batchTitle').value;
  if (!courseId || !title) return alert('Select course and enter title');
  const thumbnail = document.getElementById('batchThumb').value;
  const description = document.getElementById('batchDesc').value;
  await fetch(`${BASE}/batches`, { method:'POST', headers:headers(), body: JSON.stringify({ courseId, title, thumbnail, description }) });
  loadBatches();
}
async function deleteBatch(id) {
  if (!confirm('Delete batch and its lectures?')) return;
  await fetch(`${BASE}/batches/${id}`, { method:'DELETE', headers:headers() });
  loadBatches();
}

// Lectures
async function loadLectures() {
  const batchId = document.getElementById('lecBatchSelect').value;
  if (!batchId) return;
  const res = await fetch(`${BASE}/lectures/${batchId}`, { headers:headers() });
  const lectures = await res.json();
  document.getElementById('lectureList').innerHTML = lectures.map(l => `
    <div class="list-item">
      <span>${l.title} (order: ${l.order})</span>
      <div>
        <button class="btn" onclick="editLecture('${l._id}')">✏️</button>
        <button class="btn btn-danger" onclick="deleteLecture('${l._id}')">🗑</button>
      </div>
    </div>
  `).join('');
}
async function addLecture() {
  const batchId = document.getElementById('lecBatchSelect').value;
  const title = document.getElementById('lecTitle').value;
  const videoUrl = document.getElementById('lecVideo').value;
  if (!batchId || !title || !videoUrl) return alert('batch, title, video required');
  const lec = {
    batchId, title,
    thumbnail: document.getElementById('lecThumb').value,
    videoUrl,
    notesUrl: document.getElementById('lecNotes').value,
    dppUrl: document.getElementById('lecDPP').value,
    order: parseInt(document.getElementById('lecOrder').value) || 0
  };
  await fetch(`${BASE}/lectures`, { method:'POST', headers:headers(), body: JSON.stringify(lec) });
  loadLectures();
}
async function deleteLecture(id) {
  if (!confirm('Delete lecture?')) return;
  await fetch(`${BASE}/lectures/${id}`, { method:'DELETE', headers:headers() });
  loadLectures();
}
// Edit Lecture
async function editLecture(id) {
  const batchId = document.getElementById('lecBatchSelect').value;
  const res = await fetch(`${BASE}/lectures/${batchId}`, { headers:headers() });
  const lectures = await res.json();
  const lec = lectures.find(l => l._id === id);
  if (!lec) return;
  document.getElementById('editId').value = lec._id;
  document.getElementById('editTitle').value = lec.title;
  document.getElementById('editThumb').value = lec.thumbnail || '';
  document.getElementById('editVideo').value = lec.videoUrl;
  document.getElementById('editNotes').value = lec.notesUrl || '';
  document.getElementById('editDPP').value = lec.dppUrl || '';
  document.getElementById('editOrder').value = lec.order;
  document.getElementById('editForm').classList.remove('hidden');
}
async function updateLecture() {
  const id = document.getElementById('editId').value;
  const data = {
    title: document.getElementById('editTitle').value,
    thumbnail: document.getElementById('editThumb').value,
    videoUrl: document.getElementById('editVideo').value,
    notesUrl: document.getElementById('editNotes').value,
    dppUrl: document.getElementById('editDPP').value,
    order: parseInt(document.getElementById('editOrder').value) || 0
  };
  await fetch(`${BASE}/lectures/${id}`, { method:'PUT', headers:headers(), body: JSON.stringify(data) });
  loadLectures();
  hideEdit();
}
function hideEdit() { document.getElementById('editForm').classList.add('hidden'); }
