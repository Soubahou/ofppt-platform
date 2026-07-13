export const authorize = (action, resource) => {
  return (req, res, next) => {
    const required = `${action}:${resource}`

    if (!req.user || !req.user.permissions.includes(required)) {
      return res.status(403).json({
        error: `Forbidden — missing permission: ${required}`,
      })
    }

    next()
  }
}
