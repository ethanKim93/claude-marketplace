# API 버전 관리 전략

## 버전 전략 비교

| 전략 | 예시 | 캐시 | 가시성 | 구현 복잡도 | 권장 상황 |
|------|------|------|--------|-------------|-----------|
| **URL Path** | `/api/v1/users` | ✓ 친화적 | ✓ 명확 | 낮음 | **기본 권장** |
| **Query Parameter** | `/api/users?version=1` | △ 오염 위험 | ✓ 명확 | 낮음 | 비권장 |
| **Accept Header** | `Accept: application/vnd.api+json;version=1` | ✗ 어려움 | ✗ 숨김 | 높음 | 순수 REST 추구 시 |
| **Custom Header** | `X-API-Version: 1` | ✗ 어려움 | ✗ 숨김 | 중간 | 내부 API |
| **날짜 기반 URL** | `/api/2024-01-15/users` | ✓ 친화적 | ✓ 명확 | 중간 | Stripe, Azure 스타일 |

---

## 1. URL Path 버전 (권장 기본값)

```http
/api/v1/users
/api/v2/users
/api/v1/orders
```

### 장점
- 가장 직관적이고 가시적
- 캐시 친화적 (URL 자체가 고유)
- 브라우저/클라이언트에서 명확히 구분
- 로그 분석·디버깅 쉬움

### 단점
- URL이 RESTful 순수 원칙상 "같은 리소스"에 다른 URL을 갖게 됨 (이론적 결함)
- 코드베이스에 버전별 라우팅 관리 필요

### 구현 패턴

```
/api/v1/    → v1 라우터
/api/v2/    → v2 라우터

서버 구조:
src/
├── api/
│   ├── v1/
│   │   ├── users/
│   │   └── orders/
│   └── v2/
│       ├── users/     ← 변경된 부분만
│       └── orders/    ← 미변경 시 v1으로 리다이렉트
```

---

## 2. 날짜 기반 버전 (Stripe, Azure, Cloudflare 스타일)

```http
/api/2024-01-15/users
/api/2024-06-01/users
```

또는 헤더 방식 (Stripe):
```http
Stripe-Version: 2024-06-20
```

### 특징
- 언제 API가 변경됐는지 명확히 알 수 있음
- 하위 호환 변경과 주요 변경을 구분하기 쉬움
- 클라이언트가 특정 시점의 동작을 고정할 수 있음

### 버전 진화 정책 (Stripe 방식)
```
클라이언트는 첫 통합 시점의 버전을 사용
이후 신규 버전이 나와도 자동 업그레이드 없음
API Key에 기본 버전 고정 → 명시적으로 버전 업그레이드해야 함
```

---

## 3. Accept Header 버전

```http
GET /api/users
Accept: application/vnd.company.api+json;version=2
```

또는 미디어 타입으로:
```http
Accept: application/vnd.company.users.v2+json
```

### 특징
- REST 아키텍처에 이론적으로 가장 부합
- 브라우저에서 테스트 어려움
- CDN 캐싱이 복잡

---

## 언제 버전을 올려야 하나?

### 하위 호환 변경 (Breaking X — 버전 올릴 필요 없음)

```
✓ 새 엔드포인트 추가
✓ 기존 응답에 새 선택적 필드 추가
✓ 새 선택적 요청 파라미터 추가
✓ 에러 응답에 새 필드 추가
✓ 내부 로직 변경 (외부에 영향 없음)
✓ 기존 HTTP 메서드에 새 응답 코드 추가 (클라이언트가 4xx/5xx 처리 시)
```

### 파괴적 변경 (Breaking — 버전 올려야 함)

```
✗ 필드명 변경: userId → id
✗ 필드 타입 변경: "id": "123" → "id": 123
✗ 필드 삭제
✗ 필수 요청 파라미터 추가
✗ URL 구조 변경
✗ HTTP 메서드 변경: POST → PUT
✗ 응답 구조 재편
✗ 인증 방식 변경
✗ 에러 코드 변경
```

---

## 버전 폐기(Deprecation) 정책

### 폐기 공지 방법

```http
# 응답 헤더로 폐기 경고
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: <https://api.example.com/migrate/v1-to-v2>; rel="successor-version"
```

### 폐기 프로세스 (권장)

```
1. 신규 버전 출시
   └─ 기존 버전에 Deprecation 헤더 추가

2. 마이그레이션 가이드 공개
   └─ 변경 사항 목록, 코드 예시, FAQ

3. 폐기 예고 공지 (최소 6개월, 공개 API는 12개월)
   └─ 이메일, 개발자 포털, 릴리즈 노트

4. 모니터링
   └─ 구버전 트래픽 추적, 사용 중인 클라이언트 연락

5. 트래픽 0% 도달 후 폐기
   └─ 410 Gone 반환 또는 최신 버전으로 리다이렉트
```

### 폐기 후 응답 (410 Gone)

```json
{
  "type": "https://api.example.com/errors/api-version-deprecated",
  "title": "API Version Deprecated",
  "status": 410,
  "detail": "API v1은 2025-12-31에 폐기되었습니다. v2로 마이그레이션하세요.",
  "migrationGuide": "https://docs.example.com/migrate/v1-to-v2"
}
```

---

## 마이너 버전 처리

주요 버전(v1, v2) 내에서 작은 변경은 응답 헤더로 관리:

```http
X-API-Version: 1.3.2    # 실제 서버 버전
X-API-Min-Version: 1.0  # 지원하는 최소 버전
```

---

## OpenAPI에서 버전 표현

```yaml
openapi: 3.0.3
info:
  title: Example API
  version: "2.0.0"
  description: |
    ## 버전 정책
    - v2: 현재 버전 (안정)
    - v1: 2025-12-31 폐기 예정

servers:
  - url: https://api.example.com/api/v2
    description: Production (v2)
  - url: https://api.example.com/api/v1
    description: Production (v1, Deprecated)
    x-deprecated: true
    x-sunset: "2025-12-31"
  - url: https://staging.api.example.com/api/v2
    description: Staging
```

---

## URL 버전 vs 헤더 버전 결정 가이드

```
Q: 외부 개발자 대상 공개 API인가?
└─ YES → URL Path 버전 (가시성 중요)
└─ NO → 헤더 버전도 고려 가능

Q: CDN 캐싱이 중요한가?
└─ YES → URL Path 버전 (캐시 키가 명확)
└─ NO → 헤더 버전 가능

Q: 브라우저 직접 테스트가 필요한가?
└─ YES → URL Path 버전 (Swagger UI, 브라우저 주소창)
└─ NO → 헤더 버전 가능

결론: 특별한 이유가 없으면 URL Path 버전 사용
```
