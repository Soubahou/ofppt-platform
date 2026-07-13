import axios from 'axios'

let _accessToken = null
let _onClearAuth = null

export function setAccessToken(t)     { _accessToken = t }
export function getAccessToken()      { return _accessToken }
export function clearAuthTokens()     { _accessToken = null }
export function registerClearAuth(fn) { _onClearAuth = fn }

const RT_KEY = 'ofppt_rt'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
})

api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`
  return config
})

let isRefreshing = false
let waitQueue    = []

const processQueue = (error, token = null) => {
  waitQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  )
  waitQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config


    if (err.response?.status === 401 && !original._retry) {
      original._retry = true


      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      isRefreshing = true
      const rt = sessionStorage.getItem(RT_KEY)

      if (!rt) {

        clearAuthTokens()
        if (_onClearAuth) _onClearAuth()
        else window.location.href = '/login'
        return Promise.reject(err)
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/auth/refresh`,
          { refreshToken: rt },
        )

        if (data.refreshToken) sessionStorage.setItem(RT_KEY, data.refreshToken)
        setAccessToken(data.accessToken)
        processQueue(null, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr)
        clearAuthTokens()
        sessionStorage.removeItem(RT_KEY)
        if (_onClearAuth) _onClearAuth()
        else window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default api
