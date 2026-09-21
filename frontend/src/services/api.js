import axios from 'axios'

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api', timeout: 15000 })

export const errorMessage = (e) =>
  e.response?.data?.detail || e.response?.data?.error || 'Backend unavailable. Start it with "python run.py" (port 8000).'

export const createGoal = (goal) => http.post('/goal', { goal }).then((r) => r.data)
export const evaluateAction = (payload) => http.post('/firewall/evaluate', payload).then((r) => r.data)
export const runAgent = (goal) => http.post('/agent/run', { goal }).then((r) => r.data)
export const getSession = (id) => http.get(`/session/${id}`).then((r) => r.data)
export const getActions = (sessionId) => http.get('/actions', { params: { session_id: sessionId } }).then((r) => r.data)
