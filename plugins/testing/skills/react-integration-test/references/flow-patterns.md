# 통합 테스트 시나리오 템플릿

자주 나타나는 사용자 플로우별 테스트 패턴 모음.
필요한 섹션만 선택하여 실제 코드에 맞게 수정한다.

---

## 1. 인증 플로우

### 로그인 → 대시보드

```typescript
describe('인증 플로우', () => {
  test('로그인 성공 → 대시보드로 이동', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/login' })

    await user.type(screen.getByLabelText(/이메일/i), 'user@example.com')
    await user.type(screen.getByLabelText(/비밀번호/i), 'password123')
    await user.click(screen.getByRole('button', { name: /로그인/i }))

    expect(await screen.findByText(/대시보드/i)).toBeInTheDocument()
  })

  test('로그인 실패 → 에러 메시지 표시', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: '인증 실패' }, { status: 401 })
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/login' })

    await user.type(screen.getByLabelText(/이메일/i), 'wrong@example.com')
    await user.click(screen.getByRole('button', { name: /로그인/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('인증 실패')
  })

  test('비인증 상태에서 보호 페이지 접근 → 로그인으로 리다이렉트', () => {
    renderWithProviders(<App />, { route: '/dashboard' })
    // 즉시 리다이렉트되므로 findBy 불필요
    expect(screen.getByText(/로그인/i)).toBeInTheDocument()
  })

  test('로그아웃 → 로그인 페이지로 이동', async () => {
    const user = userEvent.setup()
    // 인증된 상태로 시작
    renderWithProviders(<App />, {
      route: '/dashboard',
      preloadedState: { auth: { user: { id: 1 }, token: 'test-token' } }
    })

    await user.click(screen.getByRole('button', { name: /로그아웃/i }))

    expect(await screen.findByText(/로그인/i)).toBeInTheDocument()
  })
})
```

---

## 2. CRUD 플로우

### 목록 → 생성 → 반영

```typescript
describe('상품 CRUD 플로우', () => {
  test('상품 목록 로드 → 새 상품 추가 → 목록 업데이트', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductManager />)

    // 초기 목록 로드
    const initialItems = await screen.findAllByRole('listitem')
    const initialCount = initialItems.length

    // 추가 폼 열기
    await user.click(screen.getByRole('button', { name: /상품 추가/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // 폼 작성
    await user.type(screen.getByLabelText(/상품명/i), '새 상품')
    await user.type(screen.getByLabelText(/가격/i), '15000')
    await user.click(screen.getByRole('button', { name: /저장/i }))

    // 다이얼로그 닫힘 + 목록에 추가됨
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
    const updatedItems = await screen.findAllByRole('listitem')
    expect(updatedItems).toHaveLength(initialCount + 1)
    expect(screen.getByText('새 상품')).toBeInTheDocument()
  })

  test('상품 삭제 → 목록에서 제거', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductManager />)

    await screen.findByText('기존 상품')

    await user.click(screen.getByRole('button', { name: /기존 상품 삭제/i }))
    await user.click(screen.getByRole('button', { name: /확인/i }))

    await waitForElementToBeRemoved(() => screen.queryByText('기존 상품'))
  })

  test('상품 수정 → 변경사항 즉시 반영', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductManager />)

    await screen.findByText('기존 상품')

    await user.click(screen.getByRole('button', { name: /기존 상품 수정/i }))
    const nameInput = screen.getByDisplayValue('기존 상품')
    await user.clear(nameInput)
    await user.type(nameInput, '수정된 상품')
    await user.click(screen.getByRole('button', { name: /저장/i }))

    expect(await screen.findByText('수정된 상품')).toBeInTheDocument()
    expect(screen.queryByText('기존 상품')).not.toBeInTheDocument()
  })
})
```

---

## 3. 검색 + 필터 플로우

```typescript
describe('검색 및 필터 플로우', () => {
  test('검색어 입력 → 실시간 필터링', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserSearchPage />)

    await screen.findByText('홍길동')
    await screen.findByText('김철수')
    await screen.findByText('이영희')

    // 검색어 입력
    await user.type(screen.getByRole('searchbox'), '홍')

    // 필터링 결과
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.queryByText('김철수')).not.toBeInTheDocument()
    expect(screen.queryByText('이영희')).not.toBeInTheDocument()
  })

  test('검색어 초기화 → 전체 목록 복원', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserSearchPage />)

    await user.type(screen.getByRole('searchbox'), '홍')
    await user.clear(screen.getByRole('searchbox'))

    expect(await screen.findByText('김철수')).toBeInTheDocument()
    expect(screen.getByText('이영희')).toBeInTheDocument()
  })

  test('API 기반 검색 (debounce)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ServerSearchPage />)

    // 빠르게 타이핑 (debounce 적용)
    await user.type(screen.getByRole('searchbox'), '홍길동')

    // debounce 후 API 호출 결과 표시
    expect(await screen.findByText('홍길동 검색 결과')).toBeInTheDocument()
  })
})
```

---

## 4. 페이지네이션 / 무한 스크롤

```typescript
describe('페이지네이션 플로우', () => {
  test('다음 페이지 이동 → 새 데이터 로드', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PaginatedList />)

    // 1페이지 데이터
    expect(await screen.findByText('아이템 1')).toBeInTheDocument()
    expect(screen.queryByText('아이템 11')).not.toBeInTheDocument()

    // 다음 페이지
    await user.click(screen.getByRole('button', { name: /다음/i }))

    // 2페이지 데이터
    expect(await screen.findByText('아이템 11')).toBeInTheDocument()
    expect(screen.queryByText('아이템 1')).not.toBeInTheDocument()

    // 현재 페이지 표시 확인
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
  })

  test('마지막 페이지에서 다음 버튼 비활성화', async () => {
    server.use(
      http.get('/api/items', ({ request }) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page') ?? 1)
        return HttpResponse.json({
          items: [{ id: page * 10, name: `아이템 ${page * 10}` }],
          total: 10,
          page,
          totalPages: 1,  // 1페이지가 마지막
        })
      })
    )

    renderWithProviders(<PaginatedList />)

    await screen.findByText('아이템 10')
    expect(screen.getByRole('button', { name: /다음/i })).toBeDisabled()
  })
})

describe('무한 스크롤 플로우', () => {
  test('추가 로드 버튼 클릭 → 다음 데이터 추가', async () => {
    const user = userEvent.setup()
    renderWithProviders(<InfiniteList />)

    const initialItems = await screen.findAllByRole('listitem')

    // "더 보기" 버튼 방식 (Intersection Observer 대신)
    await user.click(screen.getByRole('button', { name: /더 보기/i }))

    const updatedItems = await screen.findAllByRole('listitem')
    expect(updatedItems.length).toBeGreaterThan(initialItems.length)
  })
})
```

---

## 5. 에러 바운더리 + 에러 상태

```typescript
describe('에러 처리 플로우', () => {
  // 예상된 에러는 콘솔에서 숨김
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  afterAll(() => consoleSpy.mockRestore())

  test('컴포넌트 에러 → Error Boundary 폴백 표시', () => {
    renderWithProviders(
      <ErrorBoundary>
        <ThrowOnRender />
      </ErrorBoundary>
    )

    expect(screen.getByText(/문제가 발생했습니다/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /다시 시도/i })).toBeInTheDocument()
  })

  test('API 500 에러 → 에러 메시지 + 재시도 버튼', async () => {
    server.use(
      http.get('/api/data', () =>
        HttpResponse.json({ message: '서버 오류' }, { status: 500 })
      )
    )

    renderWithProviders(<DataPage />)

    expect(await screen.findByText('서버 오류')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /다시 시도/i })).toBeInTheDocument()
  })

  test('네트워크 단절 → 오프라인 메시지', async () => {
    server.use(
      http.get('/api/data', () => HttpResponse.error())
    )

    renderWithProviders(<DataPage />)

    expect(await screen.findByText(/네트워크 연결/i)).toBeInTheDocument()
  })
})
```

---

## 6. 다단계 폼 (Multi-step Form)

```typescript
describe('회원가입 다단계 폼', () => {
  test('3단계를 완료하면 가입 완료 화면을 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupForm />)

    // Step 1: 기본 정보
    expect(screen.getByText('Step 1: 기본 정보')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/이름/i), '홍길동')
    await user.type(screen.getByLabelText(/이메일/i), 'hong@example.com')
    await user.click(screen.getByRole('button', { name: /다음/i }))

    // Step 2: 비밀번호
    expect(await screen.findByText('Step 2: 보안 설정')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/비밀번호/i), 'Password123!')
    await user.type(screen.getByLabelText(/비밀번호 확인/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /다음/i }))

    // Step 3: 약관 동의
    expect(await screen.findByText('Step 3: 약관 동의')).toBeInTheDocument()
    await user.click(screen.getByLabelText(/서비스 이용약관 동의/i))
    await user.click(screen.getByRole('button', { name: /가입 완료/i }))

    // 완료 화면
    expect(await screen.findByText('회원가입이 완료되었습니다!')).toBeInTheDocument()
  })

  test('이전 단계로 돌아가면 입력값이 유지된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupForm />)

    await user.type(screen.getByLabelText(/이름/i), '홍길동')
    await user.click(screen.getByRole('button', { name: /다음/i }))

    // Step 2에서 뒤로
    await user.click(screen.getByRole('button', { name: /이전/i }))

    // 입력값 유지 확인
    expect(screen.getByLabelText(/이름/i)).toHaveValue('홍길동')
  })
})
```

---

## 7. 실시간 데이터 / 폴링

```typescript
describe('실시간 알림 플로우', () => {
  test('새 알림 도착 시 자동으로 목록에 추가된다', async () => {
    let notificationCount = 0

    server.use(
      http.get('/api/notifications', () => {
        notificationCount++
        const notifications = Array.from({ length: notificationCount }, (_, i) => ({
          id: i + 1,
          message: `알림 ${i + 1}`
        }))
        return HttpResponse.json(notifications)
      })
    )

    renderWithProviders(<NotificationPanel pollingInterval={100} />)

    // 첫 번째 폴링 결과
    expect(await screen.findByText('알림 1')).toBeInTheDocument()

    // 두 번째 폴링 결과 (100ms 후)
    expect(await screen.findByText('알림 2')).toBeInTheDocument()
  })
})
```

---

## 팁: 라우팅이 있는 컴포넌트 테스트

```typescript
// MemoryRouter + initialEntries로 특정 URL에서 시작
renderWithProviders(<App />, { route: '/products/123' })

// URL 파라미터 확인
expect(window.location.pathname).toBe('/products/123')

// 라우트 파라미터가 컴포넌트에 전달되는지 확인
expect(await screen.findByText('Product ID: 123')).toBeInTheDocument()
```
