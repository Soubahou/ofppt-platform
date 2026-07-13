import * as branchService from '../services/branch.service.js'

export const getAll = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 10
    const result = await branchService.getAll(page, limit)
    res.json(result)
  } catch (err) { next(err) }
}

export const getById = async (req, res, next) => {
  try {
    const branch = await branchService.getById(req.params.id)
    res.json(branch)
  } catch (err) { next(err) }
}

export const create = async (req, res, next) => {
  try {
    const branch = await branchService.create(req.body)
    res.status(201).json(branch)
  } catch (err) { next(err) }
}

export const update = async (req, res, next) => {
  try {
    const branch = await branchService.update(req.params.id, req.body)
    res.json(branch)
  } catch (err) { next(err) }
}

export const remove = async (req, res, next) => {
  try {
    await branchService.remove(req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
}
