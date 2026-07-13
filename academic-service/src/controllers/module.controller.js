import * as moduleService from '../services/module.service.js'

export const getAll = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 10
    res.json(await moduleService.getAll(page, limit))
  } catch (err) { next(err) }
}

export const getById = async (req, res, next) => {
  try {
    res.json(await moduleService.getById(req.params.id))
  } catch (err) { next(err) }
}

export const getTeachers = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 10
    res.json(await moduleService.getTeachers(req.params.id, page, limit))
  } catch (err) { next(err) }
}

export const create = async (req, res, next) => {
  try {
    res.status(201).json(await moduleService.create(req.body))
  } catch (err) { next(err) }
}

export const update = async (req, res, next) => {
  try {
    res.json(await moduleService.update(req.params.id, req.body))
  } catch (err) { next(err) }
}

export const remove = async (req, res, next) => {
  try {
    await moduleService.remove(req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
}

export const assignTeacher = async (req, res, next) => {
  try {
    const record = await moduleService.assignTeacher(req.params.id, req.body.teacher_id)
    res.status(201).json(record)
  } catch (err) { next(err) }
}

export const unassignTeacher = async (req, res, next) => {
  try {
    await moduleService.unassignTeacher(req.params.id, req.params.teacherId)
    res.status(204).send()
  } catch (err) { next(err) }
}
