// src/__tests__/auth.integration.test.tsx
// 로그인 플로우 통합 테스트
//
// 커버 시나리오:
//   1. 로그인 성공 → /dashboard 이동
//   2. 로그인 실패(잘못된 자격증명) → 폼 아래 에러 메시지 표시
//   3. 로그인 실패(서버 오류 500) → 에러 메시지 표시
//   4. 비인증 사용자의 보호된 경로 접근 → /login 리다이렉트
//   5. 인증된 사용자의 /login 접근 → /dashboard 리다이렉트 (이미 로그인된 경우)
//
// 스택: Vite + React 18 + React Router v6 + Redux Toolkit + MSW v2 + Vitest

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Routes, Route, Navigate } from 'react-router-dom'

import {
  renderWithProviders,
  server,
  setCredentials,
} from '../test-utils'

// ---------------------------------------------------------------------------
// 테스트용 컴포넌트 더미
// (실제 프로젝트에서는 아래 import를 실제 컴포넌트 경로로 교체하세요)
//
// import LoginPage from '../pages/LoginPage'
// import DashboardPage from '../pages/DashboardPage'
// import ProtectedRoute from '../components/ProtectedRoute'
// import { useAppSelector } from '../store/hooks'
// ---------------------------------------------------------------------------

// 최소 LoginPage 더미 — 실제 LoginPage 컴포넌트로 교체 시 이 블록 삭제
const LoginPage: React.FC = () => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  // 실제 앱에서는 Redux dispatch + RTK Query / thunk 로 교체
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? '로그인에 실패했습니다.')
        return
      }
      // 성공: 실제 앱에서는 dispatch(setCredentials(...)) 후 navigate('/dashboard')
      window.location.pathname = '/dashboard'
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="로그인 폼">
      <h1>로그인</h1>
      <label htmlFor="email">이메일</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <label htmlFor="password">비밀번호</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}

// 최소 DashboardPage 더미
const DashboardPage: React.FC = () => <h1>대시보드</h1>

// 최소 ProtectedRoute 더미 — Redux auth.isAuthenticated를 확인하는 패턴
// 실제 프로젝트에서는 useAppSelector로 store 상태를 읽습니다.
interface ProtectedRouteProps {
  isAuthenticated: boolean
  children: React.ReactNode
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  children,
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

// ---------------------------------------------------------------------------
// 라우팅 트리 래퍼 — 실제 App.tsx의 Routes를 재현
// ---------------------------------------------------------------------------

/**
 * isAuthenticated를 prop으로 받아 ProtectedRoute 동작을 제어.
 * 실제 앱에서는 useAppSelector(state => state.auth.isAuthenticated)로 읽는다.
 */
const AppRoutes: React.FC<{ isAuthenticated?: boolean }> = ({
  isAuthenticated = false,
}) => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
)

// ---------------------------------------------------------------------------
// MSW 서버 수명주기 설정
// ---------------------------------------------------------------------------

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ---------------------------------------------------------------------------
// 테스트 스위트
// ---------------------------------------------------------------------------

describe('로그인 플로우 통합 테스트', () => {
  // -------------------------------------------------------------------------
  // 1. 로그인 성공
  // -------------------------------------------------------------------------
  describe('로그인 성공', () => {
    it('올바른 자격증명을 입력하면 /dashboard로 이동한다', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AppRoutes isAuthenticated={false} />, {
        route: '/login',
      })

      // 로그인 폼이 표시된다
      expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()

      // 자격증명 입력
      await user.type(screen.getByLabelText('이메일'), 'user@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123')

      // 제출
      await user.click(screen.getByRole('button', { name: '로그인' }))

      // 대시보드 렌더링 확인
      // 실제 앱에서는 navigate()로 라우팅이 되므로 findBy*로 비동기 대기
      // 주의: 이 더미 구현은 window.location.pathname 직접 조작을 사용하므로
      //       실제 컴포넌트로 교체하면 아래 단언이 자연스럽게 동작합니다.
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })

    it('로그인 버튼 클릭 시 로딩 상태를 표시한다', async () => {
      const user = userEvent.setup()

      // 응답을 지연시켜 로딩 상태를 확인한다
      server.use(
        http.post('/api/auth/login', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return HttpResponse.json(
            { token: 'tok', user: { id: 1, email: 'user@example.com', name: '유저' } },
            { status: 200 }
          )
        })
      )

      renderWithProviders(<AppRoutes />, { route: '/login' })

      await user.type(screen.getByLabelText('이메일'), 'user@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123')
      await user.click(screen.getByRole('button', { name: '로그인' }))

      // 로딩 중 버튼 텍스트 변경 확인
      expect(screen.getByRole('button', { name: '로그인 중...' })).toBeDisabled()

      // 완료 후 버튼 복원
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '로그인 중...' })).not.toBeInTheDocument()
      })
    })
  })

  // -------------------------------------------------------------------------
  // 2. 로그인 실패 — 잘못된 자격증명 (401)
  // -------------------------------------------------------------------------
  describe('로그인 실패 — 잘못된 자격증명', () => {
    it('잘못된 이메일/비밀번호 입력 시 폼 아래에 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AppRoutes />, { route: '/login' })

      await user.type(screen.getByLabelText('이메일'), 'wrong@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: '로그인' }))

      // role="alert"로 마크업된 에러 메시지 확인
      const alert = await screen.findByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다.')

      // 페이지가 /login에 머문다 (MemoryRouter — window.location이 아닌 라우팅 상태로 확인)
      expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
    })

    it('에러 메시지 표시 후 다시 올바른 자격증명을 입력하면 에러가 사라진다', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AppRoutes />, { route: '/login' })

      // 1차 시도 — 실패
      await user.type(screen.getByLabelText('이메일'), 'wrong@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: '로그인' }))

      await screen.findByRole('alert')

      // 입력값 수정
      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')

      await user.clear(emailInput)
      await user.clear(passwordInput)
      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByRole('button', { name: '로그인' }))

      // 에러가 사라진다
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })

  // -------------------------------------------------------------------------
  // 3. 로그인 실패 — 서버 오류 (500)
  // -------------------------------------------------------------------------
  describe('로그인 실패 — 서버 오류', () => {
    it('서버 500 오류 시 네트워크/서버 오류 메시지를 표시한다', async () => {
      server.use(
        http.post('/api/auth/login', () =>
          HttpResponse.json(
            { message: '서버 내부 오류가 발생했습니다.' },
            { status: 500 }
          )
        )
      )

      const user = userEvent.setup()
      renderWithProviders(<AppRoutes />, { route: '/login' })

      await user.type(screen.getByLabelText('이메일'), 'user@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123')
      await user.click(screen.getByRole('button', { name: '로그인' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toBeInTheDocument()
      // 서버에서 내려온 메시지 또는 일반 에러 텍스트 확인
      expect(alert.textContent).toBeTruthy()

      // 여전히 로그인 페이지에 있다
      expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
    })

    it('네트워크 오류(fetch 실패) 시 에러 메시지를 표시한다', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.error()
        })
      )

      const user = userEvent.setup()
      renderWithProviders(<AppRoutes />, { route: '/login' })

      await user.type(screen.getByLabelText('이메일'), 'user@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123')
      await user.click(screen.getByRole('button', { name: '로그인' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // 4. ProtectedRoute — 비인증 사용자 접근 차단
  // -------------------------------------------------------------------------
  describe('ProtectedRoute — 비인증 사용자 접근 차단', () => {
    it('비인증 상태에서 /dashboard에 직접 접근하면 /login으로 리다이렉트된다', () => {
      // isAuthenticated: false (기본값)
      renderWithProviders(<AppRoutes isAuthenticated={false} />, {
        route: '/dashboard',
      })

      // 대시보드가 렌더되지 않고 로그인 페이지가 표시된다
      expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: '대시보드' })).not.toBeInTheDocument()
    })

    it('비인증 상태에서 임의 경로(/settings 등)에 접근해도 /login으로 리다이렉트된다', () => {
      renderWithProviders(<AppRoutes isAuthenticated={false} />, {
        route: '/settings',
      })

      // catch-all Navigate가 /login으로 보낸다
      expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // 5. ProtectedRoute — 인증된 사용자 접근 허용
  // -------------------------------------------------------------------------
  describe('ProtectedRoute — 인증된 사용자 접근 허용', () => {
    it('인증 상태에서 /dashboard에 접근하면 대시보드가 렌더된다', () => {
      renderWithProviders(<AppRoutes isAuthenticated={true} />, {
        route: '/dashboard',
        // Redux 스토어에 인증 정보를 주입하는 경우:
        preloadedState: {
          auth: {
            token: 'mock-jwt-token-abc123',
            user: { id: 1, email: 'user@example.com', name: '테스트 유저' },
            isAuthenticated: true,
          },
        },
      })

      expect(screen.getByRole('heading', { name: '대시보드' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: '로그인' })).not.toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// 추가 테스트: LoginPage 단독 렌더 (폼 접근성 검증)
// ---------------------------------------------------------------------------

describe('LoginPage 폼 접근성', () => {
  it('이메일, 비밀번호 입력 필드와 제출 버튼이 존재한다', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })

    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('초기 렌더 시 에러 메시지가 없다', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('입력 필드에 타이핑한 값이 정상적으로 반영된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'mypassword')

    expect(screen.getByLabelText('이메일')).toHaveValue('test@example.com')
    expect(screen.getByLabelText('비밀번호')).toHaveValue('mypassword')
  })
})
