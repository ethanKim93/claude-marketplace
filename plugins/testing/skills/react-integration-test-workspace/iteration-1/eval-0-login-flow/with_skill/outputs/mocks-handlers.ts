// src/mocks/handlers.ts
// MSW v2 핸들러 — 로그인 플로우용
import { http, HttpResponse, delay } from 'msw'

export const handlers = [
  /**
   * POST /api/auth/login
   *
   * 성공: 올바른 자격증명 → 200 { token, user }
   * 실패: 잘못된 자격증명 → 401 { message }
   */
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    const { email, password } = body

    // 약간의 지연으로 로딩 상태 테스트 가능
    await delay(10)

    if (email === 'user@example.com' && password === 'password123') {
      return HttpResponse.json(
        {
          token: 'test-jwt-token',
          user: { id: 1, name: '홍길동', email: 'user@example.com' },
        },
        { status: 200 }
      )
    }

    return HttpResponse.json(
      { message: '이메일 또는 비밀번호가 올바르지 않습니다' },
      { status: 401 }
    )
  }),

  /**
   * POST /api/auth/logout
   */
  http.post('/api/auth/logout', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  /**
   * GET /api/auth/me
   * 대시보드 진입 시 현재 사용자 정보를 가져오는 엔드포인트 (예시)
   */
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    return HttpResponse.json(
      { id: 1, name: '홍길동', email: 'user@example.com' },
      { status: 200 }
    )
  }),
]
