import * as authService from '../services/auth.service.js'

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' })
    }
    await authService.logout(refreshToken)
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
}

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' })
    }
    const result = await authService.refresh(refreshToken)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export const me = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export const verify = (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'token is required' })
  const result = authService.verifyToken(token)
  res.json(result)
}
