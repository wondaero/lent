// src/api/axios.js
import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
})

// 요청/응답 인터셉터도 여기서 관리 가능
// api.interceptors.request.use(config => {
//   // 예: 토큰 붙이기
//   const token = localStorage.getItem("token")
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }
//   return config
// })

export default api
