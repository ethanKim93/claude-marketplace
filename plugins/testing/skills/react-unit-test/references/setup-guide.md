# React 테스트 환경 설정 가이드

Jest와 Vitest 설정, MSW 초기화, TypeScript 지원 방법.

---

## 프레임워크 선택 기준

| 상황 | 권장 |
|------|------|
| Vite 기반 신규 프로젝트 | **Vitest** — 설정 최소, ESM 네이티브, 빠름 |
| CRA(Create React App) | **Jest** — 이미 내장, 별도 설정 불필요 |
| Next.js | **Jest** — 공식 권장 (`next/jest` 설정 제공) |
| 기존 Jest 프로젝트 마이그레이션 | **현상 유지** — API가 거의 동일해 마이그레이션 이점 적음 |

---

## Jest 설정

### 의존성 설치

```bash
npm install -D \
  jest \
  jest-environment-jsdom \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  babel-jest \
  @babel/preset-env \
  @babel/preset-react

# TypeScript 사용 시 추가
npm install -D @babel/preset-typescript ts-jest
```

### jest.config.js

```javascript
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    // CSS 모듈 모킹
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // 경로 alias (tsconfig의 paths와 일치시킴)
    '^@/(.*)$': '<rootDir>/src/$1',
    // 이미지/svg 모킹
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/index.{js,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/setupTests.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

### src/setupTests.js

```javascript
import '@testing-library/jest-dom'

// 글로벌 fetch 모킹 (MSW 미사용 시)
// global.fetch = jest.fn()

// IntersectionObserver 모킹 (무한 스크롤 등)
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// ResizeObserver 모킹
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// matchMedia 모킹 (반응형 컴포넌트)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
```

### babel.config.js (Jest용)

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript', // TypeScript 사용 시
  ],
}
```

### package.json 스크립트

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

---

## Vitest 설정

### 의존성 설치

```bash
npm install -D \
  vitest \
  @vitest/ui \
  jsdom \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  @vitejs/plugin-react

# 커버리지 (둘 중 하나)
npm install -D @vitest/coverage-v8        # 빠름, Node.js 내장
npm install -D @vitest/coverage-istanbul  # 더 정확한 브랜치 커버리지
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,          // describe, test, expect를 import 없이 사용
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',       // 또는 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',          // tsconfig paths와 일치
    },
  },
})
```

### src/setupTests.ts (Vitest)

```typescript
import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// 각 테스트 후 DOM 정리
afterEach(() => {
  cleanup()
})

// IntersectionObserver 모킹
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
})) as unknown as typeof IntersectionObserver

// ResizeObserver 모킹
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
})) as unknown as typeof ResizeObserver
```

### package.json 스크립트 (Vitest)

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage"
  }
}
```

---

## MSW (Mock Service Worker) 설정

네트워크 레벨에서 API를 모킹하여 실제 요청과 동일한 방식으로 테스트한다. `jest.fn()`으로 fetch를 모킹하는 것보다 훨씬 현실적이다.

### 설치

```bash
npm install -D msw
```

### 핸들러 정의

```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET 요청
  http.get('/api/users/:id', ({ params }) => {
    if (params.id === '999') {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({
      id: params.id,
      name: 'John Doe',
      email: 'john@example.com',
    })
  }),

  // POST 요청
  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: '123', ...body }, { status: 201 })
  }),

  // PUT 요청
  http.put('/api/users/:id', async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: params.id, ...body })
  }),

  // DELETE 요청
  http.delete('/api/users/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // 에러 시뮬레이션
  http.get('/api/error', () => {
    return HttpResponse.error()  // 네트워크 오류
  }),
]
```

### 서버 설정 (Node.js / Jest / Vitest)

```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### setupTests에 서버 연결

```javascript
// src/setupTests.js (또는 .ts)
import { server } from './mocks/server'

// 모든 테스트 전에 서버 시작
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// 각 테스트 후 핸들러 초기화 (테스트별 오버라이드 리셋)
afterEach(() => server.resetHandlers())

// 모든 테스트 후 서버 종료
afterAll(() => server.close())
```

### 테스트별 핸들러 오버라이드

```javascript
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

test('서버 오류 시 에러 메시지를 표시한다', async () => {
  // 이 테스트에서만 핸들러 교체
  server.use(
    http.get('/api/users/:id', () =>
      HttpResponse.json({ message: 'Internal error' }, { status: 500 })
    )
  )

  render(<UserProfile userId="1" />)
  expect(await screen.findByRole('alert')).toBeInTheDocument()
})
// afterEach의 resetHandlers()가 원래 핸들러로 복원함
```

---

## TypeScript 설정

### tsconfig.json (테스트 관련)

```json
{
  "compilerOptions": {
    "types": ["@testing-library/jest-dom", "vitest/globals"],
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### TypeScript용 커스텀 render 함수

```typescript
// src/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>{children}</AuthProvider>
  </ThemeProvider>
)

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

---

## 파일 모킹 설정

```javascript
// __mocks__/fileMock.js — 이미지, SVG 모킹
module.exports = 'test-file-stub'
```

```javascript
// jest.config.js에 추가
moduleNameMapper: {
  '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
}
```

---

## 커버리지 목표치 권장

| 프로젝트 단계 | 권장 목표 | 이유 |
|-------------|---------|------|
| 초기 도입 | 60-70% | 기존 코드에 점진적 추가 |
| 안정화 | 75-85% | 주요 경로 커버 |
| 프로덕션 성숙 | 80-90% | 엣지 케이스 포함 |

**주의**: 100% 커버리지는 목표가 아니다. 커버리지보다 **의미 있는 케이스를 테스트하는 것**이 중요하다. 특히 브랜치(branch) 커버리지가 라인 커버리지보다 중요한 지표다.
