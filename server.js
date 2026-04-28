require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- MongoDB Connection ----------
let cachedDb = null;
async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  await mongoose.connect(process.env.MONGO_URI);
  cachedDb = mongoose.connection;
  console.log('MongoDB connected');
}

// ---------- Models ----------
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  thumbnail: String,
  createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', courseSchema);

const batchSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  thumbnail: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const Batch = mongoose.model('Batch', batchSchema);

const lectureSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  title: { type: String, required: true },
  thumbnail: String,
  videoUrl: { type: String, required: true },
  notesUrl: String,
  dppUrl: String,
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Lecture = mongoose.model('Lecture', lectureSchema);

// ---------- Admin Authentication Middleware ----------
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'supersecretadmin123';

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// ---------- PUBLIC ROUTES ----------

// Get all courses
app.get('/api/courses', async (req, res) => {
  await connectDB();
  const courses = await Course.find().sort({ createdAt: -1 });
  res.json(courses);
});

// Get a single course (with batches)
app.get('/api/courses/:id', async (req, res) => {
  await connectDB();
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  const batches = await Batch.find({ courseId: req.params.id }).sort({ createdAt: -1 });
  res.json({ course, batches });
});

// Get a single batch (with lectures)
app.get('/api/batches/:id', async (req, res) => {
  await connectDB();
  const batch = await Batch.findById(req.params.id);
  if (!batch) return res.status(404).json({ message: 'Batch not found' });
  const lectures = await Lecture.find({ batchId: req.params.id }).sort({ order: 1, createdAt: 1 });
  res.json({ batch, lectures });
});

// ---------- ADMIN ROUTES ----------

// Admin login (just verify admin secret)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_SECRET) {
    return res.json({ token: ADMIN_SECRET });
  }
  res.status(401).json({ message: 'Invalid password' });
});

// --- Courses CRUD ---
app.get('/api/admin/courses', adminAuth, async (req, res) => {
  await connectDB();
  const courses = await Course.find().sort({ createdAt: -1 });
  res.json(courses);
});

app.post('/api/admin/courses', adminAuth, async (req, res) => {
  await connectDB();
  const { title, description, thumbnail } = req.body;
  if (!title) return res.status(400).json({ message: 'Title required' });
  const course = new Course({ title, description, thumbnail });
  await course.save();
  res.json(course);
});

app.put('/api/admin/courses/:id', adminAuth, async (req, res) => {
  await connectDB();
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(course);
});

app.delete('/api/admin/courses/:id', adminAuth, async (req, res) => {
  await connectDB();
  // delete all batches and lectures associated
  const batches = await Batch.find({ courseId: req.params.id });
  for (const batch of batches) {
    await Lecture.deleteMany({ batchId: batch._id });
  }
  await Batch.deleteMany({ courseId: req.params.id });
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// --- Batches CRUD ---
app.get('/api/admin/batches/:courseId', adminAuth, async (req, res) => {
  await connectDB();
  const batches = await Batch.find({ courseId: req.params.courseId }).sort({ createdAt: -1 });
  res.json(batches);
});

app.post('/api/admin/batches', adminAuth, async (req, res) => {
  await connectDB();
  const { courseId, title, thumbnail, description } = req.body;
  if (!courseId || !title) return res.status(400).json({ message: 'courseId and title required' });
  const batch = new Batch({ courseId, title, thumbnail, description });
  await batch.save();
  res.json(batch);
});

app.put('/api/admin/batches/:id', adminAuth, async (req, res) => {
  await connectDB();
  const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(batch);
});

app.delete('/api/admin/batches/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Lecture.deleteMany({ batchId: req.params.id });
  await Batch.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// --- Lectures CRUD ---
app.get('/api/admin/lectures/:batchId', adminAuth, async (req, res) => {
  await connectDB();
  const lectures = await Lecture.find({ batchId: req.params.batchId }).sort({ order: 1 });
  res.json(lectures);
});

app.post('/api/admin/lectures', adminAuth, async (req, res) => {
  await connectDB();
  const { batchId, title, thumbnail, videoUrl, notesUrl, dppUrl, order } = req.body;
  if (!batchId || !title || !videoUrl) return res.status(400).json({ message: 'batchId, title, videoUrl required' });
  const lecture = new Lecture({ batchId, title, thumbnail, videoUrl, notesUrl, dppUrl, order });
  await lecture.save();
  res.json(lecture);
});

app.put('/api/admin/lectures/:id', adminAuth, async (req, res) => {
  await connectDB();
  const lecture = await Lecture.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(lecture);
});

app.delete('/api/admin/lectures/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Lecture.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Fallback to frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
