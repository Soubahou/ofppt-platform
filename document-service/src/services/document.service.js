import prisma                                    from '../db.js'
import { deleteFile }                           from '../utils/fileUtils.js'
import { validateUserExists }                   from '../utils/authService.js'
import { validateModuleExists }                 from '../utils/academicService.js'
import logger                                   from '../utils/logger.js'

const paginate = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10)  || 1)
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  return { skip: (p - 1) * l, take: l, page: p, limit: l }
}

export const listDocuments = async ({ type, module_id, page, limit }) => {
  const { skip, take, page: p, limit: l } = paginate(page, limit)

  const where = {}
  if (type)      where.type = type
  if (module_id) {
    where.module_documents = { some: { module_id: parseInt(module_id, 10) } }
  }

  const [total, data] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      skip,
      take,
      orderBy: { upload_date: 'desc' },
      include: { module_documents: { select: { module_id: true } } },
    }),
  ])

  return {
    data,
    pagination: { total, page: p, limit: l, total_pages: Math.ceil(total / l) },
  }
}

export const createDocument = async ({ title, type, uploaded_by, file_path }) => {


  const document = await prisma.document.create({
    data: { title, type, uploaded_by, file_path },
  })

  logger.info({ documentId: document.id, uploaded_by }, 'Document created')
  return document
}

export const getDocumentById = async (id) => {
  const document = await prisma.document.findUniqueOrThrow({
    where:   { id },
    include: {
      module_documents:     { select: { module_id: true } },
      exercise_assignments: { select: { id: true, group_id: true, due_date: true } },
    },
  })
  return document
}

export const updateDocument = async (id, { title, type }, requestingUser) => {

  const existing = await prisma.document.findUniqueOrThrow({ where: { id } })

  if (existing.uploaded_by !== requestingUser.id && requestingUser.role !== 'direction') {
    throw { status: 403, message: 'You can only update your own documents' }
  }

  const document = await prisma.document.update({
    where: { id },
    data:  { title, type },
  })

  logger.info({ documentId: id, updatedBy: requestingUser.id }, 'Document metadata updated')
  return document
}

export const deleteDocument = async (id, requestingUser) => {
  const existing = await prisma.document.findUniqueOrThrow({ where: { id } })


  if (existing.uploaded_by !== requestingUser.id && requestingUser.role !== 'direction') {
    throw { status: 403, message: 'You can only delete your own documents' }
  }

  await prisma.document.delete({ where: { id } })
  deleteFile(existing.file_path)

  logger.info({ documentId: id, deletedBy: requestingUser.id, filePath: existing.file_path }, 'Document deleted')
}

export const getDocumentForDownload = async (id) => {
  return prisma.document.findUniqueOrThrow({ where: { id } })
}

export const listModuleDocuments = async (moduleId) => {
  const links = await prisma.moduleDocument.findMany({
    where:   { module_id: moduleId },
    include: { document: true },
    orderBy: { document: { upload_date: 'desc' } },
  })
  return links.map((l) => l.document)
}

export const linkDocumentToModule = async (moduleId, documentId, bearerToken) => {

  await validateModuleExists(moduleId, bearerToken)
  await prisma.document.findUniqueOrThrow({ where: { id: documentId } })

  const link = await prisma.moduleDocument.create({
    data: { module_id: moduleId, document_id: documentId },
  })

  logger.info({ moduleId, documentId }, 'Document linked to module')
  return link
}

export const unlinkDocumentFromModule = async (moduleId, documentId) => {
  await prisma.moduleDocument.delete({
    where: { module_id_document_id: { module_id: moduleId, document_id: documentId } },
  })

  logger.info({ moduleId, documentId }, 'Document unlinked from module')
}
