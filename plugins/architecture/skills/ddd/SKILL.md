---
name: ddd
description: |
  DDD(도메인 주도 설계) 원칙에 기반하여 코드·요구사항·아키텍처를 분석하고 도메인 분리 방안을 제시합니다.
  Bounded Context 도출, Aggregate 설계, Domain Event 식별, 헥사고날 아키텍처 패키지 구조 제안을 단계적으로 안내합니다.

  다음 상황에서 반드시 이 스킬을 사용하세요:
  - "DDD", "도메인 주도 설계" 언급 시
  - "바운디드 컨텍스트", "bounded context" 언급 시
  - "애그리게이트", "aggregate" 설계 요청 시
  - "도메인 분리", "도메인 모델" 분석 요청 시
  - "유비쿼터스 언어", "ubiquitous language" 언급 시
  - "엔티티", "값 객체", "도메인 이벤트" 설계 요청 시
  - 마이크로서비스 경계 설계 시
  - 레이어드 아키텍처를 DDD로 전환하고 싶을 때
---

# DDD (Domain-Driven Design) 스킬

DDD 일반론을 기반으로 사용자의 코드·요구사항을 분석하고 도메인 분리 방안을 안내합니다.
프로젝트 특수성보다 **DDD 원칙 자체**를 중심으로 판단하세요.

---

## 핵심 개념 참조

아래 개념들은 분석·제안 시 일관되게 적용해야 하는 DDD의 핵심입니다.

### Strategic Design (전략적 설계)

#### Bounded Context (바운디드 컨텍스트)
- 특정 도메인 모델이 **명확한 의미를 가지는 경계** — 같은 단어도 컨텍스트마다 다른 의미일 수 있다
- 하나의 팀, 하나의 코드베이스, 하나의 유비쿼터스 언어가 원칙
- **식별 방법**: 언어가 달라지는 지점, 조직 경계, 데이터 소유권이 바뀌는 지점

**컨텍스트 간 관계 패턴:**
| 패턴 | 설명 | 적합한 상황 |
|------|------|-------------|
| Shared Kernel | 공통 모델 공유 | 팀 간 긴밀한 협업 가능 |
| Customer-Supplier | 상류/하류 의존 | 명확한 제공자-소비자 관계 |
| Anti-Corruption Layer (ACL) | 외부 모델 변환 레이어 | 레거시·외부 시스템 연동 |
| Open Host Service | 공개 프로토콜 제공 | 다수의 소비자가 있는 서비스 |
| Published Language | 표준 교환 형식 | 이벤트 기반 통신 |
| Conformist | 상류 모델 그대로 수용 | 변환 비용 > 수용 비용 |

#### Ubiquitous Language (유비쿼터스 언어)
- 개발자·도메인 전문가가 **같은 단어**를 같은 의미로 사용하는 공유 언어
- 코드의 클래스명·메서드명·변수명이 유비쿼터스 언어를 반영해야 한다
- 언어가 불명확하면 Bounded Context가 잘못 설정된 신호

#### Context Map
- 여러 Bounded Context 간의 관계를 시각화한 지도
- 통합 포인트, 데이터 흐름, 팀 의존성을 한눈에 파악

---

### Tactical Design (전술적 설계)

#### Entity (엔티티)
- **식별자(ID)로 동일성을 판단**하는 객체
- 생명주기가 있고 상태가 변할 수 있다
- 예: `Order(orderId)`, `User(userId)`, `Product(productId)`

#### Value Object (값 객체)
- **속성 값으로 동일성을 판단**하는 불변 객체
- 교체 가능, 사이드 이펙트 없음
- 예: `Money(amount, currency)`, `Address(city, street, zipCode)`, `Email(value)`

**Entity vs Value Object 구분 기준:**
- 추적이 필요한가? → Entity
- 교체해도 의미가 같은가? → Value Object
- 같은 값이 두 개 존재해도 구별이 필요한가? → Entity

#### Aggregate (애그리게이트)
- 데이터 변경의 **일관성 경계** — 트랜잭션 단위
- 하나의 **Aggregate Root**(진입점)만 외부에서 직접 참조 가능
- 내부 객체는 Root를 통해서만 접근
- Aggregate 간 참조는 ID로만 한다 (직접 객체 참조 금지)

**Aggregate 설계 원칙:**
1. 가능한 작게 설계 (대부분 1~3개 Entity)
2. 비즈니스 불변식(invariant)을 함께 보호하는 것들을 묶는다
3. 트랜잭션 경계 = Aggregate 경계
4. 다른 Aggregate 변경은 Eventually Consistent로 처리

#### Domain Event (도메인 이벤트)
- 도메인에서 **의미 있는 사건** — 과거형으로 명명
- 예: `OrderPlaced`, `PaymentApproved`, `InventoryDecreased`
- Aggregate 간 느슨한 결합을 위한 주요 수단
- Event Sourcing의 기반

**이벤트 설계 체크리스트:**
- 도메인 전문가가 관심 갖는 사건인가?
- 과거형 동사로 표현되는가?
- 충분한 컨텍스트 정보를 포함하는가? (이벤트만으로 의미 파악 가능)
- 멱등성(idempotency)을 고려했는가?

#### Repository (리포지터리)
- Aggregate의 **영속성 추상화** — 컬렉션처럼 다루는 인터페이스
- 도메인 레이어에 인터페이스 정의, 인프라 레이어에 구현
- 한 Repository = 한 Aggregate Root 원칙
- 도메인 객체를 DB 스키마에서 분리

#### Domain Service (도메인 서비스)
- **특정 Entity/Value Object에 속하지 않는** 도메인 로직
- 상태 없는(stateless) 순수 도메인 로직
- 예: `TransferService(from, to, amount)`, `PricingService`
- 남발하면 도메인 로직이 서비스로 누출되는 Anemic Domain Model 위험

#### Application Service (응용 서비스)
- 유즈케이스 단위의 **오케스트레이션** — 도메인 로직 없음
- 트랜잭션 관리, 인증/인가, DTO 변환
- 도메인 객체를 조합하여 비즈니스 흐름을 구성
- 외부(API, 메시지 큐)에서 들어오는 요청의 진입점

---

### Hexagonal Architecture (헥사고날 아키텍처) 연계

DDD 전술적 설계는 헥사고날 아키텍처와 자연스럽게 연계됩니다.

```
인바운드 어댑터          포트            도메인            포트           아웃바운드 어댑터
─────────────────    ──────────    ──────────────    ──────────    ─────────────────────
REST Controller  →→  UseCase  →→  Application  →→  Repository  →→  JPA / MyBatis
gRPC Handler     →→  Port     →→  Service      →→  Port        →→  외부 API Client
Message Listener →→           →→  Domain       →→  EventPublisher→→ Kafka / RabbitMQ
Scheduler        →→           →→  Aggregate    →→              →→  File System
```

**패키지 구조 예시 (Spring Boot 기준):**
```
com.example.{bounded-context}/
├── adapter/
│   ├── in/
│   │   ├── web/                  # REST Controller, Request/Response DTO
│   │   ├── grpc/                 # gRPC Handler
│   │   └── messaging/            # Message Consumer (RabbitMQ, Kafka)
│   └── out/
│       ├── persistence/          # JPA Entity, Repository 구현체
│       ├── messaging/            # Event Publisher 구현체
│       └── client/               # 외부 서비스 Feign Client
├── application/
│   ├── port/
│   │   ├── in/                   # UseCase 인터페이스 (Command/Query)
│   │   └── out/                  # Repository, EventPublisher 인터페이스
│   └── service/                  # Application Service (UseCase 구현)
└── domain/
    ├── model/                    # Entity, Value Object, Aggregate
    ├── event/                    # Domain Event
    └── service/                  # Domain Service
```

---

## 분석 프로세스

사용자가 코드·요구사항을 제시하면 아래 순서로 진행하세요.

### Phase 1: 도메인 탐색 (Domain Discovery)

**목표**: 핵심 도메인과 유비쿼터스 언어를 파악한다.

1. **핵심 도메인 식별** — "이 시스템이 없으면 비즈니스가 돌아가지 않는 부분은?"
2. **서브도메인 분류**
   - Core Domain: 경쟁 우위의 원천 → 직접 개발
   - Supporting Domain: 필요하지만 차별화 요소 아님 → 직접 개발 또는 커스터마이징
   - Generic Domain: 범용적 → SaaS·오픈소스 활용
3. **유비쿼터스 언어 목록** 작성 — 도메인 전문가 용어를 코드 용어로 매핑

### Phase 2: Bounded Context 도출

**목표**: 모델이 일관된 의미를 가지는 경계를 찾는다.

**도출 질문:**
- 같은 단어가 다른 팀·부서에서 다른 의미로 쓰이는 곳은?
- 데이터 소유권이 바뀌는 경계는 어디인가?
- 별도 배포·스케일링이 필요한 부분은?
- 팀 경계와 일치하는가? (Conway's Law)

**출력 형식:**
```
Bounded Context: [이름]
- 담당 도메인: [핵심 개념들]
- 유비쿼터스 언어: [주요 용어 5~10개]
- 외부 의존성: [다른 컨텍스트와의 관계 + 패턴]
- 팀/배포 단위: [단일 서비스 여부]
```

### Phase 3: Aggregate 설계

**목표**: 트랜잭션 일관성 경계를 정의한다.

각 Bounded Context 내에서:
1. **불변식(Invariant) 파악** — "항상 참이어야 하는 비즈니스 규칙은?"
2. **Aggregate Root 선정** — 외부에서 진입하는 루트 Entity
3. **경계 결정** — 같은 트랜잭션으로 변경되어야 하는 것만 묶기
4. **참조 방식** — 다른 Aggregate는 ID 참조

**출력 형식:**
```
Aggregate: [이름]
- Root Entity: [클래스명(식별자)]
- 포함 객체: [Entity/Value Object 목록]
- 불변식: ["항상 A여야 한다", "B가 없으면 C 불가" ...]
- 외부 참조: [다른 Aggregate ID 목록]
- 주요 커맨드: [changeX(), addY(), removeZ() ...]
```

### Phase 4: Domain Event 식별

**목표**: Aggregate 간 결합을 이벤트로 풀어낸다.

1. 비즈니스에서 "~되면"으로 시작하는 흐름을 찾는다
2. 이벤트 → 반응 체인을 매핑한다
3. 이벤트 페이로드를 정의한다 (수신자가 필요한 정보)

**출력 형식:**
```
Event: [과거형 이름, e.g. OrderPlaced]
- 발행자: [Aggregate명]
- 트리거: [어떤 커맨드 실행 후]
- 구독자: [반응할 컨텍스트/서비스]
- 페이로드: { orderId, customerId, items[], totalAmount, occurredAt }
```

### Phase 5: 패키지 구조 제안

위 분석 결과를 기반으로 실제 패키지 구조를 제안합니다.
언어·프레임워크에 맞게 조정하되, 헥사고날 원칙을 유지하세요.

---

## 안티패턴 진단

분석 중 아래 증상이 보이면 명시적으로 지적하세요.

| 안티패턴 | 증상 | 해결 방향 |
|----------|------|-----------|
| Anemic Domain Model | Entity에 getter/setter만 있고 로직이 Service에 몰림 | 도메인 로직을 Entity/Value Object 내부로 이동 |
| Fat Service | Service 클래스가 수백 줄, 모든 로직 집중 | Domain Service / Application Service 분리 |
| Mega Aggregate | 하나의 Aggregate에 수십 개 객체 | 불변식 단위로 분리, Aggregate 경량화 |
| Shared Database | 여러 서비스가 같은 테이블 직접 접근 | 서비스별 DB 분리 또는 ACL 도입 |
| Missing Ubiquitous Language | 코드 용어와 도메인 용어 불일치 | 팀 내 언어 통일, 코드 리네이밍 |
| Circular Context Dependency | A→B→A 의존 | 이벤트 기반으로 전환 또는 컨텍스트 재구성 |

---

## 출력 원칙

- **단계별 진행**: 한 번에 모든 분석을 쏟아내지 말고, Phase를 나눠 사용자 확인 후 진행
- **질문 우선**: 모호한 도메인 개념은 추측보다 사용자에게 질문
- **예시 코드 포함**: 개념 설명 후 반드시 해당 언어로 예시 코드 제공
- **트레이드오프 명시**: 설계 결정마다 장단점을 함께 설명
- **과도한 설계 경계**: "지금 당장 필요한가?"를 기준으로 적정 수준 권장

---

## 빠른 참조: 결정 트리

```
새 기능/서비스 설계 요청
│
├─ 경계가 불명확한가?
│   └─ YES → Phase 2: Bounded Context 도출부터 시작
│
├─ Aggregate 설계 요청?
│   ├─ 불변식 파악 → Root 선정 → 경계 결정 → ID 참조 확인
│   └─ "트랜잭션이 필요한 범위"로 묶기
│
├─ 서비스 간 통신 문제?
│   ├─ 동기 → Feign/gRPC (Customer-Supplier 관계)
│   └─ 비동기 → Domain Event + Message Queue
│
└─ 기존 코드 리팩터링?
    ├─ Anemic Domain Model 진단
    ├─ 도메인 로직 Entity로 이동
    └─ 헥사고날 패키지 구조로 재편
```
