// src/test-utils.tsx
// Vite + React 18 + React Router v6 + Redux Toolkit + MSW v2 통합 테스트 유틸리티
//
// 사용법:
//   import { renderWithProviders, screen } from '../test-utils'
//   renderWithProviders(<LoginPage />, { route: '/login' })

import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore, EnhancedStore } from '@reduxjs/toolkit'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// ---------------------------------------------------------------------------
// MSW 서버 설정 (Node 환경 — Vitest/Jest 공통)
// ---------------------------------------------------------------------------

export const server = setupServer(...handlers)

// 전체 테스트 스위트에서 한 번만 호출한다. (예: src/setupTests.ts 또는 vitest.setup.ts)
//
//   import { server } from './test-utils'
//   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
//   afterEach(() => server.resetHandlers())
//   afterAll(() => server.close())

// ---------------------------------------------------------------------------
// Redux Store 타입 — 실제 프로젝트의 rootReducer로 교체하세요
// ---------------------------------------------------------------------------

// 예시: import { rootReducer } from './store/rootReducer'
// 여기서는 최소한의 auth 슬라이스만 inline으로 정의합니다.
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  token: string | null
  user: { id: number; email: string; name: string } | null
  isAuthenticated: boolean
}

const initialAuthState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ token: string; user: AuthState['user'] }>
    ) {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
    },
    logout(state) {
      state.token = null
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setCredentials, logout } = authSlice.actions

// rootReducer에 슬라이스를 등록한다. 실제 프로젝트에서는 기존 rootReducer를 import해서 사용하세요.
const rootReducer = {
  auth: authSlice.reducer,
  // 필요 시 다른 슬라이스 추가: cart: cartSlice.reducer, ...
}

// ---------------------------------------------------------------------------
// Store 팩토리 — 테스트마다 독립된 store 인스턴스 생성
// ---------------------------------------------------------------------------

type RootState = {
  auth: AuthState
  // 슬라이스 추가 시 타입도 함께 확장하세요
}

export function setupStore(preloadedState?: Partial<RootState>): EnhancedStore {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  })
}

// ---------------------------------------------------------------------------
// 커스텀 renderWithProviders
// ---------------------------------------------------------------------------

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** 테스트 시작 URL. 기본값: '/' */
  route?: string
  /** 초기 Redux 상태. 인증된 사용자로 시작할 때 활용. */
  preloadedState?: Partial<RootState>
  /** 외부에서 store 인스턴스를 직접 주입할 때 사용. */
  store?: EnhancedStore
}

export interface RenderWithProvidersResult extends RenderResult {
  store: EnhancedStore
}

/**
 * 실제 앱과 동일한 Provider 환경에서 컴포넌트를 렌더한다.
 *
 * - Redux Provider (RTK store)
 * - MemoryRouter (React Router v6) — 초기 route 지정 가능
 *
 * @example
 * // 기본 사용
 * const { store } = renderWithProviders(<LoginPage />, { route: '/login' })
 *
 * @example
 * // 인증된 사용자 상태에서 시작
 * renderWithProviders(<DashboardPage />, {
 *   route: '/dashboard',
 *   preloadedState: {
 *     auth: { token: 'tok', user: { id: 1, email: 'a@b.com', name: '홍길동' }, isAuthenticated: true }
 *   }
 * })
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    preloadedState,
    store = setupStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderWithProvidersResult {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </Provider>
    )
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions })
  return { ...result, store }
}

/**
 * App 컴포넌트 전체를 특정 경로로 렌더할 때 사용하는 헬퍼.
 * ProtectedRoute + 전체 라우팅 트리가 필요한 테스트에 적합하다.
 *
 * @example
 * renderApp('/dashboard')           // 비인증 → /login 리다이렉트 확인
 * renderApp('/login', preloadedState) // 인증 상태에서 /login 접근 시 동작 확인
 */
export function renderApp(
  route: string,
  preloadedState?: Partial<RootState>
): RenderWithProvidersResult {
  // 실제 App 컴포넌트를 import해서 사용하세요:
  // import App from './App'
  // return renderWithProviders(<App />, { route, preloadedState })
  //
  // 아래는 App이 없는 환경에서 동작하는 최소 placeholder입니다.
  const Placeholder = () => <div>App placeholder — App 컴포넌트로 교체하세요</div>
  return renderWithProviders(<Placeholder />, { route, preloadedState })
}

// ---------------------------------------------------------------------------
// @testing-library/react 전체 re-export — 테스트 파일에서 이 모듈만 import하면 됨
// ---------------------------------------------------------------------------
export * from '@testing-library/react'
