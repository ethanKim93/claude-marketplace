/**
 * 장바구니 통합 테스트
 *
 * 검증 범위:
 *  - ProductCard → Header 카운트 크로스 컴포넌트 상태 연동 (Zustand)
 *  - 여러 상품 추가 시 누적 카운트 반영
 *  - CartPage 총 금액 계산 (가격 × 수량 합산)
 *  - 장바구니 비어있을 때 빈 상태 UI 표시
 *
 * 전제 조건:
 *  - useCartStore: Zustand 스토어 (items, addItem, removeItem, clearCart)
 *  - Header: 장바구니 아이콘 + aria-label="장바구니 ({n}개)" 표시
 *  - ProductCard: "장바구니 추가" 버튼으로 addItem 호출
 *  - CartPage: 아이템 목록 + 총 금액(price × quantity 합산) 표시
 */

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ------------------------------------------------------------------
// Zustand 스토어 — 실제 프로젝트 경로로 교체하세요
// import { useCartStore } from '@/store/useCartStore'
// ------------------------------------------------------------------

// ── 인라인 스텁 (실제 소스 연결 전 동작 검증용) ──────────────────────
import { create } from 'zustand'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { items: [...state.items, { ...item, quantity: 1 }] }
    }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clearCart: () => set({ items: [] }),
}))

// ── 스텁 컴포넌트 (실제 컴포넌트 import 전 동작 검증용) ──────────────

/**
 * Header: 장바구니 아이콘 + 총 아이템 개수 배지
 * aria-label="장바구니 ({n}개)" 로 접근성 레이블 제공
 */
function Header() {
  const items = useCartStore((state) => state.items)
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <header>
      <nav>
        <span>My Shop</span>
        <a
          href="/cart"
          aria-label={`장바구니 (${totalCount}개)`}
          data-testid="cart-icon"
        >
          🛒 <span data-testid="cart-count">{totalCount}</span>
        </a>
      </nav>
    </header>
  )
}

interface ProductCardProps {
  product: Omit<CartItem, 'quantity'>
}

/**
 * ProductCard: 상품 정보 + "장바구니 추가" 버튼
 */
function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  return (
    <article aria-label={product.name}>
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()}원</p>
      <button
        type="button"
        onClick={() => addItem(product)}
        aria-label={`${product.name} 장바구니 추가`}
      >
        장바구니 추가
      </button>
    </article>
  )
}

/**
 * CartPage: 장바구니 목록 + 총 금액
 * 총 금액 = Σ (price × quantity)
 */
function CartPage() {
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (items.length === 0) {
    return (
      <main>
        <h1>장바구니</h1>
        <p>장바구니가 비어 있습니다.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>장바구니</h1>
      <table>
        <thead>
          <tr>
            <th>상품명</th>
            <th>수량</th>
            <th>금액</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} aria-label={item.name}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{(item.price * item.quantity).toLocaleString()}원</td>
              <td>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`${item.name} 삭제`}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <section aria-label="주문 요약">
        <strong>총 합계: {total.toLocaleString()}원</strong>
      </section>
    </main>
  )
}
// ── 스텁 컴포넌트 끝 ─────────────────────────────────────────────────

// ------------------------------------------------------------------
// 테스트 스위트
// ------------------------------------------------------------------

describe('장바구니 통합 테스트 — Zustand 크로스 컴포넌트 상태 연동', () => {
  /**
   * Zustand는 모듈 수준 singleton이므로
   * 각 테스트 전에 스토어를 반드시 초기화한다.
   * (테스트 간 상태 누수 방지)
   */
  beforeEach(() => {
    useCartStore.setState({ items: [] })
  })

  // ----------------------------------------------------------------
  // 1. 크로스 컴포넌트: ProductCard → Header 카운트 연동
  // ----------------------------------------------------------------
  describe('ProductCard → Header 카운트 크로스 컴포넌트 연동', () => {
    const product = { id: 1, name: '무선 마우스', price: 29000 }

    test('초기 렌더링 시 Header 장바구니 카운트는 0이다', () => {
      render(
        <>
          <Header />
          <ProductCard product={product} />
        </>
      )

      expect(screen.getByLabelText('장바구니 (0개)')).toBeInTheDocument()
    })

    test('"장바구니 추가" 클릭 시 Header 카운트가 1로 즉시 증가한다', async () => {
      const user = userEvent.setup()

      render(
        <>
          <Header />
          <ProductCard product={product} />
        </>
      )

      // 초기 상태 확인
      expect(screen.getByLabelText('장바구니 (0개)')).toBeInTheDocument()

      // ProductCard에서 추가
      await user.click(
        screen.getByRole('button', { name: `${product.name} 장바구니 추가` })
      )

      // Header 카운트가 같은 Zustand 스토어를 구독하므로 즉시 갱신됨
      expect(screen.getByLabelText('장바구니 (1개)')).toBeInTheDocument()
    })

    test('같은 상품을 두 번 추가하면 Header 카운트는 2가 된다', async () => {
      const user = userEvent.setup()

      render(
        <>
          <Header />
          <ProductCard product={product} />
        </>
      )

      const addButton = screen.getByRole('button', {
        name: `${product.name} 장바구니 추가`,
      })

      await user.click(addButton)
      await user.click(addButton)

      expect(screen.getByLabelText('장바구니 (2개)')).toBeInTheDocument()
    })

    test('서로 다른 상품 2개를 추가하면 Header 카운트는 2가 된다', async () => {
      const user = userEvent.setup()
      const productA = { id: 1, name: '무선 마우스', price: 29000 }
      const productB = { id: 2, name: '기계식 키보드', price: 89000 }

      render(
        <>
          <Header />
          <ProductCard product={productA} />
          <ProductCard product={productB} />
        </>
      )

      await user.click(
        screen.getByRole('button', { name: `${productA.name} 장바구니 추가` })
      )
      await user.click(
        screen.getByRole('button', { name: `${productB.name} 장바구니 추가` })
      )

      // 각각 quantity 1이므로 총 2개
      expect(screen.getByLabelText('장바구니 (2개)')).toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------------
  // 2. CartPage 총 금액 계산
  // ----------------------------------------------------------------
  describe('CartPage 총 금액 계산', () => {
    test('단일 상품의 총 금액 = price × quantity를 올바르게 계산한다', () => {
      // setState로 초기 상태를 직접 주입 (preloadedState 패턴 대신)
      useCartStore.setState({
        items: [{ id: 1, name: '무선 마우스', price: 29000, quantity: 2 }],
      })

      render(<CartPage />)

      // 29000 × 2 = 58,000
      expect(screen.getByText('총 합계: 58,000원')).toBeInTheDocument()
    })

    test('복수 상품의 총 금액 = 각 (price × quantity) 합산을 올바르게 계산한다', () => {
      // 상품A: 10,000원 × 2 = 20,000
      // 상품B: 5,000원  × 1 =  5,000
      // 합계: 25,000원
      useCartStore.setState({
        items: [
          { id: 1, name: '상품A', price: 10000, quantity: 2 },
          { id: 2, name: '상품B', price: 5000, quantity: 1 },
        ],
      })

      render(<CartPage />)

      expect(screen.getByText('총 합계: 25,000원')).toBeInTheDocument()
    })

    test('장바구니 테이블에 올바른 행 수가 표시된다 (헤더 1행 + 상품 행)', () => {
      useCartStore.setState({
        items: [
          { id: 1, name: '상품A', price: 10000, quantity: 2 },
          { id: 2, name: '상품B', price: 5000, quantity: 1 },
        ],
      })

      render(<CartPage />)

      // thead 1행 + tbody 2행 = 총 3행
      expect(screen.getAllByRole('row')).toHaveLength(3)
    })

    test('3개 상품 복합 시나리오: 총 금액이 정확히 계산된다', () => {
      // 15,000 × 3 + 8,000 × 2 + 50,000 × 1 = 45,000 + 16,000 + 50,000 = 111,000
      useCartStore.setState({
        items: [
          { id: 1, name: '상품A', price: 15000, quantity: 3 },
          { id: 2, name: '상품B', price: 8000, quantity: 2 },
          { id: 3, name: '상품C', price: 50000, quantity: 1 },
        ],
      })

      render(<CartPage />)

      expect(screen.getByText('총 합계: 111,000원')).toBeInTheDocument()
    })

    test('아이템 삭제 후 총 금액이 즉시 갱신된다', async () => {
      const user = userEvent.setup()

      useCartStore.setState({
        items: [
          { id: 1, name: '상품A', price: 10000, quantity: 2 },
          { id: 2, name: '상품B', price: 5000, quantity: 1 },
        ],
      })

      render(<CartPage />)

      // 초기: 10,000×2 + 5,000×1 = 25,000원
      expect(screen.getByText('총 합계: 25,000원')).toBeInTheDocument()

      // 상품B 삭제
      await user.click(screen.getByRole('button', { name: '상품B 삭제' }))

      // 삭제 후: 10,000×2 = 20,000원
      expect(screen.getByText('총 합계: 20,000원')).toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------------
  // 3. 빈 장바구니 엣지 케이스
  // ----------------------------------------------------------------
  describe('빈 장바구니 엣지 케이스', () => {
    test('장바구니가 비어있을 때 빈 상태 메시지가 표시된다', () => {
      render(<CartPage />)

      expect(screen.getByText('장바구니가 비어 있습니다.')).toBeInTheDocument()
    })

    test('모든 상품을 삭제하면 빈 상태 UI로 전환된다', async () => {
      const user = userEvent.setup()

      useCartStore.setState({
        items: [{ id: 1, name: '무선 마우스', price: 29000, quantity: 1 }],
      })

      render(<CartPage />)

      // 아이템 존재 확인
      expect(screen.getByText('총 합계: 29,000원')).toBeInTheDocument()

      // 유일한 상품 삭제
      await user.click(screen.getByRole('button', { name: '무선 마우스 삭제' }))

      // 빈 상태 UI로 전환
      expect(screen.getByText('장바구니가 비어 있습니다.')).toBeInTheDocument()
      expect(screen.queryByText(/총 합계/)).not.toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------------
  // 4. E2E 유사 시나리오: ProductCard 추가 → CartPage 반영
  // ----------------------------------------------------------------
  describe('E2E 유사 시나리오: 상품 추가 후 CartPage 총 금액 반영', () => {
    test('ProductCard에서 추가한 상품이 CartPage 총 금액에 반영된다', async () => {
      const user = userEvent.setup()
      const product = { id: 1, name: '무선 마우스', price: 29000 }

      // ProductCard로 상품 추가
      const { unmount } = render(<ProductCard product={product} />)

      await user.click(
        screen.getByRole('button', { name: `${product.name} 장바구니 추가` })
      )

      unmount()

      // CartPage에서 합계 확인 (동일 Zustand 스토어 공유)
      render(<CartPage />)

      expect(screen.getByText('총 합계: 29,000원')).toBeInTheDocument()
    })

    test('여러 상품을 추가 후 CartPage에서 누적 합계가 표시된다', async () => {
      const user = userEvent.setup()
      const productA = { id: 1, name: '무선 마우스', price: 29000 }
      const productB = { id: 2, name: '기계식 키보드', price: 89000 }

      const { unmount } = render(
        <>
          <ProductCard product={productA} />
          <ProductCard product={productB} />
        </>
      )

      await user.click(
        screen.getByRole('button', { name: `${productA.name} 장바구니 추가` })
      )
      await user.click(
        screen.getByRole('button', { name: `${productB.name} 장바구니 추가` })
      )
      // 무선 마우스 한 번 더 추가 (quantity: 2)
      await user.click(
        screen.getByRole('button', { name: `${productA.name} 장바구니 추가` })
      )

      unmount()

      // 29,000×2 + 89,000×1 = 147,000
      render(<CartPage />)
      expect(screen.getByText('총 합계: 147,000원')).toBeInTheDocument()
    })
  })
})
