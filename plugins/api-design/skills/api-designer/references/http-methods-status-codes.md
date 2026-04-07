# HTTP 메서드 & 상태 코드 가이드

## HTTP 메서드 선택 기준

### 메서드별 특성 비교

| 메서드 | 안전(Safe) | 멱등(Idempotent) | 요청 바디 | 기본 용도 |
|--------|-----------|-----------------|-----------|-----------|
| GET | ✓ | ✓ | ✗ | 리소스 조회 |
| HEAD | ✓ | ✓ | ✗ | 메타데이터만 조회 (바디 없음) |
| OPTIONS | ✓ | ✓ | ✗ | 지원 메서드 조회 (CORS preflight) |
| POST | ✗ | ✗ | ✓ | 리소스 생성, 상태 전환 트리거 |
| PUT | ✗ | ✓ | ✓ | 리소스 전체 교체 |
| PATCH | ✗ | ✗* | ✓ | 리소스 부분 수정 |
| DELETE | ✗ | ✓ | 선택 | 리소스 삭제 |

> *PATCH는 구현에 따라 멱등할 수도 있음 (JSON Patch 적용 시 비멱등, 특정 값으로 set 시 멱등)

### 메서드 상세 가이드

#### GET — 조회
```http
GET /api/v1/users              # 목록
GET /api/v1/users/123          # 단건
GET /api/v1/users?page=2&limit=20  # 페이지네이션
GET /api/v1/users?status=active&sort=-createdAt  # 필터+정렬
```
- 응답은 캐시 가능 (Cache-Control, ETag 활용)
- 쿼리스트링은 URL 인코딩 필수
- 대량 데이터 GET은 쿼리 파라미터로 페이지네이션

#### POST — 생성 및 비멱등 동작
```http
POST /api/v1/users             # 생성 → 201 Created + Location 헤더
POST /api/v1/orders/456/cancellations  # 상태 전환 → 201 or 200
POST /api/v1/reports/generate  # 복잡한 집계 쿼리 (GET 한계 시)
```
- 성공 시 `201 Created` + `Location: /api/v1/users/789`
- 중복 방지: `Idempotency-Key` 헤더 지원 권장

#### PUT — 전체 교체 (Replace)
```http
PUT /api/v1/users/123
Content-Type: application/json

{
  "name": "홍길동",
  "email": "hong@example.com",
  "phone": "010-1234-5678"
}
```
- 보내지 않은 필드는 null/기본값으로 교체됨
- 클라이언트가 리소스 전체 상태를 알고 있을 때 사용
- 멱등: 같은 요청 반복해도 결과 동일

#### PATCH — 부분 수정 (Modify)
```http
PATCH /api/v1/users/123
Content-Type: application/json

{
  "phone": "010-9999-8888"
}
```
- 보내지 않은 필드는 그대로 유지
- 큰 리소스의 일부만 수정할 때 효율적
- JSON Merge Patch(RFC 7396) 또는 JSON Patch(RFC 6902) 형식

#### DELETE — 삭제
```http
DELETE /api/v1/users/123       # 단건 삭제 → 204 No Content
DELETE /api/v1/sessions        # 전체 삭제 (세션 만료 등)
```
- 성공 시 `204 No Content` (바디 없음)
- 이미 삭제된 리소스: `404` 또는 `204` (멱등성 보장 시 204)
- 소프트 삭제: DELETE 이후에도 `404` 반환하거나 별도 상태로 관리

---

## HTTP 상태 코드 가이드

### 2xx — 성공

| 코드 | 이름 | 사용 시점 |
|------|------|-----------|
| **200** | OK | GET·PUT·PATCH 성공, POST로 데이터 반환 시 |
| **201** | Created | POST로 리소스 생성 성공 (`Location` 헤더 포함) |
| **202** | Accepted | 비동기 처리 수락 (처리 완료 아님, 폴링 URL 제공) |
| **204** | No Content | DELETE 성공, PUT/PATCH 응답 바디 없을 때 |
| **206** | Partial Content | Range 요청 (대용량 파일 다운로드) |

### 3xx — 리다이렉션

| 코드 | 이름 | 사용 시점 |
|------|------|-----------|
| **301** | Moved Permanently | URL 영구 변경 (버전 업그레이드 리다이렉트) |
| **302** | Found | 임시 리다이렉션 |
| **304** | Not Modified | ETag/Last-Modified 캐시 유효 (바디 없음) |
| **307** | Temporary Redirect | POST 메서드 유지하며 임시 리다이렉트 |
| **308** | Permanent Redirect | POST 메서드 유지하며 영구 리다이렉트 |

### 4xx — 클라이언트 오류

| 코드 | 이름 | 사용 시점 | 예시 |
|------|------|-----------|------|
| **400** | Bad Request | 요청 형식 오류, 파싱 실패 | JSON 파싱 불가, 필수 파라미터 누락 |
| **401** | Unauthorized | 인증 필요 또는 인증 실패 | 토큰 없음, 만료, 서명 불일치 |
| **403** | Forbidden | 인증은 됐지만 권한 없음 | 다른 사용자 데이터 접근, 권한 부족 |
| **404** | Not Found | 리소스 없음 | 존재하지 않는 ID |
| **405** | Method Not Allowed | 지원하지 않는 HTTP 메서드 | 읽기 전용 리소스에 DELETE |
| **409** | Conflict | 리소스 충돌 | 중복 이메일, 낙관적 잠금 실패 |
| **410** | Gone | 리소스가 영구 삭제됨 | 폐기된 API 버전 |
| **415** | Unsupported Media Type | 지원하지 않는 Content-Type | XML 요청인데 JSON만 지원 |
| **422** | Unprocessable Entity | 형식은 맞지만 비즈니스 유효성 실패 | 이메일 형식은 맞지만 이미 사용 중 |
| **429** | Too Many Requests | Rate Limit 초과 | `Retry-After` 헤더 포함 |

> **400 vs 422 구분**:
> - 400: 요청 자체가 파싱/구조적으로 잘못됨
> - 422: 파싱은 성공했지만 비즈니스 규칙/유효성 검사 실패

> **401 vs 403 구분**:
> - 401: "누구세요?" — 인증 정보가 없거나 유효하지 않음
> - 403: "알고는 있는데 안 됩니다" — 인증은 됐지만 권한 없음

### 5xx — 서버 오류

| 코드 | 이름 | 사용 시점 | 주의 |
|------|------|-----------|------|
| **500** | Internal Server Error | 예상치 못한 서버 오류 | 스택 트레이스 노출 금지 |
| **502** | Bad Gateway | 업스트림 서버 응답 오류 | 게이트웨이/프록시에서 |
| **503** | Service Unavailable | 서버 과부하, 점검 중 | `Retry-After` 헤더 포함 |
| **504** | Gateway Timeout | 업스트림 서버 타임아웃 | 게이트웨이/프록시에서 |

---

## 메서드 × 상태 코드 매트릭스

```
           200  201  202  204  400  401  403  404  409  422  429  500
GET         ✓         ✓         ✓    ✓    ✓    ✓         ✓    ✓    ✓
POST        ✓    ✓    ✓         ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
PUT         ✓         ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
PATCH       ✓              ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
DELETE           ✓         ✓    ✓    ✓    ✓    ✓         ✓    ✓    ✓
```

---

## 공통 응답 헤더

```http
Content-Type: application/json; charset=utf-8
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000   # 요청 추적
X-Response-Time: 45ms                                  # 성능 모니터링
Cache-Control: no-cache                                # 캐시 제어
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d"       # 조건부 요청
Last-Modified: Wed, 21 Oct 2024 07:28:00 GMT           # 캐시 검증
X-RateLimit-Limit: 1000                                # Rate Limit
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1704067200
Retry-After: 60                                        # 429/503 시
Location: /api/v1/users/789                            # 201 Created 시
```
