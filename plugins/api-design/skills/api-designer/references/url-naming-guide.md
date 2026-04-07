# URL 네이밍 & 구조 설계 가이드

## 핵심 원칙

1. **명사 사용** — URL은 리소스를 나타내지, 동작을 나타내지 않는다
2. **복수형** — 컬렉션은 항상 복수: `/users` not `/user`
3. **소문자 + 하이픈** — `/user-profiles` not `/UserProfiles` or `/user_profiles`
4. **계층 표현** — 소유 관계는 경로로: `/orders/{id}/items`
5. **버전 포함** — `/api/v1/` prefix 필수

---

## URL 패턴 카탈로그

### 기본 CRUD 패턴

```http
# 컬렉션
GET    /api/v1/users                 # 목록 조회
POST   /api/v1/users                 # 생성

# 개별 리소스
GET    /api/v1/users/{userId}        # 단건 조회
PUT    /api/v1/users/{userId}        # 전체 수정
PATCH  /api/v1/users/{userId}        # 부분 수정
DELETE /api/v1/users/{userId}        # 삭제

# 서브 리소스 (소유 관계)
GET    /api/v1/users/{userId}/orders          # 특정 사용자의 주문 목록
GET    /api/v1/users/{userId}/orders/{orderId} # 특정 주문 단건
POST   /api/v1/users/{userId}/orders          # 주문 생성
```

### 상태 전환 패턴

동사를 URL에 넣고 싶은 경우, 상태 변화를 **서브 리소스**로 모델링한다:

```http
# ✗ 나쁜 예 (동사 URL)
POST /api/v1/orders/456/cancel
POST /api/v1/users/123/activate
POST /api/v1/payments/789/refund

# ✓ 좋은 예 (서브 리소스로 상태 전환 모델링)
POST /api/v1/orders/456/cancellations       # 취소 이벤트 생성
POST /api/v1/users/123/activations          # 활성화 이벤트 생성
POST /api/v1/payments/789/refunds           # 환불 요청 생성
```

서브 리소스의 GET은 이력 조회로 활용:
```http
GET /api/v1/orders/456/cancellations        # 해당 주문의 취소 이력
GET /api/v1/payments/789/refunds            # 해당 결제의 환불 이력
```

### 액션 패턴 (불가피할 때)

진짜 서브 리소스로 표현하기 어려운 동작:
```http
POST /api/v1/emails/verify            # 이메일 인증 코드 발송
POST /api/v1/sessions                 # 로그인 (세션 생성)
DELETE /api/v1/sessions/current       # 로그아웃 (세션 삭제)
POST /api/v1/password-resets          # 비밀번호 재설정 요청
POST /api/v1/users/{id}/password-resets/{token}/confirmations  # 재설정 확인
```

### 검색 & 필터 패턴

```http
# 단순 필터 (쿼리 파라미터)
GET /api/v1/products?category=electronics&brand=samsung

# 텍스트 검색
GET /api/v1/products?q=아이폰+케이스

# 범위 필터
GET /api/v1/products?minPrice=10000&maxPrice=50000
GET /api/v1/orders?from=2024-01-01&to=2024-12-31

# 복합 검색 (POST 허용)
POST /api/v1/products/search
{
  "query": "아이폰 케이스",
  "filters": { "category": "accessories", "inStock": true },
  "facets": ["brand", "price_range"]
}
```

### 정렬 패턴

```http
# 단일 필드 정렬
GET /api/v1/users?sort=createdAt          # 오름차순
GET /api/v1/users?sort=-createdAt         # 내림차순 (- prefix)

# 복수 필드 정렬 (우선순위 순)
GET /api/v1/users?sort=-createdAt,name    # 생성일 내림차순 → 이름 오름차순
```

### 필드 선택 (Sparse Fieldsets)

```http
# 필요한 필드만 요청 (GraphQL-like)
GET /api/v1/users?fields=id,name,email

# 관련 리소스 포함
GET /api/v1/orders?include=user,items,shippingAddress
```

---

## Path Parameter 네이밍 규칙

```http
# ✓ 좋은 예
/api/v1/users/{userId}
/api/v1/orders/{orderId}
/api/v1/products/{productId}

# 일관성: 리소스명 + "Id" 접미사
/api/v1/organizations/{organizationId}/teams/{teamId}/members/{memberId}

# ✗ 나쁜 예
/api/v1/users/{id}          # 모든 리소스에 {id} → 혼동
/api/v1/users/{user_id}     # snake_case
/api/v1/users/{UserId}      # PascalCase
```

---

## 쿼리 파라미터 표준

| 파라미터 | 타입 | 설명 | 예시 |
|----------|------|------|------|
| `page` | integer | 페이지 번호 (1-based) | `?page=2` |
| `limit` | integer | 페이지 크기 (기본 20, 최대 100) | `?limit=50` |
| `cursor` | string | 커서 기반 페이지네이션 | `?cursor=eyJpZCI6MTAwfQ==` |
| `sort` | string | 정렬 필드 (`-` = 내림차순) | `?sort=-createdAt` |
| `q` | string | 전문 검색 쿼리 | `?q=검색어` |
| `fields` | string | 응답 필드 선택 (콤마 구분) | `?fields=id,name` |
| `include` | string | 연관 리소스 포함 | `?include=user,items` |
| `expand` | string | (include 대안) | `?expand=author,tags` |

---

## 계층 깊이 규칙

```
✓ 최적 (2단계):
/api/v1/orders/{orderId}/items

✓ 허용 (3단계):
/api/v1/organizations/{orgId}/teams/{teamId}/members

⚠️ 경고 (4단계 — 재검토 필요):
/api/v1/organizations/{orgId}/projects/{projId}/tasks/{taskId}/comments

✗ 금지 (5단계 이상 — 설계 재구성):
/api/v1/a/{aId}/b/{bId}/c/{cId}/d/{dId}/e
```

4단계 이상인 경우 해결책:
```http
# 독립 리소스로 분리 + 필터
GET /api/v1/comments?taskId={taskId}

# 또는 리소스를 최상위로 승격
GET /api/v1/tasks/{taskId}/comments
```

---

## 버전 관리 URL 전략

```http
# ✓ URL Path 버전 (권장 기본값)
/api/v1/users
/api/v2/users

# ✓ URL Path with date (Google API 스타일)
/api/2024-01-15/users

# ✗ 피해야 할 버전 표기
/api/users?version=1         # 쿼리 파라미터 (캐시 오염)
/api/users/v1                # 리소스와 혼동
```

---

## 네이밍 변환 규칙

```
영어 복수 명사 규칙:
- 일반: user → users, product → products
- s로 끝남: status → statuses, address → addresses
- y로 끝남: category → categories, city → cities
- 불규칙: person → people, child → children

복합 명사:
- 두 단어: user-profile, order-item, product-category
- 세 단어: user-shipping-address, customer-payment-method

약어 처리:
- 모두 소문자: api-key (not API-Key)
- 단, path variable에서는 camelCase: {apiKeyId}
```

---

## URL 안티패턴

| 안티패턴 | 나쁜 예 | 좋은 예 |
|----------|---------|---------|
| 동사 포함 | `/getUsers`, `/createOrder` | `/users`, `/orders` |
| 단수 컬렉션 | `/user`, `/product` | `/users`, `/products` |
| 버전 없음 | `/api/users` | `/api/v1/users` |
| 대문자 | `/Users`, `/UserProfiles` | `/users`, `/user-profiles` |
| 언더스코어 | `/user_profiles` | `/user-profiles` |
| 파일 확장자 | `/users.json` | `/users` + Accept 헤더 |
| 불필요한 중첩 | `/users/{id}/profile` | `/users/{id}` (profile이 user의 일부라면) |
| 행위 없는 서브 | `/users/{id}/get` | `GET /users/{id}` |
