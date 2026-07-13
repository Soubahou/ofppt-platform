import path   from 'path'
import fs     from 'fs/promises'
import * as userService          from '../services/user.service.js'
import { generateInitialsAvatar } from '../utils/avatar.utils.js'

export const getAll = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1
    const limit  = parseInt(req.query.limit) || 10
    const search = req.query.search || ''
    const role   = req.query.role   || ''
    const result = await userService.getAll(page, limit, search, role)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export const getById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    const { first_name, last_name, date_of_birth, role_id } = req.body
    const result = await userService.create({ first_name, last_name, date_of_birth, role_id })
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export const update = async (req, res, next) => {
  try {
    const user = await userService.update(req.params.id, req.body)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export const remove = async (req, res, next) => {
  try {
    await userService.remove(req.params.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export const getRoles = async (req, res, next) => {
  try {
    const roles = await userService.getRoles()
    res.json(roles)
  } catch (err) {
    next(err)
  }
}

export const getAvatar = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id)

    if (user.avatar) {
      const avatarPath = path.join(process.cwd(), user.avatar)

      const exists = await fs.access(avatarPath).then(() => true).catch(() => false)
      if (exists) {
        return res.sendFile(avatarPath)
      }
    }


    const svg = generateInitialsAvatar(user.first_name, user.last_name)
    res.setHeader('Content-Type', 'image/svg+xml')
    res.send(svg)
  } catch (err) {
    next(err)
  }
}

export const setAvatar = async (req, res, next) => {
  try {
    const userId       = parseInt(req.params.id)
    const currentUserId = req.user.id
    const hasPermission = req.user.permissions.includes('update:user')

    if (userId !== currentUserId && !hasPermission) {

      if (req.file) await fs.unlink(req.file.path).catch(() => {})
      return res.status(403).json({ error: 'Forbidden — You can only update your own avatar' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const relativePath = `${process.env.UPLOAD_DIR}/avatars/${req.file.filename}`
    const result = await userService.setAvatar(userId, relativePath)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export const deleteAvatar = async (req, res, next) => {
  try {
    const userId        = parseInt(req.params.id)
    const currentUserId = req.user.id
    const hasPermission = req.user.permissions.includes('update:user')

    if (userId !== currentUserId && !hasPermission) {
      return res.status(403).json({ error: 'Forbidden — You can only delete your own avatar' })
    }

    await userService.removeAvatar(userId)
    res.json({ message: 'Avatar removed successfully' })
  } catch (err) {
    next(err)
  }
}
