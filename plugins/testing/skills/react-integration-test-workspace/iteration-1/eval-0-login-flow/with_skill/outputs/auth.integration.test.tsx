// src/__tests__/auth.integration.test.tsx
// 로그인 플로우 통합 테스트 — Vite + React 18 + React Router v6 + Redux Toolkit + MSW v2
import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderWithProviders, userEvent } from '../test-utils'
import { handlers } from '../mocks/handlers'

// ----------------------------------------------------------------
// App 컴포넌트 구조 (실제 프로젝트에 맞게 import 경로 수정)
// ----------------------------------------------------------------
// 아래 import는 실제 프로젝트의 컴포넌트를 가리켜야 합니다.
// 예:
//   import App from '../App'
//   import { LoginPage } from '../pages/LoginPage'
//   import { ProtectedRoute } from '../components/ProtectedRoute'
//
// 이 테스트 파일은 App을 진입점으로 사용합니다.
// App이 React Router Routes/Route를 포함하고,
// /login → LoginPage, /dashboard → DashboardPage (ProtectedRoute 안에)
// 구조를 가진다고 가정합니다.
//
// import App from '../App'
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// MSW 서버
// ----------------------------------------------------------------
const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())   // 테스트 간 핸들러 오버라이드 초기화
afterAll(() => server.close())

// ----------------------------------------------------------------
// 테스트 스위트
// ----------------------------------------------------------------

describe('로그인 플로우 통합 테스트', () => {
  /**
   * 시나리오 1: 로그인 성공 → /dashboard 이동
   *
   * 1. /login 페이지 렌더링
   * 2. 이메일·비밀번호 입력
   * 3. 로그인 버튼 클릭
   * 4. MSW가 200 응답
   * 5. /dashboard로 이동 확인
   */
  test('올바른 자격증명으로 로그인하면 /dashboard로 이동한다', async () => {
    const user = userEvent.setup()

    // App 전체를 /login 경로에서 렌더링
    // renderWithProviders(<App />, { route: '/login' })
    //
    // --- 실제 컴포넌트가 없으므로 인라인 App 대역(stub)으로 시연 ---
    const { Routes, Route, Navigate, useNavigate } = await import('react-router-dom')
    const { useDispatch, useSelector } = await import('react-redux')
    const { setCredentials } = await import('../test-utils')
    const React = await import('react')

    function LoginPage() {
      const dispatch = useDispatch()
      const navigate = useNavigate()
      const [email, setEmail] = React.useState('')
      const [password, setPassword] = React.useState('')
      const [error, setError] = React.useState<string | null>(null)

      async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          if (!res.ok) {
            const data = await res.json()
            setError(data.message)
            return
          }
          const data = await res.json()
          dispatch(setCredentials({ token: data.token, user: data.user }))
          navigate('/dashboard')
        } catch {
          setError('네트워크 오류가 발생했습니다')
        }
      }

      return (
        <form onSubmit={handleSubmit}>
          <h1>로그인</h1>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <button type="submit">로그인</button>
        </form>
      )
    }

    function DashboardPage() {
      return <main><h1>대시보드</h1><p>환영합니다</p></main>
    }

    function ProtectedRoute({ children }: { children: React.ReactNode }) {
      const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated)
      return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
    }

    function TestApp() {
      return (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )
    }
    // --- stub 끝 ---

    renderWithProviders(<TestApp />, { route: '/login' })

    // 폼 요소 확인
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()

    // 사용자 입력
    await user.type(screen.getByLabelText('이메일'), 'user@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.click(screen.getByRole('button', { name: /로그인/i }))

    // MSW 응답 처리 후 대시보드 이동 확인 (비동기 쿼리)
    expect(await screen.findByRole('heading', { name: '대시보드' })).toBeInTheDocument()

    // 로그인 폼이 더 이상 표시되지 않음
    expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument()
  })

  /**
   * 시나리오 2: 로그인 실패 → 에러 메시지 표시
   *
   * 1. MSW 핸들러를 401 응답으로 오버라이드
   * 2. 잘못된 자격증명 입력
   * 3. form 아래에 에러 메시지 렌더링 확인
   * 4. 여전히 /login에 머무름 확인
   */
  test('잘못된 자격증명으로 로그인하면 에러 메시지가 표시된다', async () => {
    // MSW 핸들러를 401로 오버라이드 (이 테스트에서만 적용)
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          { message: '이메일 또는 비밀번호가 올바르지 않습니다' },
          { status: 401 }
        )
      )
    )

    const user = userEvent.setup()
    const { Routes, Route, Navigate, useNavigate } = await import('react-router-dom')
    const { useDispatch } = await import('react-redux')
    const { setCredentials } = await import('../test-utils')
    const React = await import('react')

    function LoginPage() {
      const dispatch = useDispatch()
      const navigate = useNavigate()
      const [email, setEmail] = React.useState('')
      const [password, setPassword] = React.useState('')
      const [error, setError] = React.useState<string | null>(null)

      async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.message)
          return
        }
        const data = await res.json()
        dispatch(setCredentials({ token: data.token, user: data.user }))
        navigate('/dashboard')
      }

      return (
        <form onSubmit={handleSubmit}>
          <h1>로그인</h1>
          <label htmlFor="email">이메일</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password">비밀번호</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p role="alert">{error}</p>}
          <button type="submit">로그인</button>
        </form>
      )
    }

    function TestApp() {
      return (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>대시보드</div>} />
        </Routes>
      )
    }

    renderWithProviders(<TestApp />, { route: '/login' })

    await user.type(screen.getByLabelText('이메일'), 'wrong@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /로그인/i }))

    // form 아래에 에러 메시지 표시 (비동기 쿼리)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다')

    // 여전히 로그인 페이지에 머무름
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
    // 대시보드가 렌더링되지 않음
    expect(screen.queryByText('대시보드')).not.toBeInTheDocument()
  })

  /**
   * 시나리오 3: 비인증 사용자가 보호된 경로(/dashboard)에 접근 → /login 리다이렉트
   *
   * 1. store의 auth.isAuthenticated = false (기본값)
   * 2. /dashboard 접근
   * 3. ProtectedRoute가 /login으로 Navigate
   * 4. 로그인 페이지가 렌더링됨 확인
   */
  test('비인증 사용자가 /dashboard에 접근하면 /login으로 리다이렉트된다', async () => {
    const { Routes, Route, Navigate } = await import('react-router-dom')
    const { useSelector } = await import('react-redux')
    const React = await import('react')

    function LoginPage() {
      return <h1>로그인</h1>
    }

    function DashboardPage() {
      return <h1>대시보드</h1>
    }

    function ProtectedRoute({ children }: { children: React.ReactNode }) {
      const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated)
      return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
    }

    function TestApp() {
      return (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      )
    }

    // 인증되지 않은 기본 store 상태로 /dashboard 접근 시도
    renderWithProviders(<TestApp />, {
      route: '/dashboard',
      preloadedState: {
        auth: { token: null, user: null, isAuthenticated: false },
      },
    })

    // /login으로 리다이렉트 → 로그인 페이지 렌더링 확인 (비동기 쿼리)
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()

    // 대시보드 컨텐츠가 렌더링되지 않음
    expect(screen.queryByText('대시보드')).not.toBeInTheDocument()
  })

  /**
   * 시나리오 4 (보너스): 인증된 사용자가 /dashboard에 접근하면 정상 진입
   *
   * preloadedState로 인증 상태를 사전 설정한다.
   */
  test('인증된 사용자가 /dashboard에 접근하면 대시보드가 표시된다', async () => {
    const { Routes, Route, Navigate } = await import('react-router-dom')
    const { useSelector } = await import('react-redux')
    const React = await import('react')

    function LoginPage() {
      return <h1>로그인</h1>
    }

    function DashboardPage() {
      return <main><h1>대시보드</h1><p>홍길동님, 환영합니다</p></main>
    }

    function ProtectedRoute({ children }: { children: React.ReactNode }) {
      const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated)
      return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
    }

    function TestApp() {
      return (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      )
    }

    // 인증된 상태로 store 초기화
    renderWithProviders(<TestApp />, {
      route: '/dashboard',
      preloadedState: {
        auth: {
          token: 'test-jwt-token',
          user: { id: 1, name: '홍길동' },
          isAuthenticated: true,
        },
      },
    })

    // 대시보드 컨텐츠 표시 확인
    expect(await screen.findByRole('heading', { name: '대시보드' })).toBeInTheDocument()
    expect(screen.getByText('홍길동님, 환영합니다')).toBeInTheDocument()

    // 로그인 페이지가 렌더링되지 않음
    expect(screen.queryByRole('heading', { name: '로그인' })).not.toBeInTheDocument()
  })
})
