import * as absenceService from '../services/absence.service.js'

export const listAbsences = async (req, res, next) => {
  try {
    res.json(await absenceService.listAbsences(req.query, req.user))
  } catch (err) { next(err) }
}

export const getAbsenceById = async (req, res, next) => {
  try {
    res.json(await absenceService.getAbsenceById(parseInt(req.params.id, 10), req.user))
  } catch (err) { next(err) }
}

export const createAbsence = async (req, res, next) => {
  try {
    const absence = await absenceService.createAbsence({
      user_id:      req.user.id,
      instance_ids: req.body.instance_ids,
      reason:       req.body.reason,
    })
    res.status(201).json(absence)
  } catch (err) { next(err) }
}

export const updateAbsence = async (req, res, next) => {
  try {
    res.json(
      await absenceService.updateAbsence(parseInt(req.params.id, 10), req.body, req.user)
    )
  } catch (err) { next(err) }
}

export const justifyAbsence = async (req, res, next) => {
  try {
    res.json(
      await absenceService.justifyAbsence(parseInt(req.params.id, 10), req.body, req.user)
    )
  } catch (err) { next(err) }
}

export const approveAbsence = async (req, res, next) => {
  try {
    res.json(
      await absenceService.approveAbsence(parseInt(req.params.id, 10), req.user)
    )
  } catch (err) { next(err) }
}

export const rejectAbsence = async (req, res, next) => {
  try {
    res.json(
      await absenceService.rejectAbsence(parseInt(req.params.id, 10), req.user)
    )
  } catch (err) { next(err) }
}

export const deleteAbsence = async (req, res, next) => {
  try {
    await absenceService.deleteAbsence(parseInt(req.params.id, 10))
    res.status(204).end()
  } catch (err) { next(err) }
}

export const getAbsencesByStudent = async (req, res, next) => {
  try {
    res.json(
      await absenceService.getAbsencesByStudent(
        parseInt(req.params.id, 10),
        req.query,
        req.user,
      )
    )
  } catch (err) { next(err) }
}

export const getStats = async (req, res, next) => {
  try {
    res.json(await absenceService.getStats())
  } catch (err) { next(err) }
}