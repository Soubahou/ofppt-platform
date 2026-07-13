import * as mtgService from '../services/mtg.service.js'

export const list = async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page)  || 1
    const limit   = parseInt(req.query.limit) || 50
    const filters = {}
    if (req.query.group_id)   filters.group_id   = req.query.group_id
    if (req.query.teacher_id) filters.teacher_id = req.query.teacher_id
    if (req.query.module_id)  filters.module_id  = req.query.module_id
    if (req.query.is_active !== undefined) filters.is_active = req.query.is_active
    res.json(await mtgService.getAll(page, limit, filters))
  } catch (err) { next(err) }
}

export const upsert = async (req, res, next) => {
  try {
    const mtg = await mtgService.upsertModuleTeacherGroup(req.body)
    res.status(200).json(mtg)
  } catch (err) { next(err) }
}