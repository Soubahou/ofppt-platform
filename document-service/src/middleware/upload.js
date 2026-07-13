import multer from 'multer'

const MAX_DOC_MB = parseInt(process.env.MAX_DOCUMENT_SIZE_MB || '20', 10)
const MAX_SUB_MB = parseInt(process.env.MAX_SUBMISSION_SIZE_MB || '10', 10)

const allowOnly = (mimeTypes) => (_req, file, cb) => {
  if (mimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      Object.assign(
        new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${mimeTypes.join(', ')}`),
        { status: 415 },
      ),
      false,
    )
  }
}

export const documentUpload = multer({
  dest:  'uploads/documents/',
  limits: { fileSize: MAX_DOC_MB * 1024 * 1024 },
  fileFilter: allowOnly([
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
})

export const submissionUpload = multer({
  dest:  'uploads/submissions/',
  limits: { fileSize: MAX_SUB_MB * 1024 * 1024 },
  fileFilter: allowOnly([
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
  ]),
})
