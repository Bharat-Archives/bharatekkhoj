const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "itihas2026";

// Path resolution
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'archive-data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Seed default archive records if missing
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    categories: [
      {
        id: "textiles",
        tag: "TEXTILES",
        titleHi: "भारत के धागे",
        titleEn: "Bharat ke Dhaage",
        desc: "An exploration of vibrant weaving and embroidery traditions, tying regional history into everyday fabrics.",
        icon: "loom",
        documents: [
          {
            id: "doc-1",
            titleHi: "चंदेरी और बनारसी का इतिहास",
            titleEn: "History of Chanderi & Banarasi Weaves",
            author: "Archive Curator",
            year: "1924",
            summary: "A monograph examining royal patronage of silk and zari weaving traditions across regional workshops.",
            fileUrl: "/sample-doc.pdf",
            fileName: "chanderi_banarasi.pdf"
          }
        ]
      },
      {
        id: "history",
        tag: "HISTORY",
        titleHi: "इतिहास के पन्ने",
        titleEn: "Itihas ke Panne",
        desc: "Delving into historical texts, inscriptions, and detailed accounts of eras and events.",
        icon: "scroll",
        documents: []
      },
      {
        id: "heritage",
        tag: "ART & HERITAGE",
        titleHi: "कला और धरोहर",
        titleEn: "Kala aur Dharohar",
        desc: "Reflecting architectural brilliance, rock inscriptions, and sculpture traditions across ancient India.",
        icon: "monument",
        documents: []
      }
    ]
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const cleanName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, cleanName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 35 * 1024 * 1024 }, // 35 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed.'));
    }
  }
});

// Middleware
app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend and uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper Functions
function readArchive() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    return { categories: [] };
  }
}

function writeArchive(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Header-token authorization (bypasses devtunnel cookie dropping)
function requireCurator(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token === ADMIN_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized. Passcode required." });
}

// --- PUBLIC ROUTES ---
app.get('/api/categories', (req, res) => {
  const data = readArchive();
  res.json(data.categories || []);
});

app.get('/api/document/:catId/:docId', (req, res) => {
  const { catId, docId } = req.params;
  const data = readArchive();
  const category = (data.categories || []).find(c => c.id === catId);
  if (!category) return res.status(404).json({ error: "Category not found" });
  const doc = (category.documents || []).find(d => d.id === docId);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  res.json({ category, document: doc });
});

// --- CURATOR AUTHENTICATION ---
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_PASSWORD });
  }
  return res.status(401).json({ error: "गलत पासवर्ड! (Incorrect Passcode)" });
});

app.get('/api/admin/status', (req, res) => {
  const token = req.headers['x-admin-token'];
  res.json({ loggedIn: token === ADMIN_PASSWORD });
});

// --- CURATOR ACTIONS ---

// Add Category Tab
app.post('/api/admin/categories', requireCurator, (req, res) => {
  try {
    const { titleHi, titleEn, tag, desc } = req.body;
    if (!titleHi || !titleEn) {
      return res.status(400).json({ error: "Both Hindi and English titles are required." });
    }

    const data = readArchive();
    const newCat = {
      id: 'cat-' + Date.now(),
      tag: (tag || 'ARCHIVE').trim().toUpperCase(),
      titleHi: titleHi.trim(),
      titleEn: titleEn.trim(),
      desc: (desc || "Historical study materials and research folios.").trim(),
      icon: "scroll",
      documents: []
    };

    data.categories.push(newCat);
    writeArchive(data);
    return res.json({ success: true, category: newCat });
  } catch (err) {
    console.error("Tab creation error:", err);
    return res.status(500).json({ error: "Failed to write database file." });
  }
});

// Delete Category Tab
app.delete('/api/admin/categories/:catId', requireCurator, (req, res) => {
  try {
    const { catId } = req.params;
    const data = readArchive();
    data.categories = (data.categories || []).filter(c => c.id !== catId);
    writeArchive(data);
    res.json({ success: true, message: "Tab successfully removed." });
  } catch (err) {
    res.status(500).json({ error: "Could not remove tab." });
  }
});

// Upload PDF to a Category Tab
app.post('/api/admin/documents/:catId', requireCurator, upload.single('pdfFile'), (req, res) => {
  try {
    const { catId } = req.params;
    const { titleHi, titleEn, author, year, summary } = req.body;

    if (!req.file) return res.status(400).json({ error: "PDF file is required." });

    const data = readArchive();
    const category = (data.categories || []).find(c => c.id === catId);
    if (!category) return res.status(404).json({ error: "Category tab not found." });

    const newDoc = {
      id: 'doc-' + Date.now(),
      titleHi: titleHi || req.file.originalname,
      titleEn: titleEn || "Untitled Document",
      author: author || "Curator Archive",
      year: year || "Heritage Collection",
      summary: summary || "Historical monograph for student reference.",
      fileUrl: '/uploads/' + req.file.filename,
      fileName: req.file.originalname
    };

    if (!category.documents) category.documents = [];
    category.documents.push(newDoc);
    writeArchive(data);

    res.json({ success: true, document: newDoc });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload document." });
  }
});

// Edit Existing PDF Document Details / Replace File
app.put('/api/admin/documents/:catId/:docId', requireCurator, upload.single('pdfFile'), (req, res) => {
  try {
    const { catId, docId } = req.params;
    const { titleHi, titleEn, author, year, summary } = req.body;

    const data = readArchive();
    const category = (data.categories || []).find(c => c.id === catId);
    if (!category) return res.status(404).json({ error: "Category not found." });

    const doc = (category.documents || []).find(d => d.id === docId);
    if (!doc) return res.status(404).json({ error: "Document not found." });

    if (titleHi) doc.titleHi = titleHi;
    if (titleEn) doc.titleEn = titleEn;
    if (author) doc.author = author;
    if (year) doc.year = year;
    if (summary) doc.summary = summary;

    if (req.file) {
      if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, doc.fileUrl);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      doc.fileUrl = '/uploads/' + req.file.filename;
      doc.fileName = req.file.originalname;
    }

    writeArchive(data);
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ error: "Failed to update document." });
  }
});

// Delete Document
app.delete('/api/admin/documents/:catId/:docId', requireCurator, (req, res) => {
  try {
    const { catId, docId } = req.params;
    const data = readArchive();
    const category = (data.categories || []).find(c => c.id === catId);
    if (!category) return res.status(404).json({ error: "Category not found." });

    const doc = (category.documents || []).find(d => d.id === docId);
    if (doc && doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, doc.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    category.documents = (category.documents || []).filter(d => d.id !== docId);
    writeArchive(data);
    res.json({ success: true, message: "Document deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete document." });
  }
});

app.listen(PORT, () => {
  console.log(`Heritage Archive backend running at http://localhost:${PORT}`);
});