import { v4 as uuidv4 } from 'uuid'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const correlationId = (req, res, next) => {
  const incoming = req.headers['x-correlation-id']
  const id = (incoming && UUID_PATTERN.test(incoming)) ? incoming : uuidv4()

  req.correlationId = id
  res.setHeader('x-correlation-id', id)
  next()
}
