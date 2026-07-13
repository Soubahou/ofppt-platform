import * as groupService from '../services/group.service.js'

export const getAll = async (req, res, next) => {
  try {
    const page      = parseInt(req.query.page)  || 1
    const limit     = parseInt(req.query.limit) || 10
    const filters   = {}
    if (req.query.branch_id) filters.branch_id = req.query.branch_id
    const result = await groupService.getAll(page, limit, filters)
    res.json(result)
  } catch (err) { next(err) }
}

export const getById = async (req, res, next) => {
  try {
    const group = await groupService.getById(req.params.id)
    res.json(group)
  } catch (err) { next(err) }
}

export const getStudents = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1
    const limit  = parseInt(req.query.limit) || 10
    const result = await groupService.getStudents(req.params.id, page, limit)
    res.json(result)
  } catch (err) { next(err) }
}

export const create = async (req, res, next) => {
  try {
    const group = await groupService.create(req.body)
    res.status(201).json(group)
  } catch (err) { next(err) }
}

export const update = async (req, res, next) => {
  try {
    const group = await groupService.update(req.params.id, req.body)
    res.json(group)
  } catch (err) { next(err) }
}

export const remove = async (req, res, next) => {
  try {
    await groupService.remove(req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
}
