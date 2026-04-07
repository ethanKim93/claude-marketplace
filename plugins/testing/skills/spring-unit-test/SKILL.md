---
name: spring-unit-test
description: |
  Spring Boot 프로젝트의 단위 테스트 및 통합 테스트 코드를 자동 생성하고 개선합니다.
  소스코드를 분석하여 계층(Controller/Service/Repository)에 맞는 테스트 전략을 선택하고,
  Mockito + JUnit5 기반 테스트 코드를 BDD 네이밍 컨벤션으로 작성합니다.

  다음 상황에서 반드시 이 스킬을 사용하세요:
  - "테스트 코드 작성해줘", "단위 테스트 만들어줘", "JUnit 테스트 짜줘" 요청 시
  - "Controller 테스트", "Service 테스트", "Repository 테스트" 요청 시
  - "MockMvc 테스트", "Mockito 테스트", "WebMvcTest" 관련 요청 시
  - "테스트 커버리지 높이기", "테스트가 없는 코드에 테스트 추가" 요청 시
  - "Spring Boot test", "spring test", "테스트 코드 리뷰", "테스트 개선" 요청 시
  - "통합 테스트 작성", "DataJpaTest", "SpringBootTest 사용법" 요청 시
  - "@MockBean", "@SpyBean", "ArgumentCaptor", "BDD Mockito" 관련 질문 시
  - 특정 클래스나 메서드를 주고 "이거 테스트해줘"라고 요청할 때
  - "테스트가 너무 느려요", "테스트 전략 조언해줘" 같은 테스팅 고민 상담 시
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Spring Unit Test 스킬

Spring Boot 프로젝트의 소스코드를 분석하여 **계층에 맞는 올바른 테스트 전략**으로 테스트 코드를 작성한다.
좋은 테스트는 빠르고, 명확하고, 한 가지 책임만 검증한다.

---

## Phase 0: 컨텍스트 파악

시작하기 전에 다음을 확인한다.

### 입력 분류

**A. 특정 파일/클래스 지정**: "UserService 테스트 작성해줘" → 해당 파일 바로 Read
**B. 디렉터리 단위**: "service 폴더 전체 테스트" → Glob으로 파일 목록 수집 후 진행
**C. 기존 테스트 개선**: 테스트 파일을 주고 리뷰 요청 → 현재 테스트의 문제점 진단 후 개선안 제시
**D. 전략 질문**: "어떤 테스트를 써야 하나요?" → 테스트 피라미드 설명 및 프로젝트 구조 파악 후 추천

### 프로젝트 구조 스캔 (A/B 케이스)

```bash
# 빌드 도구 및 의존성 확인
cat pom.xml 또는 build.gradle
```

확인 포인트:
- `spring-boot-starter-test` 포함 여부 (JUnit5 + Mockito + AssertJ 번들)
- `testcontainers` 사용 여부
- `spring-security-test` 포함 여부
- `h2` 인메모리 DB 사용 여부

대상 파일을 Read하여 다음을 파악한다:
- 클래스 종류 (Controller / Service / Repository / Component / Util)
- 주입 의존성 목록
- 핵심 메서드와 비즈니스 로직
- 예외 처리 패턴
- Spring Security 적용 여부

---

## Phase 1: 테스트 전략 결정

### 테스트 계층 선택 기준

| 대상 클래스 | 권장 어노테이션 | 이유 |
|------------|----------------|------|
| `@RestController` / `@Controller` | `@WebMvcTest` | MVC 레이어만 로드, MockMvc 자동 구성, 빠름 |
| `@Service` / `@Component` | `@ExtendWith(MockitoExtension.class)` | Spring 컨텍스트 불필요, 가장 빠름 |
| `@Repository` (JPA) | `@DataJpaTest` | JPA 레이어만 로드, 트랜잭션 자동 롤백 |
| 여러 계층 연계 테스트 | `@SpringBootTest` | 전체 컨텍스트, 실제 통합 시나리오 |

**핵심 원칙**: Spring 컨텍스트는 꼭 필요할 때만 로드한다. 불필요한 컨텍스트 로딩은 테스트를 수십 배 느리게 만든다.

### 테스트 피라미드 권장 비율

```
         /\
        /E2E\       5-10%   — 전체 시스템 연동
       /------\
      /  통합   \    20-30%  — @SpringBootTest, @DataJpaTest
     /----------\
    /  단위 테스트  \  60-70%  — @ExtendWith(MockitoExtension.class)
   /--------------\
```

사용자 프로젝트의 현황을 파악하고 어느 레이어가 부족한지 언급한다.

---

## Phase 2: 테스트 코드 작성

### 공통 구조 — Arrange / Act / Assert

모든 테스트는 세 구역으로 구분한다. 주석으로 명시하여 가독성을 높인다:

```java
@Test
void should_반환값_when_조건() {
    // given
    ...
    
    // when
    ...
    
    // then
    ...
}
```

### 네이밍 컨벤션

테스트명은 **무엇을 테스트하는지** 바로 알 수 있어야 한다. 세 가지 스타일 중 프로젝트에서 이미 사용 중인 것을 따르고, 없으면 `should_when` 스타일을 기본으로 한다:

| 스타일 | 예시 |
|--------|------|
| `should_when` (권장) | `should_returnUser_when_validIdGiven` |
| `given_when_then` | `given_existingUser_when_delete_then_notFound` |
| `메서드명_조건_결과` | `getUser_invalidId_throwsException` |

@DisplayName을 함께 사용하면 한국어 설명을 추가할 수 있다:
```java
@Test
@DisplayName("유효한 ID로 조회 시 사용자를 반환한다")
void should_returnUser_when_validIdGiven() { ... }
```

---

## Layer별 테스트 작성 패턴

### Controller 테스트 (@WebMvcTest)

Controller는 HTTP 요청/응답 매핑, 상태 코드, JSON 직렬화를 검증한다. 비즈니스 로직은 Service가 담당하므로 Service는 반드시 `@MockBean`으로 대체한다.

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("존재하는 사용자 ID로 조회하면 200과 사용자 정보를 반환한다")
    void should_return200WithUser_when_existingUserIdRequested() throws Exception {
        // given
        UserResponse response = new UserResponse(1L, "john@example.com");
        given(userService.getUser(1L)).willReturn(response);

        // when & then
        mockMvc.perform(get("/api/users/1")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1L))
            .andExpect(jsonPath("$.email").value("john@example.com"));
    }

    @Test
    @DisplayName("존재하지 않는 사용자 ID 조회 시 404를 반환한다")
    void should_return404_when_nonExistentUserIdRequested() throws Exception {
        // given
        given(userService.getUser(99L))
            .willThrow(new EntityNotFoundException("사용자를 찾을 수 없습니다."));

        // when & then
        mockMvc.perform(get("/api/users/99"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("유효하지 않은 요청 본문으로 생성 시 400을 반환한다")
    void should_return400_when_invalidRequestBodyProvided() throws Exception {
        // given
        String invalidBody = objectMapper.writeValueAsString(
            new CreateUserRequest(null, ""));  // 필수값 누락

        // when & then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidBody))
            .andExpect(status().isBadRequest());
    }
}
```

**Controller 테스트 체크리스트**:
- [ ] 성공 케이스: 올바른 상태 코드 + 응답 본문 검증
- [ ] 실패 케이스: 존재하지 않는 리소스, 권한 없음, 잘못된 입력값
- [ ] 요청 유효성 검사(`@Valid`) 동작 확인
- [ ] Spring Security 적용 시 인증/인가 시나리오 포함

**Security가 적용된 경우** 추가:
```java
@Test
@WithMockUser(roles = "ADMIN")
void should_return200_when_adminUserAccesses() throws Exception { ... }

@Test
@WithMockUser(roles = "USER")
void should_return403_when_regularUserAccessesAdminEndpoint() throws Exception { ... }

@Test
void should_return401_when_unauthenticatedUserAccesses() throws Exception { ... }
```

---

### Service 테스트 (@ExtendWith(MockitoExtension.class))

Service는 비즈니스 로직의 핵심이다. Spring 컨텍스트 없이 순수 Java + Mockito로 테스트하여 실행 속도를 극대화한다.

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @InjectMocks
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Test
    @DisplayName("신규 사용자 생성 시 저장 후 환영 이메일을 발송한다")
    void should_saveUserAndSendWelcomeEmail_when_newUserCreated() {
        // given
        CreateUserRequest request = new CreateUserRequest("john@example.com", "John");
        User savedUser = User.builder().id(1L).email("john@example.com").build();
        given(userRepository.save(any(User.class))).willReturn(savedUser);

        // when
        UserResponse result = userService.createUser(request);

        // then
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getEmail()).isEqualTo("john@example.com");

        // 이메일 발송 호출 검증
        then(emailService).should().sendWelcomeEmail(savedUser.getEmail());
    }

    @Test
    @DisplayName("이미 가입된 이메일로 생성 시 DuplicateEmailException을 던진다")
    void should_throwException_when_duplicateEmailProvided() {
        // given
        given(userRepository.existsByEmail("john@example.com")).willReturn(true);

        // when & then
        assertThatThrownBy(() ->
            userService.createUser(new CreateUserRequest("john@example.com", "John")))
            .isInstanceOf(DuplicateEmailException.class)
            .hasMessageContaining("이미 사용 중인 이메일");
    }

    @Test
    @DisplayName("사용자 정보 수정 시 변경된 필드만 업데이트된다")
    void should_updateOnlyChangedFields_when_userUpdated() {
        // given
        User existing = User.builder().id(1L).name("Old Name").email("old@example.com").build();
        given(userRepository.findById(1L)).willReturn(Optional.of(existing));

        // ArgumentCaptor로 실제 저장된 엔티티 검증
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);

        // when
        userService.updateUser(1L, new UpdateUserRequest("New Name", null));

        // then
        then(userRepository).should().save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getName()).isEqualTo("New Name");
        assertThat(saved.getEmail()).isEqualTo("old@example.com");  // 변경 안 됨
    }
}
```

**Service 테스트 체크리스트**:
- [ ] 정상 흐름 (happy path)
- [ ] 입력값 경계: null, 빈 문자열, 음수, 최대값
- [ ] 예외 발생 시나리오 (각 조건별)
- [ ] Repository/외부 서비스 호출 횟수 및 인자 검증
- [ ] ArgumentCaptor로 저장된 엔티티의 필드 검증

---

### Repository 테스트 (@DataJpaTest)

커스텀 쿼리 메서드, JPQL, Native Query를 검증한다. 기본 CRUD는 Spring Data가 보장하므로 테스트 불필요하다.

```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("이메일로 활성 사용자를 조회한다")
    void should_returnActiveUser_when_searchedByEmail() {
        // given
        User activeUser = User.builder()
            .email("active@example.com")
            .status(UserStatus.ACTIVE)
            .build();
        entityManager.persistAndFlush(activeUser);

        // when
        Optional<User> result = userRepository.findByEmailAndStatus(
            "active@example.com", UserStatus.ACTIVE);

        // then
        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("active@example.com");
    }

    @Test
    @DisplayName("생성일 범위로 사용자 목록을 조회한다")
    void should_returnUsersInDateRange_when_dateRangeGiven() {
        // given
        LocalDateTime start = LocalDateTime.of(2024, 1, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2024, 12, 31, 23, 59);

        User jan = User.builder().email("jan@example.com").createdAt(
            LocalDateTime.of(2024, 6, 15, 0, 0)).build();
        User dec2023 = User.builder().email("dec@example.com").createdAt(
            LocalDateTime.of(2023, 12, 1, 0, 0)).build();

        entityManager.persistAndFlush(jan);
        entityManager.persistAndFlush(dec2023);

        // when
        List<User> results = userRepository.findByCreatedAtBetween(start, end);

        // then
        assertThat(results).hasSize(1)
            .extracting(User::getEmail)
            .containsExactly("jan@example.com");
    }
}
```

**Repository 테스트 체크리스트**:
- [ ] 커스텀 쿼리 메서드 (`findBy...`, `countBy...`, `existsBy...`)
- [ ] JPQL / Native Query
- [ ] 페이징 및 정렬
- [ ] 결과 없음 케이스 (빈 Optional, 빈 List)
- [ ] TestEntityManager로 직접 데이터 삽입하여 독립성 확보

---

### 통합 테스트 (@SpringBootTest)

여러 계층이 실제로 연동되는 시나리오를 검증한다. 느리므로 핵심 흐름에만 사용한다.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserFlowIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("사용자 생성부터 조회까지 전체 흐름이 정상 동작한다")
    void should_completeUserLifecycle_when_createdAndQueried() {
        // given
        CreateUserRequest request = new CreateUserRequest("john@example.com", "John");

        // when - 생성
        ResponseEntity<UserResponse> createResponse = restTemplate
            .postForEntity("/api/users", request, UserResponse.class);

        // then - 생성 확인
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long userId = createResponse.getBody().getId();

        // when - 조회
        ResponseEntity<UserResponse> getResponse = restTemplate
            .getForEntity("/api/users/" + userId, UserResponse.class);

        // then - 조회 확인
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody().getEmail()).isEqualTo("john@example.com");
    }
}
```

---

## Phase 3: 테스트 파일 생성 및 배치

### 파일 위치 규칙

소스 파일 위치를 그대로 `src/test/java`에 미러링한다:

```
src/main/java/com/example/app/service/UserService.java
                              ↓
src/test/java/com/example/app/service/UserServiceTest.java
```

기존 테스트 파일이 있으면 덮어쓰지 말고 누락된 테스트 케이스를 추가한다.

### 생성 후 검증

```bash
# 테스트 실행 (Maven)
./mvnw test -pl . -Dtest=UserServiceTest

# 테스트 실행 (Gradle)
./gradlew test --tests "com.example.app.service.UserServiceTest"
```

컴파일 오류나 import 오류가 있으면 즉시 수정한다.

---

## Phase 4: 테스트 품질 리뷰

작성된 테스트에 대해 다음 안티패턴을 확인하고 발견 시 수정 제안을 제공한다:

### 흔한 안티패턴

| 안티패턴 | 문제 | 해결 |
|---------|------|------|
| `@SpringBootTest`를 Service 테스트에 사용 | 수십 배 느려짐 | `@ExtendWith(MockitoExtension.class)`로 변경 |
| 모든 의존성을 Mock으로 대체 | 실제 통합 동작 미검증 | 핵심 경로는 통합 테스트로 보완 |
| Happy path만 테스트 | 예외 케이스 누락 | 경계값·null·예외 시나리오 추가 |
| `verify()` 남용 | 구현 세부사항에 종속 | 결과 검증 중심으로 전환 |
| 테스트 간 상태 공유 | 순서 의존성, Flaky 테스트 | `@BeforeEach`로 격리 |
| 불명확한 테스트명 (`test1`, `testOK`) | 실패 시 원인 불명 | BDD 네이밍으로 재작성 |
| `Thread.sleep()` 사용 | Flaky, 느림 | Awaitility 라이브러리 또는 설계 개선 |

---

## Phase 5: 결과 요약

테스트 작성 완료 후 다음을 사용자에게 보고한다:

```
## 생성된 테스트 요약

| 파일 | 테스트 수 | 전략 | 비고 |
|------|-----------|------|------|
| UserServiceTest.java | 8개 | @ExtendWith(MockitoExtension) | 예외 케이스 3개 포함 |
| UserControllerTest.java | 5개 | @WebMvcTest | Security 테스트 포함 |
| UserRepositoryTest.java | 3개 | @DataJpaTest | 커스텀 쿼리 검증 |

## 다음 단계 제안
- [ ] 통합 테스트 추가 권장 (핵심 흐름 X개 미검증)
- [ ] TestContainers 도입으로 실제 DB 테스트 강화 가능
- [ ] 테스트 커버리지 측정: `./mvnw test jacoco:report`
```

---

## 참고 자료

자세한 패턴 예제와 의존성 설정은 `references/` 디렉터리를 참고한다:
- `references/mockito-patterns.md` — Mockito 고급 패턴 모음
- `references/test-dependencies.md` — Maven/Gradle 의존성 설정
