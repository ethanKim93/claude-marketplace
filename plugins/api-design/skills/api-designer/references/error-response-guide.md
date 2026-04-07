# 에러 응답 설계 가이드

## RFC 7807 Problem Details (표준 권장)

[RFC 7807](https://tools.ietf.org/html/rfc7807) — Problem Details for HTTP APIs

### 기본 구조

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "요청 데이터가 유효하지 않습니다.",
  "instance": "/api/v1/users",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| `type` | 권장 | URI | 에러 유형의 고유 식별자 (문서 URL) |
| `title` | 권장 | string | 에러 유형의 짧은 요약 (human-readable) |
| `status` | 권장 | integer | HTTP 상태 코드 |
| `detail` | 선택 | string | 이 특정 에러의 상세 설명 |
| `instance` | 선택 | URI | 에러가 발생한 리소스 경로 |
| 커스텀 필드 | 선택 | any | 유효성 검사 오류 등 추가 정보 |

### 확장 필드 패턴

```json
// 유효성 검사 에러 (422)
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "입력값이 유효하지 않습니다.",
  "instance": "/api/v1/users",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "올바른 이메일 형식이 아닙니다.",
      "value": "not-an-email"
    },
    {
      "field": "phone",
      "code": "REQUIRED",
      "message": "필수 입력 항목입니다."
    }
  ]
}
```

```json
// 리소스 충돌 에러 (409)
{
  "type": "https://api.example.com/errors/duplicate-resource",
  "title": "Duplicate Resource",
  "status": 409,
  "detail": "이미 등록된 이메일 주소입니다.",
  "instance": "/api/v1/users",
  "conflictingField": "email",
  "conflictingValue": "hong@example.com"
}
```

```json
// Rate Limit 초과 (429)
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "요청 한도를 초과했습니다. 60초 후 다시 시도하세요.",
  "instance": "/api/v1/users",
  "retryAfter": 60,
  "limit": 1000,
  "remaining": 0,
  "resetAt": "2024-01-15T10:00:00Z"
}
```

---

## Content-Type

```http
Content-Type: application/problem+json    # RFC 7807 권장
Content-Type: application/json            # 일반적으로도 허용
```

---

## 에러 코드 체계 설계

### 에러 코드 명명 규칙

```
형식: {DOMAIN}_{TYPE}

예시:
USER_NOT_FOUND          → 사용자 조회 실패
USER_EMAIL_DUPLICATE    → 이메일 중복
ORDER_INVALID_STATUS    → 주문 상태 전환 불가
PAYMENT_INSUFFICIENT_BALANCE  → 잔액 부족
AUTH_TOKEN_EXPIRED      → 토큰 만료
AUTH_TOKEN_INVALID      → 토큰 유효하지 않음
```

### 공통 에러 코드 목록

| 에러 코드 | HTTP 상태 | 설명 |
|-----------|-----------|------|
| `VALIDATION_FAILED` | 422 | 입력값 유효성 검사 실패 |
| `REQUIRED_FIELD_MISSING` | 400 | 필수 필드 누락 |
| `INVALID_FIELD_FORMAT` | 422 | 필드 형식 오류 |
| `RESOURCE_NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `RESOURCE_ALREADY_EXISTS` | 409 | 리소스 중복 |
| `RESOURCE_CONFLICT` | 409 | 리소스 충돌 (낙관적 잠금 등) |
| `UNAUTHORIZED` | 401 | 인증 필요 |
| `TOKEN_EXPIRED` | 401 | 토큰 만료 |
| `TOKEN_INVALID` | 401 | 토큰 유효하지 않음 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate Limit 초과 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |
| `SERVICE_UNAVAILABLE` | 503 | 서비스 일시 중단 |
| `UPSTREAM_ERROR` | 502 | 외부 서비스 오류 |

---

## HTTP 상태 코드별 에러 응답 예시

### 400 Bad Request — 요청 형식 오류

```json
{
  "type": "https://api.example.com/errors/bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "JSON 파싱에 실패했습니다.",
  "instance": "/api/v1/users"
}
```

### 401 Unauthorized — 인증 실패

```json
{
  "type": "https://api.example.com/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "인증 토큰이 만료되었습니다.",
  "instance": "/api/v1/users",
  "code": "TOKEN_EXPIRED"
}
```

응답 헤더도 포함:
```http
WWW-Authenticate: Bearer realm="api.example.com", error="invalid_token", error_description="Token has expired"
```

### 403 Forbidden — 권한 없음

```json
{
  "type": "https://api.example.com/errors/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "해당 리소스에 대한 접근 권한이 없습니다.",
  "instance": "/api/v1/users/999",
  "requiredScope": "admin:users"
}
```

### 404 Not Found — 리소스 없음

```json
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "ID '999'에 해당하는 사용자를 찾을 수 없습니다.",
  "instance": "/api/v1/users/999"
}
```

### 409 Conflict — 리소스 충돌

```json
{
  "type": "https://api.example.com/errors/conflict",
  "title": "Resource Conflict",
  "status": 409,
  "detail": "이미 등록된 이메일 주소입니다.",
  "instance": "/api/v1/users",
  "conflictField": "email"
}
```

### 422 Unprocessable Entity — 유효성 검사 실패

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "입력값 유효성 검사에 실패했습니다.",
  "instance": "/api/v1/users",
  "errors": [
    { "field": "email", "code": "INVALID_FORMAT", "message": "올바른 이메일 형식이 아닙니다." },
    { "field": "password", "code": "TOO_SHORT", "message": "비밀번호는 8자 이상이어야 합니다.", "minLength": 8 },
    { "field": "phone", "code": "INVALID_FORMAT", "message": "올바른 전화번호 형식이 아닙니다." }
  ]
}
```

### 429 Too Many Requests — Rate Limit

```json
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "분당 요청 한도(1000회)를 초과했습니다.",
  "instance": "/api/v1/users",
  "retryAfter": 45
}
```

응답 헤더:
```http
Retry-After: 45
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
```

### 500 Internal Server Error

```json
{
  "type": "https://api.example.com/errors/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "instance": "/api/v1/users",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

> **보안 주의**: 500 에러에 스택 트레이스, DB 오류 메시지, 시스템 경로 등 내부 정보를 절대 노출하지 않는다. `traceId`만 제공하고 서버 로그에서 추적.

---

## 에러 문서 페이지 (type URI 목적지)

각 `type` URI는 실제로 접속 가능한 에러 문서 페이지를 가리키면 이상적:

```
https://api.example.com/errors/validation-failed
→ 에러 설명, 발생 원인, 해결 방법, 예시 응답 등을 담은 HTML 문서
```

개발 초기에는 `about:blank` 사용 허용, 프로덕션에서는 실제 문서 페이지 제공 권장.

---

## OpenAPI 에러 응답 컴포넌트

```yaml
components:
  schemas:
    ProblemDetails:
      type: object
      properties:
        type:
          type: string
          format: uri
          example: "https://api.example.com/errors/validation-failed"
        title:
          type: string
          example: "Validation Failed"
        status:
          type: integer
          example: 422
        detail:
          type: string
          example: "입력값이 유효하지 않습니다."
        instance:
          type: string
          format: uri-reference
          example: "/api/v1/users"
        traceId:
          type: string
          format: uuid

    ValidationError:
      allOf:
        - $ref: '#/components/schemas/ProblemDetails'
        - type: object
          properties:
            errors:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  code:
                    type: string
                  message:
                    type: string

  responses:
    BadRequest:
      description: 잘못된 요청 형식
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

    Unauthorized:
      description: 인증 필요
      headers:
        WWW-Authenticate:
          schema:
            type: string
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

    Forbidden:
      description: 권한 없음
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

    NotFound:
      description: 리소스를 찾을 수 없음
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

    UnprocessableEntity:
      description: 유효성 검사 실패
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ValidationError'

    TooManyRequests:
      description: Rate Limit 초과
      headers:
        Retry-After:
          schema:
            type: integer
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

    InternalServerError:
      description: 서버 내부 오류
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'
```
