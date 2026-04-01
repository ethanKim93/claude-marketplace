# Oracle DB 리뷰 체크리스트

8차원 평가 프레임워크의 상세 체크 항목 목록입니다. 각 항목은 검사 방법, 관련 안티패턴 ID, 심각도 등급을 포함합니다.

---

## 점수 계산 규칙

| 심각도 | 감점 |
|--------|------|
| Critical 발견 | -20점 |
| Major 발견    | -10점 |
| Minor 발견    |  -3점 |

차원별 기준점: 100점. 최저 0점.

**종합 점수** = 각 차원 점수의 가중 평균:

| 차원 | 가중치 |
|------|--------|
| D1. 구조 | 20% |
| D2. 네이밍 컨벤션 | 10% |
| D3. 데이터 타입 | 10% |
| D4. 제약조건 및 무결성 | 20% |
| D5. 성능 | 15% |
| D6. 보안 | 10% |
| D7. 유지보수성 | 5% |
| D8. 안티패턴 | 10% |

**건강 등급**:
- 90~100점: EXCELLENT — 배포 권장
- 75~89점: GOOD — Minor 항목 개선 후 배포
- 60~74점: WARN — Major 항목 필수 개선 후 배포
- 0~59점: FAIL — Critical 항목 즉시 수정, 재리뷰 필요

---

## D1. 구조 리뷰 체크리스트

### 1.1 테이블 분류 및 목적 명확성

| # | 체크 항목 | 검사 방법 | 관련 AP | 심각도 |
|---|-----------|-----------|---------|--------|
| 1.1.1 | 테이블 접미사가 엔티티 성격을 반영하는가 (_MST, _DTL, _HST, _LOG, _MAP, _CD, _TMP, _STAT) | DDL 테이블명 확인 | - | Minor |
| 1.1.2 | 마스터(MST) 테이블이 정적 기준 데이터를 담고 있는가 | 테이블 컬럼 구성 확인 | AP-001 | Minor |
| 1.1.3 | 이력(HST) 테이블에 파티셔닝이 적용되어 있는가 | PARTITION 절 확인 | AP-007 | Major |
| 1.1.4 | 임시(TMP) 테이블이 GLOBAL TEMPORARY TABLE로 선언되어 있는가 | CREATE GLOBAL TEMPORARY TABLE 확인 | - | Minor |

### 1.2 정규화 수준 평가

| # | 체크 항목 | 검사 방법 | 관련 AP | 심각도 |
|---|-----------|-----------|---------|--------|
| 1.2.1 | 반복 그룹 컬럼이 없는가 (ITEM1, ITEM2, ITEM3 형태) | 컬럼명 패턴 검사 | AP-015 | Major |
| 1.2.2 | 복합 PK에서 비PK 컬럼이 PK 전체에 함수 종속되는가 (2NF) | 복합 PK 컬럼과 나머지 컬럼 관계 검토 | - | Major |
| 1.2.3 | 비PK 컬럼 간 이행 종속이 없는가 (3NF) | 컬럼 간 함수 종속 관계 검토 | - | Minor |
| 1.2.4 | 비정규화 시 COMMENT로 사유가 기록되어 있는가 | 컬럼 COMMENT 확인 | AP-026 | Major |

### 1.3 관계 및 참조 무결성

| # | 체크 항목 | 검사 방법 | 관련 AP | 심각도 |
|---|-----------|-----------|---------|--------|
| 1.3.1 | 부모-자식 관계가 FK로 명시되어 있는가 | FK 제약조건 목록 확인 | AP-013 | Major |
| 1.3.2 | 순환 참조 관계가 없는가 | FK 관계 그래프 순환 검사 | AP-019 | Critical |
| 1.3.3 | 다형성 연관(TYPE + ID 가짜 FK)이 없는가 | TARGET_TYPE, REF_TYPE 등 컬럼 패턴 | AP-012 | Major |
| 1.3.4 | 고아 테이블(관계 없는 테이블)이 없는가 | FK/참조 관계 없는 테이블 검사 | - | Minor |

### 1.4 테이블 규모 적정성

| # | 체크 항목 | 검사 방법 | 관련 AP | 심각도 |
|---|-----------|-----------|---------|--------|
| 1.4.1 | 단일 테이블의 컬럼 수가 30개 미만인가 | 컬럼 수 계산 | AP-001 | Major |
| 1.4.2 | EAV 패턴(ATTR_NM + ATTR_VAL 구조)이 없는가 | 컬럼명 패턴 검사 | AP-010 | Major |
| 1.4.3 | One True Lookup Table(TYPE 구분자로 모든 코드 통합) 구조가 없는가 | CODE_TYPE 같은 구분자 컬럼 확인 | AP-011 | Major |

---

## D2. 네이밍 컨벤션 체크리스트

`naming-conventions.md` 및 `standard-dictionary.md` 참조

### 2.1 테이블/뷰/시퀀스 네이밍

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 2.1.1 | 테이블명이 `TB_`로 시작하는가 | TB_{SYSTEM}_{ENTITY}_{SUFFIX} | - | Major |
| 2.1.2 | 뷰명이 `VW_`로 시작하는가 | VW_{SYSTEM}_{ENTITY} | - | Minor |
| 2.1.3 | 구체화 뷰명이 `MV_`로 시작하는가 | MV_{SYSTEM}_{ENTITY} | - | Minor |
| 2.1.4 | 시퀀스명이 `SQ_`로 시작하며 대상 테이블명을 포함하는가 | SQ_{TABLE_NAME} | AP-017 | Minor |
| 2.1.5 | 모든 객체명이 UPPER_CASE + 언더스코어인가 | camelCase, 소문자 없음 | - | Major |
| 2.1.6 | 모든 객체명이 30자 이내인가 | Oracle 12.2 미만 30자 제한 | - | Minor |
| 2.1.7 | Oracle 예약어를 단독으로 사용하지 않는가 | DATE, NUMBER, SIZE 등 | - | Major |

### 2.2 컬럼 네이밍

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 2.2.1 | 컬럼명이 `{도메인}_{속성}` 패턴을 따르는가 | CUST_ID, ORD_DT, PAY_AMT | - | Major |
| 2.2.2 | 표준 사전의 약어를 사용하는가 | standard-dictionary.md 참조 | - | Minor |
| 2.2.3 | 날짜 컬럼명이 `_DT` 또는 `_DTM`으로 끝나는가 | ORD_DT, EXPIRE_DTM | - | Minor |
| 2.2.4 | 금액 컬럼명이 `_AMT`로 끝나는가 | PAY_AMT, TOTAL_AMT | - | Minor |
| 2.2.5 | 코드 컬럼명이 `_CD`로 끝나는가 | STATUS_CD, DIV_CD | - | Minor |
| 2.2.6 | Y/N 구분 컬럼명이 `_YN`으로 끝나는가 | USE_YN, DEL_YN | - | Minor |
| 2.2.7 | 감사 컬럼명이 표준을 따르는가 | REGR_ID, REG_DT, MODR_ID, MOD_DT | AP-002 | Major |

### 2.3 제약조건/인덱스 네이밍

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 2.3.1 | PK 제약조건명이 `PK_`로 시작하는가 | PK_{TABLE_NAME} | AP-006 | Major |
| 2.3.2 | FK 제약조건명이 `FK_`로 시작하는가 | FK_{CHILD}_{PARENT} | AP-006 | Major |
| 2.3.3 | UK 제약조건명이 `UK_`로 시작하는가 | UK_{TABLE}_{COLUMN} | AP-006 | Major |
| 2.3.4 | CHECK 제약조건명이 `CK_`로 시작하는가 | CK_{TABLE}_{COLUMN} | AP-006 | Major |
| 2.3.5 | SYS_C로 시작하는 자동 생성 제약조건명이 없는가 | ALL_CONSTRAINTS | AP-006 | Major |
| 2.3.6 | B-Tree 인덱스명이 `IX_`로 시작하는가 | IX_{TABLE}_{COLUMNS} | - | Minor |
| 2.3.7 | Unique 인덱스명이 `UIX_`로 시작하는가 | UIX_{TABLE}_{COLUMNS} | - | Minor |
| 2.3.8 | Bitmap 인덱스명이 `BIX_`로 시작하는가 | BIX_{TABLE}_{COLUMNS} | - | Minor |

---

## D3. 데이터 타입 체크리스트

`data-type-guide.md` 참조

### 3.1 문자열 타입

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 3.1.1 | VARCHAR2 컬럼이 `CHAR` 시맨틱스를 명시하는가 | VARCHAR2(N CHAR) | AP-003 | Major |
| 3.1.2 | CHAR 타입이 1~2자 고정 코드에만 사용되는가 | Y/N, M/F만 CHAR | AP-004 | Minor |
| 3.1.3 | VARCHAR2 최대 길이가 비즈니스 요건에 적절한가 | 과도하게 크거나 너무 작음 | - | Minor |
| 3.1.4 | LONG 타입이 사용되지 않는가 | deprecated | AP-025 | Critical |
| 3.1.5 | NVARCHAR2, NCHAR 타입 사용이 의도적인가 | AL16UTF16 vs UTF-8 환경 확인 | - | Minor |

### 3.2 숫자 타입

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 3.2.1 | NUMBER에 정밀도와 스케일이 명시되어 있는가 | NUMBER(18), NUMBER(15,2) | AP-016 | Major |
| 3.2.2 | PK/FK에 `NUMBER(18)` 또는 적절한 정밀도가 사용되는가 | 식별자 컬럼 | - | Minor |
| 3.2.3 | 금액 컬럼에 `NUMBER(15,2)` 또는 더 큰 스케일이 사용되는가 | 소수점 2자리 | - | Minor |
| 3.2.4 | Y/N 표현에 NUMBER가 아닌 CHAR(1)이 사용되는가 | 0/1 숫자 대신 Y/N | - | Minor |

### 3.3 날짜/시간 타입

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 3.3.1 | 시간 정보가 필요한 컬럼에 DATE(초 단위)가 충분한가, TIMESTAMP가 필요한가 | 밀리초 이하 필요 시 TIMESTAMP | - | Minor |
| 3.3.2 | 글로벌 서비스라면 TIMESTAMP WITH TIME ZONE을 사용하는가 | 타임존 고려 여부 | - | Minor |
| 3.3.3 | 날짜 비교 시 암묵적 타입 변환이 없도록 DDL에 명시적 타입이 사용되는가 | 컬럼 타입과 실제 사용 패턴 | AP-016 | Major |

### 3.4 LOB 타입

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 3.4.1 | CLOB 사용이 4000자 초과 데이터에만 적용되는가 | VARCHAR2(4000 CHAR)로 충분하면 CLOB 불필요 | AP-008 | Minor |
| 3.4.2 | CLOB/BLOB에 `STORE AS SECUREFILE` 옵션이 사용되는가 | BasicFile vs SecureFile | - | Minor |
| 3.4.3 | LOB 컬럼에 전용 테이블스페이스가 지정되어 있는가 | LOB STORE AS (TABLESPACE ...) | AP-018 | Minor |

---

## D4. 제약조건 및 무결성 체크리스트

### 4.1 Primary Key

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 4.1.1 | 모든 테이블에 PK가 정의되어 있는가 | PK 없는 테이블은 데이터 무결성 불가 | - | Critical |
| 4.1.2 | PK 컬럼이 NOT NULL로 선언되어 있는가 | PK는 자동으로 NOT NULL이나 명시 권장 | AP-013 | Minor |
| 4.1.3 | 복합 PK 사용이 의도적이며 단일 대리키(Surrogate Key)가 더 적절하지 않은가 | 복합 PK의 컬럼 수가 3개 이하 | - | Minor |
| 4.1.4 | 파티션 테이블에서 PK가 파티션 키를 포함하는가 | LOCAL 인덱스를 위한 PK 설계 | - | Major |

### 4.2 Foreign Key

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 4.2.1 | 모든 FK 컬럼에 인덱스가 존재하는가 | Oracle 데드락 방지 필수 | AP-005, AP-022 | Critical |
| 4.2.2 | FK 제약조건이 명시적으로 이름 지정되어 있는가 | FK_{CHILD}_{PARENT} 패턴 | AP-006 | Major |
| 4.2.3 | ON DELETE 옵션이 비즈니스 요건에 맞는가 | CASCADE vs SET NULL vs 기본(제한) | - | Minor |
| 4.2.4 | 자기 참조 FK(계층 구조)에 NULL 허용이 되어 있는가 | 루트 노드는 NULL 부모 | AP-019 | Major |

### 4.3 Unique Key

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 4.3.1 | 비즈니스 자연키에 UK 제약조건이 있는가 | 사원번호, 주민번호 등 | - | Major |
| 4.3.2 | UK 제약조건명이 `UK_` 형태로 명시되어 있는가 | 자동 생성 이름 없음 | AP-006 | Major |

### 4.4 Check Constraint

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 4.4.1 | Y/N 컬럼에 `CHECK (COL IN ('Y', 'N'))` 이 있는가 | CHAR(1) Y/N 컬럼 | AP-013 | Major |
| 4.4.2 | 상태 코드 컬럼에 허용값 CHECK 또는 FK 참조가 있는가 | STATUS_CD, TYPE_CD 등 | - | Minor |
| 4.4.3 | CHECK 제약조건이 명시적으로 이름 지정되어 있는가 | CK_ 접두사 | AP-006 | Major |

### 4.5 NOT NULL

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 4.5.1 | 비즈니스상 필수 컬럼에 NOT NULL이 적용되어 있는가 | 이름, 날짜, 금액, 상태 컬럼 | AP-013 | Major |
| 4.5.2 | 감사 컬럼(REGR_ID, REG_DT, MODR_ID, MOD_DT)이 NOT NULL인가 | 필수 감사 정보 | AP-002 | Major |

---

## D5. 성능 체크리스트

### 5.1 인덱스 전략

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 5.1.1 | 모든 FK 컬럼에 인덱스가 있는가 | Oracle 데드락 방지 | AP-005, AP-022 | Critical |
| 5.1.2 | OLTP 테이블의 인덱스 수가 5개 이하인가 | 과도한 인덱스는 DML 성능 저하 | AP-021 | Minor |
| 5.1.3 | 복합 인덱스의 선두 컬럼이 등치 조건에 사용되는가 | 범위 조건 컬럼은 뒤에 배치 | - | Minor |
| 5.1.4 | 낮은 카디널리티 컬럼(상태, Y/N)에 DW 환경에서 Bitmap 인덱스가 사용되는가 | DW 전용 (OLTP에서는 사용 금지) | - | Minor |
| 5.1.5 | 함수 기반 인덱스가 실제 쿼리 패턴과 일치하는가 | UPPER(COL) 인덱스와 쿼리 패턴 | - | Minor |

### 5.2 파티셔닝

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 5.2.1 | 1,000만 건 이상 예상 테이블에 파티셔닝이 적용되어 있는가 | HST, LOG, TRX 테이블 | AP-007 | Major |
| 5.2.2 | 파티션 키가 주요 WHERE 절에 포함되는가 | 파티션 프루닝 가능 여부 | AP-023 | Minor |
| 5.2.3 | Range 파티션에 Interval 옵션이 사용되어 자동 추가되는가 | 수동 파티션 추가 부담 제거 | - | Minor |
| 5.2.4 | 파티션 테이블의 인덱스가 LOCAL/GLOBAL 중 적절히 선택되었는가 | 파티션 키 포함 여부에 따라 결정 | - | Minor |
| 5.2.5 | 파티션 크기가 1~10GB 범위를 목표로 하는가 | 너무 크거나 너무 작은 파티션 | - | Minor |

### 5.3 시퀀스

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 5.3.1 | 시퀀스에 CACHE 옵션이 설정되어 있는가 (NOCACHE 금지) | CACHE 1000 이상 권장 | AP-017 | Minor |
| 5.3.2 | RAC 환경에서 ORDER 옵션이 필요한지 검토되었는가 | 순서 보장 vs 성능 트레이드오프 | - | Minor |

### 5.4 테이블스페이스 설계

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 5.4.1 | 테이블, 인덱스, LOB가 별도 테이블스페이스에 저장되는가 | TS_{SYS}_DATA / INDEX / LOB | AP-018 | Minor |
| 5.4.2 | 기본 테이블스페이스(USERS, SYSTEM)가 사용되지 않는가 | 운영 환경 | AP-018 | Minor |

---

## D6. 보안 체크리스트

### 6.1 권한 설계

| # | 체크 항목 | 기준 | 심각도 |
|---|-----------|------|--------|
| 6.1.1 | SELECT * ON 전체 스키마 권한이 과도하게 부여되지 않는가 | 최소 권한 원칙 | Major |
| 6.1.2 | DDL 파일에 하드코딩된 비밀번호나 민감 정보가 없는가 | IDENTIFIED BY '...' 패턴 | Critical |
| 6.1.3 | 스키마 간 접근에 동의어(SYNONYM)가 활용되는가 | 직접 스키마.테이블 참조 지양 | Minor |

### 6.2 민감 데이터 관리

| # | 체크 항목 | 기준 | 심각도 |
|---|-----------|------|--------|
| 6.2.1 | 주민등록번호, 카드번호 등 개인정보 컬럼이 식별되어 있는가 | COMMENT에 PII 명시 | Major |
| 6.2.2 | 민감 데이터에 마스킹 처리를 위한 뷰 또는 VPD가 고려되어 있는가 | 직접 조회 제한 | Minor |
| 6.2.3 | 비밀번호 컬럼이 평문 저장되지 않는가 | PASSWD, PWD 컬럼에 COMMENT 확인 | Critical |

### 6.3 감사 추적

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 6.3.1 | 모든 테이블에 4개 감사 컬럼이 있는가 | REGR_ID, REG_DT, MODR_ID, MOD_DT | AP-002 | Major |
| 6.3.2 | 고위험 테이블(금융, 개인정보)에 별도 감사 이력 테이블이 있는가 | HST 테이블 | - | Minor |

---

## D7. 유지보수성 체크리스트

### 7.1 문서화

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 7.1.1 | 모든 테이블에 `COMMENT ON TABLE`이 작성되어 있는가 | 빈 COMMENT 포함 확인 | AP-009 | Minor |
| 7.1.2 | 모든 컬럼에 `COMMENT ON COLUMN`이 작성되어 있는가 | 빈 COMMENT 허용 안 함 | AP-009 | Minor |
| 7.1.3 | DDL 파일 상단에 헤더 주석(작성자, 날짜, 목적)이 있는가 | -- Author, Date, Description | - | Minor |
| 7.1.4 | 비정규화 컬럼에 사유가 COMMENT로 명시되어 있는가 | [비정규화 사유: ...] | AP-026 | Major |

### 7.2 변경 관리

| # | 체크 항목 | 기준 | 심각도 |
|---|-----------|------|--------|
| 7.2.1 | 롤백 스크립트(DROP, DISABLE, ROLLBACK)가 함께 제공되는가 | DDL과 롤백 스크립트 세트 | Minor |
| 7.2.2 | 실행 순서(tablespace → table → index → constraint → sequence → view)가 명시되어 있는가 | 의존성 순서 | Minor |

### 7.3 코드 재사용성

| # | 체크 항목 | 기준 | 관련 AP | 심각도 |
|---|-----------|------|---------|--------|
| 7.3.1 | 트리거가 감사 컬럼 자동화 등 기술적 목적에만 사용되는가 | 비즈니스 로직 없음 | AP-024 | Major |
| 7.3.2 | 패키지/프로시저/함수 네이밍이 표준을 따르는가 | PKG_, PRC_, FN_ 접두사 | - | Minor |

---

## D8. 안티패턴 탐지 요약표

`anti-patterns.md` 카탈로그 전체를 참조하여 아래 항목을 순서대로 검사합니다.

| AP ID | 안티패턴 | 탐지 신호 | 심각도 |
|-------|----------|-----------|--------|
| AP-001 | God Table | 컬럼 수 > 30 | Major |
| AP-002 | 감사 컬럼 누락 | REGR_ID 등 4개 없음 | Major |
| AP-003 | VARCHAR2 BYTE | `VARCHAR2(N)` 또는 `VARCHAR2(N BYTE)` | Major |
| AP-004 | CHAR 남용 | CHAR 컬럼 길이 > 2 | Minor |
| AP-005 | FK 인덱스 누락 | FK 컬럼에 인덱스 없음 | **Critical** |
| AP-006 | 이름 없는 제약조건 | `SYS_C%` 패턴 | Major |
| AP-007 | 대용량 미파티셔닝 | HST/LOG 테이블에 PARTITION 없음 | Major |
| AP-008 | 과도한 CLOB | CLOB 컬럼이 4000자 이내 데이터용 | Minor |
| AP-009 | COMMENT 누락 | ALL_TAB_COMMENTS IS NULL | Minor |
| AP-010 | EAV 패턴 | ATTR_NM + ATTR_VAL 컬럼 조합 | Major |
| AP-011 | OTLT | CODE_TYPE 구분자로 모든 코드 통합 | Major |
| AP-012 | 다형성 연관 | TARGET_TYPE + TARGET_ID 컬럼 조합 | Major |
| AP-013 | NOT NULL 누락 | 필수 비즈니스 컬럼에 NULL 허용 | Major |
| AP-014 | 과도한 정규화 | 1:1 관계 테이블 과다 | Minor |
| AP-015 | 반복 그룹 | ITEM1/ITEM2/ITEM3 컬럼 패턴 | Major |
| AP-016 | 암묵적 타입 변환 | NUMBER 컬럼에 VARCHAR2 기본값 등 | Major |
| AP-017 | 시퀀스 CACHE 미설정 | CACHE_SIZE = 0 | Minor |
| AP-018 | 테이블스페이스 미분리 | TABLESPACE = 'USERS' | Minor |
| AP-019 | 순환 FK | A→B→C→A FK 관계 | **Critical** |
| AP-020 | DEFAULT 누락 | USE_YN, SORT_SEQ에 DEFAULT 없음 | Minor |
| AP-021 | 과도한 인덱싱 | 인덱스 수 > 5 (OLTP) | Minor |
| AP-022 | FK 인덱스 부재(데드락) | AP-005와 동일, 대용량에서 더 위험 | **Critical** |
| AP-023 | 파티션 프루닝 미사용 | 파티션 키 없이 조회하는 주요 쿼리 | Minor |
| AP-024 | 트리거 비즈니스 로직 | 트리거 내 비감사 테이블 DML | Major |
| AP-025 | LONG 타입 | DATA_TYPE IN ('LONG', 'LONG RAW') | **Critical** |
| AP-026 | 문서 없는 비정규화 | 비정규화 컬럼에 COMMENT 없음 | Major |

---

## 진단 쿼리 모음

리뷰 중 활용할 수 있는 Oracle Data Dictionary 조회 쿼리입니다.

```sql
-- FK 인덱스 누락 탐지 (AP-005, AP-022)
SELECT ac.table_name,
       acc.column_name,
       ac.constraint_name AS fk_name,
       'FK_INDEX_MISSING' AS issue
FROM all_constraints ac
JOIN all_cons_columns acc
  ON ac.constraint_name = acc.constraint_name
 AND ac.owner = acc.owner
WHERE ac.constraint_type = 'R'
  AND ac.owner = USER
  AND NOT EXISTS (
    SELECT 1 FROM all_ind_columns aic
    WHERE aic.table_name   = acc.table_name
      AND aic.column_name  = acc.column_name
      AND aic.column_position = 1
      AND aic.index_owner  = ac.owner
  )
ORDER BY ac.table_name;

-- God Table 탐지 (AP-001)
SELECT table_name, COUNT(*) AS col_count
FROM all_tab_columns
WHERE owner = USER
GROUP BY table_name
HAVING COUNT(*) > 30
ORDER BY col_count DESC;

-- COMMENT 누락 탐지 (AP-009)
SELECT t.table_name,
       NVL(c.comments, '(MISSING)') AS table_comment
FROM all_tables t
LEFT JOIN all_tab_comments c
  ON t.table_name = c.table_name AND c.owner = USER
WHERE t.owner = USER
  AND (c.comments IS NULL OR c.comments = '')
ORDER BY t.table_name;

-- 이름 없는 제약조건 탐지 (AP-006)
SELECT table_name, constraint_name, constraint_type
FROM all_constraints
WHERE owner = USER
  AND constraint_name LIKE 'SYS_C%'
ORDER BY table_name;

-- LONG 타입 탐지 (AP-025)
SELECT table_name, column_name, data_type
FROM all_tab_columns
WHERE owner = USER
  AND data_type IN ('LONG', 'LONG RAW')
ORDER BY table_name;

-- 시퀀스 CACHE 미설정 탐지 (AP-017)
SELECT sequence_name, cache_size, order_flag
FROM all_sequences
WHERE sequence_owner = USER
  AND cache_size < 100
ORDER BY sequence_name;

-- 감사 컬럼 누락 탐지 (AP-002)
SELECT t.table_name,
       MAX(CASE WHEN c.column_name = 'REGR_ID' THEN 'Y' ELSE 'N' END) AS has_regr_id,
       MAX(CASE WHEN c.column_name = 'REG_DT'  THEN 'Y' ELSE 'N' END) AS has_reg_dt,
       MAX(CASE WHEN c.column_name = 'MODR_ID' THEN 'Y' ELSE 'N' END) AS has_modr_id,
       MAX(CASE WHEN c.column_name = 'MOD_DT'  THEN 'Y' ELSE 'N' END) AS has_mod_dt
FROM all_tables t
JOIN all_tab_columns c ON t.table_name = c.table_name AND c.owner = USER
WHERE t.owner = USER
  AND c.column_name IN ('REGR_ID', 'REG_DT', 'MODR_ID', 'MOD_DT')
GROUP BY t.table_name
HAVING MAX(CASE WHEN c.column_name = 'REGR_ID' THEN 'Y' ELSE 'N' END) = 'N'
    OR MAX(CASE WHEN c.column_name = 'REG_DT'  THEN 'Y' ELSE 'N' END) = 'N'
    OR MAX(CASE WHEN c.column_name = 'MODR_ID' THEN 'Y' ELSE 'N' END) = 'N'
    OR MAX(CASE WHEN c.column_name = 'MOD_DT'  THEN 'Y' ELSE 'N' END) = 'N';
```
