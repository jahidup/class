require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- MongoDB ----------
let cachedDb = null;
async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  await mongoose.connect(process.env.MONGO_URI);
  cachedDb = mongoose.connection;
  console.log('MongoDB connected');
}

// ---------- Models ----------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  verified: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Date,
  resetToken: String,
  resetExpiry: Date,
  collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const courseSchema = new mongoose.Schema({
  title: String, description: String, thumbnail: String,
}, { timestamps: true });
const Course = mongoose.model('Course', courseSchema);

const batchSchema = new mongoose.Schema({
  title: String, courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  thumbnail: String, description: String,
}, { timestamps: true });
const Batch = mongoose.model('Batch', batchSchema);

const subjectSchema = new mongoose.Schema({
  title: String, batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  thumbnail: String,
}, { timestamps: true });
const Subject = mongoose.model('Subject', subjectSchema);

const chapterSchema = new mongoose.Schema({
  title: String, subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  thumbnail: String,
}, { timestamps: true });
const Chapter = mongoose.model('Chapter', chapterSchema);

const lectureSchema = new mongoose.Schema({
  title: String, chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  videoUrl: String, notesUrl: String, dppUrl: String,
  order: { type: Number, default: 0 }, thumbnail: String,
}, { timestamps: true });
const Lecture = mongoose.model('Lecture', lectureSchema);

// ---------- Mailer ----------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});
const sendMail = async (to, subject, html) => {
  await transporter.sendMail({ from: `"PW Pro" <${process.env.EMAIL_USER}>`, to, subject, html });
};

// ---------- Auth Middleware ----------
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Admin middleware
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token || token !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ message: 'Unauthorized' });
  next();
};

// ---------- Public APIs (no auth) ----------
app.get('/api/courses', async (req, res) => {
  await connectDB();
  res.json(await Course.find().lean());
});

app.get('/api/courses/:id/batches', async (req, res) => {
  await connectDB();
  res.json(await Batch.find({ courseId: req.params.id }).lean());
});

app.get('/api/batches/:id/subjects', async (req, res) => {
  await connectDB();
  res.json(await Subject.find({ batchId: req.params.id }).lean());
});

app.get('/api/subjects/:id/chapters', async (req, res) => {
  await connectDB();
  res.json(await Chapter.find({ subjectId: req.params.id }).lean());
});

app.get('/api/chapters/:id/lectures', async (req, res) => {
  await connectDB();
  res.json(await Lecture.find({ chapterId: req.params.id }).sort({ order: 1 }).lean());
});

// ---------- Auth Routes ----------
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

app.post('/api/register', async (req, res) => {
  await connectDB();
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password min 6 chars' });
  const existing = await User.findOne({ email });
  if (existing?.verified) return res.status(400).json({ message: 'Email already registered' });
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  if (existing) {
    existing.name = name; existing.password = hashed; existing.otp = otp; existing.otpExpiry = otpExpiry; existing.verified = false;
    await existing.save();
  } else {
    await new User({ name, email, password: hashed, otp, otpExpiry }).save();
  }
  await sendMail(email, 'OTP Verification', `<h1>${otp}</h1><p>Expires in 5 minutes</p>`);
  res.json({ message: 'OTP sent' });
});

app.post('/api/verify', async (req, res) => {
  await connectDB();
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.verified) return res.status(400).json({ message: 'Already verified' });
  if (user.otp !== otp || user.otpExpiry < new Date()) return res.status(400).json({ message: 'Invalid OTP' });
  user.verified = true; user.otp = undefined; user.otpExpiry = undefined;
  await user.save();
  res.json({ message: 'Account verified' });
});

app.post('/api/login', async (req, res) => {
  await connectDB();
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.verified) return res.status(400).json({ message: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, collections: user.collections } });
});

app.post('/api/forgot', async (req, res) => {
  await connectDB();
  const { email } = req.body;
  const user = await User.findOne({ email, verified: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetToken = resetToken;
  user.resetExpiry = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const link = `${process.env.BASE_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  await sendMail(email, 'Password Reset', `<p>Click to reset: <a href="${link}">${link}</a></p>`);
  res.json({ message: 'Reset link sent' });
});

app.post('/api/reset', async (req, res) => {
  await connectDB();
  const { token, newPassword } = req.body;
  const user = await User.findOne({ resetToken: token, resetExpiry: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetToken = undefined; user.resetExpiry = undefined;
  await user.save();
  res.json({ message: 'Password reset successful' });
});

app.post('/api/resend-otp', async (req, res) => {
  await connectDB();
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'Not found' });
  const otp = generateOTP();
  user.otp = otp; user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();
  await sendMail(email, 'OTP', `<h1>${otp}</h1>`);
  res.json({ message: 'OTP resent' });
});

// ---------- Student Protected Routes ----------
app.get('/api/me', auth, async (req, res) => {
  await connectDB();
  const user = await User.findById(req.user.id).populate('collections', 'title thumbnail courseId').lean();
  res.json(user);
});

app.post('/api/collection/:batchId', auth, async (req, res) => {
  await connectDB();
  const user = await User.findById(req.user.id);
  const batchId = req.params.batchId;
  if (!user.collections.includes(batchId)) {
    user.collections.push(batchId);
    await user.save();
  }
  res.json({ collections: user.collections });
});

app.delete('/api/collection/:batchId', auth, async (req, res) => {
  await connectDB();
  const user = await User.findById(req.user.id);
  user.collections = user.collections.filter(id => id.toString() !== req.params.batchId);
  await user.save();
  res.json({ collections: user.collections });
});

// ---------- Admin Routes ----------
app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_SECRET) return res.json({ token: ADMIN_SECRET });
  res.status(401).json({ message: 'Wrong password' });
});

// Courses CRUD (admin only)
app.get('/api/admin/courses', adminAuth, async (req, res) => {
  await connectDB();
  res.json(await Course.find().lean());
});
app.post('/api/admin/courses', adminAuth, async (req, res) => {
  await connectDB();
  const course = await new Course(req.body).save();
  res.json(course);
});
app.delete('/api/admin/courses/:id', adminAuth, async (req, res) => {
  await connectDB();
  const batches = await Batch.find({ courseId: req.params.id });
  for (const b of batches) {
    const subjects = await Subject.find({ batchId: b._id });
    for (const s of subjects) {
      const chapters = await Chapter.find({ subjectId: s._id });
      for (const c of chapters) await Lecture.deleteMany({ chapterId: c._id });
      await Chapter.deleteMany({ subjectId: s._id });
    }
    await Subject.deleteMany({ batchId: b._id });
  }
  await Batch.deleteMany({ courseId: req.params.id });
  await Course.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Batches, Subjects, Chapters, Lectures CRUD similar pattern – for brevity I'll provide generic CRUD handlers using a factory or simpler: I'll write explicit routes.

// You can extend the pattern. For a production app, we need all CRUD endpoints. I'll provide a minimal admin API that supports full management.

// Because space is limited, I'll define an Admin API generator using a helper. In actual code, I'll include full set.

// (Full admin CRUD for all models is below.)

// I'll embed all needed admin routes.

function adminCrud(model, parentField) {
  const router = express.Router();
  router.get('/', adminAuth, async (req, res) => {
    await connectDB();
    const filter = parentField ? { [parentField]: null } : {};
    res.json(await model.find(filter).lean());
  });
  router.post('/', adminAuth, async (req, res) => {
    await connectDB();
    const doc = await new model(req.body).save();
    res.json(doc);
  });
  router.put('/:id', adminAuth, async (req, res) => {
    await connectDB();
    const doc = await model.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    res.json(doc);
  });
  router.delete('/:id', adminAuth, async (req, res) => {
    await connectDB();
    await model.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });
  return router;
}

app.use('/api/admin/courses', adminCrud(Course));
app.use('/api/admin/batches', adminCrud(Batch));
app.use('/api/admin/subjects', adminCrud(Subject));
app.use('/api/admin/chapters', adminCrud(Chapter));
app.use('/api/admin/lectures', adminCrud(Lecture));

// Fetch children for admin (to populate dropdowns)
app.get('/api/admin/batches/:courseId', adminAuth, async (req, res) => {
  await connectDB();
  res.json(await Batch.find({ courseId: req.params.courseId }).lean());
});
app.get('/api/admin/subjects/:batchId', adminAuth, async (req, res) => {
  await connectDB();
  res.json(await Subject.find({ batchId: req.params.batchId }).lean());
});
app.get('/api/admin/chapters/:subjectId', adminAuth, async (req, res) => {
  await connectDB();
  res.json(await Chapter.find({ subjectId: req.params.subjectId }).lean());
});
app.get('/api/admin/lectures/:chapterId', adminAuth, async (req, res) => {
  await connectDB();
  res.json(await Lecture.find({ chapterId: req.params.chapterId }).lean());
});

// ---------- Serve SPA ----------
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server on ${PORT}`));
}
