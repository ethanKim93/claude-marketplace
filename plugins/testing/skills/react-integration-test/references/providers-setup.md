# Provider 설정 패턴

통합 테스트에서 `renderWithProviders`를 구성하는 패턴 모음.
프로젝트 스택에 맞는 예제를 선택하여 `src/test-utils.tsx`에 작성한다.

---

## 패턴 1: React Router + Context API만 사용 (경량)

```typescript
// src/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: MemoryRouterProps['initialEntries']
  initialIndex?: number
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ['/'], initialIndex, ...renderOptions }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export * from '@testing-library/react'
```

**사용 예:**
```typescript
renderWithProviders(<App />, { initialEntries: ['/dashboard'] })
```

---

## 패턴 2: Redux Toolkit + React Router

```typescript
// src/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { setupStore, AppStore, RootState } from './store'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>
  store?: AppStore
  route?: string
}

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

  // store를 반환하여 테스트에서 store.getState() 접근 가능
  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store }
}

export * from '@testing-library/react'
```

**store 설정 참고:**
```typescript
// src/store/index.ts
import { configureStore, PreloadedState } from '@reduxjs/toolkit'
import cartReducer from './cartSlice'
import authReducer from './authSlice'

export const setupStore = (preloadedState?: PreloadedState<RootState>) =>
  configureStore({
    reducer: { cart: cartReducer, auth: authReducer },
    preloadedState
  })

export type AppStore = ReturnType<typeof setupStore>
export type RootState = ReturnType<AppStore['getState']>
```

**사용 예:**
```typescript
// preloadedState로 초기 장바구니 설정
const { store } = renderWithProviders(<CartPage />, {
  preloadedState: { cart: { items: [{ id: 1, name: '상품A', price: 10000, quantity: 1 }] } }
})

// dispatch 후 store 상태 확인
await userEvent.click(screen.getByRole('button', { name: /추가/i }))
expect(store.getState().cart.items).toHaveLength(2)
```

---

## 패턴 3: React Query + React Router

```typescript
// src/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// 테스트용 QueryClient — 재시도 없음, 캐시 즉시 만료
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,        // v5: cacheTime → gcTime
        staleTime: 0,
      },
      mutations: { retry: false },
    },
    // 테스트 중 콘솔 에러 억제 (예상된 에러 케이스)
    // logger: { log: console.log, warn: console.warn, error: () => {} }
  })

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient }
}

export * from '@testing-library/react'
```

**사용 예:**
```typescript
// 특정 캐시 상태 사전 설정
const queryClient = createTestQueryClient()
queryClient.setQueryData(['user', 1], { id: 1, name: '홍길동' })

renderWithProviders(<UserProfile userId={1} />, { queryClient })

// 캐시 데이터가 즉시 표시됨 (네트워크 요청 없음)
expect(screen.getByText('홍길동')).toBeInTheDocument()
```

---

## 패턴 4: 풀스택 (RTK + React Query + Router + Theme)

대부분의 중대형 앱에서 사용하는 완전한 패턴이다.

```typescript
// src/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { setupStore, AppStore, RootState } from './store'
import { theme } from './styles/theme'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>
  store?: AppStore
  route?: string
  queryClient?: QueryClient
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    route = '/',
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>
            <ThemeProvider theme={theme}>
              {children}
            </ThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store, queryClient }
}

export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
```

---

## 패턴 5: Zustand 스토어

Zustand는 Context 기반이 아니라 모듈 수준 singleton이므로, 테스트 간 상태 누수를 막기 위해 `beforeEach`에서 초기화한다.

```typescript
// src/store/useCartStore.ts (Zustand)
import { create } from 'zustand'

interface CartItem { id: number; name: string; quantity: number }
interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  clearCart: () => set({ items: [] }),
}))
```

```typescript
// 테스트 파일에서 Zustand 스토어 초기화
import { useCartStore } from '../store/useCartStore'
import { renderWithProviders, screen } from '../test-utils'

beforeEach(() => {
  // 테스트마다 Zustand 스토어 초기화
  useCartStore.setState({ items: [] })
})

test('장바구니에 상품을 추가할 수 있다', async () => {
  renderWithProviders(<CartPage />)
  // ...
})

test('특정 초기 상태로 테스트', async () => {
  // 특정 상태로 초기화
  useCartStore.setState({
    items: [{ id: 1, name: '상품A', quantity: 2 }]
  })

  renderWithProviders(<CartSummary />)
  expect(screen.getByText('상품A × 2')).toBeInTheDocument()
})
```

---

## MSW 서버 설정

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw'

export const handlers = [
  http.get('/api/users', async () => {
    await delay(10) // 로딩 상태 테스트를 위한 약간의 지연
    return HttpResponse.json([
      { id: 1, name: '홍길동', email: 'hong@example.com' },
      { id: 2, name: '김철수', email: 'kim@example.com' },
    ])
  }),

  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: '홍길동', email: 'hong@example.com' })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json()
    if (email === 'user@example.com' && password === 'password123') {
      return HttpResponse.json({ token: 'test-token', user: { id: 1, name: '홍길동' } })
    }
    return HttpResponse.json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 3, ...body }, { status: 201 })
  }),

  http.delete('/api/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 })
  }),
]
```

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```typescript
// src/setupTests.ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'

// 처리되지 않은 요청은 에러로 처리 (핸들러 누락 감지)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```
