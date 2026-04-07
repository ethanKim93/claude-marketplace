# 외부 인프라별 통합 테스트 전략

실제 운영 환경의 인프라를 테스트에서 다루는 패턴 모음.

---

## 데이터 격리 전략 비교

| 전략 | 환경 | 장점 | 단점 |
|------|------|------|------|
| `@Transactional` 자동 롤백 | MOCK (MockMvc) | 설정 없이 깨끗한 격리 | RANDOM_PORT에서 동작 안 함 |
| `@BeforeEach` deleteAll | RANDOM_PORT | 단순, 명시적 | 느림, 참조 무결성 주의 |
| `@Sql` 트런케이트 | 모두 | 대용량 데이터 정리 용이 | SQL 파일 관리 필요 |
| 독립 DB (테스트별 스키마) | RANDOM_PORT | 완벽한 격리 | 설정 복잡 |

### RANDOM_PORT 환경 데이터 정리 (권장 패턴)

```java
@BeforeEach
void cleanUp() {
    // 참조 무결성 고려한 삭제 순서 (자식 → 부모)
    orderItemRepository.deleteAll();
    orderRepository.deleteAll();
    productRepository.deleteAll();
    userRepository.deleteAll();
}
```

참조 무결성 제약이 많으면 네이티브 쿼리로 한 번에 처리:

```java
@Autowired
private EntityManager entityManager;

@BeforeEach
@Transactional
void cleanUp() {
    entityManager.createNativeQuery("SET REFERENTIAL_INTEGRITY FALSE").executeUpdate();  // H2
    // PostgreSQL: "SET session_replication_role = replica"
    entityManager.createNativeQuery("TRUNCATE TABLE order_items, orders, products, users").executeUpdate();
    entityManager.createNativeQuery("SET REFERENTIAL_INTEGRITY TRUE").executeUpdate();
}
```

---

## @Sql 파일 관리 전략

### 디렉터리 구조

```
src/test/resources/
├── sql/
│   ├── schema/
│   │   └── truncate-all.sql        # 전체 테이블 초기화
│   ├── fixture/
│   │   ├── users.sql               # 공통 사용자 픽스처
│   │   ├── products.sql            # 공통 상품 픽스처
│   │   └── orders.sql              # 주문 픽스처
│   └── scenario/
│       ├── vip-user-with-orders.sql # 특정 시나리오용
│       └── out-of-stock.sql         # 재고 없는 상품
```

### 사용 패턴

```java
// 클래스 레벨 — 모든 테스트 전/후 실행
@Sql(scripts = "/sql/schema/truncate-all.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@Sql(scripts = "/sql/fixture/users.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class UserApiTest extends MockMvcIntegrationSupport {

    @Test
    @Sql("/sql/fixture/orders.sql")  // 이 테스트만 주문 데이터 추가
    void should_returnOrders_when_userHasOrders() throws Exception { ... }

    @Test
    @Sql("/sql/scenario/vip-user-with-orders.sql")  // 시나리오 특화
    void should_applyVipDiscount_when_vipUserOrders() throws Exception { ... }
}
```

### @SqlGroup으로 여러 파일 묶기

```java
@SqlGroup({
    @Sql(scripts = "/sql/schema/truncate-all.sql"),
    @Sql(scripts = "/sql/fixture/users.sql"),
    @Sql(scripts = "/sql/fixture/products.sql")
})
class ProductIntegrationTest { ... }
```

---

## Security 통합 테스트 심화

### @WithUserDetails — 실제 UserDetailsService 호출

```java
// 테스트 전용 사용자를 미리 DB에 저장하고 @WithUserDetails로 인증
@Test
@Sql("/sql/fixture/users.sql")  // email: user@example.com 포함
@WithUserDetails(
    value = "user@example.com",
    userDetailsServiceBeanName = "customUserDetailsService"
)
void should_returnMyOrders_when_authenticatedUserRequests() throws Exception {
    mockMvc.perform(get("/api/orders/my"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray());
}
```

### 커스텀 @WithMockCustomUser 어노테이션

```java
// src/test/java/.../support/WithMockCustomUser.java
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockCustomUserFactory.class)
public @interface WithMockCustomUser {
    String username() default "user@example.com";
    String role() default "USER";
    long userId() default 1L;
}

// Factory
public class WithMockCustomUserFactory
        implements WithSecurityContextFactory<WithMockCustomUser> {

    @Override
    public SecurityContext createSecurityContext(WithMockCustomUser annotation) {
        CustomUserDetails userDetails = new CustomUserDetails(
            annotation.userId(),
            annotation.username(),
            List.of(new SimpleGrantedAuthority("ROLE_" + annotation.role()))
        );
        Authentication auth = new UsernamePasswordAuthenticationToken(
            userDetails, null, userDetails.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        return context;
    }
}

// 사용
@Test
@WithMockCustomUser(userId = 42L, role = "ADMIN")
void should_deleteAnyUser_when_adminRequests() throws Exception { ... }
```

### JWT 통합 테스트

```java
// JWT 토큰을 직접 생성하여 헤더에 주입
@Autowired
private JwtTokenProvider jwtTokenProvider;

@Test
void should_return200_when_validJwtProvided() throws Exception {
    // given - 테스트용 토큰 생성
    String token = jwtTokenProvider.createToken("user@example.com", List.of("ROLE_USER"));

    // when & then
    mockMvc.perform(get("/api/users/me")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
}

@Test
void should_return401_when_expiredJwtProvided() throws Exception {
    // given - 만료된 토큰 (테스트용 짧은 만료시간)
    String expiredToken = jwtTokenProvider.createTokenWithExpiry(
        "user@example.com", Duration.ofMillis(-1));

    mockMvc.perform(get("/api/users/me")
            .header("Authorization", "Bearer " + expiredToken))
        .andExpect(status().isUnauthorized());
}
```

---

## 외부 API 연동 테스트

### WireMock으로 외부 HTTP API 모킹

```xml
<!-- Maven -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-contract-wiremock</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest
@AutoConfigureWireMock(port = 0)  // 랜덤 포트
class ExternalApiIntegrationTest {

    @Autowired
    private PaymentService paymentService;

    @Test
    void should_processPayment_when_externalApiSucceeds() {
        // given - 외부 API 응답 스텁
        stubFor(post(urlEqualTo("/v1/payments"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {"transactionId": "txn-123", "status": "APPROVED"}
                    """)));

        // when
        PaymentResult result = paymentService.charge("card-token", 50000);

        // then
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(result.getTransactionId()).isEqualTo("txn-123");
    }

    @Test
    void should_throwException_when_externalApiFails() {
        // given - 외부 API 실패 스텁
        stubFor(post(urlEqualTo("/v1/payments"))
            .willReturn(aResponse().withStatus(500)));

        // when & then
        assertThatThrownBy(() -> paymentService.charge("card-token", 50000))
            .isInstanceOf(PaymentException.class);
    }
}
```

---

## 이메일 발송 테스트

### GreenMail (인메모리 SMTP 서버)

```xml
<dependency>
    <groupId>com.icegreen</groupId>
    <artifactId>greenmail-junit5</artifactId>
    <version>2.1.2</version>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest
class EmailIntegrationTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP)
        .withConfiguration(GreenMailConfiguration.aConfig()
            .withUser("test@example.com", "password"))
        .withPerMethodLifecycle(false);

    @Autowired
    private UserService userService;

    @Test
    void should_sendWelcomeEmail_when_userRegistered() throws Exception {
        // when
        userService.registerUser("newuser@example.com", "John");

        // then - GreenMail이 받은 이메일 확인
        await().atMost(3, SECONDS)
            .until(() -> greenMail.getReceivedMessages().length == 1);

        MimeMessage received = greenMail.getReceivedMessages()[0];
        assertThat(received.getSubject()).contains("환영합니다");
        assertThat(received.getAllRecipients()[0].toString())
            .isEqualTo("newuser@example.com");
    }
}
```

```yaml
# application-test.yml
spring:
  mail:
    host: localhost
    port: 3025  # GreenMail SMTP 포트
    username: test@example.com
    password: password
    properties:
      mail.smtp.auth: true
```

---

## 파일 업로드/다운로드 테스트

```java
@Test
@DisplayName("이미지 파일 업로드 시 URL을 반환한다")
@WithMockUser
void should_returnImageUrl_when_imageFileUploaded() throws Exception {
    // given
    MockMultipartFile imageFile = new MockMultipartFile(
        "file",
        "test-image.jpg",
        MediaType.IMAGE_JPEG_VALUE,
        "fake-image-content".getBytes()
    );

    // when & then
    mockMvc.perform(multipart("/api/files/upload")
            .file(imageFile))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.url").value(containsString("test-image")));
}
```

---

## 페이지네이션 테스트

```java
@Test
@Sql("/sql/fixture/products-100.sql")  // 100개 상품 데이터
void should_returnPagedResults_when_pageRequested() throws Exception {
    mockMvc.perform(get("/api/products")
            .param("page", "0")
            .param("size", "10")
            .param("sort", "createdAt,desc"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.content.length()").value(10))
        .andExpect(jsonPath("$.totalElements").value(100))
        .andExpect(jsonPath("$.totalPages").value(10))
        .andExpect(jsonPath("$.first").value(true))
        .andExpect(jsonPath("$.last").value(false));
}
```

---

## 트랜잭션 경계 테스트

단위 테스트에서 잡기 어려운 트랜잭션 관련 버그를 통합 테스트로 검증한다.

```java
@Test
@DisplayName("주문 생성 중 결제 실패 시 주문도 롤백된다")
void should_rollbackOrder_when_paymentFails() {
    // given - 결제가 실패하도록 Mock 설정
    given(paymentGateway.charge(any())).willThrow(new PaymentException("카드 한도 초과"));

    long orderCountBefore = orderRepository.count();

    // when & then
    assertThatThrownBy(() -> orderService.createOrderWithPayment(/* ... */))
        .isInstanceOf(PaymentException.class);

    // 주문도 함께 롤백되었는지 확인
    assertThat(orderRepository.count()).isEqualTo(orderCountBefore);
}
```

---

## ObjectMother / Builder 픽스처 패턴

### ObjectMother (정적 팩토리 메서드)

```java
public class OrderFixture {

    public static Order pendingOrder(User buyer, Product product) {
        return Order.builder()
            .buyer(buyer)
            .product(product)
            .quantity(1)
            .totalAmount(product.getPrice())
            .status(OrderStatus.PENDING)
            .orderedAt(LocalDateTime.now())
            .build();
    }

    public static Order completedOrder(User buyer, Product product) {
        return Order.builder()
            .buyer(buyer)
            .product(product)
            .quantity(1)
            .totalAmount(product.getPrice())
            .status(OrderStatus.COMPLETED)
            .orderedAt(LocalDateTime.now().minusDays(1))
            .completedAt(LocalDateTime.now())
            .build();
    }
}

// 사용
Order order = OrderFixture.pendingOrder(buyer, product);
orderRepository.save(order);
```

### TestDataBuilder (커스텀 빌더)

테스트마다 조금씩 다른 픽스처가 필요할 때:

```java
public class UserTestDataBuilder {

    private String email = "user@example.com";
    private String name = "테스트유저";
    private Role role = Role.USER;
    private UserStatus status = UserStatus.ACTIVE;

    public static UserTestDataBuilder aUser() {
        return new UserTestDataBuilder();
    }

    public UserTestDataBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    public UserTestDataBuilder asAdmin() {
        this.role = Role.ADMIN;
        return this;
    }

    public UserTestDataBuilder blocked() {
        this.status = UserStatus.BLOCKED;
        return this;
    }

    public User build() {
        return User.builder()
            .email(email)
            .name(name)
            .role(role)
            .status(status)
            .build();
    }
}

// 사용
User blockedAdmin = UserTestDataBuilder.aUser()
    .withEmail("admin@example.com")
    .asAdmin()
    .blocked()
    .build();
```
