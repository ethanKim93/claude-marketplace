// src/mocks/handlers.ts
// MSW v2 핸들러 — 로그인/인증 관련 API 기본 응답 정의

import { http, HttpResponse } from 'msw'

// 성공 시 반환할 더미 유저 및 토큰
const MOCK_TOKEN = 'mock-jwt-token-abc123'
const MOCK_USER = {
  id: 1,
  email: 'user@example.com',
  name: '테스트 유저',
  role: 'user',
}

export const handlers = [
  // POST /api/auth/login — 로그인
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    if (body.email === 'user@example.com' && body.password === 'password123') {
      return HttpResponse.json(
        {
          token: MOCK_TOKEN,
          user: MOCK_USER,
        },
        { status: 200 }
      )
    }

    return HttpResponse.json(
      { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 }
    )
  }),

  // POST /api/auth/logout — 로그아웃
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: '로그아웃 되었습니다.' }, { status: 200 })
  }),

  // GET /api/auth/me — 현재 인증 사용자 정보 조회
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (authHeader === `Bearer ${MOCK_TOKEN}`) {
      return HttpResponse.json(MOCK_USER, { status: 200 })
    }

    return HttpResponse.json({ message: '인증이 필요합니다.' }, { status: 401 })
  }),

  // GET /api/dashboard — 대시보드 데이터 (로그인 후 이동하는 페이지)
  http.get('/api/dashboard', ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (authHeader === `Bearer ${MOCK_TOKEN}`) {
      return HttpResponse.json(
        {
          summary: '대시보드 데이터 로드 완료',
          items: [{ id: 1, title: '항목 1' }],
        },
        { status: 200 }
      )
    }

    return HttpResponse.json({ message: '인증이 필요합니다.' }, { status: 401 })
  }),
]
