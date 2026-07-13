import * as roomService from '../services/room.service.js'

export const getAll = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 10
    res.json(await roomService.getAll(page, limit))
  } catch (err) { next(err) }
}

export const getById = async (req, res, next) => {
  try {
    res.json(await roomService.getById(req.params.id))
  } catch (err) { next(err) }
}

export const create = async (req, res, next) => {
  try {
    res.status(201).json(await roomService.create(req.body))
  } catch (err) { next(err) }
}

export const update = async (req, res, next) => {
  try {
    res.json(await roomService.update(req.params.id, req.body))
  } catch (err) { next(err) }
}

export const remove = async (req, res, next) => {
  try {
    await roomService.remove(req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
}
