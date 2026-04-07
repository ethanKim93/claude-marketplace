# Spring Boot 테스트 의존성 설정

## Maven (pom.xml)

### 기본 설정 (spring-boot-starter-test 포함)

```xml
<dependencies>
    <!-- spring-boot-starter-test에 포함된 것들:
         JUnit 5, Mockito, AssertJ, Hamcrest, JsonPath, Spring Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Security 테스트 (@WithMockUser, csrf 등) -->
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### TestContainers (실제 DB 통합 테스트)

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>testcontainers-bom</artifactId>
            <version>1.19.3</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
    <!-- 사용 DB에 맞게 선택 -->
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
</dependencies>
```

---

## Gradle (build.gradle)

```groovy
dependencies {
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'

    // TestContainers
    testImplementation platform('org.testcontainers:testcontainers-bom:1.19.3')
    testImplementation 'org.testcontainers:junit-jupiter'
    testImplementation 'org.testcontainers:postgresql'
}
```

---

## TestContainers 사용 패턴

### 기본 패턴 (테스트 클래스별 컨테이너)

```java
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    // 테스트 메서드들...
}
```

### 공유 컨테이너 패턴 (성능 개선 — 컨테이너 한 번만 시작)

```java
// 베이스 클래스로 추출
@SpringBootTest
abstract class AbstractIntegrationTest {

    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    static {
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}

// 각 테스트 클래스
class UserRepositoryIntegrationTest extends AbstractIntegrationTest {
    // 이미 시작된 컨테이너를 재사용
}
```

### Spring Boot 3.1+ ServiceConnection (가장 간단)

```java
@SpringBootTest
@Testcontainers
class UserIntegrationTest {

    @Container
    @ServiceConnection  // 자동으로 application.properties 설정 대체
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    // @DynamicPropertySource 불필요!
}
```

---

## 인메모리 DB (H2) 설정

`@DataJpaTest`는 기본적으로 H2를 사용한다. H2가 없으면 추가:

```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```

실제 DB 방언 사용 (PostgreSQL 모드):
```yaml
# src/test/resources/application.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
  jpa:
    database-platform: org.hibernate.dialect.H2Dialect
```

---

## application.yml for Tests

```yaml
# src/test/resources/application.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
  mail:
    host: localhost  # 메일 전송 비활성화

logging:
  level:
    org.springframework.test: DEBUG
    org.hibernate.SQL: DEBUG
```
