# 인증 & 인가 패턴 가이드

## 인증 방식 선택 매트릭스

| 상황 | 추천 방식 | 이유 |
|------|-----------|------|
| 서버-투-서버 내부 API | API Key (헤더) | 단순, 오버헤드 없음 |
| 외부 개발자 대상 공개 API | API Key + OAuth 2.0 | 개발자 경험 + 위임 권한 |
| 사용자 대행 액션 (모바일/SPA) | OAuth 2.0 Authorization Code + PKCE | 표준, 안전한 토큰 교환 |
| 마이크로서비스 내부 통신 | JWT (서비스 간 서명) | Stateless, 클레임 포함 |
| 관리자 도구 (내부) | Basic Auth + HTTPS | 단순 내부 도구용 |
| B2B 서비스간 연동 | OAuth 2.0 Client Credentials | 사용자 없는 앱 간 인증 |

---

## 1. API Key

### 특징
- 가장 단순한 인증 방식
- Stateless (서버에서 검증만)
- 권한 위임 불가

### 구현 방법

```http
# ✓ 권장: Authorization 헤더
Authorization: ApiKey your-api-key-here

# ✓ 허용: X-API-Key 커스텀 헤더
X-API-Key: your-api-key-here

# ✗ 비권장: 쿼리 파라미터 (로그에 노출됨)
GET /api/v1/users?api_key=your-api-key-here
```

### OpenAPI 스펙
```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

security:
  - ApiKeyAuth: []
```

### 베스트 프랙티스
- 키 길이: 최소 32바이트 랜덤 (64자 hex 또는 Base64)
- DB에 해시 저장 (bcrypt 또는 SHA-256)
- 만료 기간 설정 (90일 또는 1년)
- 키 발급 시 한 번만 보여주고 이후 재조회 불가
- 키별 권한 범위(scope) 지정 가능하면 지정

---

## 2. OAuth 2.0

### 플로우 선택 가이드

```
클라이언트 유형?
├── 서버 사이드 (사용자 없음) → Client Credentials Flow
├── 신뢰할 수 있는 퍼스트파티 앱 (사용자 있음)
│   └── 모바일/SPA → Authorization Code + PKCE
└── 서드파티 앱 (사용자 대리) → Authorization Code + PKCE
```

### 2-1. Authorization Code + PKCE (권장 — 사용자 인증)

```
1. 클라이언트: code_verifier 생성 (랜덤 43-128자)
              code_challenge = BASE64URL(SHA256(code_verifier))

2. 브라우저를 인가 서버로 리다이렉트
GET /oauth/authorize?
  response_type=code&
  client_id=client123&
  redirect_uri=https://app.example.com/callback&
  scope=read:users write:orders&
  state=random-state-value&          ← CSRF 방지
  code_challenge=abc123...&          ← PKCE
  code_challenge_method=S256

3. 사용자 로그인 + 권한 동의

4. 인가 서버 → 클라이언트로 코드 전달
GET https://app.example.com/callback?code=AUTH_CODE&state=random-state-value

5. 코드 → 토큰 교환
POST /oauth/token
{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "redirect_uri": "https://app.example.com/callback",
  "client_id": "client123",
  "code_verifier": "원본 code_verifier"   ← PKCE 검증
}

6. 응답
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token-value",
  "scope": "read:users write:orders"
}
```

### 2-2. Client Credentials (서버-투-서버)

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=client_credentials&scope=read:reports
```

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:reports"
}
```

### Access Token 사용

```http
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token 처리

```
Access Token 만료 (401 받음)
→ Refresh Token으로 새 Access Token 요청
→ 성공: 새 토큰으로 재시도
→ 실패(refresh token도 만료): 재로그인 유도
```

```http
POST /oauth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh-token-value",
  "client_id": "client123"
}
```

### OpenAPI 스펙
```yaml
components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth/authorize
          tokenUrl: https://auth.example.com/oauth/token
          scopes:
            read:users: 사용자 정보 읽기
            write:users: 사용자 정보 수정
            read:orders: 주문 정보 읽기
        clientCredentials:
          tokenUrl: https://auth.example.com/oauth/token
          scopes:
            read:reports: 리포트 읽기
```

---

## 3. JWT (JSON Web Token)

### JWT 구조

```
Header.Payload.Signature

eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.    ← Header (Base64URL)
eyJzdWIiOiJ1c2VyMTIzIiwibmFtZSI6Iu2Zjeq...← Payload (Base64URL)
signature_here                               ← Signature
```

### Payload 표준 클레임

```json
{
  "iss": "https://auth.example.com",         // 발행자
  "sub": "user123",                          // 주체 (사용자 ID)
  "aud": "https://api.example.com",          // 대상 (API)
  "exp": 1704067200,                         // 만료 시간 (Unix timestamp)
  "iat": 1704063600,                         // 발행 시간
  "jti": "550e8400-e29b-41d4-a716",         // 토큰 고유 ID (재사용 방지)
  "scope": "read:users write:orders",        // 권한 범위
  "role": "admin",                           // 역할 (커스텀 클레임)
  "orgId": "org-abc-123"                     // 조직 ID (커스텀 클레임)
}
```

### 서명 알고리즘 선택

| 알고리즘 | 타입 | 용도 |
|----------|------|------|
| RS256 | 비대칭 (RSA) | 공개 API (검증키 배포 가능) |
| ES256 | 비대칭 (ECDSA) | RS256보다 짧고 빠름 (권장) |
| HS256 | 대칭 (HMAC) | 같은 서비스 내부 (비밀키 공유 필요) |

> 마이크로서비스 간: RS256 또는 ES256 (각 서비스가 공개키로만 검증)

### 토큰 저장 위치 (클라이언트)

```
브라우저:
- ✓ HttpOnly Cookie (XSS 방어)
- ✓ Memory (SPA, 탭 종료 시 소멸)
- ✗ localStorage (XSS 취약)
- ✗ sessionStorage (XSS 취약)

모바일:
- ✓ Keychain (iOS) / Keystore (Android)
```

### JWT 무효화 전략

JWT는 기본적으로 만료 전까지 무효화 불가 → 짧은 만료 + Refresh Token 조합:

```
Access Token:  15분 ~ 1시간
Refresh Token: 30일 (HttpOnly Cookie에 저장)

강제 로그아웃 시:
1. Refresh Token DB에서 삭제
2. Token Revocation List (Redis) — Access Token 블랙리스트
```

### OpenAPI 스펙
```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## 인가 (Authorization) 패턴

### RBAC (Role-Based Access Control)

```
역할 정의:
- ADMIN: 모든 작업
- MANAGER: 읽기 + 수정 (삭제 불가)
- VIEWER: 읽기만

JWT 클레임에 역할 포함:
{ "role": "MANAGER", "permissions": ["users:read", "users:write"] }
```

### ABAC (Attribute-Based Access Control)

```
정책 예시:
- 사용자는 자신의 리소스만 수정 가능
- 조직 멤버는 해당 조직 리소스에만 접근
- 리소스 소유자는 공유 설정 가능
```

### 에러 응답

```json
// 401 Unauthorized — 인증 필요
{
  "type": "https://api.example.com/errors/unauthorized",
  "title": "Authentication Required",
  "status": 401,
  "detail": "유효한 인증 토큰이 필요합니다.",
  "instance": "/api/v1/users"
}

// 403 Forbidden — 권한 없음
{
  "type": "https://api.example.com/errors/forbidden",
  "title": "Access Forbidden",
  "status": 403,
  "detail": "해당 리소스에 접근할 권한이 없습니다.",
  "instance": "/api/v1/users/123"
}
```

---

## Scope 설계 가이드

```
형식: {action}:{resource}

읽기/쓰기 분리:
- read:users       → 사용자 목록/단건 조회
- write:users      → 사용자 생성/수정/삭제
- admin:users      → 사용자 관리 전체 권한

도메인별 분리:
- read:orders
- write:orders
- read:payments
- write:payments

최소 권한 원칙:
- 각 앱/서비스는 필요한 scope만 요청
- 사용자에게 명확한 동의 화면 제공
```
