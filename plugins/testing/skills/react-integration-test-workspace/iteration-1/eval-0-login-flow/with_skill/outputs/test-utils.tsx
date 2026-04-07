// src/test-utils.tsx
// RTK + React Router v6 통합 테스트용 renderWithProviders
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore, PreloadedState } from '@reduxjs/toolkit'

// ----- Store 설정 -----
// 실제 프로젝트의 store/index.ts 구조를 반영한다.
// 프로젝트에 authSlice 등이 있다면 여기에 import하여 추가한다.

// 예시 auth 슬라이스 (실제 프로젝트 슬라이스로 교체)
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  token: string | null
  user: { id: number; name: string } | null
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
    setCredentials(state, action: PayloadAction<{ token: string; user: { id: number; name: string } }>) {
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

// setupStore: preloadedState를 받아 테스트마다 독립된 store 인스턴스 생성
export const setupStore = (preloadedState?: PreloadedState<RootState>) =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
      // 프로젝트의 다른 슬라이스 추가
    },
    preloadedState,
  })

export type AppStore = ReturnType<typeof setupStore>
export type RootState = ReturnType<AppStore['getState']>

// ----- renderWithProviders -----

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Redux 초기 상태 (preloadedState) */
  preloadedState?: Partial<RootState>
  /** 외부에서 생성한 store를 직접 전달할 때 사용 */
  store?: AppStore
  /** MemoryRouter의 초기 경로 (기본값: '/') */
  route?: string
}

/**
 * RTK store + MemoryRouter를 포함한 통합 테스트용 render 헬퍼.
 *
 * @example
 * // 기본 사용
 * renderWithProviders(<App />, { route: '/login' })
 *
 * @example
 * // 인증된 상태로 시작
 * renderWithProviders(<App />, {
 *   route: '/dashboard',
 *   preloadedState: {
 *     auth: { token: 'test-token', user: { id: 1, name: '홍길동' }, isAuthenticated: true }
 *   }
 * })
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    route = '/',
    ...renderOptions
  }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </Provider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store }
}

// @testing-library/react의 모든 유틸리티 재-export
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
