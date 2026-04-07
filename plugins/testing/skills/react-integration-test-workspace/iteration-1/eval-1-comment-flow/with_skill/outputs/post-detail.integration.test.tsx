/**
 * PostDetail 페이지 통합 테스트
 *
 * 커버 시나리오:
 *  1. 댓글 작성 성공 → 목록 업데이트 + 폼 초기화
 *  2. 유효성 검사 실패 → 에러 메시지 표시 (API 호출 없음)
 *  3. API 오류 → 에러 메시지 표시 + 입력값 유지
 *
 * 환경: React Query v5 + MSW v2 + renderWithProviders(QueryClientProvider + MemoryRouter)
 */

import { screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '@/test-utils'
import { server } from '@/mocks/server'
import PostDetail from '@/pages/PostDetail'

// ---------------------------------------------------------------------------
// 공용 픽스처
// ---------------------------------------------------------------------------

const POST_ID = '42'

const INITIAL_COMMENTS = [
  { id: 1, author: '홍길동', body: '첫 번째 댓글입니다.' },
  { id: 2, author: '김철수', body: '두 번째 댓글입니다.' },
]

const NEW_COMMENT = { id: 3, author: '테스트 유저', body: '새로 작성한 댓글입니다.' }

// ---------------------------------------------------------------------------
// MSW 기본 핸들러 — beforeEach 마다 server.resetHandlers()로 복원됨
// ---------------------------------------------------------------------------

beforeAll(() => {
  // 기본 GET /api/posts/:id/comments 핸들러는 server.ts(또는 handlers.ts)에 등록돼 있다고 가정.
  // 이 파일에서는 런타임 오버라이드만 사용한다.
})

afterEach(() => {
  // 런타임 오버라이드가 다음 테스트로 누출되지 않도록 초기화
  server.resetHandlers()
})

// ---------------------------------------------------------------------------
// describe: 댓글 작성 플로우
// ---------------------------------------------------------------------------

describe('PostDetail — 댓글 작성 플로우', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 시나리오 1: 댓글 작성 성공
  // ─────────────────────────────────────────────────────────────────────────
  test('댓글 제출 성공 시 목록에 새 댓글이 추가되고 입력창이 초기화된다', async () => {
    const user = userEvent.setup()

    // MSW: 초기 목록 응답
    server.use(
      http.get(`/api/posts/${POST_ID}/comments`, () =>
        HttpResponse.json(INITIAL_COMMENTS)
      ),
      // POST 성공 → 서버가 생성된 댓글을 반환
      http.post(`/api/posts/:id/comments`, () =>
        HttpResponse.json(NEW_COMMENT, { status: 201 })
      )
    )

    renderWithProviders(<PostDetail postId={POST_ID} />)

    // 초기 댓글 목록 로드 대기 (findAllByRole = waitFor + getAllByRole)
    const initialComments = await screen.findAllByRole('listitem', { name: /comment/i })
    expect(initialComments).toHaveLength(INITIAL_COMMENTS.length)

    // 댓글 입력 및 제출
    const textarea = screen.getByLabelText(/댓글 입력/i)
    await user.type(textarea, NEW_COMMENT.body)
    await user.click(screen.getByRole('button', { name: /등록/i }))

    // 로딩(제출 중) 스피너가 사라질 때까지 대기
    // 컴포넌트가 제출 중 버튼을 비활성화하거나 스피너를 렌더링하면 아래 라인이 Flaky 방지 역할을 한다.
    // 구현에 따라 waitForElementToBeRemoved 대상을 조정한다.
    // 여기서는 뮤테이션 성공 후 React Query가 쿼리를 무효화하여 목록을 재페칭하므로
    // 새 댓글 텍스트가 나타날 때까지 기다린다.
    expect(await screen.findByText(NEW_COMMENT.body)).toBeInTheDocument()

    // 목록 아이템이 1개 증가했는지 확인
    const updatedComments = await screen.findAllByRole('listitem', { name: /comment/i })
    expect(updatedComments).toHaveLength(INITIAL_COMMENTS.length + 1)

    // 입력창 초기화 확인
    expect(textarea).toHaveValue('')
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 시나리오 2: 유효성 검사 실패 (빈 값 제출)
  // ─────────────────────────────────────────────────────────────────────────
  test('입력값 없이 제출하면 유효성 오류 메시지를 표시하고 API를 호출하지 않는다', async () => {
    const user = userEvent.setup()

    server.use(
      http.get(`/api/posts/${POST_ID}/comments`, () =>
        HttpResponse.json(INITIAL_COMMENTS)
      )
    )

    renderWithProviders(<PostDetail postId={POST_ID} />)

    // 초기 목록 로드 대기
    await screen.findAllByRole('listitem', { name: /comment/i })

    // 입력 없이 제출
    await user.click(screen.getByRole('button', { name: /등록/i }))

    // 유효성 에러 메시지 표시 확인
    // (컴포넌트가 role="alert" 또는 aria-invalid로 에러를 알린다고 가정)
    const errorMessage = await screen.findByRole('alert')
    expect(errorMessage).toHaveTextContent(/댓글을 입력해주세요/i)

    // 목록 아이템 수가 변하지 않음 (POST가 호출되지 않음)
    const comments = screen.getAllByRole('listitem', { name: /comment/i })
    expect(comments).toHaveLength(INITIAL_COMMENTS.length)

    // MSW의 onUnhandledRequest: 'error' 설정이 POST 요청을 잡으면 테스트가 자동 실패하므로
    // 별도 스파이 없이도 API 미호출을 검증할 수 있다.
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 시나리오 3: API 오류 — 에러 메시지 표시 + 입력값 유지
  // ─────────────────────────────────────────────────────────────────────────
  test('API 오류 시 에러 메시지를 표시하고 입력값을 유지한다', async () => {
    const user = userEvent.setup()

    server.use(
      http.get(`/api/posts/${POST_ID}/comments`, () =>
        HttpResponse.json(INITIAL_COMMENTS)
      ),
      // 런타임 오버라이드: POST → 500 에러
      http.post(`/api/posts/:id/comments`, () =>
        HttpResponse.json({ message: '서버 내부 오류가 발생했습니다.' }, { status: 500 })
      )
    )

    renderWithProviders(<PostDetail postId={POST_ID} />)

    // 초기 목록 로드 대기
    await screen.findAllByRole('listitem', { name: /comment/i })

    const INPUT_TEXT = '오류 상황에서 작성 중인 댓글'
    const textarea = screen.getByLabelText(/댓글 입력/i)
    await user.type(textarea, INPUT_TEXT)
    await user.click(screen.getByRole('button', { name: /등록/i }))

    // 에러 메시지 표시 확인
    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert).toHaveTextContent(/서버 내부 오류/i)

    // 입력값이 유지되어 있는지 확인 (리셋하지 않음)
    expect(textarea).toHaveValue(INPUT_TEXT)

    // 목록 아이템 수가 변하지 않음 (서버 저장 실패)
    const comments = screen.getAllByRole('listitem', { name: /comment/i })
    expect(comments).toHaveLength(INITIAL_COMMENTS.length)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 보조 시나리오: 댓글 목록 로드 중 로딩 → 성공 상태 전환 확인
  // (waitForElementToBeRemoved 활용 예시)
  // ─────────────────────────────────────────────────────────────────────────
  test('댓글 목록 로딩 → 성공 상태로 전환되며 로딩 인디케이터가 사라진다', async () => {
    server.use(
      http.get(`/api/posts/${POST_ID}/comments`, () =>
        HttpResponse.json(INITIAL_COMMENTS)
      )
    )

    renderWithProviders(<PostDetail postId={POST_ID} />)

    // 로딩 인디케이터가 표시되었다가 사라지는 것을 확인
    // (컴포넌트가 aria-label="댓글 로딩 중" 또는 role="progressbar"를 렌더링한다고 가정)
    await waitForElementToBeRemoved(
      () => screen.queryByRole('progressbar'),
      { timeout: 3000 }
    )

    // 성공 상태: 댓글 목록 표시
    const comments = screen.getAllByRole('listitem', { name: /comment/i })
    expect(comments).toHaveLength(INITIAL_COMMENTS.length)

    expect(screen.getByText('첫 번째 댓글입니다.')).toBeInTheDocument()
    expect(screen.getByText('두 번째 댓글입니다.')).toBeInTheDocument()
  })
})
