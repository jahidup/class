const API = '/api';
const appEl = document.getElementById('app');

// Shared fetch helper
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

// Loading & Error states
function showLoading() {
  appEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}
function showError() {
  appEl.innerHTML = '<div class="empty-state"><p>⚠️ Failed to load data. Please try again.</p></div>';
}

// ---------- Home: Courses ----------
async function loadCourses() {
  showLoading();
  try {
    const courses = await fetchJSON(`${API}/courses`);
    if (!courses.length) {
      appEl.innerHTML = `<div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        <p>No courses yet. Check back soon!</p>
      </div>`;
      return;
    }
    let html = '<h1>📚 Featured Courses</h1><div class="course-grid stagger">';
    courses.forEach(course => {
      html += `
        <div class="card fade-in" onclick="openCourse('${course._id}')">
          <img src="${course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop'}" alt="${course.title}" loading="lazy">
          <div class="card-body">
            <div class="card-title">${course.title}</div>
            <div class="card-text">${course.description || 'Master new skills with our structured playlist.'}</div>
          </div>
        </div>`;
    });
    html += '</div>';
    appEl.innerHTML = html;
  } catch (e) { showError(); }
}

// ---------- Batches of a Course ----------
async function openCourse(courseId) {
  showLoading();
  try {
    const data = await fetchJSON(`${API}/courses/${courseId}`);
    const { course, batches } = data;
    let html = `<button class="btn-back" onclick="loadCourses()">← All Courses</button>`;
    html += `<h1>${course.title}</h1>`;
    if (!batches.length) {
      html += '<div class="empty-state"><p>No batches available for this course.</p></div>';
    } else {
      html += '<div class="batch-grid stagger">';
      batches.forEach(batch => {
        html += `
          <div class="card fade-in" onclick="openBatch('${batch._id}')">
            <img src="${batch.thumbnail || 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=400&h=200&fit=crop'}" alt="${batch.title}" loading="lazy">
            <div class="card-body">
              <div class="card-title">${batch.title}</div>
              <div class="card-text">${batch.description || ''}</div>
            </div>
          </div>`;
      });
      html += '</div>';
    }
    appEl.innerHTML = html;
  } catch (e) { showError(); }
}

// ---------- Lectures of a Batch ----------
async function openBatch(batchId) {
  showLoading();
  try {
    const data = await fetchJSON(`${API}/batches/${batchId}`);
    const { batch, lectures } = data;
    let html = `<button class="btn-back" onclick="openCourse('${batch.courseId}')">← Back to Batches</button>`;
    html += `<h1>${batch.title}</h1>`;
    if (!lectures.length) {
      html += '<div class="empty-state"><p>Lectures coming soon!</p></div>';
    } else {
      html += '<div class="batch-grid stagger">';
      lectures.forEach(lec => {
        html += `
          <div class="card fade-in">
            <img src="${lec.thumbnail || 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=200&fit=crop'}" alt="${lec.title}" loading="lazy">
            <div class="card-body">
              <div class="card-title">${lec.title}</div>
              <div class="lec-actions">
                <a href="${lec.videoUrl}" target="_blank" class="btn">▶️ Watch</a>
                <a href="${lec.notesUrl || '#'}" target="_blank" class="btn btn-outline" ${!lec.notesUrl ? 'disabled style="opacity:0.5; pointer-events:none;"' : ''}>📝 Notes</a>
                <a href="${lec.dppUrl || '#'}" target="_blank" class="btn btn-outline" ${!lec.dppUrl ? 'disabled style="opacity:0.5; pointer-events:none;"' : ''}>📄 DPP</a>
              </div>
            </div>
          </div>`;
      });
      html += '</div>';
    }
    appEl.innerHTML = html;
  } catch (e) { showError(); }
}

// Start the app
loadCourses();
