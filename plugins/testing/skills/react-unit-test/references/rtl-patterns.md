# RTL 쿼리 패턴 레퍼런스

React Testing Library 쿼리 상세 사용법, jest-dom 매처, 복합 시나리오 모음.

---

## 쿼리 변형 (Variant)

각 쿼리 이름 앞에 세 가지 변형이 있다:

| 변형 | 없을 때 | 여러 개일 때 | 비동기 |
|------|---------|------------|--------|
| `getBy` | 즉시 에러 throw | 즉시 에러 throw | 지원 안 함 |
| `queryBy` | `null` 반환 | 즉시 에러 throw | 지원 안 함 |
| `findBy` | 타임아웃 에러 | 타임아웃 에러 | Promise 반환 |
| `getAllBy` | 즉시 에러 throw | 배열 반환 | 지원 안 함 |
| `queryAllBy` | 빈 배열 반환 | 배열 반환 | 지원 안 함 |
| `findAllBy` | 타임아웃 에러 | 배열 반환 (Promise) | Promise 반환 |

**사용 패턴**:
```javascript
// 요소가 반드시 존재해야 할 때
screen.getByRole('button')

// 요소가 없을 수도 있을 때 (존재 여부 검증)
expect(screen.queryByText('에러 메시지')).not.toBeInTheDocument()

// 비동기로 나타나는 요소 대기
const element = await screen.findByText('로딩 완료')

// 여러 요소 중 특정 조건
const buttons = screen.getAllByRole('button')
expect(buttons).toHaveLength(3)
```

---

## 1. getByRole — 최우선 쿼리

ARIA 역할(role)로 요소를 찾는다. 접근성과 직결되어 있어 스크린리더 호환성도 동시에 검증된다.

### 주요 ARIA 역할 목록

| HTML 요소 | 암묵적 role |
|-----------|-----------|
| `<button>` | `button` |
| `<a href>` | `link` |
| `<input type="text">` | `textbox` |
| `<input type="checkbox">` | `checkbox` |
| `<input type="radio">` | `radio` |
| `<input type="number">` | `spinbutton` |
| `<select>` | `combobox` |
| `<h1>`~`<h6>` | `heading` |
| `<img>` | `img` |
| `<ul>`, `<ol>` | `list` |
| `<li>` | `listitem` |
| `<table>` | `table` |
| `<form>` | `form` (accessible name 있을 때만) |
| `<dialog>` | `dialog` |
| `<nav>` | `navigation` |
| `<main>` | `main` |

### name 옵션으로 구체화

```javascript
// 텍스트 콘텐츠로 버튼 구분
screen.getByRole('button', { name: /저장/i })
screen.getByRole('button', { name: '취소' })

// aria-label로 구분
// <button aria-label="메뉴 닫기">×</button>
screen.getByRole('button', { name: /메뉴 닫기/i })

// 레벨로 heading 구분
screen.getByRole('heading', { level: 1 })
screen.getByRole('heading', { name: /제목/i, level: 2 })

// hidden 요소 포함
screen.getByRole('button', { hidden: true })
```

---

## 2. getByLabelText — 폼 필드 최적

`<label>` 또는 `aria-label`, `aria-labelledby`로 연결된 입력 필드를 찾는다.

```javascript
// htmlFor + id 연결
// <label htmlFor="email">이메일</label>
// <input id="email" type="email" />
screen.getByLabelText('이메일')
screen.getByLabelText(/이메일/i)

// aria-label
// <input aria-label="검색어 입력" />
screen.getByLabelText(/검색어 입력/i)

// aria-labelledby
// <span id="pwd-label">비밀번호</span>
// <input aria-labelledby="pwd-label" type="password" />
screen.getByLabelText(/비밀번호/i)

// label로 감싼 형태
// <label>이름 <input type="text" /></label>
screen.getByLabelText('이름')
```

---

## 3. getByPlaceholderText — 레이블 없을 때 폴백

접근성이 낮으므로 `getByLabelText`가 불가능할 때만 사용한다.

```javascript
// <input placeholder="이메일을 입력하세요" />
screen.getByPlaceholderText('이메일을 입력하세요')
screen.getByPlaceholderText(/이메일/i)
```

---

## 4. getByText — 화면 텍스트 검색

텍스트 콘텐츠로 요소를 찾는다. 정확한 매칭이 기본이므로 정규식을 권장한다.

```javascript
// 정확한 텍스트
screen.getByText('저장 완료')

// 정규식 (대소문자 무시)
screen.getByText(/저장 완료/i)

// 부분 일치
screen.getByText(/저장/i)

// selector 옵션으로 특정 태그 한정
screen.getByText('환영합니다', { selector: 'h1' })
```

---

## 5. 복합 쿼리 시나리오

### 같은 역할의 요소가 여러 개일 때

```javascript
// 버튼이 여러 개 → name으로 구분
render(
  <div>
    <button>저장</button>
    <button>취소</button>
    <button>삭제</button>
  </div>
)
screen.getByRole('button', { name: /저장/i })
screen.getByRole('button', { name: /취소/i })
```

### 특정 컨테이너 안에서 찾기

```javascript
import { within } from '@testing-library/react'

render(
  <form aria-label="로그인 폼">
    <input aria-label="이메일" />
    <button>로그인</button>
  </form>
)

const form = screen.getByRole('form', { name: /로그인 폼/i })
const emailInput = within(form).getByLabelText(/이메일/i)
const loginBtn = within(form).getByRole('button', { name: /로그인/i })
```

### 요소가 없어야 함을 검증

```javascript
// 요소가 DOM에 없어야 할 때
expect(screen.queryByText('에러 메시지')).not.toBeInTheDocument()

// 요소가 화면에 안 보여야 할 때 (DOM엔 있지만 hidden)
expect(screen.queryByRole('dialog')).not.toBeVisible()
```

---

## jest-dom 매처 레퍼런스

`@testing-library/jest-dom`이 제공하는 커스텀 매처 목록.

```javascript
// DOM 내 존재 여부
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// 가시성
expect(element).toBeVisible()
expect(element).not.toBeVisible()     // display:none, visibility:hidden 등

// 활성화 상태
expect(button).toBeEnabled()
expect(button).toBeDisabled()

// 폼 필드 값
expect(input).toHaveValue('입력값')
expect(input).toHaveValue(42)          // number input
expect(select).toHaveValue('option1')
expect(checkbox).toBeChecked()
expect(checkbox).not.toBeChecked()

// 텍스트 콘텐츠
expect(element).toHaveTextContent('정확한 텍스트')
expect(element).toHaveTextContent(/부분 일치/i)

// 속성
expect(input).toHaveAttribute('type', 'email')
expect(link).toHaveAttribute('href', '/home')
expect(element).toHaveAttribute('data-testid')     // 값 무관 존재만 확인

// CSS 클래스
expect(element).toHaveClass('active')
expect(element).toHaveClass('btn', 'primary')       // 여러 클래스 동시

// 스타일
expect(element).toHaveStyle('display: none')
expect(element).toHaveStyle({ color: 'red', fontSize: '16px' })

// 포커스
expect(input).toHaveFocus()

// 접근성
expect(element).toHaveAccessibleName('제출 버튼')
expect(element).toHaveAccessibleDescription('폼을 제출합니다')
```

---

## userEvent 패턴

`@testing-library/user-event` v14+ 기준. setup() 호출 방식을 권장한다.

```javascript
import userEvent from '@testing-library/user-event'

// 권장: setup()으로 user 인스턴스 생성
const user = userEvent.setup()

test('사용자 상호작용 테스트', async () => {
  render(<LoginForm />)

  // 클릭
  await user.click(screen.getByRole('button', { name: /제출/i }))

  // 텍스트 입력 (기존 값 유지하며 추가)
  await user.type(screen.getByLabelText('이메일'), 'test@example.com')

  // 필드 초기화 후 입력
  await user.clear(screen.getByLabelText('이름'))
  await user.type(screen.getByLabelText('이름'), '새 이름')

  // 키보드 이벤트
  await user.keyboard('{Enter}')
  await user.keyboard('{Tab}')
  await user.keyboard('{Escape}')

  // 셀렉트 선택
  await user.selectOptions(screen.getByRole('combobox'), '옵션2')

  // 체크박스 토글
  await user.click(screen.getByRole('checkbox'))

  // 파일 업로드
  const file = new File(['내용'], 'test.txt', { type: 'text/plain' })
  await user.upload(screen.getByLabelText('파일 첨부'), file)

  // 호버 (tooltip 등)
  await user.hover(screen.getByRole('button'))
  await user.unhover(screen.getByRole('button'))
})
```

---

## waitFor / findBy 상세 옵션

```javascript
// timeout: 기본 1000ms
await waitFor(
  () => expect(screen.getByText('완료')).toBeInTheDocument(),
  { timeout: 3000 }
)

// interval: 재시도 간격 (기본 50ms)
await waitFor(
  () => expect(screen.getByText('완료')).toBeInTheDocument(),
  { interval: 100 }
)

// findBy도 동일 옵션 지원
const element = await screen.findByText('완료', {}, { timeout: 3000 })

// 요소가 사라질 때까지 대기
await waitForElementToBeRemoved(() => screen.queryByText('로딩 중...'))
await waitForElementToBeRemoved(screen.getByText('로딩 중...'))
```
