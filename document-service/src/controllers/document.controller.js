import * as documentService from '../services/document.service.js'
import { streamFile }       from '../utils/fileUtils.js'
import logger               from '../utils/logger.js'

export const list = async (req, res, next) => {
  try {
    const result = await documentService.listDocuments(req.query)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A file is required' })
    }


    const file_path = `documents/${req.file.filename}`

    const document = await documentService.createDocument({
        title:       req.body.title,
        type:        req.body.type,
        uploaded_by: req.user.id,
        file_path,
      },
    )

    res.status(201).json(document)
  } catch (err) {
    next(err)
  }
}

export const getById = async (req, res, next) => {
  try {
    const document = await documentService.getDocumentById(parseInt(req.params.id, 10))
    res.json(document)
  } catch (err) {
    next(err)
  }
}

export const update = async (req, res, next) => {
  try {
    const document = await documentService.updateDocument(
      parseInt(req.params.id, 10),
      req.body,
      req.user,
    )
    res.json(document)
  } catch (err) {
    next(err)
  }
}

export const remove = async (req, res, next) => {
  try {
    await documentService.deleteDocument(parseInt(req.params.id, 10), req.user)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

export const download = async (req, res, next) => {
  try {
    const document = await documentService.getDocumentForDownload(parseInt(req.params.id, 10))
    streamFile(res, document.file_path, document.title)
  } catch (err) {
    next(err)
  }
}

export const listByModule = async (req, res, next) => {
  try {
    const data = await documentService.listModuleDocuments(parseInt(req.params.moduleId, 10))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export const linkToModule = async (req, res, next) => {
  try {
    const link = await documentService.linkDocumentToModule(
      parseInt(req.params.moduleId, 10),
      parseInt(req.body.document_id, 10),
      req.rawToken,
    )
    res.status(201).json(link)
  } catch (err) {
    next(err)
  }
}

export const unlinkFromModule = async (req, res, next) => {
  try {
    await documentService.unlinkDocumentFromModule(
      parseInt(req.params.moduleId,  10),
      parseInt(req.params.documentId, 10),
    )
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
