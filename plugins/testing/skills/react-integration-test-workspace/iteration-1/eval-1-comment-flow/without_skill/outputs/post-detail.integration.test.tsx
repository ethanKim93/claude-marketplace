// src/pages/PostDetail/PostDetail.integration.test.tsx
// React Query v5 + MSW v2 통합 테스트 — 댓글 기능 흐름
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from 'src/test-utils'
import { PostDetail } from 'src/pages/PostDetail'

// ─────────────────────────────────────────────
// 픽스처
// ─────────────────────────────────────────────
const POST_ID = 42

const INITIAL_COMMENTS = [
  { id: 1, author: '홍길동', body: '첫 번째 댓글입니다.', createdAt: '2026-04-01T00:00:00Z' },
  { id: 2, author: '이순신', body: '두 번째 댓글입니다.', createdAt: '2026-04-02T00:00:00Z' },
]

const NEW_COMMENT = {
  id: 3,
  author: '강감찬',
  body: '새로 작성한 댓글',
  createdAt: '2026-04-08T00:00:00Z',
}

// ─────────────────────────────────────────────
// MSW 서버 설정
// ─────────────────────────────────────────────
const server = setupServer(
  // GET /api/posts/:id/comments — 초기 목록 반환
  http.get(`/api/posts/${POST_ID}/comments`, async () => {
    await delay(10)
    return HttpResponse.json(INITIAL_COMMENTS, { status: 200 })
  }),

  // POST /api/posts/:id/comments — 성공 케이스 (기본 핸들러)
  http.post(`/api/posts/${POST_ID}/comments`, async ({ request }) => {
    const body = await request.json() as { body: string }
    await delay(10)
    return HttpResponse.json(
      { ...NEW_COMMENT, body: body.body },
      { status: 201 }
    )
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────
/** PostDetail 페이지를 렌더하고 댓글 목록이 나타날 때까지 대기 */
async function renderAndWaitForComments() {
  renderWithProviders(<PostDetail postId={POST_ID} />, { route: `/posts/${POST_ID}` })

  // 댓글 목록 로딩 완료 대기
  await waitFor(() => {
    expect(screen.getByText(INITIAL_COMMENTS[0].body)).toBeInTheDocument()
  })
}

// ─────────────────────────────────────────────
// 테스트 스위트
// ─────────────────────────────────────────────
describe('PostDetail — 댓글 통합 테스트', () => {
  // ── 1. 초기 렌더 ──────────────────────────
  describe('초기 렌더', () => {
    it('기존 댓글 목록을 화면에 표시한다', async () => {
      await renderAndWaitForComments()

      expect(screen.getByText(INITIAL_COMMENTS[0].body)).toBeInTheDocument()
      expect(screen.getByText(INITIAL_COMMENTS[1].body)).toBeInTheDocument()
    })

    it('댓글 작성 폼의 텍스트에어리어가 비어 있다', async () => {
      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      expect(textarea).toHaveValue('')
    })
  })

  // ── 2. 댓글 제출 성공 플로우 ──────────────
  describe('댓글 제출 성공', () => {
    it('폼 제출 시 POST /api/posts/:id/comments를 호출한다', async () => {
      const user = userEvent.setup()
      let capturedBody: unknown = null

      server.use(
        http.post(`/api/posts/${POST_ID}/comments`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ ...NEW_COMMENT }, { status: 201 })
        })
      )

      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(capturedBody).toMatchObject({ body: NEW_COMMENT.body })
      })
    })

    it('성공 응답 후 새 댓글이 목록에 추가된다', async () => {
      const user = userEvent.setup()
      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(screen.getByText(NEW_COMMENT.body)).toBeInTheDocument()
      })

      // 기존 댓글도 유지
      expect(screen.getByText(INITIAL_COMMENTS[0].body)).toBeInTheDocument()
      expect(screen.getByText(INITIAL_COMMENTS[1].body)).toBeInTheDocument()
    })

    it('성공 응답 후 입력창이 초기화된다', async () => {
      const user = userEvent.setup()
      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(screen.getByText(NEW_COMMENT.body)).toBeInTheDocument()
      })

      expect(textarea).toHaveValue('')
    })

    it('제출 중 버튼이 비활성화(또는 로딩 표시)된다', async () => {
      const user = userEvent.setup()

      // 응답 지연을 늘려 로딩 상태를 관찰할 시간 확보
      server.use(
        http.post(`/api/posts/${POST_ID}/comments`, async () => {
          await delay(200)
          return HttpResponse.json(NEW_COMMENT, { status: 201 })
        })
      )

      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)

      const submitButton = screen.getByRole('button', { name: /작성|제출|등록/i })
      await user.click(submitButton)

      // 요청 진행 중 버튼 비활성화 또는 로딩 텍스트 표시 확인
      expect(
        submitButton.hasAttribute('disabled') ||
        /로딩|전송 중|submitting/i.test(submitButton.textContent ?? '')
      ).toBe(true)

      // 완료 후 정상 복귀
      await waitFor(() => {
        expect(screen.getByText(NEW_COMMENT.body)).toBeInTheDocument()
      })
    })
  })

  // ── 3. 댓글 제출 실패 플로우 ──────────────
  describe('댓글 제출 실패', () => {
    beforeEach(() => {
      // POST를 500 에러로 오버라이드
      server.use(
        http.post(`/api/posts/${POST_ID}/comments`, async () => {
          await delay(10)
          return HttpResponse.json(
            { message: '댓글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
          )
        })
      )
    })

    it('API 실패 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup()
      await renderAndWaitForComments()

      await user.type(screen.getByRole('textbox', { name: /댓글/i }), NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('alert') ||
          screen.getByText(/실패|오류|error/i)
        ).toBeInTheDocument()
      })
    })

    it('API 실패 후 입력값이 유지된다', async () => {
      const user = userEvent.setup()
      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('alert') ||
          screen.getByText(/실패|오류|error/i)
        ).toBeInTheDocument()
      })

      // 입력값 보존
      expect(textarea).toHaveValue(NEW_COMMENT.body)
    })

    it('API 실패 후 목록에 새 댓글이 추가되지 않는다', async () => {
      const user = userEvent.setup()
      await renderAndWaitForComments()

      await user.type(screen.getByRole('textbox', { name: /댓글/i }), NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('alert') ||
          screen.getByText(/실패|오류|error/i)
        ).toBeInTheDocument()
      })

      // 기존 댓글 2개만 존재
      const commentItems = screen.getAllByRole('listitem')
      expect(commentItems).toHaveLength(INITIAL_COMMENTS.length)
    })

    it('API 실패 후 재시도가 가능하다', async () => {
      const user = userEvent.setup()
      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('alert') ||
          screen.getByText(/실패|오류|error/i)
        ).toBeInTheDocument()
      })

      // 성공 응답으로 교체 후 재시도
      server.use(
        http.post(`/api/posts/${POST_ID}/comments`, async () => {
          await delay(10)
          return HttpResponse.json(NEW_COMMENT, { status: 201 })
        })
      )

      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(screen.getByText(NEW_COMMENT.body)).toBeInTheDocument()
      })

      // 재시도 성공 후 입력창 초기화
      expect(textarea).toHaveValue('')
    })
  })

  // ── 4. 네트워크 에러 ──────────────────────
  describe('네트워크 에러', () => {
    it('네트워크 오류 발생 시 에러 메시지를 표시하고 입력값을 유지한다', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`/api/posts/${POST_ID}/comments`, () => {
          return HttpResponse.error()
        })
      )

      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('alert') ||
          screen.getByText(/실패|오류|네트워크|error/i)
        ).toBeInTheDocument()
      })

      expect(textarea).toHaveValue(NEW_COMMENT.body)
    })
  })

  // ── 5. 낙관적 업데이트 (구현 시 활성화) ──
  describe.skip('낙관적 업데이트 (옵셔널)', () => {
    it('요청 완료 전에도 새 댓글이 목록에 먼저 표시된다', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`/api/posts/${POST_ID}/comments`, async () => {
          await delay(500) // 충분한 지연
          return HttpResponse.json(NEW_COMMENT, { status: 201 })
        })
      )

      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      // 응답 전에 낙관적으로 표시
      expect(screen.getByText(NEW_COMMENT.body)).toBeInTheDocument()
    })

    it('낙관적 업데이트 후 API 실패 시 롤백된다', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`/api/posts/${POST_ID}/comments`, async () => {
          await delay(200)
          return HttpResponse.json({ message: '서버 에러' }, { status: 500 })
        })
      )

      await renderAndWaitForComments()

      const textarea = screen.getByRole('textbox', { name: /댓글/i })
      await user.type(textarea, NEW_COMMENT.body)
      await user.click(screen.getByRole('button', { name: /작성|제출|등록/i }))

      // 낙관적 표시 후 롤백
      await waitFor(() => {
        expect(screen.queryByText(NEW_COMMENT.body)).not.toBeInTheDocument()
      })
    })
  })
})
