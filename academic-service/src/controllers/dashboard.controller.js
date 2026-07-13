import * as dashboardService from '../services/dashboard.service.js'

export const getStats = async (req, res, next) => {
  try {
    res.json(await dashboardService.getStats())
  } catch (err) {
    next(err)
  }
}