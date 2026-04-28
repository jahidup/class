const API_BASE = '/api';
let currentView = 'courses'; // 'courses', 'batches', 'lectures'
let selectedCourseId = null;
let selectedBatchId = null;

const app = document.getElementById('app');

// ---------- Helpers ----------
async function fetchData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

function renderLoading() {
  app.innerHTML = '<div class="loading">Loading...</div>';
}

function renderError(msg) {
  app.innerHTML = `<div class="error">${msg}</div>`;
}

// ---------- Home (Courses) ----------
async function showCourses() {
  currentView = 'courses';
  renderLoading();
  try {
    const courses = await fetchData(`${API_BASE}/courses`);
    if (!courses.length) {
      app.innerHTML = '<div class="empty">No courses available yet.</div>';
      return;
    }
    let html = '<h1>📚 Available Courses</h1><div class="grid">';
    courses.forEach(course => {
      html += `
        <div class="card" data-course-id="${course._id}" onclick="openCourse('${course._id}')">
          <img src="${course.thumbnail || 'https://via.placeholder.com/400x200?text=Course'}" alt="${course.title}">
          <div class="card-body">
            <div class="card-title">${course.title}</div>
            <div class="card-text">${course.description || ''}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    app.innerHTML = html;
  } catch (err) {
    renderError('Failed to load courses.');
  }
}

// ---------- Batches of a Course ----------
async function openCourse(courseId) {
  selectedCourseId = courseId;
  currentView = 'batches';
  renderLoading();
  try {
    const data = await fetchData(`${API_BASE}/courses/${courseId}`);
    if (!data.batches.length) {
      app.innerHTML = '<button class="btn back-btn" onclick="showCourses()">← Back</button><div class="empty">No batches available.</div>';
      return;
    }
    let html = `<button class="btn back-btn" onclick="showCourses()">← Back to Courses</button>`;
    html += `<h1>${data.course.title} – Batches</h1><div class="grid">`;
    data.batches.forEach(batch => {
      html += `
        <div class="card" onclick="openBatch('${batch._id}')">
          <img src="${batch.thumbnail || 'https://via.placeholder.com/400x200?text=Batch'}" alt="${batch.title}">
          <div class="card-body">
            <div class="card-title">${batch.title}</div>
            <div class="card-text">${batch.description || ''}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    app.innerHTML = html;
  } catch (err) {
    renderError('Failed to load batches.');
  }
}

// ---------- Lectures of a Batch ----------
async function openBatch(batchId) {
  selectedBatchId = batchId;
  currentView = 'lectures';
  renderLoading();
  try {
    const data = await fetchData(`${API_BASE}/batches/${batchId}`);
    if (!data.lectures.length) {
      app.innerHTML = '<button class="btn back-btn" onclick="openCourse(\'' + selectedCourseId + '\')">← Back to Batches</button><div class="empty">No lectures yet.</div>';
      return;
    }
    let html = `<button class="btn back-btn" onclick="openCourse('${selectedCourseId}')">← Back to Batches</button>`;
    html += `<h1>${data.batch.title} – Lectures</h1><div class="grid">`;
    data.lectures.forEach(lec => {
      html += `
        <div class="card">
          <img src="${lec.thumbnail || 'https://via.placeholder.com/400x200?text=Lecture'}" alt="${lec.title}">
          <div class="card-body">
            <div class="card-title">${lec.title}</div>
            <div style="margin-top:10px;">
              <a href="${lec.videoUrl}" target="_blank" class="btn">▶️ Watch Video</a>
              <a href="${lec.notesUrl || '#'}" target="_blank" class="btn ${!lec.notesUrl ? 'disabled' : ''}">📝 Notes</a>
              <a href="${lec.dppUrl || '#'}" target="_blank" class="btn ${!lec.dppUrl ? 'disabled' : ''}">📄 DPP</a>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    app.innerHTML = html;
  } catch (err) {
    renderError('Failed to load lectures.');
  }
}

// Initial load
showCourses();
