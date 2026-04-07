# 요청/응답 설계 패턴

## 응답 Envelope 설계

### Envelope 없는 방식 (권장 — 단순 리소스)

```json
// GET /api/v1/users/123
{
  "id": "123",
  "name": "홍길동",
  "email": "hong@example.com",
  "createdAt": "2024-01-15T09:00:00Z"
}
```

### Envelope 있는 방식 (목록 조회에서 메타 포함 필요 시)

```json
// GET /api/v1/users
{
  "data": [
    { "id": "1", "name": "홍길동" },
    { "id": "2", "name": "김철수" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 153,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

> 일관성 원칙: 한 API 전체에서 envelope 사용 여부를 통일한다. 섞어 쓰지 않는다.

---

## 페이지네이션 패턴

### 1. Offset 기반 (소규모, 랜덤 접근 필요 시)

```http
GET /api/v1/users?page=2&limit=20
```

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "totalCount": 153,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

**장점**: 특정 페이지 바로 이동 가능, 구현 단순  
**단점**: 대용량에서 성능 저하 (OFFSET N은 N개 스캔), 데이터 삽입/삭제 시 중복/누락

### 2. Cursor 기반 (권장 — 대용량, 실시간 피드)

```http
GET /api/v1/posts?limit=20                          # 첫 페이지
GET /api/v1/posts?cursor=eyJpZCI6MTAwfQ==&limit=20  # 다음 페이지
```

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTIwfQ==",    // 마지막 아이템 기반 opaque cursor
    "hasNext": true,
    "limit": 20
  }
}
```

커서 구현 예시 (서버 내부, Base64 인코딩):
```json
// cursor = base64({"id": 120, "createdAt": "2024-01-15T09:00:00Z"})
// 쿼리: WHERE id < 120 ORDER BY id DESC LIMIT 20
```

**장점**: 일관된 성능 (인덱스 탐색), 실시간 데이터에도 안정  
**단점**: 랜덤 페이지 이동 불가, 구현 복잡

### 3. Link Header 방식 (GitHub API 스타일)

```http
HTTP/1.1 200 OK
Link: <https://api.example.com/users?page=3&limit=20>; rel="next",
      <https://api.example.com/users?page=1&limit=20>; rel="prev",
      <https://api.example.com/users?page=8&limit=20>; rel="last",
      <https://api.example.com/users?page=1&limit=20>; rel="first"
```

---

## 필터링 패턴

### 단순 동등 필터

```http
GET /api/v1/users?status=active
GET /api/v1/orders?userId=123&status=pending
```

### 범위 필터

```http
# 방식 1: 파라미터 prefix
GET /api/v1/orders?minAmount=10000&maxAmount=50000
GET /api/v1/orders?fromDate=2024-01-01&toDate=2024-12-31

# 방식 2: 대괄호 표기
GET /api/v1/orders?amount[gte]=10000&amount[lte]=50000
GET /api/v1/orders?createdAt[gte]=2024-01-01T00:00:00Z
```

### 복수값 필터 (IN 조건)

```http
# 콤마 구분
GET /api/v1/products?category=electronics,clothing

# 반복 파라미터
GET /api/v1/products?category=electronics&category=clothing
```

### NULL/존재 여부 필터

```http
GET /api/v1/users?phoneNumber=exists           # 전화번호 있는 사용자
GET /api/v1/products?discountPrice=null        # 할인가 없는 상품
```

---

## 정렬 패턴

```http
# 단일 정렬
GET /api/v1/users?sort=name             # name 오름차순
GET /api/v1/users?sort=-createdAt       # createdAt 내림차순 (- prefix)

# 복수 정렬 (우선순위 순, 콤마 구분)
GET /api/v1/products?sort=-rating,price

# 응답에 정렬 정보 포함 (선택)
{
  "data": [...],
  "sort": [{ "field": "rating", "order": "desc" }, { "field": "price", "order": "asc" }]
}
```

---

## 필드 선택 (Sparse Fieldsets)

```http
GET /api/v1/users?fields=id,name,email
```

```json
// 요청된 필드만 반환 (bandwidth 절약)
[
  { "id": "1", "name": "홍길동", "email": "hong@example.com" },
  { "id": "2", "name": "김철수", "email": "kim@example.com" }
]
```

---

## 연관 리소스 포함 (include/expand)

```http
GET /api/v1/orders/456?include=user,items,shippingAddress
```

```json
{
  "id": "456",
  "status": "pending",
  "totalAmount": 50000,
  "user": {
    "id": "123",
    "name": "홍길동",
    "email": "hong@example.com"
  },
  "items": [
    { "productId": "789", "name": "아이폰 케이스", "quantity": 2, "price": 15000 }
  ],
  "shippingAddress": {
    "street": "강남대로 123",
    "city": "서울",
    "zipCode": "06000"
  }
}
```

---

## 벌크 작업 패턴

### 벌크 생성

```http
POST /api/v1/users/batch
Content-Type: application/json

{
  "items": [
    { "name": "사용자1", "email": "user1@example.com" },
    { "name": "사용자2", "email": "user2@example.com" }
  ]
}
```

```json
// 응답: 항목별 성공/실패 분리
{
  "results": [
    { "index": 0, "status": "created", "id": "101", "data": {...} },
    { "index": 1, "status": "failed",  "error": { "code": "EMAIL_DUPLICATE", "message": "이미 등록된 이메일" } }
  ],
  "summary": { "total": 2, "created": 1, "failed": 1 }
}
```

### 벌크 업데이트

```http
PATCH /api/v1/products/batch
{
  "items": [
    { "id": "101", "price": 29000 },
    { "id": "102", "price": 35000 }
  ]
}
```

### 벌크 삭제

```http
DELETE /api/v1/messages/batch
{
  "ids": ["msg1", "msg2", "msg3"]
}
```

---

## 비동기 장기 실행 작업 패턴

```http
// 1. 작업 요청 → 202 Accepted
POST /api/v1/reports/generate
{
  "type": "annual_sales",
  "year": 2024
}

// 응답
HTTP/1.1 202 Accepted
Location: /api/v1/jobs/job-abc-123

{
  "jobId": "job-abc-123",
  "status": "pending",
  "statusUrl": "/api/v1/jobs/job-abc-123",
  "estimatedDuration": "PT5M"
}
```

```http
// 2. 상태 폴링
GET /api/v1/jobs/job-abc-123

// 처리 중
{
  "jobId": "job-abc-123",
  "status": "processing",
  "progress": 45,
  "startedAt": "2024-01-15T09:00:00Z"
}

// 완료
{
  "jobId": "job-abc-123",
  "status": "completed",
  "result": { "url": "/api/v1/reports/report-xyz-456" },
  "completedAt": "2024-01-15T09:05:30Z"
}

// 실패
{
  "jobId": "job-abc-123",
  "status": "failed",
  "error": { "code": "DATA_TOO_LARGE", "message": "데이터가 너무 큽니다." }
}
```

---

## 멱등성 키 (Idempotency Key)

결제·주문 등 중복 실행 방지가 필요한 POST:

```http
POST /api/v1/payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "amount": 50000,
  "currency": "KRW",
  "method": "card"
}
```

- 같은 Idempotency-Key로 재요청 → 이전 결과 반환 (실제 처리 안 함)
- 키는 클라이언트가 생성 (UUID v4 권장)
- 서버에서 24시간 보관 후 만료

---

## 날짜/시간 형식

```
# ✓ ISO 8601 UTC (권장)
"createdAt": "2024-01-15T09:00:00Z"
"updatedAt": "2024-01-15T09:00:00+09:00"  # 타임존 명시 시

# ✓ 날짜만
"birthDate": "1990-01-15"
"startDate": "2024-01-01"

# ✗ 피해야 할 형식
"created_at": 1705312800000   # Unix timestamp (가독성 낮음)
"createdAt": "2024/01/15"     # 비표준 구분자
"createdAt": "15-Jan-2024"    # 비표준 순서
```

---

## 금액/통화 처리

```json
// ✓ 정수 + 통화 코드 분리 (소수점 오차 방지)
{
  "amount": 50000,
  "currency": "KRW",
  "amountFormatted": "₩50,000"
}

// 소수점 있는 통화 (USD 등): 최소 단위(센트) 사용
{
  "amount": 4999,         // $49.99 in cents
  "currency": "USD",
  "amountFormatted": "$49.99"
}
```

---

## 응답 데이터 타입 규칙

| 타입 | 표준 형식 | 예시 |
|------|----------|------|
| ID | 문자열 (UUID 또는 KSUID 권장) | `"id": "01HXYZ..."` |
| 날짜시간 | ISO 8601 UTC 문자열 | `"2024-01-15T09:00:00Z"` |
| 날짜 | ISO 8601 날짜 | `"2024-01-15"` |
| 금액 | 정수 (최소 단위) | `50000` |
| 불리언 | `true`/`false` | `"active": true` |
| Null | `null` | 선택적 필드 미입력 시 |
| 열거형 | SCREAMING_SNAKE_CASE 문자열 | `"status": "IN_PROGRESS"` |
