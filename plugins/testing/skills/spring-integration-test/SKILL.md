---
name: spring-integration-test
description: |
  Spring Boot 프로젝트의 통합 테스트(Integration Test) 코드를 작성합니다.
  @SpringBootTest 기반으로 실제 애플리케이션 컨텍스트를 로드하여 계층 간 연동,
  외부 인프라(DB/Redis/Kafka), Security 인가 흐름, 비동기 이벤트 등을 검증합니다.
  Testcontainers, Awaitility, @Sql, @WithUserDetails 등 통합 테스트 전용 기법을 활용합니다.

  다음 상황에서 반드시 이 스킬을 사용하세요:
  - "통합 테스트 작성해줘", "Integration Test 만들어줘", "E2E 테스트 짜줘" 요청 시
  - "실제 DB로 테스트하고 싶어", "Testcontainers 써줘", "@ServiceConnection 사용법" 요청 시
  - "전체 흐름 테스트", "여러 계층 묶어서 테스트", "API부터 DB까지 검증" 요청 시
  - "TestRestTemplate, WebTestClient 사용법" 요청 시
  - "비동기 테스트", "이벤트 기반 테스트", "Awaitility 사용법" 요청 시
  - "Security 통합 테스트", "@WithUserDetails 사용", "JWT 토큰 테스트" 요청 시
  - "@Sql로 테스트 데이터 세팅", "테스트 픽스처 관리" 요청 시
  - "테스트 컨텍스트 캐싱", "테스트가 너무 느려요 (통합 테스트 수십 개 이상)" 요청 시
  - "Kafka 테스트", "Redis 테스트", "외부 인프라 포함 테스트" 요청 시
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Spring Integration Test 스킬

실제 Spring 애플리케이션 컨텍스트를 띄워서 **계층 간 실제 연동**을 검증하는 통합 테스트를 작성한다.
단위 테스트로는 잡기 어려운 설정 오류, 트랜잭션 경계, 인프라 연동 문제를 발견하는 것이 목표다.

---

## Phase 0: 프로젝트 파악

### 의존성 스캔

```bash
cat pom.xml || cat build.gradle
```

확인 포인트:
- `spring-boot-starter-test` — JUnit5 + AssertJ + MockMvc 번들
- `testcontainers` — 실제 DB/Redis/Kafka 컨테이너
- `spring-security-test` — @WithMockUser, @WithUserDetails
- `awaitility` — 비동기 테스트
- `spring-kafka-test` / `spring-data-redis` / `spring-amqp` — 메시징 테스트

의존성이 부족하면 **Phase 5 결과 요약** 때 추가할 것들을 안내한다.

### 소스 구조 파악

```bash
# 패키지 구조와 주요 클래스 파악
find src/main/java -name "*.java" | head -60
```

확인 포인트:
- 메인 클래스 위치 → `@SpringBootApplication` 패키지
- 도메인 구조 (계층형 vs 도메인형)
- 이미 존재하는 통합 테스트 (`*IntegrationTest.java`, `*IT.java`)
- `src/test/resources/application.yml` (테스트 전용 설정 존재 여부)

---

## Phase 1: 통합 테스트 전략 결정

### webEnvironment 선택 기준

| 옵션 | 포트 | 사용 시나리오 |
|------|------|--------------|
| `RANDOM_PORT` | 랜덤 | **HTTP 계층까지 실제 테스트** — TestRestTemplate/WebTestClient 사용, 필터/인터셉터 포함 검증 |
| `MOCK` (기본) | 없음 | **MockMvc로 MVC 계층 테스트** — 빠르고 트랜잭션 롤백 가능, 서블릿 컨테이너 미시작 |
| `NONE` | 없음 | **비웹 컴포넌트 통합** — 배치, 스케줄러, 이벤트 기반 처리 |
| `DEFINED_PORT` | 8080 | 외부 도구와 연동 필요 시만 사용 (포트 충돌 위험) |

```
통합 테스트 선택 흐름:

HTTP 엔드포인트 포함? ─yes─► RANDOM_PORT + TestRestTemplate/WebTestClient
                    └no
비웹 서비스/배치? ────────────► NONE
MockMvc 충분? ─────────────────► MOCK (기본, 가장 빠름)
```

### HTTP 클라이언트 선택

| 클라이언트 | 적합 시나리오 |
|------------|--------------|
| `TestRestTemplate` | 블로킹 REST API, 간단한 JSON 요청/응답 |
| `WebTestClient` | Reactive, 스트리밍, 비동기 응답, 상세한 응답 단언 |

---

## Phase 2: 베이스 클래스 설계 (컨텍스트 캐싱 전략)

**핵심**: `@SpringBootTest` 구성이 같으면 Spring이 ApplicationContext를 재사용한다.
테스트마다 구성이 다르면 컨텍스트를 새로 띄워 테스트 전체가 수십 분씩 느려진다.

### 베이스 클래스 패턴 (권장)

프로젝트에 통합 테스트가 3개 이상이면 공통 베이스 클래스를 만든다:

```java
// src/test/java/.../support/IntegrationTestSupport.java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class IntegrationTestSupport {

    @Autowired
    protected TestRestTemplate restTemplate;

    // Testcontainers — static으로 선언해야 JVM 단위로 공유됨
    @Container
    @ServiceConnection  // Spring Boot 3.1+: datasource 자동 설정
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    // 여러 컨테이너가 필요한 경우
    @Container
    @ServiceConnection
    static GenericContainer<?> redis =
        new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    // 테스트 간 데이터 격리 — 각 테스트 전에 DB 초기화
    // (방법1: deleteAll, 방법2: @Transactional 롤백, 방법3: @Sql)
}
```

> **왜 static?** 인스턴스 필드로 선언하면 테스트 클래스마다 컨테이너가 새로 시작된다.
> static + `@Container`는 테스트 스위트 전체에서 한 번만 시작하고 끝날 때 자동 종료된다.

### MockMvc 베이스 (MOCK 환경)

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional  // 각 테스트 후 자동 롤백 — 데이터 격리 보장
public abstract class MockMvcIntegrationSupport {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;
}
```

> **@Transactional 주의**: MockMvc + MOCK 환경에서는 롤백이 잘 동작한다.
> 하지만 RANDOM_PORT에서는 HTTP 요청이 별도 스레드에서 실행되므로 `@Transactional`이 롤백되지 않는다.
> RANDOM_PORT에서는 `@BeforeEach`에서 데이터를 직접 정리해야 한다.

---

## Phase 3: 테스트 시나리오별 작성 패턴

### 3-1. 전체 흐름 테스트 (RANDOM_PORT + TestRestTemplate)

계층(Controller → Service → Repository → DB)을 통과하는 핵심 비즈니스 흐름을 검증한다.

```java
@Testcontainers
class UserFlowIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanUp() {
        userRepository.deleteAll();  // RANDOM_PORT는 @Transactional 롤백 안 됨
    }

    @Test
    @DisplayName("회원가입 → 로그인 → 프로필 조회 전체 흐름이 정상 동작한다")
    void should_completeUserLifecycle_when_registeredAndLoggedIn() {
        // given - 회원가입
        CreateUserRequest signupRequest = new CreateUserRequest(
            "john@example.com", "password123", "John Doe");

        ResponseEntity<UserResponse> signupResponse = restTemplate
            .postForEntity("/api/users/signup", signupRequest, UserResponse.class);

        assertThat(signupResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long userId = signupResponse.getBody().getId();

        // when - 로그인
        LoginRequest loginRequest = new LoginRequest("john@example.com", "password123");
        ResponseEntity<TokenResponse> loginResponse = restTemplate
            .postForEntity("/api/auth/login", loginRequest, TokenResponse.class);

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        String token = loginResponse.getBody().getAccessToken();

        // then - 토큰으로 프로필 조회
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<UserResponse> profileResponse = restTemplate
            .exchange("/api/users/me", HttpMethod.GET,
                new HttpEntity<>(headers), UserResponse.class);

        assertThat(profileResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(profileResponse.getBody().getEmail()).isEqualTo("john@example.com");
        assertThat(profileResponse.getBody().getId()).isEqualTo(userId);
    }
}
```

### 3-2. MockMvc 통합 테스트 (MOCK + @Transactional 롤백)

빠르게 돌면서 실제 DB도 사용하는 중간 전략. 서블릿 필터, ArgumentResolver, ExceptionHandler까지 포함.

```java
class OrderControllerIntegrationTest extends MockMvcIntegrationSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Test
    @DisplayName("재고가 있는 상품 주문 시 201 Created와 주문 정보를 반환한다")
    @WithUserDetails(value = "buyer@example.com", userDetailsServiceBeanName = "userDetailsService")
    void should_return201WithOrder_when_productInStockOrdered() throws Exception {
        // given
        User buyer = userRepository.save(User.of("buyer@example.com", "password"));
        Product product = productRepository.save(Product.of("노트북", 1_500_000, 10));

        String requestBody = objectMapper.writeValueAsString(
            new CreateOrderRequest(product.getId(), 2));

        // when & then
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.orderId").isNotEmpty())
            .andExpect(jsonPath("$.totalAmount").value(3_000_000))
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andDo(print());
    }

    @Test
    @DisplayName("재고 부족 시 409 Conflict를 반환한다")
    @WithUserDetails(value = "buyer@example.com", userDetailsServiceBeanName = "userDetailsService")
    void should_return409_when_stockInsufficient() throws Exception {
        // given
        userRepository.save(User.of("buyer@example.com", "password"));
        Product product = productRepository.save(Product.of("노트북", 1_500_000, 1));

        String requestBody = objectMapper.writeValueAsString(
            new CreateOrderRequest(product.getId(), 5));  // 재고(1)보다 많이 주문

        // when & then
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value(containsString("재고")));
    }
}
```

### 3-3. Security 통합 테스트

인증/인가가 올바르게 동작하는지 검증한다. `@WithMockUser`는 UserDetails를 단순 모킹하고,
`@WithUserDetails`는 실제 `UserDetailsService`를 호출하므로 DB에 유저가 있어야 한다.

```java
class SecurityIntegrationTest extends MockMvcIntegrationSupport {

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("인증되지 않은 요청은 401을 반환한다")
    void should_return401_when_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ROLE_USER는 관리자 API 접근 시 403을 반환한다")
    @WithMockUser(roles = "USER")
    void should_return403_when_userAccessesAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_ADMIN은 관리자 API에 접근할 수 있다")
    @WithMockUser(roles = "ADMIN")
    void should_return200_when_adminAccessesAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("실제 사용자 정보로 인증 후 내 정보 조회가 가능하다")
    @Transactional
    void should_returnMyProfile_when_authenticatedWithRealUser() throws Exception {
        // given - 실제 DB에 사용자 저장
        userRepository.save(User.builder()
            .email("real@example.com")
            .password(passwordEncoder.encode("pass"))
            .role(Role.USER)
            .build());

        // when - 실제 로그인 요청
        String loginBody = objectMapper.writeValueAsString(
            new LoginRequest("real@example.com", "pass"));

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
            .andExpect(status().isOk())
            .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .get("accessToken").asText();

        // then - 발급된 토큰으로 내 정보 조회
        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("real@example.com"));
    }
}
```

### 3-4. 비동기 / 이벤트 기반 테스트 (Awaitility)

`@Async`, `ApplicationEvent`, Kafka 컨슈머처럼 **결과가 지연되는** 코드는 Awaitility로 폴링한다.

```java
class OrderEventIntegrationTest extends MockMvcIntegrationSupport {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private OrderService orderService;

    @Test
    @DisplayName("주문 완료 이벤트 발행 후 비동기로 알림이 저장된다")
    void should_saveNotificationAsync_when_orderCompleted() {
        // given
        Long orderId = orderService.createOrder(/* ... */);

        // when - 이벤트 발행 (비동기 처리)
        orderService.completeOrder(orderId);

        // then - 최대 5초 내에 알림이 저장되기를 기다림
        await()
            .atMost(5, SECONDS)
            .pollInterval(200, MILLISECONDS)
            .untilAsserted(() -> {
                List<Notification> notifications =
                    notificationRepository.findByOrderId(orderId);
                assertThat(notifications)
                    .hasSize(1)
                    .extracting(Notification::getType)
                    .containsExactly(NotificationType.ORDER_COMPLETE);
            });
    }
}
```

> Awaitility import: `import static org.awaitility.Awaitility.await;`

### 3-5. Testcontainers — 실제 인프라 통합 테스트

#### PostgreSQL / MySQL

```java
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class UserRepositoryIntegrationTest {

    @Container
    @ServiceConnection  // Spring Boot 3.1+ — @DynamicPropertySource 불필요
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withInitScript("schema.sql");  // 초기 스키마 적용

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("복잡한 네이티브 쿼리가 실제 PostgreSQL에서 올바르게 동작한다")
    @Sql("/test-data/users.sql")       // 테스트 데이터 삽입
    @Sql(scripts = "/test-data/cleanup.sql",
         executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)  // 정리
    void should_returnCorrectResult_when_complexNativeQueryExecuted() {
        List<UserStatsDto> stats = userRepository.findUserStatsByCreatedAtRange(
            LocalDate.of(2024, 1, 1), LocalDate.of(2024, 12, 31));

        assertThat(stats).isNotEmpty()
            .allSatisfy(stat -> {
                assertThat(stat.getOrderCount()).isGreaterThanOrEqualTo(0);
                assertThat(stat.getTotalAmount()).isNotNull();
            });
    }
}
```

#### Redis

```java
@Testcontainers
@SpringBootTest
class CacheIntegrationTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @DynamicPropertySource  // @ServiceConnection이 Redis를 자동 지원하지 않는 경우
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port",
            () -> redis.getMappedPort(6379).toString());
    }

    @Autowired
    private ProductService productService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Test
    @DisplayName("첫 번째 조회는 DB에서, 두 번째 조회는 캐시에서 반환된다")
    void should_returnFromCache_when_queriedSecondTime() {
        // when - 첫 번째 조회 (DB 히트)
        ProductResponse first = productService.getProduct(1L);

        // then - Redis에 캐시됐는지 확인
        assertThat(redisTemplate.hasKey("product:1")).isTrue();

        // when - 두 번째 조회 (캐시 히트)
        ProductResponse second = productService.getProduct(1L);

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(second.getName()).isEqualTo(first.getName());
    }
}
```

#### Kafka

```java
@SpringBootTest
@Testcontainers
class OrderKafkaIntegrationTest extends IntegrationTestSupport {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.4.0"));

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private OrderEventRepository orderEventRepository;

    @Test
    @DisplayName("Kafka 메시지를 발행하면 컨슈머가 처리하여 DB에 저장된다")
    void should_persistEvent_when_kafkaMessagePublished() {
        // given
        OrderCreatedEvent event = new OrderCreatedEvent(UUID.randomUUID(), "user-1", 50_000);

        // when
        kafkaTemplate.send("order-events", event.getOrderId().toString(), event);

        // then - 컨슈머가 처리할 때까지 대기
        await()
            .atMost(10, SECONDS)
            .untilAsserted(() ->
                assertThat(orderEventRepository.findByOrderId(event.getOrderId()))
                    .isPresent()
                    .get()
                    .satisfies(saved ->
                        assertThat(saved.getStatus()).isEqualTo(EventStatus.PROCESSED))
            );
    }
}
```

### 3-6. 테스트 데이터 관리 (@Sql + ObjectMother)

#### @Sql로 픽스처 관리

```
src/test/resources/
├── sql/
│   ├── setup/
│   │   ├── users.sql
│   │   ├── products.sql
│   │   └── orders.sql
│   └── cleanup/
│       └── truncate-all.sql
```

```sql
-- sql/setup/users.sql
INSERT INTO users (id, email, name, role, created_at)
VALUES (1, 'admin@example.com', '관리자', 'ADMIN', NOW()),
       (2, 'user@example.com', '일반사용자', 'USER', NOW());
```

```java
// 클래스 레벨: 모든 테스트에 공통 적용
@Sql("/sql/setup/users.sql")
@Sql(scripts = "/sql/cleanup/truncate-all.sql",
     executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
class UserApiIntegrationTest extends MockMvcIntegrationSupport {

    @Test
    @Sql("/sql/setup/orders.sql")  // 메서드 레벨: 이 테스트만 추가 데이터
    void should_returnOrderHistory_when_userHasOrders() throws Exception { ... }
}
```

#### ObjectMother 패턴 (테스트 픽스처 재사용)

```java
// src/test/java/.../support/fixture/UserFixture.java
public class UserFixture {

    public static User aUser() {
        return User.builder()
            .email("user@example.com")
            .name("테스트유저")
            .role(Role.USER)
            .status(UserStatus.ACTIVE)
            .build();
    }

    public static User anAdmin() {
        return User.builder()
            .email("admin@example.com")
            .name("관리자")
            .role(Role.ADMIN)
            .status(UserStatus.ACTIVE)
            .build();
    }

    public static User aUser(Consumer<User.UserBuilder> customizer) {
        User.UserBuilder builder = User.builder()
            .email("user@example.com")
            .name("테스트유저")
            .role(Role.USER)
            .status(UserStatus.ACTIVE);
        customizer.accept(builder);
        return builder.build();
    }
}

// 사용 예
User blockedUser = UserFixture.aUser(b -> b.status(UserStatus.BLOCKED));
```

---

## Phase 4: 테스트 설정 파일

```yaml
# src/test/resources/application.yml
spring:
  # @DataJpaTest / 단순 통합 테스트: H2 인메모리
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: false  # 로그 줄이기
    properties:
      hibernate:
        format_sql: false

  # 외부 서비스 비활성화
  mail:
    host: localhost
    port: 2525
  kafka:
    bootstrap-servers: localhost:9999  # Testcontainers가 오버라이드

logging:
  level:
    root: WARN
    com.example.app: INFO  # 애플리케이션 로그만 INFO
    org.springframework.test: WARN
```

```java
// @TestConfiguration으로 테스트 전용 빈 등록
@TestConfiguration
public class TestConfig {

    // 외부 API 클라이언트를 Mock으로 교체
    @Bean
    @Primary
    public PaymentGateway mockPaymentGateway() {
        return Mockito.mock(PaymentGateway.class);
    }

    // 테스트용 PasswordEncoder (bcrypt는 느려서 테스트에 부적합)
    @Bean
    @Primary
    public PasswordEncoder testPasswordEncoder() {
        return new BCryptPasswordEncoder(4);  // strength 낮춰서 속도 개선
    }
}
```

---

## Phase 5: 테스트 파일 생성 및 실행

### 파일 위치

```
src/test/java/com/example/app/
├── support/
│   ├── IntegrationTestSupport.java    # RANDOM_PORT 베이스
│   ├── MockMvcIntegrationSupport.java # MOCK 베이스
│   └── fixture/
│       ├── UserFixture.java
│       └── ProductFixture.java
└── integration/
    ├── UserFlowIntegrationTest.java
    ├── OrderApiIntegrationTest.java
    └── security/
        └── SecurityIntegrationTest.java
```

### 실행

```bash
# 특정 통합 테스트만 실행
./mvnw test -Dtest="*IntegrationTest"
./gradlew test --tests "*IntegrationTest"

# 통합 테스트와 단위 테스트 분리 실행 (Gradle)
./gradlew integrationTest  # 별도 sourceSet 설정 시

# 테스트 커버리지 리포트
./mvnw test jacoco:report
./gradlew test jacocoTestReport
```

### 생성 후 검증

```bash
# 컴파일 오류 확인
./mvnw test-compile
./gradlew compileTestJava
```

컴파일 오류나 import 누락이 있으면 즉시 수정한다.

---

## Phase 6: 결과 요약 보고

작성 완료 후 다음 형식으로 보고한다:

```
## 통합 테스트 생성 요약

| 파일 | 테스트 수 | 전략 | 핵심 검증 |
|------|-----------|------|-----------|
| UserFlowIntegrationTest.java | 3개 | RANDOM_PORT + Testcontainers | 회원가입→로그인→조회 E2E |
| OrderApiIntegrationTest.java | 5개 | MockMvc + @Transactional | 주문 생성/취소/조회 API |
| SecurityIntegrationTest.java | 4개 | MockMvc + @WithMockUser | 인증/인가 시나리오 |

## 데이터 격리 전략
- MOCK 환경: @Transactional 자동 롤백
- RANDOM_PORT: @BeforeEach deleteAll()

## 권장 추가 작업
- [ ] Testcontainers 미사용 → 현재 H2로 검증 중인 쿼리를 실제 DB로 보완 권장
- [ ] Kafka 컨슈머 테스트 미작성 → 비동기 이벤트 처리 검증 필요
- [ ] 테스트 커버리지: ./mvnw test jacoco:report
```

---

## 통합 테스트 안티패턴

| 안티패턴 | 문제점 | 해결 |
|---------|--------|------|
| 단위 테스트 대신 통합 테스트만 작성 | 속도 저하, 실패 원인 파악 어려움 | 피라미드 유지 (단위 60%, 통합 30%) |
| `@MockBean` 남발 | 실제 통합 동작 미검증, 컨텍스트 캐시 분리 | 핵심 빈은 실제 사용, 외부 API만 Mock |
| 테스트 간 데이터 공유 | 순서 의존성, Flaky 테스트 | @BeforeEach 데이터 정리 또는 @Transactional |
| H2로만 통합 테스트 | 방언 차이로 운영 환경 버그 미발견 | Testcontainers로 실제 DB 검증 |
| `Thread.sleep()` | 느리고 Flaky | Awaitility로 교체 |
| 매 테스트마다 컨텍스트 재시작 | 수십 분 소요 | 베이스 클래스 + static 컨테이너로 공유 |
| 통합 테스트에 너무 세밀한 검증 | 구현 의존적, 유지보수 부담 | 비즈니스 결과 중심 검증 |

---

## 참고 자료

자세한 설정은 `references/` 디렉터리를 참고한다:
- `references/testcontainers-patterns.md` — DB/Redis/Kafka Testcontainers 설정 모음
- `references/infrastructure-patterns.md` — 외부 인프라별 통합 테스트 전략
