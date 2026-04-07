---
name: react-unit-test
description: |
  React 컴포넌트·커스텀 훅의 단위 테스트 코드를 작성하고 개선합니다.
  소스코드를 분석하여 컴포넌트 유형(순수 UI·상태·Context·비동기·Form)에 맞는
  React Testing Library + Jest/Vitest 기반 테스트를 작성합니다.
  쿼리 우선순위(getByRole 우선), 사용자 행동 시뮬레이션(userEvent), MSW API 모킹,
  커스텀 훅 테스트(renderHook)를 포함한 best practice를 적용합니다.

  다음 상황에서 반드시 이 스킬을 사용하세요:
  - "React 테스트 작성해줘", "컴포넌트 테스트 만들어줘", "RTL로 테스트 짜줘" 요청 시
  - "Jest 테스트", "Vitest 테스트", "React Testing Library" 관련 요청 시
  - "커스텀 훅 테스트", "useEffect 테스트", "Context 테스트" 요청 시
  - "API 모킹", "MSW 설정", "fetch 모킹" 방법을 물을 때
  - "테스트 커버리지 높이기", "React 컴포넌트에 테스트 없어요" 요청 시
  - "getByRole vs getByTestId", "fireEvent vs userEvent 차이" 질문 시
  - "테스트가 불안정해요(flaky)", "act warning 해결", "비동기 테스트 방법" 질문 시
  - 특정 컴포넌트나 훅을 주고 "이거 테스트해줘"라고 요청할 때
  - "react test", "unit test", "프론트엔드 테스트 전략" 언급 시
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# React Unit Test 스킬

React 컴포넌트와 커스텀 훅의 소스코드를 분석하여 **React Testing Library** 기반 단위 테스트를 작성한다.
좋은 React 테스트는 구현 세부사항이 아닌 **사용자가 보고 경험하는 것**을 검증한다.

> 상세 쿼리 레퍼런스와 설정 가이드는 `references/` 디렉터리를 참조한다.

---

## Phase 0: 프로젝트 컨텍스트 파악

### 입력 분류

**A. 특정 파일/컴포넌트 지정**: "Button.jsx 테스트 작성해줘" → 파일 바로 Read  
**B. 디렉터리 단위**: "components 폴더 전체 테스트" → Glob으로 파일 목록 수집  
**C. 기존 테스트 개선**: 테스트 파일을 주고 리뷰 요청 → 문제점 진단 후 개선안 제시  
**D. 설정 질문**: "Jest vs Vitest 어떻게 설정해요?" → `references/setup-guide.md` 참조  

### 환경 감지

```bash
# package.json 분석으로 테스트 환경 파악
cat package.json
```

확인 포인트:

| 확인 항목 | 감지 시그널 |
|-----------|------------|
| 테스트 프레임워크 | `jest` / `vitest` 의존성 |
| 번들러/프레임워크 | `vite` → Vitest 권장, `react-scripts` → Jest 기본 |
| RTL 버전 | `@testing-library/react` 버전 (v13+ = React 18 지원) |
| MSW 사용 여부 | `msw` 의존성 |
| TypeScript | `@types/react`, `tsconfig.json` 존재 여부 |

대상 파일을 Read하여 다음을 파악한다:
- 컴포넌트 유형 (순수 UI / 상태 / Context / 비동기 / Form)
- 외부 의존성 (API 호출, Context, 커스텀 훅, 서드파티 라이브러리)
- Props 인터페이스 및 이벤트 핸들러

---

## Phase 1: 테스트 전략 결정

### 컴포넌트 유형별 전략

| 컴포넌트 유형 | 특징 | 핵심 테스트 포인트 |
|--------------|------|-------------------|
| 순수 UI | Props만 받아 렌더링 | Props → 화면 출력, 이벤트 → 콜백 호출 |
| 상태(useState) | 내부 상태 변화 | 초기 상태, 사용자 액션 후 UI 변화 |
| Context | Provider 의존 | 커스텀 render 래퍼로 Provider 제공 |
| 비동기(useEffect/API) | 로딩·성공·에러 상태 | MSW로 API 모킹, findBy로 비동기 대기 |
| Form | 입력 유효성·제출 | userEvent.type, 에러 메시지, onSubmit 호출 |
| Custom Hook | 훅 로직 | renderHook + act로 상태 변화 검증 |

### 쿼리 선택 원칙

사용자가 실제로 상호작용하는 방식대로 요소를 찾는다. 상세 쿼리 레퍼런스는 `references/rtl-patterns.md`를 참조한다.

```
우선순위 (높음 → 낮음)
1. getByRole           — 버튼, 입력, 헤딩 등 ARIA 역할로 검색 (최우선)
2. getByLabelText      — 폼 레이블과 연결된 입력 필드
3. getByPlaceholderText — placeholder (레이블 없을 때)
4. getByText           — 화면에 보이는 텍스트
5. getByDisplayValue   — 현재 선택된 input/select 값
6. getByAltText        — 이미지 alt 속성
7. getByTitle          — title 속성
8. getByTestId         — data-testid (마지막 수단)
```

---

## Phase 2: 테스트 코드 작성

### 공통 구조 — Arrange / Act / Assert

```javascript
test('버튼 클릭 시 카운트가 증가한다', async () => {
  // arrange: 테스트 대상 렌더링
  render(<Counter />)

  // act: 사용자 행동 시뮬레이션
  await userEvent.click(screen.getByRole('button', { name: /increment/i }))

  // assert: 결과 검증
  expect(screen.getByText('Count: 1')).toBeInTheDocument()
})
```

---

### 유형 1: 순수 UI 컴포넌트

Props를 받아 렌더링만 하는 컴포넌트. 렌더링 결과와 이벤트 핸들러 호출을 검증한다.

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  test('label을 렌더링한다', () => {
    render(<Button label="저장" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: /저장/i })).toBeInTheDocument()
  })

  test('클릭 시 onClick 핸들러를 호출한다', async () => {
    const handleClick = jest.fn()
    render(<Button label="저장" onClick={handleClick} />)

    await userEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('disabled 상태에서는 클릭해도 핸들러를 호출하지 않는다', async () => {
    const handleClick = jest.fn()
    render(<Button label="저장" onClick={handleClick} disabled />)

    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

**체크리스트**:
- [ ] 필수 Props 렌더링 확인
- [ ] 조건부 렌더링 (disabled, hidden, loading 등)
- [ ] 이벤트 핸들러 호출 여부 및 인자

---

### 유형 2: 상태(useState) 컴포넌트

내부 상태 변화에 따른 UI 변경을 검증한다. 내부 상태 변수를 직접 확인하지 않고 화면에 나타나는 결과로 판단한다.

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter'

describe('Counter', () => {
  test('초기값 0으로 시작한다', () => {
    render(<Counter />)
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  test('increment 클릭마다 카운트가 1 증가한다', async () => {
    render(<Counter />)
    const btn = screen.getByRole('button', { name: /increment/i })

    await userEvent.click(btn)
    expect(screen.getByText('Count: 1')).toBeInTheDocument()

    await userEvent.click(btn)
    expect(screen.getByText('Count: 2')).toBeInTheDocument()
  })

  test('reset 클릭 시 초기값으로 돌아간다', async () => {
    render(<Counter />)

    await userEvent.click(screen.getByRole('button', { name: /increment/i }))
    await userEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })
})
```

---

### 유형 3: Context 컴포넌트

Context Provider가 필요한 컴포넌트는 커스텀 render 함수로 Provider를 주입한다.

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../context/ThemeContext'
import { ThemedButton } from './ThemedButton'

// 커스텀 render 래퍼 — Context가 필요한 모든 테스트에 재사용
const renderWithProviders = (ui, options = {}) =>
  render(ui, { wrapper: ThemeProvider, ...options })

describe('ThemedButton', () => {
  test('기본 테마(light)로 렌더링된다', () => {
    renderWithProviders(<ThemedButton label="클릭" />)
    expect(screen.getByRole('button')).toHaveTextContent('light')
  })

  test('클릭 시 테마가 dark로 전환된다', async () => {
    renderWithProviders(<ThemedButton label="클릭" />)

    await userEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toHaveTextContent('dark')
  })
})
```

**팁**: 여러 Provider가 중첩될 경우 `src/test-utils.js`에 통합 래퍼를 만들어 관리한다.

```javascript
// src/test-utils.js
import { render } from '@testing-library/react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'

const AllProviders = ({ children }) => (
  <ThemeProvider>
    <AuthProvider>{children}</AuthProvider>
  </ThemeProvider>
)

export const customRender = (ui, options = {}) =>
  render(ui, { wrapper: AllProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

---

### 유형 4: 비동기 컴포넌트 (useEffect / API 호출)

API 모킹은 `msw`를 사용한다 (jest.fn()으로 fetch를 모킹하면 실제 네트워크 동작과 달라져 신뢰도가 떨어진다). MSW 설정은 `references/setup-guide.md`를 참조한다.

```javascript
import { render, screen } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { UserProfile } from './UserProfile'

// 기본 핸들러 — 성공 케이스
const server = setupServer(
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'John Doe' })
  )
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('UserProfile', () => {
  test('로딩 중에는 스피너를 표시한다', () => {
    render(<UserProfile userId="1" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  test('데이터 로드 완료 후 사용자 이름을 표시한다', async () => {
    render(<UserProfile userId="1" />)

    // findBy = getBy + waitFor (비동기 대기)
    expect(await screen.findByText('John Doe')).toBeInTheDocument()
  })

  test('API 오류 시 에러 메시지를 표시한다', async () => {
    server.use(
      http.get('/api/users/:id', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 })
      )
    )
    render(<UserProfile userId="999" />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Error')
  })

  test('userId 변경 시 새 데이터를 불러온다', async () => {
    server.use(
      http.get('/api/users/2', () =>
        HttpResponse.json({ id: '2', name: 'Jane Doe' })
      )
    )

    const { rerender } = render(<UserProfile userId="1" />)
    await screen.findByText('John Doe')

    rerender(<UserProfile userId="2" />)
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
  })
})
```

**비동기 쿼리 선택 기준**:

| 상황 | 권장 방법 |
|------|----------|
| 요소가 나타날 때까지 대기 | `await screen.findByRole(...)` |
| 여러 조건을 동시에 대기 | `await waitFor(() => { expect(...) })` |
| 요소가 사라질 때까지 대기 | `await waitForElementToBeRemoved(...)` |
| 존재하지 않아야 함을 검증 | `expect(screen.queryByText(...)).not.toBeInTheDocument()` |

---

### 유형 5: Form 컴포넌트

실제 사용자가 폼을 채우는 것처럼 `userEvent.type`으로 입력한다.

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  test('폼 요소들을 렌더링한다', () => {
    render(<LoginForm onSubmit={() => {}} />)

    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument()
  })

  test('빈 폼 제출 시 유효성 오류 메시지를 표시한다', async () => {
    render(<LoginForm onSubmit={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /로그인/i }))

    expect(screen.getByText(/유효한 이메일/i)).toBeInTheDocument()
    expect(screen.getByText(/6자 이상/i)).toBeInTheDocument()
  })

  test('유효한 정보 입력 후 제출 시 onSubmit을 호출한다', async () => {
    const handleSubmit = jest.fn()
    render(<LoginForm onSubmit={handleSubmit} />)

    await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /로그인/i }))

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  test('이메일 형식이 올바르지 않으면 오류를 표시한다', async () => {
    render(<LoginForm onSubmit={() => {}} />)

    await userEvent.type(screen.getByLabelText('이메일'), 'notanemail')
    await userEvent.click(screen.getByRole('button', { name: /로그인/i }))

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/유효한 이메일/i)
  })
})
```

---

### 유형 6: Custom Hook

`renderHook`으로 훅을 독립적으로 테스트한다. 상태 변화는 반드시 `act()` 안에서 일으킨다.

```javascript
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  test('초기값 0으로 시작한다', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  test('커스텀 초기값을 받는다', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  test('increment 호출 시 count가 1 증가한다', () => {
    const { result } = renderHook(() => useCounter())

    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })

  test('reset 호출 시 초기값으로 돌아간다', () => {
    const { result } = renderHook(() => useCounter(5))

    act(() => {
      result.current.increment()
      result.current.increment()
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.count).toBe(5)
  })

  test('rerender 시 새 initialValue를 인식한다', () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useCounter(initial),
      { initialProps: { initial: 0 } }
    )

    act(() => { result.current.increment() })
    expect(result.current.count).toBe(1)

    rerender({ initial: 100 })
    act(() => { result.current.reset() })
    expect(result.current.count).toBe(100)
  })
})
```

---

## Phase 3: 테스트 파일 배치 및 실행

### 파일 위치 규칙

소스 파일과 같은 디렉터리(co-location)에 테스트를 배치하는 것이 권장된다:

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.jsx
│   │   └── Button.test.jsx       ← 소스 옆에 배치
│   └── UserProfile/
│       ├── UserProfile.jsx
│       └── UserProfile.test.jsx
├── hooks/
│   ├── useCounter.js
│   └── useCounter.test.js
└── test-utils.js                  ← 공용 커스텀 render 함수
```

기존 테스트 파일이 있으면 덮어쓰지 않고 누락된 케이스를 추가한다.

### 테스트 실행

```bash
# Jest
npx jest Button.test.jsx --watch

# Vitest
npx vitest Button.test.jsx

# 커버리지 리포트 (Jest)
npx jest --coverage

# 커버리지 리포트 (Vitest)
npx vitest run --coverage
```

---

## Phase 4: 안티패턴 진단

작성된 테스트를 검토하여 아래 안티패턴이 있으면 수정 제안을 제공한다:

| 안티패턴 | 문제 | 해결 |
|---------|------|------|
| `getByTestId` 과다 사용 | 접근성 개선 무관, 리팩터링에 취약 | `getByRole`, `getByLabelText`로 대체 |
| `fireEvent` 사용 | 실제 브라우저 이벤트 미시뮬레이션 | `userEvent`로 교체 |
| 구현 세부사항 검증 | 내부 state/메서드 직접 접근 | 화면 출력 결과로만 검증 |
| `sleep(ms)` 또는 `setTimeout` | Flaky 테스트 | `findBy`, `waitFor`로 대체 |
| Provider 없이 Context 컴포넌트 테스트 | 런타임 에러 | 커스텀 render 래퍼 사용 |
| `act()` 없이 상태 변경 | act warning, 불안정한 테스트 | 상태 변경 코드를 `act()` 안으로 이동 |
| 테스트 간 상태 공유 | 순서 의존성, Flaky | `beforeEach`에서 mock 초기화 |
| 모든 의존성을 mock으로 대체 | 실제 동작 미검증 | 외부 API만 모킹, 내부 로직은 실제 실행 |

---

## Phase 5: 결과 요약

테스트 작성 완료 후 다음 형식으로 보고한다:

```
## 생성된 테스트 요약

| 파일 | 테스트 수 | 컴포넌트 유형 | 비고 |
|------|-----------|--------------|------|
| Button.test.jsx | 3개 | 순수 UI | 이벤트 핸들러 포함 |
| UserProfile.test.jsx | 4개 | 비동기 | MSW 모킹 적용 |
| useCounter.test.js | 5개 | Custom Hook | rerender 케이스 포함 |

## 다음 단계 제안
- [ ] MSW 미설정 → references/setup-guide.md 참조
- [ ] Context Provider 없음 → test-utils.js 공용 래퍼 생성 권장
- [ ] 커버리지 측정 → `npx jest --coverage` 실행 후 임계값 설정
```

---

## 참고 자료

자세한 쿼리 레퍼런스와 설정 가이드는 `references/` 디렉터리를 참고한다:
- `references/rtl-patterns.md` — 쿼리별 상세 사용법, jest-dom 매처, 복합 시나리오
- `references/setup-guide.md` — Jest/Vitest 설정, MSW 초기화, TypeScript 지원
