---
name: api-designer
description: |
  HTTP/REST API 설계 스킬. 서비스 요구사항 분석 → 리소스 모델링 → 엔드포인트 계약 설계
  → 인증·버전관리·에러처리 공통 관심사 결정 → OpenAPI 3.0 스펙 자동 생성까지 단계별로 안내한다.

  다음 상황에서 반드시 이 스킬을 사용하세요:
  - "API 설계해줘", "REST API 만들어줘", "엔드포인트 설계", "API 스펙 작성"
  - "URL 구조 어떻게 할까", "HTTP 메서드 뭐 써야 해", "상태 코드 뭐 반환해야 해"
  - "OpenAPI / Swagger 문서 만들어줘", "API 문서화해줘"
  - "API 버전 관리 어떻게", "인증 방식 뭐 쓸까", "JWT vs API Key"
  - "REST 설계 리뷰해줘", "API 안티패턴 찾아줘"
  - 페이지네이션·필터링·정렬 API 설계 관련 질문
  - BRD/PRD 이후 기능 단위 API 설계 단계
  - 기존 API 설계를 개선하거나 표준화할 때
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# API Designer — HTTP/REST API 설계 가이드

서비스 요구사항을 **리소스 중심**으로 모델링하고, 업계 표준(RFC, Google/Microsoft API Guidelines)에 맞는 API 계약을 설계한 뒤 OpenAPI 3.0 스펙으로 출력한다.

---

## 참조 파일 목록

| 파일 | 내용 | 언제 읽나 |
|------|------|-----------|
| `references/http-methods-status-codes.md` | HTTP 메서드 선택 기준, 상태 코드 전체 가이드 | Phase 2 엔드포인트 설계 시 |
| `references/url-naming-guide.md` | URL 구조, 네이밍 컨벤션, 계층 설계 | Phase 1 리소스 모델링 시 |
| `references/request-response-patterns.md` | 요청/응답 바디 설계, 페이지네이션, 필터링, 벌크, 비동기 | Phase 2~3 상세 설계 시 |
| `references/auth-patterns.md` | API Key · OAuth 2.0 · JWT 패턴 비교 및 구현 가이드 | Phase 3 인증 설계 시 |
| `references/error-response-guide.md` | RFC 7807 Problem Details, 에러 코드 체계 | Phase 3 에러 설계 시 |
| `references/versioning-strategies.md` | URL · Header · Query 버전 전략 비교, 폐기 정책 | Phase 3 버전 관리 시 |
| `references/openapi-template.yaml` | 완전한 OpenAPI 3.0 템플릿 (보안·공통 컴포넌트 포함) | Phase 4 스펙 생성 시 |
| `references/api-design-checklist.md` | 24개 체크포인트, 안티패턴 26종 진단표 | Phase 5 리뷰 시 |

---

## Phase 0: 컨텍스트 파악

**목표**: 설계 범위와 제약 조건을 파악한다.

다음 질문으로 컨텍스트를 수집한다 (답변이 없으면 기본값 적용):

```
1. 어떤 서비스/도메인의 API를 설계하나요? (예: 전자상거래, 사용자 관리, 결제)
2. 주요 소비자는 누구인가요? (내부 서비스간 / 서드파티 개발자 / 모바일 앱 / 웹 프론트엔드)
3. 기존 API나 시스템이 있나요? (리뷰 모드: 기존 코드/스펙 경로 알려주세요)
4. 인증 방식 선호도가 있나요? (없으면 소비자 유형에 맞게 추천)
5. 버전 관리 방식은? (없으면 URL Path v1 기본 권장)
6. 특별한 제약이 있나요? (레거시 연동, 특정 프레임워크, 성능 요구사항)
```

> **리뷰 모드**: 기존 API 스펙(OpenAPI YAML/JSON, 코드, ERD)이 있으면 먼저 읽어서 현황을 파악한다. Phase 1~4를 생략하고 Phase 5 안티패턴 진단으로 바로 진입한다.

---

## Phase 1: 리소스 모델링

**목표**: 도메인 개념을 REST 리소스로 매핑한다.

### 1-1. 리소스 식별

요구사항(BRD/PRD/기능 목록)에서 명사를 추출하여 리소스 후보를 나열한다.

```
리소스 = 독립적으로 식별되고 조작될 수 있는 "사물"
- ✓ 컬렉션 리소스: /users, /orders, /products
- ✓ 개별 리소스:  /users/{id}, /orders/{orderId}
- ✓ 서브 리소스:  /orders/{orderId}/items
- ✗ 동사는 리소스가 아님: /getUser, /createOrder
```

### 1-2. 관계 결정

리소스 간 관계를 분석한다:

| 관계 | URL 패턴 | 예시 |
|------|----------|------|
| 소유 관계 (Composition) | `/{parent}/{id}/{child}` | `/orders/{id}/items` |
| 참조 관계 (Association) | 독립 리소스 + 필터 | `/products?categoryId={id}` |
| 많은 중첩은 냄새 | 3단계 이하 유지 | `/orgs/{id}/teams/{id}/members` |

### 1-3. URL 설계

`references/url-naming-guide.md`를 참고하여 URL을 확정한다.

핵심 규칙:
- 복수 명사 사용: `/users` not `/user`
- 소문자 + 하이픈(kebab-case): `/user-profiles`
- 버전 prefix 포함: `/api/v1/users`
- 동사 쓰지 않기: `/api/v1/users/{id}/activate` → `POST /api/v1/users/{id}/activations`

---

## Phase 2: 엔드포인트 계약 설계

**목표**: 각 리소스에 대해 메서드·요청·응답 계약을 정의한다.

`references/http-methods-status-codes.md`를 참고한다.

### 2-1. 표준 CRUD 매핑

```
POST   /resources           → 201 Created  (생성)
GET    /resources           → 200 OK       (목록 조회, 페이지네이션 포함)
GET    /resources/{id}      → 200 OK       (단건 조회)
PUT    /resources/{id}      → 200 OK       (전체 교체)
PATCH  /resources/{id}      → 200 OK       (부분 수정)
DELETE /resources/{id}      → 204 No Content (삭제)
```

### 2-2. 요청/응답 스키마 설계

각 엔드포인트에 대해 정의:

```yaml
# 요청
- Path Parameters: 필수 식별자 (예: {userId})
- Query Parameters: 필터·정렬·페이지네이션 (예: ?page=1&limit=20&sort=-createdAt)
- Request Headers: Content-Type, Authorization, Idempotency-Key (POST 멱등성 필요 시)
- Request Body: JSON 스키마 (생성/수정 전용)

# 응답
- Response Headers: Content-Type, X-Request-Id, X-RateLimit-*
- Response Body: 데이터 + 메타 (페이지네이션 정보 등)
- 에러 응답: RFC 7807 Problem Details 형식
```

`references/request-response-patterns.md`에서 페이지네이션·필터링·벌크·비동기 패턴을 참고한다.

### 2-3. 특수 동작 처리

순수 CRUD로 표현하기 어려운 동작:

```
# 상태 전환 → 하위 리소스로 모델링
POST /orders/{id}/cancellations    # 주문 취소
POST /users/{id}/password-resets   # 비밀번호 재설정
POST /devices/{id}/activations     # 기기 활성화

# 집계/검색 → GET + 쿼리 파라미터
GET /reports/sales?from=2024-01&to=2024-12
GET /products?q=검색어&category=shoes&minPrice=10000

# 벌크 → 컬렉션에 POST
POST /users/batch-create
POST /messages/batch-delete
```

---

## Phase 3: 공통 관심사 설계

### 3-1. 인증 & 인가

`references/auth-patterns.md`를 읽고 상황에 맞는 방식을 선택한다.

| 상황 | 추천 |
|------|------|
| 서버-투-서버 내부 API | API Key (Header) |
| 외부 개발자 대상 공개 API | API Key + OAuth 2.0 Client Credentials |
| 사용자 대행 액션 (모바일/SPA) | OAuth 2.0 Authorization Code + PKCE |
| 마이크로서비스 내부 통신 | JWT (서비스 간 서명 검증) |

### 3-2. 버전 관리

`references/versioning-strategies.md`를 참고한다.

기본 전략: **URL Path 버전** (`/api/v1/...`)
- 단순하고 캐시 친화적
- 주요 변경 시 v2로 올림
- 이전 버전 6개월 공지 후 폐기

### 3-3. 에러 응답

`references/error-response-guide.md`를 읽고 에러 코드 체계를 정의한다.

RFC 7807 기준 표준 에러 응답 형식:
```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "요청 파라미터가 유효하지 않습니다.",
  "instance": "/api/v1/users",
  "errors": [
    { "field": "email", "message": "올바른 이메일 형식이 아닙니다." }
  ]
}
```

### 3-4. 페이지네이션 & 필터링

기본값: **Cursor 기반 페이지네이션** (대용량 데이터), 소규모는 Offset 허용

```json
// 응답 예시
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTAwfQ==",
    "hasNext": true,
    "totalCount": 1500
  }
}
```

### 3-5. Rate Limiting

응답 헤더로 제공:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1704067200
```
초과 시: `429 Too Many Requests`

---

## Phase 4: OpenAPI 3.0 스펙 생성

**목표**: 앞 단계에서 설계한 내용을 OpenAPI 3.0 YAML로 출력한다.

`references/openapi-template.yaml`을 기반 구조로 사용하여 다음 내용을 채운다:

```
1. info: 서비스명, 버전, 연락처
2. servers: 환경별 URL (production, staging, development)
3. security: 인증 스키마 (securitySchemes + 전역 security 또는 개별 operation)
4. paths: Phase 2에서 설계한 모든 엔드포인트
   - parameters: path/query/header 파라미터
   - requestBody: Content-Type + 스키마 (application/json 기본)
   - responses: 성공 응답 + 에러 응답 (공통 components 참조)
5. components:
   - schemas: 재사용 모델 (요청/응답 바디, 에러 형식)
   - parameters: 공통 파라미터 (page, limit, sort 등)
   - responses: 공통 에러 응답 (400, 401, 403, 404, 422, 429, 500)
   - securitySchemes: 인증 방식 정의
```

출력 파일 경로 규칙:
```
docs/api/{domain}-api.yaml          # 도메인별 스펙
docs/api/{domain}-api.md            # 사람이 읽기 쉬운 요약
```

---

## Phase 5: 설계 리뷰 & 안티패턴 진단

**목표**: 설계가 REST 원칙과 업계 표준을 준수하는지 검증한다.

`references/api-design-checklist.md`의 24개 체크포인트를 실행한다.

### 주요 안티패턴 (즉시 수정)

| 안티패턴 | 증상 | 수정 |
|----------|------|------|
| Verb in URL | `POST /createUser` | `POST /users` |
| 단수 리소스명 | `GET /user` | `GET /users/{id}` |
| 과도한 중첩 | `/a/{id}/b/{id}/c/{id}/d` | 4단계 초과 시 분리 |
| 모든 것이 200 | 에러도 200 반환 | 적절한 4xx/5xx 사용 |
| Snake_case URL | `/user_profiles` | `/user-profiles` (kebab) |
| 마법 숫자 상태 | 비표준 상태 코드 사용 | RFC 9110 표준 코드만 |
| 없는 버전 | `/api/users` (v 없음) | `/api/v1/users` |
| Boolean 파라미터 과용 | `?active=true&deleted=false` | 리소스 상태를 경로로 표현 |
| N+1 노출 | 응답마다 연관 객체 전체 반환 | `?include=` 파라미터로 제어 |
| 비밀 노출 | 응답에 password, secretKey | 민감 필드 응답에서 제거 |

---

## 출력 원칙

- **단계를 건너뛰지 않는다**: 리소스 모델이 확정되기 전에 OpenAPI를 생성하지 않는다.
- **확인 후 진행**: 각 Phase 종료 시 "이렇게 이해했는데 맞나요?" 확인 한 번.
- **파일로 저장**: OpenAPI YAML은 반드시 파일로 저장하고 경로를 알려준다.
- **설명 추가**: 스펙만 생성하지 말고, 주요 설계 결정과 그 이유를 Summary로 제공한다.
- **반복 가능**: "A 리소스만 먼저 해줘" → 해당 리소스만 Phase 1~4 실행 후 전체 스펙에 병합.

---

## 빠른 참조: 결정 트리

```
사용자 요청
├── "기존 API 리뷰해줘" → Phase 0(리뷰 모드) → Phase 5
├── "API 설계해줘" (요구사항 有)
│   ├── BRD/PRD 있음 → Phase 0 → 1 → 2 → 3 → 4 → 5
│   └── 없음 → Phase 0 질문으로 수집 후 시작
├── "OpenAPI 스펙만 만들어줘" (설계 已완료)
│   └── Phase 4 바로 실행
├── "URL 어떻게 해야 해?" → references/url-naming-guide.md 인라인 설명
├── "상태 코드 뭐 써?" → references/http-methods-status-codes.md 인라인 설명
└── "인증 어떻게?" → references/auth-patterns.md + Phase 3-1
```
