import { unlink, existsSync } from 'fs'
import { resolve, join }       from 'path'
import logger                  from './logger.js'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'

export const getAbsolutePath = (filePath) => {
  return resolve(join(UPLOAD_DIR, filePath))
}

export const deleteFile = (filePath) => {
  const absPath = getAbsolutePath(filePath)

  if (!existsSync(absPath)) {
    logger.warn({ filePath, absPath }, 'File not found on disk during delete — skipping')
    return
  }

  unlink(absPath, (err) => {
    if (err) {
      logger.error({ err, filePath, absPath }, 'Failed to delete file from disk')
    } else {
      logger.info({ filePath }, 'File deleted from disk')
    }
  })
}

export const streamFile = (res, filePath, filename) => {
  const absPath = getAbsolutePath(filePath)

  if (!existsSync(absPath)) {
    throw { status: 404, message: 'File not found on disk' }
  }


  const displayName = filename || filePath.split('/').pop()

  res.setHeader('Content-Disposition', `attachment; filename="${displayName}"`)
  res.sendFile(absPath)
}
