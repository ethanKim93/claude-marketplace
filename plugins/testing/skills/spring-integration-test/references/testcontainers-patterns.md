# Testcontainers 패턴 모음

Spring Boot 3.x + JUnit5 기준. 의존성 설정 포함.

---

## 의존성 설정

### Maven (pom.xml)

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>testcontainers-bom</artifactId>
            <version>1.19.8</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- JUnit5 통합 -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
    <!-- DB 선택 (사용하는 DB만) -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>mysql</artifactId>
        <scope>test</scope>
    </dependency>
    <!-- Redis (GenericContainer 사용, 별도 모듈 없음) -->
    <!-- Kafka -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>kafka</artifactId>
        <scope>test</scope>
    </dependency>
    <!-- 비동기 테스트 -->
    <dependency>
        <groupId>org.awaitility</groupId>
        <artifactId>awaitility</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Gradle (build.gradle)

```groovy
dependencies {
    testImplementation platform('org.testcontainers:testcontainers-bom:1.19.8')
    testImplementation 'org.testcontainers:junit-jupiter'
    testImplementation 'org.testcontainers:postgresql'   // 사용 DB만
    testImplementation 'org.testcontainers:kafka'        // Kafka 사용 시
    testImplementation 'org.awaitility:awaitility'
}
```

---

## PostgreSQL

### Spring Boot 3.1+ @ServiceConnection (권장)

```java
@Testcontainers
@SpringBootTest
class MyIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    // @DynamicPropertySource 불필요 — @ServiceConnection이 자동 처리
}
```

### 수동 @DynamicPropertySource (3.1 미만 또는 @ServiceConnection 미지원 시)

```java
@Container
static PostgreSQLContainer<?> postgres =
    new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test")
        .withInitScript("sql/schema.sql");  // 초기 DDL

@DynamicPropertySource
static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
}
```

---

## MySQL

```java
@Container
@ServiceConnection
static MySQLContainer<?> mysql =
    new MySQLContainer<>("mysql:8.0")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");
```

---

## Redis

Redis는 `@ServiceConnection`이 Spring Data Redis와 자동 연동된다 (Spring Boot 3.1+).

```java
// 방법1: @ServiceConnection (Spring Boot 3.1+, spring-boot-testcontainers 필요)
@Container
@ServiceConnection
static RedisContainer redis = new RedisContainer("redis:7-alpine");

// 방법2: GenericContainer + @DynamicPropertySource
@Container
static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
    .withExposedPorts(6379)
    .waitingFor(Wait.forListeningPort());

@DynamicPropertySource
static void redisProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.data.redis.host", redis::getHost);
    registry.add("spring.data.redis.port",
        () -> redis.getMappedPort(6379).toString());
}
```

Maven 의존성 (RedisContainer 사용 시):
```xml
<dependency>
    <groupId>com.redis</groupId>
    <artifactId>testcontainers-redis</artifactId>
    <version>2.2.2</version>
    <scope>test</scope>
</dependency>
```

---

## Kafka

```java
@Container
static KafkaContainer kafka = new KafkaContainer(
    DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

@DynamicPropertySource
static void kafkaProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    registry.add("spring.kafka.consumer.auto-offset-reset", () -> "earliest");
    registry.add("spring.kafka.consumer.group-id", () -> "test-group");
}
```

### Kafka 메시지 발행/소비 테스트 패턴

```java
@Test
void should_consumeMessage_when_messageProduced() {
    // given
    String topic = "test-topic";
    String message = """
        {"orderId": "abc-123", "amount": 50000}
        """;

    // when - 메시지 발행
    kafkaTemplate.send(topic, "key-1", message).get();  // 동기 발행

    // then - 컨슈머가 처리할 때까지 대기
    await()
        .atMost(Duration.ofSeconds(10))
        .pollInterval(Duration.ofMillis(500))
        .untilAsserted(() -> {
            // DB 저장 여부 또는 처리 결과 검증
            assertThat(processedEventRepository.count()).isEqualTo(1);
        });
}
```

### EmbeddedKafka (컨테이너 없이, 빠름)

실제 Kafka 호환성이 중요하지 않은 경우:

```java
@SpringBootTest
@EmbeddedKafka(
    partitions = 1,
    topics = {"order-events", "payment-events"},
    brokerProperties = {"listeners=PLAINTEXT://localhost:9092"}
)
class EmbeddedKafkaTest {
    // spring-kafka-test 의존성 필요
}
```

---

## 공유 컨테이너 패턴 (성능 최적화)

여러 테스트 클래스가 같은 컨테이너를 재사용하여 시작 시간을 단축한다.

```java
// 베이스 클래스에서 static으로 선언 — JVM 단위로 1회만 시작
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
public abstract class IntegrationTestSupport {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static final GenericContainer<?> redis =
        new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    static {
        // 컨테이너 순서 제어가 필요한 경우 수동 시작
        postgres.start();
        redis.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        // postgres는 @ServiceConnection이 처리
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port",
            () -> redis.getMappedPort(6379).toString());
    }
}
```

---

## 컨테이너 시작 속도 개선 팁

1. **Alpine 이미지 사용**: `postgres:16` 대신 `postgres:16-alpine` (이미지 크기 ↓)
2. **Ryuk 비활성화** (CI 환경): `TESTCONTAINERS_RYUK_DISABLED=true`
3. **로컬 이미지 캐시 활용**: 첫 실행 후 Docker가 이미지를 캐시
4. **`withReuse(true)`** (로컬 개발용, CI에서는 사용 금지):
   ```java
   static PostgreSQLContainer<?> postgres =
       new PostgreSQLContainer<>("postgres:16-alpine")
           .withReuse(true);  // 프로세스 종료 후에도 컨테이너 유지
   ```
5. **`waitingFor` 최적화**: 기본 wait 전략이 느린 경우
   ```java
   .waitingFor(Wait.forSuccessfulCommand("pg_isready"))
   ```

---

## 자주 쓰는 대기(Wait) 전략

```java
// 포트 리슨 대기 (기본)
.waitingFor(Wait.forListeningPort())

// HTTP 헬스체크 대기
.waitingFor(Wait.forHttp("/health").forStatusCode(200))

// 로그 패턴 대기
.waitingFor(Wait.forLogMessage(".*database system is ready.*", 1))

// 복합 대기
.waitingFor(new WaitAllStrategy()
    .withStrategy(Wait.forListeningPort())
    .withStrategy(Wait.forLogMessage(".*ready.*", 1)))
```
