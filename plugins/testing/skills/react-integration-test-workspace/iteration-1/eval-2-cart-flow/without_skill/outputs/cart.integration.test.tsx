/**
 * 장바구니 통합 테스트
 *
 * 스택: React 18 + Zustand + @testing-library/react + @testing-library/user-event
 *
 * 검증 시나리오:
 *  1. ProductCard에서 '장바구니 추가' 클릭 → Header 카운트가 즉시 증가
 *  2. 여러 상품을 추가하면 Header 카운트가 누적 반영
 *  3. 동일 상품을 여러 번 추가하면 수량만 증가 (중복 항목 생성 X)
 *  4. CartPage — 담긴 상품들의 총 금액 계산 검증
 *  5. CartPage — 장바구니가 비어있을 때 빈 상태 메시지 표시
 *  6. CartPage — 수량 변경 후 총 금액 재계산
 *  7. CartPage — 아이템 삭제 후 총 금액 재계산
 */

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { create } from 'zustand'

// ---------------------------------------------------------------------------
// 1. Zustand Store 정의 (실제 프로젝트의 src/stores/cartStore.ts 를 반영)
// ---------------------------------------------------------------------------

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
  totalCount: () => number
  totalPrice: () => number
}

/**
 * 테스트 전용 store 팩토리.
 *
 * 각 테스트가 독립된 인스턴스를 사용하도록 beforeEach에서 새로 생성한다.
 * 실제 프로젝트에서 싱글턴 store를 사용한다면,
 * beforeEach에서 useCartStore.setState({ items: [] }) 로 초기화한다.
 */
const createCartStore = () =>
  create<CartStore>((set, get) => ({
    items: [],

    addItem: (product) =>
      set((state) => {
        const existing = state.items.find((i) => i.id === product.id)
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          }
        }
        return { items: [...state.items, { ...product, quantity: 1 }] }
      }),

    removeItem: (id) =>
      set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

    updateQuantity: (id, quantity) =>
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
      })),

    clearCart: () => set({ items: [] }),

    totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

    totalPrice: () =>
      get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  }))

// ---------------------------------------------------------------------------
// 2. 컴포넌트 정의 (실제 프로젝트 컴포넌트를 인라인으로 재현)
// ---------------------------------------------------------------------------

// --- ProductCard ---
interface ProductCardProps {
  product: { id: number; name: string; price: number }
  useStore: () => CartStore
}

function ProductCard({ product, useStore }: ProductCardProps) {
  const addItem = useStore((s) => s.addItem)
  return (
    <div data-testid={`product-card-${product.id}`}>
      <span data-testid="product-name">{product.name}</span>
      <span data-testid="product-price">{product.price.toLocaleString()}원</span>
      <button
        onClick={() => addItem(product)}
        aria-label={`${product.name} 장바구니 추가`}
      >
        장바구니 추가
      </button>
    </div>
  )
}

// --- Header ---
interface HeaderProps {
  useStore: () => CartStore
}

function Header({ useStore }: HeaderProps) {
  const totalCount = useStore((s) => s.totalCount())
  return (
    <header>
      <nav>
        <span aria-label="사이트 이름">My Shop</span>
        <button aria-label="장바구니" data-testid="cart-icon-button">
          🛒
          {totalCount > 0 && (
            <span
              data-testid="cart-item-count"
              aria-label={`장바구니 상품 ${totalCount}개`}
            >
              {totalCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  )
}

// --- CartPage ---
interface CartPageProps {
  useStore: () => CartStore
}

function CartPage({ useStore }: CartPageProps) {
  const items = useStore((s) => s.items)
  const removeItem = useStore((s) => s.removeItem)
  const updateQuantity = useStore((s) => s.updateQuantity)
  const totalPrice = useStore((s) => s.totalPrice())

  if (items.length === 0) {
    return (
      <main>
        <p data-testid="empty-cart-message">장바구니가 비어있습니다.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>장바구니</h1>
      <ul aria-label="장바구니 목록">
        {items.map((item) => (
          <li key={item.id} data-testid={`cart-item-${item.id}`}>
            <span data-testid="item-name">{item.name}</span>
            <span data-testid="item-unit-price">{item.price.toLocaleString()}원</span>
            <input
              type="number"
              aria-label={`${item.name} 수량`}
              value={item.quantity}
              min={1}
              onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
              data-testid={`item-quantity-${item.id}`}
            />
            <span data-testid={`item-subtotal-${item.id}`}>
              {(item.price * item.quantity).toLocaleString()}원
            </span>
            <button
              onClick={() => removeItem(item.id)}
              aria-label={`${item.name} 삭제`}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
      <div data-testid="cart-total-price">
        총 금액: {totalPrice.toLocaleString()}원
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// 3. 테스트용 래퍼 컴포넌트 — Header + ProductCard를 같은 store로 묶음
// ---------------------------------------------------------------------------

interface ShopLayoutProps {
  products: { id: number; name: string; price: number }[]
  useStore: () => CartStore
}

function ShopLayout({ products, useStore }: ShopLayoutProps) {
  return (
    <>
      <Header useStore={useStore} />
      <main>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} useStore={useStore} />
        ))}
      </main>
    </>
  )
}

// ---------------------------------------------------------------------------
// 4. 테스트 픽스처
// ---------------------------------------------------------------------------

const PRODUCTS = [
  { id: 1, name: '무선 키보드', price: 89000 },
  { id: 2, name: '기계식 마우스', price: 55000 },
  { id: 3, name: 'USB 허브', price: 32000 },
]

// ---------------------------------------------------------------------------
// 5. 테스트 스위트
// ---------------------------------------------------------------------------

describe('장바구니 통합 테스트', () => {
  // 매 테스트마다 독립된 Zustand store 인스턴스를 생성한다.
  // → 테스트 간 상태 오염을 방지하는 핵심 패턴
  let useCartStore: ReturnType<typeof createCartStore>

  beforeEach(() => {
    useCartStore = createCartStore()
  })

  // -------------------------------------------------------------------------
  // 시나리오 1: ProductCard 추가 → Header 카운트 즉시 반영 (크로스 컴포넌트)
  // -------------------------------------------------------------------------
  describe('ProductCard → Header 상태 공유', () => {
    it('장바구니가 비어있을 때 Header에 카운트 배지가 표시되지 않는다', () => {
      render(<ShopLayout products={PRODUCTS} useStore={useCartStore} />)

      expect(screen.queryByTestId('cart-item-count')).not.toBeInTheDocument()
    })

    it('ProductCard에서 "장바구니 추가" 클릭 시 Header 카운트가 즉시 1이 된다', async () => {
      const user = userEvent.setup()
      render(<ShopLayout products={PRODUCTS} useStore={useCartStore} />)

      await user.click(
        screen.getByRole('button', { name: `${PRODUCTS[0].name} 장바구니 추가` })
      )

      expect(screen.getByTestId('cart-item-count')).toHaveTextContent('1')
      expect(
        screen.getByLabelText(`장바구니 상품 1개`)
      ).toBeInTheDocument()
    })

    it('다른 상품을 추가할 때마다 Header 카운트가 누적된다', async () => {
      const user = userEvent.setup()
      render(<ShopLayout products={PRODUCTS} useStore={useCartStore} />)

      // 상품 1 추가
      await user.click(
        screen.getByRole('button', { name: `${PRODUCTS[0].name} 장바구니 추가` })
      )
      expect(screen.getByTestId('cart-item-count')).toHaveTextContent('1')

      // 상품 2 추가
      await user.click(
        screen.getByRole('button', { name: `${PRODUCTS[1].name} 장바구니 추가` })
      )
      expect(screen.getByTestId('cart-item-count')).toHaveTextContent('2')

      // 상품 3 추가
      await user.click(
        screen.getByRole('button', { name: `${PRODUCTS[2].name} 장바구니 추가` })
      )
      expect(screen.getByTestId('cart-item-count')).toHaveTextContent('3')
    })

    it('동일 상품을 여러 번 추가하면 수량이 증가하고 Header 카운트도 누적된다', async () => {
      const user = userEvent.setup()
      render(<ShopLayout products={PRODUCTS} useStore={useCartStore} />)

      const addButton = screen.getByRole('button', {
        name: `${PRODUCTS[0].name} 장바구니 추가`,
      })

      await user.click(addButton)
      await user.click(addButton)
      await user.click(addButton)

      // 동일 상품 3번 추가 → 수량 3, 카운트 3
      expect(screen.getByTestId('cart-item-count')).toHaveTextContent('3')
    })
  })

  // -------------------------------------------------------------------------
  // 시나리오 2: CartPage — 총 금액 계산 검증
  // -------------------------------------------------------------------------
  describe('CartPage 총 금액 계산', () => {
    it('CartPage — 장바구니가 비어있을 때 빈 상태 메시지를 표시한다', () => {
      render(<CartPage useStore={useCartStore} />)

      expect(screen.getByTestId('empty-cart-message')).toBeInTheDocument()
      expect(screen.queryByTestId('cart-total-price')).not.toBeInTheDocument()
    })

    it('CartPage — 단일 상품 1개의 총 금액이 올바르게 계산된다', () => {
      // Zustand 초기 상태를 직접 세팅하여 CartPage를 즉시 테스트
      useCartStore.setState({
        items: [{ id: 1, name: '무선 키보드', price: 89000, quantity: 1 }],
      })

      render(<CartPage useStore={useCartStore} />)

      expect(screen.getByTestId('cart-total-price')).toHaveTextContent(
        '89,000원'
      )
    })

    it('CartPage — 여러 상품의 총 금액 합산이 올바르다', () => {
      // 무선 키보드 89,000 × 1 + 기계식 마우스 55,000 × 2 = 199,000
      useCartStore.setState({
        items: [
          { id: 1, name: '무선 키보드', price: 89000, quantity: 1 },
          { id: 2, name: '기계식 마우스', price: 55000, quantity: 2 },
        ],
      })

      render(<CartPage useStore={useCartStore} />)

      expect(screen.getByTestId('cart-total-price')).toHaveTextContent(
        '199,000원'
      )

      // 소계도 개별 검증
      expect(screen.getByTestId('item-subtotal-1')).toHaveTextContent('89,000원')
      expect(screen.getByTestId('item-subtotal-2')).toHaveTextContent('110,000원')
    })

    it('CartPage — 수량 변경 후 총 금액이 즉시 재계산된다', async () => {
      const user = userEvent.setup()

      useCartStore.setState({
        items: [{ id: 1, name: '무선 키보드', price: 89000, quantity: 1 }],
      })

      render(<CartPage useStore={useCartStore} />)

      // 수량을 1 → 3으로 변경
      const quantityInput = screen.getByLabelText('무선 키보드 수량')
      await user.clear(quantityInput)
      await user.type(quantityInput, '3')

      // 89,000 × 3 = 267,000
      expect(screen.getByTestId('cart-total-price')).toHaveTextContent(
        '267,000원'
      )
      expect(screen.getByTestId('item-subtotal-1')).toHaveTextContent('267,000원')
    })

    it('CartPage — 아이템 삭제 후 총 금액이 재계산된다', async () => {
      const user = userEvent.setup()

      useCartStore.setState({
        items: [
          { id: 1, name: '무선 키보드', price: 89000, quantity: 1 },
          { id: 2, name: '기계식 마우스', price: 55000, quantity: 1 },
        ],
      })

      render(<CartPage useStore={useCartStore} />)

      // 초기 총 금액: 89,000 + 55,000 = 144,000
      expect(screen.getByTestId('cart-total-price')).toHaveTextContent(
        '144,000원'
      )

      // 무선 키보드 삭제
      await user.click(screen.getByRole('button', { name: '무선 키보드 삭제' }))

      // 삭제 후 총 금액: 55,000
      expect(screen.getByTestId('cart-total-price')).toHaveTextContent(
        '55,000원'
      )
      expect(screen.queryByTestId('cart-item-1')).not.toBeInTheDocument()
    })

    it('CartPage — 마지막 아이템 삭제 시 빈 장바구니 메시지가 나타난다', async () => {
      const user = userEvent.setup()

      useCartStore.setState({
        items: [{ id: 1, name: '무선 키보드', price: 89000, quantity: 1 }],
      })

      render(<CartPage useStore={useCartStore} />)

      await user.click(screen.getByRole('button', { name: '무선 키보드 삭제' }))

      expect(screen.getByTestId('empty-cart-message')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // 시나리오 3: ShopLayout + CartPage 를 같은 store로 동시 마운트
  // (실제 앱과 가장 유사한 통합 테스트)
  // -------------------------------------------------------------------------
  describe('ShopLayout + CartPage 크로스 컴포넌트 통합', () => {
    function FullApp({ useStore }: { useStore: () => CartStore }) {
      return (
        <>
          <Header useStore={useStore} />
          <section aria-label="상품 목록">
            {PRODUCTS.map((p) => (
              <ProductCard key={p.id} product={p} useStore={useStore} />
            ))}
          </section>
          <CartPage useStore={useStore} />
        </>
      )
    }

    it('ProductCard에서 추가한 상품이 CartPage 목록과 총 금액에 반영된다', async () => {
      const user = userEvent.setup()
      render(<FullApp useStore={useCartStore} />)

      // 무선 키보드 추가
      await user.click(
        screen.getByRole('button', { name: '무선 키보드 장바구니 추가' })
      )

      // Header 카운트 확인
      expect(screen.getByTestId('cart-item-count')).toHaveTextContent('1')

      // CartPage 목록 확인
      expect(screen.getByTestId('cart-item-1')).toBeInTheDocument()
      expect(
        within(screen.getByTestId('cart-item-1')).getByTestId('item-name')
      ).toHaveTextContent('무선 키보드')

      // CartPage 총 금액 확인
      expect(screen.getByTestId('cart-total-price')).toHaveTextContent(
        '89,000원'
      )
    })

    it('여러 상품 추가 후 Header 카운트와 CartPage 총 금액이 모두 일치한다', async () => {
      const user = userEvent.setup()
      render(<FullApp useStore={useCartStore} />)

      // 무선 키보드 2번 추가 → 수량 2
      await user.click(
        screen.getByRole('button', { name: '무선 키보드 장바구니 추가' })
      )
      await user.click(
        screen.getByRole('button', { name: '무선 키보드 장바구니 추가' })
      )

      // USB 허브 1번 추가
      await user.click(
        screen.getByRole('button', { name: 'USB 허브 장바구니 추가' })
      )

      // 총 수량: 2 + 1 = 3
      expect(screen.getByTestId('cart-item-count')).toHaveTextContent('3')

      // 총 금액: 89,000 × 2 + 32,000 × 1 = 210,000
      expect(screen.getByTestId('cart-total-price')).toHaveTextContent(
        '210,000원'
      )
    })
  })
})
