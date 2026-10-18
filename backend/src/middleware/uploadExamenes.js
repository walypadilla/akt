// backend/src/middleware/uploadExamenes.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '../../uploads/examenes');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `examen_${req.params.id}_${Date.now()}${ext}`;
    cb(null, safe);
  },
});

const uploadExamen = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Solo se permiten archivos JPG, PNG o PDF'));
  },
});

module.exports = { uploadExamen };