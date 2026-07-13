import * as scheduleService from '../services/schedule.service.js'
import prisma from '../db.js'

export const getAllSessions = async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page)  || 1
    const limit   = parseInt(req.query.limit) || 100
    const filters = {}
    if (req.query.module_teacher_group_id) filters.module_teacher_group_id = req.query.module_teacher_group_id
    if (req.query.day_of_week !== undefined) filters.day_of_week = req.query.day_of_week
    if (req.query.room_id)     filters.room_id     = req.query.room_id
    if (req.query.group_id)    filters.group_id    = req.query.group_id
    if (req.query.scheduled !== undefined) filters.scheduled = req.query.scheduled
    res.json(await scheduleService.getAllSessions(page, limit, filters))
  } catch (err) { next(err) }
}

export const getSessionById = async (req, res, next) => {
  try {
    res.json(await scheduleService.getSessionById(req.params.id))
  } catch (err) { next(err) }
}

export const createSession = async (req, res, next) => {
  try {
    res.status(201).json(await scheduleService.createSession(req.body))
  } catch (err) { next(err) }
}

export const updateSession = async (req, res, next) => {
  try {
    res.json(await scheduleService.updateSession(req.params.id, req.body))
  } catch (err) { next(err) }
}

export const deleteSession = async (req, res, next) => {
  try {
    await scheduleService.deleteSession(req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
}

export const placeSession = async (req, res, next) => {
  try {
    const result = await scheduleService.placeSession(req.params.id, req.body)
    res.json(result)
  } catch (err) { next(err) }
}

export const unplaceSession = async (req, res, next) => {
  try {
    const result = await scheduleService.unplaceSession(req.params.id)
    res.json(result)
  } catch (err) { next(err) }
}

export const generateInstances = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.body
    res.status(201).json(await scheduleService.generateInstances(req.params.id, start_date, end_date))
  } catch (err) { next(err) }
}

export const patchInstance = async (req, res, next) => {
  try {
    res.json(await scheduleService.patchInstance(req.params.id, req.body))
  } catch (err) { next(err) }
}

export const getWeek = async (req, res, next) => {
  try {
    const { date, group_id, teacher_id, user_id } = req.query

    if (!date)
      return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' })

    if (group_id) {
      const week = await scheduleService.getWeekForGroup(date, group_id)
      return res.json({ date, group_id: parseInt(group_id), week })
    }

   if (teacher_id || user_id) {
  let resolvedTeacherId = teacher_id
  if (!resolvedTeacherId && user_id) {
    const teacher = await prisma.teacher.findFirst({ where: { user_id: parseInt(user_id) } })

    if (!teacher) {
      // FIX: fall back to student — resolve their group and return that week
      const student = await prisma.student.findFirst({
        where: { user_id: parseInt(user_id) },
      })
      if (!student?.group_id)
        return res.json({ date, week: {} })

      const week = await scheduleService.getWeekForGroup(date, student.group_id)
      return res.json({ date, group_id: student.group_id, week })
    }

    // FIX from previous session: was teacher.id (undefined)
    resolvedTeacherId = teacher.user_id
  }

  const week = await scheduleService.getWeekForTeacher(date, resolvedTeacherId)
  return res.json({ date, teacher_id: parseInt(resolvedTeacherId), week })
}

    return res.status(400).json({ error: 'Either group_id, teacher_id, or user_id is required' })
  } catch (err) { next(err) }
}

export const generateWeekInstances = async (req, res, next) => {
  try {
    const { group_id, week_start_date } = req.body
    if (!group_id || !week_start_date)
      return res.status(400).json({ error: 'group_id and week_start_date are required' })
    res.status(201).json(await scheduleService.generateWeekInstances(group_id, week_start_date))
  } catch (err) { next(err) }
}