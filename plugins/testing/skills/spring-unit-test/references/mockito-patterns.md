# Mockito 고급 패턴 모음

## BDDMockito vs 기본 Mockito

BDDMockito는 given-when-then 구조에 더 잘 어울리는 API를 제공한다. 팀 내에서 하나로 통일해서 쓰는 것이 좋다.

```java
// 기본 Mockito
when(userRepository.findById(1L)).thenReturn(Optional.of(user));
verify(userRepository).findById(1L);

// BDDMockito (given-when-then 구조에 더 자연스럽게 읽힘)
given(userRepository.findById(1L)).willReturn(Optional.of(user));
then(userRepository).should().findById(1L);
then(userRepository).should(never()).delete(any());
```

---

## Stubbing 패턴

```java
// 기본값 반환
given(repo.findById(1L)).willReturn(Optional.of(entity));

// 예외 던지기
given(repo.findById(-1L)).willThrow(new IllegalArgumentException("Invalid ID"));

// void 메서드에서 예외
willThrow(new RuntimeException("Email 전송 실패"))
    .given(emailService).send(anyString());

// 연속 호출 (첫 번째, 두 번째 호출에 다른 결과)
given(idGenerator.next())
    .willReturn(1L)
    .willReturn(2L);

// 인자 기반 커스텀 응답
given(repo.findById(anyLong())).willAnswer(invocation -> {
    Long id = invocation.getArgument(0);
    return id > 0 ? Optional.of(new User(id)) : Optional.empty();
});
```

---

## ArgumentCaptor — 저장된 인자 검증

Service가 Repository에 실제로 어떤 값을 넘겼는지 검증할 때 사용한다.

```java
@Test
void should_saveUserWithHashedPassword_when_userCreated() {
    // given
    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);

    // when
    userService.createUser(new CreateUserRequest("john@example.com", "plainPassword"));

    // then - 실제 저장된 User 엔티티 검증
    then(userRepository).should().save(captor.capture());
    User savedUser = captor.getValue();

    assertThat(savedUser.getEmail()).isEqualTo("john@example.com");
    assertThat(savedUser.getPassword()).isNotEqualTo("plainPassword");  // 해시됨
    assertThat(savedUser.getPassword()).startsWith("$2a$");  // BCrypt 패턴
}

// 여러 번 호출된 경우 모든 인자 캡처
ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
then(repo).should(times(3)).save(captor.capture());
List<User> savedUsers = captor.getAllValues();
```

---

## 호출 검증 패턴

```java
// 정확히 1번 호출됨 (기본값)
then(emailService).should().send(eq("john@example.com"));

// 정확히 N번
then(repo).should(times(3)).save(any());

// 한 번도 호출 안 됨
then(emailService).should(never()).send(anyString());

// 최소/최대 횟수
then(repo).should(atLeast(1)).findById(anyLong());
then(repo).should(atMost(2)).save(any());

// 특정 메서드 외 아무 것도 호출 안 됨 확인
then(emailService).shouldHaveNoMoreInteractions();
```

---

## @Spy와 @SpyBean

실제 구현을 유지하면서 일부 메서드만 가로채고 싶을 때 사용한다.
단, Spy는 실제 객체를 생성하므로 의존성이 많으면 복잡해진다. 가능하면 Mock을 선호한다.

```java
@ExtendWith(MockitoExtension.class)
class PriceCalculatorTest {

    @Spy
    private DiscountPolicy discountPolicy = new DiscountPolicy();  // 실제 구현 사용

    @InjectMocks
    private PriceCalculator calculator;

    @Test
    void should_applyDiscount_when_vipUserPurchases() {
        // Spy의 특정 메서드만 오버라이드
        doReturn(0.3).when(discountPolicy).getDiscountRate(any());

        // 나머지 메서드는 실제 동작
        Price result = calculator.calculateFinalPrice(order, vipUser);
        assertThat(result.getDiscountedAmount()).isPositive();
    }
}
```

---

## Mockito와 AssertJ 조합으로 예외 검증

```java
// 기본 예외 타입 검증
assertThatThrownBy(() -> userService.getUser(-1L))
    .isInstanceOf(IllegalArgumentException.class);

// 메시지 포함 검증
assertThatThrownBy(() -> userService.getUser(99L))
    .isInstanceOf(EntityNotFoundException.class)
    .hasMessageContaining("사용자를 찾을 수 없습니다");

// 특정 예외 타입으로 단언
assertThatExceptionOfType(DuplicateEmailException.class)
    .isThrownBy(() -> userService.createUser(duplicateRequest))
    .withMessage("이미 사용 중인 이메일입니다: john@example.com");

// 예외가 발생하지 않아야 하는 케이스
assertThatNoException()
    .isThrownBy(() -> userService.createUser(validRequest));
```

---

## @MockBean vs @Mock

| 구분 | @Mock (Mockito) | @MockBean (Spring) |
|------|-----------------|-------------------|
| 사용 위치 | `@ExtendWith(MockitoExtension)` 테스트 | `@WebMvcTest`, `@SpringBootTest` 테스트 |
| Spring 컨텍스트 | 불필요 | 필요 (Spring 빈으로 등록됨) |
| 속도 | 빠름 | 느림 (컨텍스트 로딩) |
| 언제 | Service 단위 테스트 | Controller 테스트에서 Service 목킹 시 |

```java
// Service 테스트 — @Mock 사용
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository userRepository;  // ✅
}

// Controller 테스트 — @MockBean 사용
@WebMvcTest(UserController.class)
class UserControllerTest {
    @MockBean
    private UserService userService;  // ✅ Spring 빈으로 대체
}
```
