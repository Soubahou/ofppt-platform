import multer from 'multer'
import path   from 'path'
import { fileURLToPath } from 'url'
import fs     from 'fs'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const UPLOAD_DIR  = process.env.UPLOAD_DIR || 'uploads'
const AVATAR_DIR  = path.join(process.cwd(), UPLOAD_DIR, 'avatars')

if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_DIR)
  },
  filename: (req, file, cb) => {
    const ext        = path.extname(file.originalname)
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/
  const extname  = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    cb(null, true)
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false)
  }
}

export const upload = multer({
  storage,
  limits:     { fileSize: 2 * 1024 * 1024 }, 
  fileFilter,
})

export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 2MB' })
    }
    return res.status(400).json({ error: err.message })
  }
  if (err) {
    return res.status(400).json({ error: err.message })
  }
  next()
}
