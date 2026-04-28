require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let cachedDb = null;
async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  await mongoose.connect(process.env.MONGO_URI);
  cachedDb = mongoose.connection;
  console.log('MongoDB connected');
}

// ---------- Models ----------
const courseSchema = new mongoose.Schema({
  title: String, description: String, thumbnail: String,
  createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', courseSchema);

const batchSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: String, thumbnail: String, description: String,
  createdAt: { type: Date, default: Date.now }
});
const Batch = mongoose.model('Batch', batchSchema);

const lectureSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  title: String, thumbnail: String, videoUrl: String,
  notesUrl: String, dppUrl: String, order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Lecture = mongoose.model('Lecture', lectureSchema);

// ---------- Admin Auth Middleware ----------
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'supersecret';
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token || token !== `Bearer ${ADMIN_SECRET}`)
    return res.status(401).json({ message: 'Unauthorized' });
  next();
};

// ---------- Public APIs ----------
app.get('/api/courses', async (req, res) => {
  await connectDB();
  const courses = await Course.find().sort({ createdAt: -1 }).lean();
  res.json(courses);
});

app.get('/api/courses/:id', async (req, res) => {
  await connectDB();
  const course = await Course.findById(req.params.id).lean();
  if (!course) return res.status(404).json({ message: 'Not found' });
  const batches = await Batch.find({ courseId: req.params.id }).sort({ createdAt: -1 }).lean();
  res.json({ course, batches });
});

app.get('/api/batches/:id', async (req, res) => {
  await connectDB();
  const batch = await Batch.findById(req.params.id).lean();
  if (!batch) return res.status(404).json({ message: 'Not found' });
  const lectures = await Lecture.find({ batchId: req.params.id }).sort({ order: 1 }).lean();
  res.json({ batch, lectures });
});

// ---------- Admin APIs ----------
app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_SECRET) return res.json({ token: ADMIN_SECRET });
  res.status(401).json({ message: 'Wrong password' });
});

app.get('/api/admin/courses', adminAuth, async (req, res) => {
  await connectDB();
  res.json(await Course.find().sort({ createdAt: -1 }).lean());
});

app.post('/api/admin/courses', adminAuth, async (req, res) => {
  await connectDB();
  const course = await new Course(req.body).save();
  res.json(course);
});

app.delete('/api/admin/courses/:id', adminAuth, async (req, res) => {
  await connectDB();
  const batches = await Batch.find({ courseId: req.params.id });
  for (const batch of batches) await Lecture.deleteMany({ batchId: batch._id });
  await Batch.deleteMany({ courseId: req.params.id });
  await Course.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/batches/:courseId', adminAuth, async (req, res) => {
  await connectDB();
  res.json(await Batch.find({ courseId: req.params.courseId }).sort({ createdAt: -1 }).lean());
});

app.post('/api/admin/batches', adminAuth, async (req, res) => {
  await connectDB();
  const batch = await new Batch(req.body).save();
  res.json(batch);
});

app.delete('/api/admin/batches/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Lecture.deleteMany({ batchId: req.params.id });
  await Batch.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/lectures/:batchId', adminAuth, async (req, res) => {
  await connectDB();
  res.json(await Lecture.find({ batchId: req.params.batchId }).sort({ order: 1 }).lean());
});

app.post('/api/admin/lectures', adminAuth, async (req, res) => {
  await connectDB();
  const lecture = await new Lecture(req.body).save();
  res.json(lecture);
});

app.put('/api/admin/lectures/:id', adminAuth, async (req, res) => {
  await connectDB();
  const lecture = await Lecture.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(lecture);
});

app.delete('/api/admin/lectures/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Lecture.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}
