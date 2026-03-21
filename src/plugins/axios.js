import axios from 'axios'

const api = axios.create({
  timeout: 10000
})


// Interceptor request tanpa token
api.interceptors.request.use(config => config)

// Interceptor response
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      console.warn('Unauthorized, redirecting to login...')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
