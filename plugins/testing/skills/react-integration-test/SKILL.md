---
name: react-integration-test
description: |
  React 통합 테스트(Integration Test) 코드를 작성합니다.
  여러 컴포넌트를 실제 Provider(Router/Redux/React Query/Context) 환경에서 조합하여
  사용자 플로우 시나리오를 검증합니다.
  MSW로 API를 모킹하고 renderWithProviders 패턴으로 실제 앱과 동일한 환경을 구성합니다.

  다음 상황에서 반드시 이 스킬을 사용하세요:
  - "통합 테스트 작성해줘", "여러 컴포넌트 묶어서 테스트", "사용자 플로우 테스트" 요청 시
  - "로그인 흐름 테스트", "폼 제출 후 API 호출 → 화면 변화 테스트" 요청 시
  - "React Router 포함 테스트", "페이지 이동 테스트", "protected route 테스트" 요청 시
  - "Redux store 통합 테스트", "React Query + MSW 통합", "Zustand 테스트" 요청 시
  - "renderWithProviders 설정해줘", "test-utils.tsx 만들어줘" 요청 시
  - "단위 테스트만으로 부족해", "실제 흐름 테스트가 필요해", "E2E 없이 유저 시나리오 검증" 요청 시
  - "react integration test", "feature test", "scenario test", "flow test" 언급 시
  - "인증 흐름 테스트", "장바구니 플로우 테스트", "다단계 폼 테스트" 같은 복합 시나리오 요청 시
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# React Integration Test 스킬

여러 컴포넌트가 **실제 Provider 환경에서 함께 동작하는 시나리오**를 검증하는 통합 테스트를 작성한다.
단위 테스트가 "이 버튼이 클릭될 때 핸들러가 호출되는가"를 확인한다면, 통합 테스트는 "사용자가 로그인하면 대시보드로 이동하고 데이터가 표시되는가"를 확인한다.

> Provider 설정 패턴은 `references/providers-setup.md`, 시나리오 템플릿은 `references/flow-patterns.md`를 참조한다.

---

## Phase 0: 프로젝트 스택 파악

### 의존성 스캔

```bash
cat package.json
```

확인 포인트:

| 확인 항목 | 감지 시그널 | 영향 |
|-----------|------------|------|
| 테스트 프레임워크 | `jest` / `vitest` | 설정 파일 위치, mock API |
| 라우팅 | `react-router-dom` 버전 | MemoryRouter vs BrowserRouter |
| 전역 상태 | `redux`, `@reduxjs/toolkit`, `zustand`, `jotai` | store 래핑 필요 |
| 서버 상태 | `@tanstack/react-query` | QueryClientProvider + 재시도 off |
| API 모킹 | `msw` 버전 (v1 vs v2) | `rest` vs `http` API |
| 스타일 | `styled-components`, `@mui/material` | ThemeProvider 필요 여부 |

### 기존 테스트 인프라 확인

```bash
# 기존 test-utils 또는 setupTests 파일 탐색
find src -name "test-utils*" -o -name "setupTests*" | head -10
```

기존 `renderWithProviders`나 커스텀 render 함수가 있으면 재사용한다. 없으면 Phase 2에서 생성한다.

---

## Phase 1: 테스트 범위 결정

### 통합 테스트가 적합한 시나리오

통합 테스트는 **여러 계층이 연결되는 지점**에서 가장 가치 있다.

| 시나리오 유형 | 예시 | 핵심 검증 포인트 |
|-------------|------|----------------|
| 인증 플로우 | 로그인 → 토큰 저장 → 보호된 페이지 | 리다이렉트, 토큰 처리, 접근 제어 |
| 폼 → API → UI 갱신 | 댓글 작성 → API POST → 목록 업데이트 | 유효성 검사, API 호출, 상태 반영 |
| 목록 → 상세 | 아이템 클릭 → 라우팅 → 상세 페이지 데이터 | 라우트 파라미터, 데이터 페칭 |
| 전역 상태 변경 | 장바구니 추가 → 헤더 카운트 변경 | store 업데이트가 원격 컴포넌트에 반영 |
| 에러/로딩 상태 | API 실패 → 에러 UI, 재시도 | 사용자 피드백 |

여러 파일을 읽어 **어떤 컴포넌트들이 함께 동작하는지**를 먼저 파악한다.

---

## Phase 2: renderWithProviders 설정

통합 테스트의 핵심은 **실제 앱과 동일한 Provider 환경**을 구성하는 것이다. 상세 설정 예제는 `references/providers-setup.md`를 참조한다.

### 기본 패턴

```typescript
// src/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// 프로젝트 스택에 맞게 Provider 조합 (아래 예시는 RTK + React Query + Router)
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={setupStore()}>
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
```

**React Query 클라이언트는 테스트마다 새로 생성한다.** 재시도는 off로 설정해야 에러 테스트가 즉시 실패 상태로 넘어간다:

```typescript
const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
})
```

---

## Phase 3: 시나리오별 테스트 작성

### 시나리오 1: 인증 플로우

```typescript
import { renderWithProviders, screen } from '../test-utils'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('로그인 플로우', () => {
  test('유효한 자격증명으로 로그인하면 대시보드로 이동한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/login' })

    await user.type(screen.getByLabelText('이메일'), 'user@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123')
    await user.click(screen.getByRole('button', { name: /로그인/i }))

    // API 응답 후 리다이렉트 확인
    expect(await screen.findByText('대시보드')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/dashboard')
  })

  test('잘못된 자격증명으로 로그인하면 오류를 표시한다', async () => {
    const user = userEvent.setup()
    // MSW에서 401 응답하도록 오버라이드
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
      )
    )

    renderWithProviders(<App />, { route: '/login' })
    await user.type(screen.getByLabelText('이메일'), 'wrong@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /로그인/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('이메일 또는 비밀번호')
    expect(window.location.pathname).toBe('/login')
  })

  test('비인증 사용자가 보호된 페이지에 접근하면 로그인으로 리다이렉트한다', async () => {
    renderWithProviders(<App />, { route: '/dashboard' })

    // ProtectedRoute가 로그인 페이지로 리다이렉트
    expect(await screen.findByText('로그인')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })
})
```

---

### 시나리오 2: 폼 제출 → API → UI 갱신

폼 컴포넌트, 목록 컴포넌트, API 통신이 함께 동작하는 시나리오다.

```typescript
describe('댓글 작성 플로우', () => {
  test('댓글 작성 후 목록에 즉시 반영된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PostDetail postId="1" />)

    // 기존 댓글 로드 대기
    await screen.findByText('첫 번째 댓글')

    // 새 댓글 작성
    await user.type(screen.getByLabelText('댓글 입력'), '새로운 댓글입니다')
    await user.click(screen.getByRole('button', { name: /등록/i }))

    // API 응답 후 목록 업데이트 확인
    expect(await screen.findByText('새로운 댓글입니다')).toBeInTheDocument()
    // 입력창 초기화 확인
    expect(screen.getByLabelText('댓글 입력')).toHaveValue('')
  })

  test('필수 입력값 없이 제출하면 유효성 오류를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PostDetail postId="1" />)

    await user.click(screen.getByRole('button', { name: /등록/i }))

    expect(screen.getByText('댓글을 입력해주세요')).toBeInTheDocument()
    // API 요청이 발생하지 않음 — MSW의 onUnhandledRequest: 'error'가 잡아줌
  })

  test('API 오류 시 에러 메시지를 표시하고 폼을 유지한다', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/posts/:id/comments', () =>
        HttpResponse.json({ message: '서버 오류' }, { status: 500 })
      )
    )

    renderWithProviders(<PostDetail postId="1" />)
    await user.type(screen.getByLabelText('댓글 입력'), '내용')
    await user.click(screen.getByRole('button', { name: /등록/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('서버 오류')
    // 작성 중이던 내용 유지 확인
    expect(screen.getByLabelText('댓글 입력')).toHaveValue('내용')
  })
})
```

---

### 시나리오 3: React Query 캐싱 및 뮤테이션

```typescript
describe('React Query 통합', () => {
  test('데이터를 로드하고 로딩·성공 상태를 순서대로 표시한다', async () => {
    renderWithProviders(<UserList />)

    // 로딩 상태 (초기)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // 성공 상태 (MSW 응답 후)
    const userItems = await screen.findAllByRole('listitem')
    expect(userItems.length).toBeGreaterThan(0)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  test('삭제 뮤테이션 후 목록에서 아이템이 사라진다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserList />)

    await screen.findByText('홍길동')

    // 삭제 버튼 클릭
    const deleteButton = screen.getByRole('button', { name: /홍길동 삭제/i })
    await user.click(deleteButton)

    // 확인 다이얼로그
    await user.click(screen.getByRole('button', { name: /확인/i }))

    // 목록에서 제거 확인
    await waitForElementToBeRemoved(() => screen.queryByText('홍길동'))
  })

  test('에러 상태에서 재시도 버튼을 클릭하면 다시 페칭한다', async () => {
    let callCount = 0
    server.use(
      http.get('/api/users', () => {
        callCount++
        if (callCount === 1) {
          return HttpResponse.json({ message: '오류' }, { status: 500 })
        }
        return HttpResponse.json([{ id: 1, name: '홍길동' }])
      })
    )

    renderWithProviders(<UserList />)
    const retryButton = await screen.findByRole('button', { name: /다시 시도/i })
    await userEvent.click(retryButton)

    expect(await screen.findByText('홍길동')).toBeInTheDocument()
  })
})
```

---

### 시나리오 4: 전역 상태(Redux / Zustand) 연동

서로 다른 컴포넌트가 같은 store를 통해 상태를 공유하는 시나리오다.

```typescript
describe('장바구니 전역 상태 연동', () => {
  test('상품 추가 시 헤더 장바구니 아이콘 카운트가 증가한다', async () => {
    const user = userEvent.setup()
    // ProductCard와 CartIcon은 다른 컴포넌트 트리에 있음
    renderWithProviders(
      <>
        <Header />
        <ProductCard productId="1" />
      </>
    )

    // 초기 장바구니 0개
    expect(screen.getByLabelText('장바구니 (0개)')).toBeInTheDocument()

    // 상품 추가
    await user.click(screen.getByRole('button', { name: /장바구니 추가/i }))

    // Header의 아이콘이 즉시 업데이트 (같은 store 구독)
    expect(screen.getByLabelText('장바구니 (1개)')).toBeInTheDocument()
  })

  test('특정 초기 상태로 store를 설정하여 테스트한다', async () => {
    renderWithProviders(<CartPage />, {
      preloadedState: {
        cart: {
          items: [
            { id: 1, name: '상품A', price: 10000, quantity: 2 },
            { id: 2, name: '상품B', price: 5000, quantity: 1 }
          ]
        }
      }
    })

    expect(screen.getByText('총 합계: 25,000원')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3) // 헤더 + 2개 상품
  })
})
```

`preloadedState`를 지원하려면 `renderWithProviders`가 store 생성을 받아야 한다. `references/providers-setup.md`의 RTK 예제를 참조한다.

---

### 시나리오 5: 라우팅 및 내비게이션

```typescript
describe('라우팅 통합', () => {
  test('목록에서 아이템 클릭 시 상세 페이지로 이동한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/users' })

    await screen.findByText('홍길동')

    await user.click(screen.getByRole('link', { name: '홍길동' }))

    // 상세 페이지 렌더링
    expect(await screen.findByText('사용자 상세')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/users/1')
  })

  test('브레드크럼 뒤로가기가 목록 페이지로 이동한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/users/1' })

    await screen.findByText('사용자 상세')

    await user.click(screen.getByRole('link', { name: /사용자 목록/i }))

    expect(await screen.findByText('전체 사용자')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/users')
  })
})
```

---

## Phase 4: 안티패턴 진단

완성된 통합 테스트를 검토하여 아래 문제를 수정 제안한다.

| 안티패턴 | 문제 | 해결 |
|---------|------|------|
| 모든 의존성을 Mock으로 교체 | 사실상 단위 테스트와 동일 | 외부 API만 MSW로 모킹, 내부 로직은 실제 사용 |
| 구현 세부사항 검증 (store 직접 접인) | 리팩터링에 취약 | UI에 나타난 결과만 단언 |
| `getByTestId` 남용 | 접근성 검증 누락 | `getByRole`, `getByLabelText` 우선 |
| 너무 많은 시나리오를 하나의 테스트에 | 실패 원인 파악 어려움 | 테스트 1개 = 시나리오 1개 |
| Provider 누락으로 Context 에러 | 런타임 에러 | `renderWithProviders` 일관 사용 |
| 비동기 처리 누락 | Flaky 테스트, act warning | `await screen.findBy*` 또는 `waitFor` 사용 |
| QueryClient 재사용 | 테스트 간 캐시 오염 | 매 테스트마다 새 QueryClient 생성 |
| MSW 핸들러 미리셋 | 이전 테스트의 오버라이드가 남음 | `afterEach(() => server.resetHandlers())` 필수 |

---

## Phase 5: 결과 요약

테스트 작성 완료 후 다음 형식으로 보고한다:

```
## 생성된 통합 테스트 요약

| 파일 | 테스트 수 | 커버 시나리오 | MSW 오버라이드 |
|------|-----------|--------------|--------------|
| auth.integration.test.tsx | 3개 | 로그인 성공/실패, Protected Route | POST /api/auth/login 401 |
| post-detail.integration.test.tsx | 3개 | 댓글 작성, 유효성, API 오류 | POST /api/posts/:id/comments 500 |
| user-list.integration.test.tsx | 3개 | 목록 로딩, 삭제, 재시도 | GET /api/users 500 |

## 설정 파일 생성 여부
- [ ] src/test-utils.tsx — renderWithProviders 생성
- [ ] src/mocks/handlers.ts — MSW 핸들러 생성
- [ ] src/mocks/server.ts — 서버 설정 생성

## 다음 단계 제안
- [ ] MSW 핸들러가 없으면 references/providers-setup.md 참조하여 설정
- [ ] E2E 테스트 보완이 필요한 시나리오: [목록]
- [ ] 커버리지 측정: npx vitest run --coverage
```

---

## 참고 자료

- `references/providers-setup.md` — RTK / Zustand / React Query / Router Provider 설정 예제
- `references/flow-patterns.md` — 인증, CRUD, 페이지네이션, 에러 바운더리 등 시나리오 템플릿
