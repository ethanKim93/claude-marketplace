# Oracle DB 안티패턴 카탈로그

Oracle 데이터베이스 설계에서 자주 발생하는 26개 안티패턴의 탐지 방법, 영향, 개선 방법을 정리한 참조 문서입니다.

각 항목 구조: **ID | 이름 | 카테고리 | 심각도 | 설명 | 탐지 신호 | BAD 예시 | GOOD 예시 | 영향**

---

## 카테고리 분류

| 카테고리 | 안티패턴 IDs |
|----------|-------------|
| 구조 (Structural) | AP-001, AP-010, AP-011, AP-012, AP-014, AP-015, AP-019, AP-024 |
| 데이터 타입 (Data Type) | AP-003, AP-004, AP-008, AP-025 |
| 제약조건 (Constraint) | AP-002, AP-006, AP-013, AP-020 |
| 성능 (Performance) | AP-005, AP-007, AP-016, AP-017, AP-018, AP-021, AP-022, AP-023 |
| 유지보수성 (Maintainability) | AP-009, AP-026 |

---

## AP-001: God Table (거대 테이블)

| 항목 | 내용 |
|------|------|
| **카테고리** | 구조 |
| **심각도** | Major |
| **설명** | 단일 테이블에 30개 이상의 컬럼이 집중되어 있는 패턴. 여러 엔티티의 책임이 하나의 테이블에 혼재되어 있음을 의미한다. |
| **탐지 신호** | `COUNT(column_name) > 30` in `ALL_TAB_COLUMNS`, 테이블 접두사가 하나인데 너무 많은 비즈니스 영역을 포함 |
| **영향** | 유지보수 어려움, 불필요한 컬럼 잠금(행 경합), NULL 비율 증가, 인덱스 과부하 |

```sql
-- BAD: 주문, 고객, 배송, 결제 정보가 하나의 테이블에 혼재 (45개 컬럼)
CREATE TABLE TB_ORDER (
    ORD_ID          NUMBER(18)      NOT NULL,
    ORD_DT          DATE            NOT NULL,
    CUST_ID         NUMBER(18)      NOT NULL,
    CUST_NM         VARCHAR2(100 CHAR),   -- 고객 정보 (별도 테이블 필요)
    CUST_EMAIL      VARCHAR2(200 CHAR),
    CUST_TEL_NO     VARCHAR2(20 CHAR),
    CUST_ADDR       VARCHAR2(500 CHAR),
    PAY_AMT         NUMBER(15,2),         -- 결제 정보 (별도 테이블 필요)
    PAY_DT          DATE,
    PAY_MTHD_CD     VARCHAR2(10 CHAR),
    PAY_STATUS_CD   VARCHAR2(10 CHAR),
    CARD_NO         VARCHAR2(20 CHAR),
    DLVR_ADDR       VARCHAR2(500 CHAR),   -- 배송 정보 (별도 테이블 필요)
    DLVR_NM         VARCHAR2(100 CHAR),
    DLVR_TEL_NO     VARCHAR2(20 CHAR),
    DLVR_STATUS_CD  VARCHAR2(10 CHAR),
    DLVR_DT         DATE,
    -- ... 30개 이상 컬럼 계속
    CONSTRAINT PK_TB_ORDER PRIMARY KEY (ORD_ID)
);

-- GOOD: 책임별로 테이블 분리
CREATE TABLE TB_ORDER_MST (   -- 주문 마스터 (핵심 정보만)
    ORD_ID          NUMBER(18)      NOT NULL,
    ORD_DT          DATE            NOT NULL,
    CUST_ID         NUMBER(18)      NOT NULL,
    ORD_STATUS_CD   VARCHAR2(10 CHAR) NOT NULL,
    REGR_ID         VARCHAR2(50 CHAR) NOT NULL,
    REG_DT          DATE            NOT NULL,
    MODR_ID         VARCHAR2(50 CHAR) NOT NULL,
    MOD_DT          DATE            NOT NULL,
    CONSTRAINT PK_TB_ORDER_MST PRIMARY KEY (ORD_ID)
);

CREATE TABLE TB_ORDER_PAY (   -- 결제 정보 분리
    PAY_ID          NUMBER(18)      NOT NULL,
    ORD_ID          NUMBER(18)      NOT NULL,
    PAY_AMT         NUMBER(15,2)    NOT NULL,
    PAY_DT          DATE,
    PAY_MTHD_CD     VARCHAR2(10 CHAR) NOT NULL,
    CONSTRAINT PK_TB_ORDER_PAY PRIMARY KEY (PAY_ID),
    CONSTRAINT FK_TB_ORDER_PAY_ORD FOREIGN KEY (ORD_ID)
        REFERENCES TB_ORDER_MST (ORD_ID)
);
```

---

## AP-002: 감사 컬럼 누락 (Missing Audit Columns)

| 항목 | 내용 |
|------|------|
| **카테고리** | 제약조건 |
| **심각도** | Major |
| **설명** | 모든 테이블에 필수적으로 있어야 하는 4개 감사 컬럼(REGR_ID, REG_DT, MODR_ID, MOD_DT)이 누락된 패턴. |
| **탐지 신호** | `ALL_TAB_COLUMNS`에서 REGR_ID, REG_DT, MODR_ID, MOD_DT 컬럼이 없는 테이블 존재 |
| **영향** | 데이터 변경 이력 추적 불가, 장애 원인 분석 어려움, 컴플라이언스 위반 |

```sql
-- BAD: 감사 컬럼 없음
CREATE TABLE TB_PRODUCT_MST (
    PRD_ID    NUMBER(18)       NOT NULL,
    PRD_NM    VARCHAR2(200 CHAR) NOT NULL,
    PRC       NUMBER(15,2)     NOT NULL,
    CONSTRAINT PK_TB_PRODUCT_MST PRIMARY KEY (PRD_ID)
);

-- GOOD: 4개 감사 컬럼 포함
CREATE TABLE TB_PRODUCT_MST (
    PRD_ID    NUMBER(18)         NOT NULL,
    PRD_NM    VARCHAR2(200 CHAR) NOT NULL,
    PRC       NUMBER(15,2)       NOT NULL,
    REGR_ID   VARCHAR2(50 CHAR)  NOT NULL,  -- 등록자 ID
    REG_DT    DATE               NOT NULL,  -- 등록일시
    MODR_ID   VARCHAR2(50 CHAR)  NOT NULL,  -- 수정자 ID
    MOD_DT    DATE               NOT NULL,  -- 수정일시
    CONSTRAINT PK_TB_PRODUCT_MST PRIMARY KEY (PRD_ID)
);
```

---

## AP-003: VARCHAR2 BYTE 시맨틱스 (VARCHAR2 BYTE Semantics)

| 항목 | 내용 |
|------|------|
| **카테고리** | 데이터 타입 |
| **심각도** | Major |
| **설명** | VARCHAR2 선언 시 `CHAR` 대신 `BYTE`(기본값) 시맨틱스를 사용하는 패턴. 한국어(UTF-8) 환경에서 한 글자가 3바이트이므로 실제 저장 가능 글자 수가 예상보다 적어진다. |
| **탐지 신호** | DDL에 `VARCHAR2(N)` 또는 `VARCHAR2(N BYTE)` 표기 (CHAR 없음) |
| **영향** | 한글 데이터가 예상보다 일찍 잘림, 애플리케이션 오류 발생, 데이터 손실 |

```sql
-- BAD: BYTE 시맨틱스 (기본값) — 한글 33자만 저장 가능
CREATE TABLE TB_USER_MST (
    USER_ID   NUMBER(18)      NOT NULL,
    USER_NM   VARCHAR2(100),         -- 100 BYTE = 한글 33자
    ADDR      VARCHAR2(500 BYTE),    -- 명시적이지만 여전히 BYTE
    CONSTRAINT PK_TB_USER_MST PRIMARY KEY (USER_ID)
);

-- GOOD: CHAR 시맨틱스 명시 — 한글 100자 저장 가능
CREATE TABLE TB_USER_MST (
    USER_ID   NUMBER(18)         NOT NULL,
    USER_NM   VARCHAR2(100 CHAR) NOT NULL,  -- 100글자 보장
    ADDR      VARCHAR2(500 CHAR),
    CONSTRAINT PK_TB_USER_MST PRIMARY KEY (USER_ID)
);
```

---

## AP-004: CHAR 남용 (CHAR Abuse)

| 항목 | 내용 |
|------|------|
| **카테고리** | 데이터 타입 |
| **심각도** | Minor |
| **설명** | 가변 길이 데이터에 CHAR 타입을 사용하는 패턴. CHAR는 고정 길이이므로 짧은 값도 공백으로 패딩하여 저장한다. |
| **탐지 신호** | `CHAR` 타입 컬럼의 길이가 3 이상이거나, 이름/주소 등 가변 데이터에 CHAR 사용 |
| **영향** | 불필요한 저장 공간 낭비, 비교 시 공백 패딩 문제로 예상치 못한 쿼리 결과 |

```sql
-- BAD: 가변 길이 데이터에 CHAR 사용
CREATE TABLE TB_USER_MST (
    USER_ID   NUMBER(18)  NOT NULL,
    USER_NM   CHAR(100),           -- 이름은 가변 길이
    EMAIL     CHAR(200),           -- 이메일은 가변 길이
    STATUS_CD CHAR(10),            -- 코드도 불필요하게 큼
    USE_YN    CHAR(1)    NOT NULL  -- 이것만 적절 (Y/N 고정 1자)
);

-- GOOD: 고정 길이(1~2자 코드)만 CHAR 사용
CREATE TABLE TB_USER_MST (
    USER_ID   NUMBER(18)         NOT NULL,
    USER_NM   VARCHAR2(100 CHAR) NOT NULL,  -- 가변 → VARCHAR2
    EMAIL     VARCHAR2(200 CHAR),
    STATUS_CD VARCHAR2(10 CHAR)  NOT NULL,  -- 코드도 VARCHAR2
    USE_YN    CHAR(1)            NOT NULL,  -- 고정 1자 → CHAR 적절
    CONSTRAINT CK_TB_USER_MST_USE_YN CHECK (USE_YN IN ('Y', 'N'))
);
```

---

## AP-005: FK 인덱스 누락 (Missing FK Index)

| 항목 | 내용 |
|------|------|
| **카테고리** | 성능 |
| **심각도** | Critical |
| **설명** | 외래 키(FK) 컬럼에 인덱스가 없는 패턴. Oracle은 부모 테이블의 DELETE/UPDATE 시 자식 테이블을 전체 스캔하여 데드락과 심각한 성능 저하를 유발한다. |
| **탐지 신호** | FK 제약조건이 있는 컬럼에 대한 인덱스가 `ALL_INDEXES`에 없음 |
| **영향** | 부모 레코드 삭제/수정 시 자식 테이블 전체 테이블 스캔, 데드락, 심각한 성능 저하 |

```sql
-- BAD: FK 컬럼(ORD_ID)에 인덱스 없음 — 부모 삭제 시 전체 스캔
ALTER TABLE TB_ORDER_DTL
    ADD CONSTRAINT FK_ORDER_DTL_ORD FOREIGN KEY (ORD_ID)
    REFERENCES TB_ORDER_MST (ORD_ID);
-- TB_ORDER_DTL.ORD_ID에 인덱스 없음!

-- GOOD: FK 컬럼에 반드시 인덱스 생성
ALTER TABLE TB_ORDER_DTL
    ADD CONSTRAINT FK_ORDER_DTL_ORD FOREIGN KEY (ORD_ID)
    REFERENCES TB_ORDER_MST (ORD_ID);

-- FK 인덱스 즉시 생성
CREATE INDEX IX_TB_ORDER_DTL_ORD_ID
    ON TB_ORDER_DTL (ORD_ID)
    TABLESPACE TS_OMS_INDEX;
```

---

## AP-006: 이름 없는 제약조건 (Unnamed Constraints / SYS_C)

| 항목 | 내용 |
|------|------|
| **카테고리** | 유지보수성 |
| **심각도** | Major |
| **설명** | 제약조건에 이름을 부여하지 않아 Oracle이 자동으로 `SYS_C0012345` 형태의 이름을 생성하는 패턴. |
| **탐지 신호** | `ALL_CONSTRAINTS`에서 `CONSTRAINT_NAME LIKE 'SYS_C%'` |
| **영향** | 오류 메시지에 의미 없는 이름 표시, 스크립트에서 제약조건 참조 불가, 마이그레이션 어려움 |

```sql
-- BAD: 이름 없는 제약조건 — SYS_C001234 자동 생성
CREATE TABLE TB_EMP_MST (
    EMP_ID    NUMBER(18)        NOT NULL,
    EMP_NM    VARCHAR2(100 CHAR) NOT NULL,
    DEPT_ID   NUMBER(18)        NOT NULL,
    USE_YN    CHAR(1)           NOT NULL,
    PRIMARY KEY (EMP_ID),                    -- SYS_C 자동 생성
    CHECK (USE_YN IN ('Y', 'N'))             -- SYS_C 자동 생성
);
ALTER TABLE TB_EMP_MST
    ADD FOREIGN KEY (DEPT_ID) REFERENCES TB_DEPT_MST (DEPT_ID);  -- SYS_C 자동 생성

-- GOOD: 모든 제약조건에 명시적 이름 부여
CREATE TABLE TB_EMP_MST (
    EMP_ID    NUMBER(18)         NOT NULL,
    EMP_NM    VARCHAR2(100 CHAR) NOT NULL,
    DEPT_ID   NUMBER(18)         NOT NULL,
    USE_YN    CHAR(1)            NOT NULL,
    CONSTRAINT PK_TB_EMP_MST         PRIMARY KEY (EMP_ID),
    CONSTRAINT CK_TB_EMP_MST_USE_YN  CHECK (USE_YN IN ('Y', 'N'))
);
ALTER TABLE TB_EMP_MST
    ADD CONSTRAINT FK_TB_EMP_MST_DEPT FOREIGN KEY (DEPT_ID)
    REFERENCES TB_DEPT_MST (DEPT_ID);
```

---

## AP-007: 대용량 테이블 미파티셔닝 (Unpartitioned Large Table)

| 항목 | 내용 |
|------|------|
| **카테고리** | 성능 |
| **심각도** | Major |
| **설명** | 1,000만 건 이상 예상되는 테이블에 파티셔닝이 없는 패턴. |
| **탐지 신호** | 이력(HST)/로그(LOG)/거래(TRX) 테이블에 파티션 없음, `ALL_TABLES`의 `PARTITIONED = 'NO'` |
| **영향** | 풀 테이블 스캔 성능 저하, 데이터 삭제(PURGE) 시 DML 부하, 병렬 처리 불가 |

```sql
-- BAD: 대용량 이력 테이블에 파티션 없음
CREATE TABLE TB_PAY_HST (
    PAY_HST_ID  NUMBER(18)        NOT NULL,
    PAY_ID      NUMBER(18)        NOT NULL,
    PAY_DT      DATE              NOT NULL,  -- 날짜 기반 조회인데 파티션 없음
    PAY_AMT     NUMBER(15,2)      NOT NULL,
    STATUS_CD   VARCHAR2(10 CHAR) NOT NULL,
    REGR_ID     VARCHAR2(50 CHAR) NOT NULL,
    REG_DT      DATE              NOT NULL,
    MODR_ID     VARCHAR2(50 CHAR) NOT NULL,
    MOD_DT      DATE              NOT NULL,
    CONSTRAINT PK_TB_PAY_HST PRIMARY KEY (PAY_HST_ID)
);

-- GOOD: Range-Interval 파티션으로 월별 자동 분할
CREATE TABLE TB_PAY_HST (
    PAY_HST_ID  NUMBER(18)        NOT NULL,
    PAY_ID      NUMBER(18)        NOT NULL,
    PAY_DT      DATE              NOT NULL,
    PAY_AMT     NUMBER(15,2)      NOT NULL,
    STATUS_CD   VARCHAR2(10 CHAR) NOT NULL,
    REGR_ID     VARCHAR2(50 CHAR) NOT NULL,
    REG_DT      DATE              NOT NULL,
    MODR_ID     VARCHAR2(50 CHAR) NOT NULL,
    MOD_DT      DATE              NOT NULL,
    CONSTRAINT PK_TB_PAY_HST PRIMARY KEY (PAY_HST_ID, PAY_DT)
)
PARTITION BY RANGE (PAY_DT)
INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'))
(
    PARTITION P_TB_PAY_HST_2024_01
        VALUES LESS THAN (DATE '2024-02-01')
        TABLESPACE TS_PAY_DATA
);
```

---

## AP-008: 과도한 CLOB 사용 (Excessive CLOB Usage)

| 항목 | 내용 |
|------|------|
| **카테고리** | 데이터 타입 |
| **심각도** | Minor |
| **설명** | VARCHAR2(4000 CHAR)로 충분한 데이터에 CLOB을 사용하는 패턴. |
| **탐지 신호** | CLOB 컬럼의 실제 데이터가 대부분 4000자 미만 |
| **영향** | LOB 세그먼트 I/O 오버헤드, 인덱싱 제한, 쿼리 성능 저하 |

```sql
-- BAD: 설명 필드에 불필요하게 CLOB 사용
CREATE TABLE TB_PRODUCT_MST (
    PRD_ID    NUMBER(18)  NOT NULL,
    PRD_NM    VARCHAR2(200 CHAR) NOT NULL,
    PRD_DESC  CLOB,       -- 대부분 1000자 이내인데 CLOB 사용
    CONSTRAINT PK_TB_PRODUCT_MST PRIMARY KEY (PRD_ID)
);

-- GOOD: VARCHAR2로 충분하면 VARCHAR2 사용, 진짜 대용량만 CLOB
CREATE TABLE TB_PRODUCT_MST (
    PRD_ID       NUMBER(18)          NOT NULL,
    PRD_NM       VARCHAR2(200 CHAR)  NOT NULL,
    PRD_DESC     VARCHAR2(4000 CHAR),           -- 4000자 이내면 VARCHAR2
    PRD_MANUAL   CLOB,                          -- 실제 대용량 문서만 CLOB
    CONSTRAINT PK_TB_PRODUCT_MST PRIMARY KEY (PRD_ID)
)
LOB (PRD_MANUAL) STORE AS SECUREFILE (
    TABLESPACE  TS_PRD_LOB
    ENABLE STORAGE IN ROW
    COMPRESS
);
```

---

## AP-009: COMMENT 문 누락 (Missing COMMENT Statements)

| 항목 | 내용 |
|------|------|
| **카테고리** | 유지보수성 |
| **심각도** | Minor |
| **설명** | 테이블과 컬럼에 COMMENT가 없는 패턴. |
| **탐지 신호** | `ALL_TAB_COMMENTS`, `ALL_COL_COMMENTS`에서 COMMENTS가 NULL 또는 빈 값 |
| **영향** | 신규 개발자 온보딩 어려움, 데이터 사전 구축 불가, 운영 시 혼란 |

```sql
-- BAD: COMMENT 없음
CREATE TABLE TB_EMP_MST (
    EMP_ID  NUMBER(18) NOT NULL,
    EMP_NM  VARCHAR2(100 CHAR) NOT NULL,
    DEPT_ID NUMBER(18) NOT NULL,
    CONSTRAINT PK_TB_EMP_MST PRIMARY KEY (EMP_ID)
);

-- GOOD: 테이블과 모든 컬럼에 COMMENT 작성
CREATE TABLE TB_EMP_MST (
    EMP_ID  NUMBER(18)         NOT NULL,
    EMP_NM  VARCHAR2(100 CHAR) NOT NULL,
    DEPT_ID NUMBER(18)         NOT NULL,
    REGR_ID VARCHAR2(50 CHAR)  NOT NULL,
    REG_DT  DATE               NOT NULL,
    MODR_ID VARCHAR2(50 CHAR)  NOT NULL,
    MOD_DT  DATE               NOT NULL,
    CONSTRAINT PK_TB_EMP_MST PRIMARY KEY (EMP_ID)
);

COMMENT ON TABLE  TB_EMP_MST          IS '직원 마스터 — HR 시스템의 핵심 직원 정보 관리';
COMMENT ON COLUMN TB_EMP_MST.EMP_ID   IS '직원 ID (시퀀스 SQ_TB_EMP_MST 자동 채번)';
COMMENT ON COLUMN TB_EMP_MST.EMP_NM   IS '직원 성명';
COMMENT ON COLUMN TB_EMP_MST.DEPT_ID  IS '부서 ID (FK → TB_DEPT_MST.DEPT_ID)';
COMMENT ON COLUMN TB_EMP_MST.REGR_ID  IS '등록자 사용자 ID';
COMMENT ON COLUMN TB_EMP_MST.REG_DT   IS '등록 일시';
COMMENT ON COLUMN TB_EMP_MST.MODR_ID  IS '최종 수정자 사용자 ID';
COMMENT ON COLUMN TB_EMP_MST.MOD_DT   IS '최종 수정 일시';
```

---

## AP-010: EAV 패턴 (Entity-Attribute-Value Pattern)

| 항목 | 내용 |
|------|------|
| **카테고리** | 구조 |
| **심각도** | Major |
| **설명** | 속성명-값 쌍을 행으로 저장하는 패턴. 스키마 변경 없이 속성을 추가할 수 있지만, 쿼리와 데이터 무결성이 심각하게 훼손된다. |
| **탐지 신호** | `ATTR_NM`, `ATTR_VAL` 또는 `PROP_KEY`, `PROP_VALUE` 같은 컬럼 조합 |
| **영향** | 타입 안전성 없음, 조인 없이 단일 레코드 조회 불가, 인덱싱 어려움, NOT NULL 등 제약 불가 |

```sql
-- BAD: EAV 패턴 — 모든 속성을 키-값으로 저장
CREATE TABLE TB_PRODUCT_ATTR (
    PRD_ID    NUMBER(18)         NOT NULL,
    ATTR_NM   VARCHAR2(100 CHAR) NOT NULL,  -- 'COLOR', 'SIZE', 'WEIGHT' 등
    ATTR_VAL  VARCHAR2(500 CHAR),           -- 모든 값이 문자열로 저장
    CONSTRAINT PK_TB_PRODUCT_ATTR PRIMARY KEY (PRD_ID, ATTR_NM)
);
-- 조회 예시: 너무 복잡한 피벗 쿼리 필요
SELECT PRD_ID,
       MAX(CASE WHEN ATTR_NM = 'COLOR' THEN ATTR_VAL END) AS COLOR,
       MAX(CASE WHEN ATTR_NM = 'SIZE'  THEN ATTR_VAL END) AS SIZE
FROM TB_PRODUCT_ATTR
GROUP BY PRD_ID;

-- GOOD: 속성을 컬럼으로 명시적 정의
CREATE TABLE TB_PRODUCT_SPEC (
    PRD_ID    NUMBER(18)        NOT NULL,
    COLOR_NM  VARCHAR2(50 CHAR),             -- 명시적 타입과 제약
    SIZE_CD   VARCHAR2(10 CHAR),
    WEIGHT_G  NUMBER(10,2),
    REGR_ID   VARCHAR2(50 CHAR) NOT NULL,
    REG_DT    DATE              NOT NULL,
    MODR_ID   VARCHAR2(50 CHAR) NOT NULL,
    MOD_DT    DATE              NOT NULL,
    CONSTRAINT PK_TB_PRODUCT_SPEC PRIMARY KEY (PRD_ID)
);
```

---

## AP-011: One True Lookup Table (OTLT)

| 항목 | 내용 |
|------|------|
| **카테고리** | 구조 |
| **심각도** | Major |
| **설명** | 모든 코드성 데이터를 하나의 테이블에 TYPE 컬럼으로 구분하는 패턴. |
| **탐지 신호** | `TYPE_CD`, `CODE_TYPE`, `GROUP_CD` 같은 구분자 컬럼이 있는 단일 코드 테이블 |
| **영향** | FK 참조 무결성 보장 불가, 코드 유형별 제약조건 불가, 조회 시 항상 TYPE_CD 조건 필요 |

```sql
-- BAD: 모든 코드를 하나의 테이블에 저장
CREATE TABLE TB_CODE_MST (
    CODE_TYPE VARCHAR2(50 CHAR) NOT NULL,  -- 'ORD_STATUS', 'PAY_MTHD', 'GENDER' 등
    CODE_VAL  VARCHAR2(50 CHAR) NOT NULL,
    CODE_NM   VARCHAR2(200 CHAR) NOT NULL,
    SORT_SEQ  NUMBER(5),
    CONSTRAINT PK_TB_CODE_MST PRIMARY KEY (CODE_TYPE, CODE_VAL)
);
-- FK가 특정 CODE_TYPE으로만 참조할 수 없음!

-- GOOD: 코드 유형별로 별도 테이블 (또는 제약조건)
CREATE TABLE TB_ORD_STATUS_CD (
    STATUS_CD  VARCHAR2(10 CHAR)  NOT NULL,
    STATUS_NM  VARCHAR2(100 CHAR) NOT NULL,
    SORT_SEQ   NUMBER(5)          NOT NULL,
    USE_YN     CHAR(1)            NOT NULL DEFAULT 'Y',
    REGR_ID    VARCHAR2(50 CHAR)  NOT NULL,
    REG_DT     DATE               NOT NULL,
    MODR_ID    VARCHAR2(50 CHAR)  NOT NULL,
    MOD_DT     DATE               NOT NULL,
    CONSTRAINT PK_TB_ORD_STATUS_CD     PRIMARY KEY (STATUS_CD),
    CONSTRAINT CK_TB_ORD_STATUS_USE_YN CHECK (USE_YN IN ('Y', 'N'))
);
-- 이제 TB_ORDER_MST.STATUS_CD → TB_ORD_STATUS_CD.STATUS_CD FK 가능
```

---

## AP-012: 다형성 연관 (Polymorphic Associations)

| 항목 | 내용 |
|------|------|
| **카테고리** | 구조 |
| **심각도** | Major |
| **설명** | 하나의 FK가 여러 테이블을 참조할 수 있도록 TYPE 컬럼과 함께 사용하는 패턴. Oracle의 FK 제약조건으로는 구현 불가. |
| **탐지 신호** | `TARGET_TYPE`, `REF_TYPE` 같은 타입 구분 컬럼과 `REF_ID` 같은 가짜 FK 컬럼 조합 |
| **영향** | 참조 무결성 DB 레벨 보장 불가, 쿼리 복잡도 증가, 잘못된 참조 데이터 발생 가능 |

```sql
-- BAD: 댓글이 게시글 또는 상품에 달릴 수 있다고 TYPE으로 구분
CREATE TABLE TB_COMMENT (
    CMT_ID      NUMBER(18)         NOT NULL,
    TARGET_TYPE VARCHAR2(20 CHAR)  NOT NULL,  -- 'POST' or 'PRODUCT'
    TARGET_ID   NUMBER(18)         NOT NULL,  -- TB_POST 또는 TB_PRODUCT 중 하나 참조
    CMT_CN      VARCHAR2(4000 CHAR) NOT NULL,
    CONSTRAINT PK_TB_COMMENT PRIMARY KEY (CMT_ID)
    -- FK 설정 불가! TARGET_ID가 무엇을 참조하는지 DB가 알 수 없음
);

-- GOOD: 연관 테이블 분리 또는 슈퍼타입-서브타입 패턴
CREATE TABLE TB_POST_CMT (       -- 게시글 댓글 전용
    CMT_ID   NUMBER(18)          NOT NULL,
    POST_ID  NUMBER(18)          NOT NULL,
    CMT_CN   VARCHAR2(4000 CHAR) NOT NULL,
    REGR_ID  VARCHAR2(50 CHAR)   NOT NULL,
    REG_DT   DATE                NOT NULL,
    MODR_ID  VARCHAR2(50 CHAR)   NOT NULL,
    MOD_DT   DATE                NOT NULL,
    CONSTRAINT PK_TB_POST_CMT        PRIMARY KEY (CMT_ID),
    CONSTRAINT FK_TB_POST_CMT_POST   FOREIGN KEY (POST_ID)
        REFERENCES TB_POST_MST (POST_ID)
);
```

---

## AP-013: 필수 컬럼 NOT NULL 누락 (Missing NOT NULL on Required Columns)

| 항목 | 내용 |
|------|------|
| **카테고리** | 제약조건 |
| **심각도** | Major |
| **설명** | 비즈니스 규칙상 반드시 값이 있어야 하는 컬럼에 NOT NULL 제약이 없는 패턴. |
| **탐지 신호** | 이름(NM), 상태(STATUS_CD), 금액(AMT), 날짜(DT) 컬럼이 NULL 허용 |
| **영향** | 불완전 데이터 저장, 집계 쿼리 오류(NULL 무시), 비즈니스 로직 버그 |

```sql
-- BAD: 필수 비즈니스 데이터가 NULL 허용
CREATE TABLE TB_ORDER_MST (
    ORD_ID      NUMBER(18),       -- PK인데 NOT NULL 없음
    ORD_DT      DATE,             -- 주문일시는 필수인데 NULL 허용
    CUST_ID     NUMBER(18),       -- 고객은 필수인데 NULL 허용
    TOTAL_AMT   NUMBER(15,2),     -- 주문금액은 필수인데 NULL 허용
    STATUS_CD   VARCHAR2(10 CHAR) -- 상태는 필수인데 NULL 허용
);

-- GOOD: 비즈니스 규칙에 맞게 NOT NULL 적용
CREATE TABLE TB_ORDER_MST (
    ORD_ID      NUMBER(18)        NOT NULL,  -- PK는 반드시 NOT NULL
    ORD_DT      DATE              NOT NULL,  -- 주문일시 필수
    CUST_ID     NUMBER(18)        NOT NULL,  -- 고객 필수
    TOTAL_AMT   NUMBER(15,2)      NOT NULL,  -- 금액 필수
    STATUS_CD   VARCHAR2(10 CHAR) NOT NULL,  -- 상태 필수
    RMK         VARCHAR2(4000 CHAR),         -- 비고는 선택 → NULL 허용
    REGR_ID     VARCHAR2(50 CHAR) NOT NULL,
    REG_DT      DATE              NOT NULL,
    MODR_ID     VARCHAR2(50 CHAR) NOT NULL,
    MOD_DT      DATE              NOT NULL,
    CONSTRAINT PK_TB_ORDER_MST PRIMARY KEY (ORD_ID)
);
```

---

## AP-014: 과도한 정규화 (Over-Normalization)

| 항목 | 내용 |
|------|------|
| **카테고리** | 구조 |
| **심각도** | Minor |
| **설명** | 실제 UPDATE 이상이 거의 발생하지 않는 데이터까지 별도 테이블로 분리하여 조인 횟수가 불필요하게 늘어나는 패턴. |
| **탐지 신호** | 3개 이상의 조인 없이는 기본 화면도 조회 불가, 1:1 관계 테이블이 과다 |
| **영향** | 쿼리 복잡도 및 응답 시간 증가, 개발 생산성 저하 |

```sql
-- BAD: 주소를 과도하게 분리 (조인 4번 필요)
-- TB_USER_MST → TB_USER_ADDR → TB_ADDR_MST → TB_SIDO_CD → TB_SIGUNGU_CD

-- GOOD: 실제 변경 빈도를 고려한 적절한 비정규화 (인라인 주소 + 코드 참조)
CREATE TABLE TB_USER_MST (
    USER_ID       NUMBER(18)         NOT NULL,
    USER_NM       VARCHAR2(100 CHAR) NOT NULL,
    -- 주소는 자주 변경되지 않으므로 인라인 저장 (비정규화 의도 명시)
    ROAD_ADDR     VARCHAR2(200 CHAR),  -- 도로명 주소 (비정규화: 변경 빈도 낮음)
    DETAIL_ADDR   VARCHAR2(200 CHAR),
    ZIP_CD        VARCHAR2(10 CHAR),
    SIDO_NM       VARCHAR2(50 CHAR),   -- 시도명 (비정규화: 쿼리 편의)
    SIGUNGU_NM    VARCHAR2(50 CHAR),   -- 시군구명 (비정규화: 쿼리 편의)
    REGR_ID       VARCHAR2(50 CHAR)    NOT NULL,
    REG_DT        DATE                 NOT NULL,
    MODR_ID       VARCHAR2(50 CHAR)    NOT NULL,
    MOD_DT        DATE                 NOT NULL,
    CONSTRAINT PK_TB_USER_MST PRIMARY KEY (USER_ID)
);

COMMENT ON COLUMN TB_USER_MST.ROAD_ADDR   IS '도로명 주소 [비정규화 사유: 주소 변경 빈도 낮음, 조인 성능 개선]';
```

---

## AP-015: 반복 그룹 / 비정규화 (Repeating Groups)

| 항목 | 내용 |
|------|------|
| **카테고리** | 구조 |
| **심각도** | Major |
| **설명** | 동일한 속성이 번호를 달리하며 여러 컬럼에 반복되는 1NF 위반 패턴. |
| **탐지 신호** | `ITEM1`, `ITEM2`, `ITEM3` 또는 `PHONE1`, `PHONE2`, `PHONE3` 같은 순번 컬럼 |
| **영향** | 항목 수 증가 시 스키마 변경 필요, NULL 컬럼 낭비, 집계 쿼리 복잡 |

```sql
-- BAD: 전화번호를 3개 컬럼으로 반복
CREATE TABLE TB_CUSTOMER_MST (
    CUST_ID   NUMBER(18)        NOT NULL,
    CUST_NM   VARCHAR2(100 CHAR) NOT NULL,
    TEL_NO1   VARCHAR2(20 CHAR),   -- 전화번호 1
    TEL_NO2   VARCHAR2(20 CHAR),   -- 전화번호 2
    TEL_NO3   VARCHAR2(20 CHAR),   -- 전화번호 3 (4번째가 생기면 스키마 변경!)
    CONSTRAINT PK_TB_CUSTOMER_MST PRIMARY KEY (CUST_ID)
);

-- GOOD: 별도 테이블로 1:N 관계 표현
CREATE TABLE TB_CUSTOMER_MST (
    CUST_ID  NUMBER(18)         NOT NULL,
    CUST_NM  VARCHAR2(100 CHAR) NOT NULL,
    REGR_ID  VARCHAR2(50 CHAR)  NOT NULL,
    REG_DT   DATE               NOT NULL,
    MODR_ID  VARCHAR2(50 CHAR)  NOT NULL,
    MOD_DT   DATE               NOT NULL,
    CONSTRAINT PK_TB_CUSTOMER_MST PRIMARY KEY (CUST_ID)
);

CREATE TABLE TB_CUSTOMER_TEL (
    TEL_SEQ  NUMBER(5)         NOT NULL,
    CUST_ID  NUMBER(18)        NOT NULL,
    TEL_NO   VARCHAR2(20 CHAR) NOT NULL,
    TEL_TYPE_CD VARCHAR2(10 CHAR) NOT NULL,  -- 'MOBILE', 'HOME', 'OFFICE'
    REGR_ID  VARCHAR2(50 CHAR) NOT NULL,
    REG_DT   DATE              NOT NULL,
    MODR_ID  VARCHAR2(50 CHAR) NOT NULL,
    MOD_DT   DATE              NOT NULL,
    CONSTRAINT PK_TB_CUSTOMER_TEL     PRIMARY KEY (TEL_SEQ),
    CONSTRAINT FK_TB_CUSTOMER_TEL_CUST FOREIGN KEY (CUST_ID)
        REFERENCES TB_CUSTOMER_MST (CUST_ID)
);
```

---

## AP-016: 암묵적 타입 변환 (Implicit Type Conversion)

| 항목 | 내용 |
|------|------|
| **카테고리** | 성능 |
| **심각도** | Major |
| **설명** | 인덱스 컬럼과 비교값의 데이터 타입이 달라 Oracle이 내부적으로 함수를 적용, 인덱스가 무력화되는 패턴. |
| **탐지 신호** | NUMBER 컬럼에 문자열 비교, DATE 컬럼에 TO_DATE 없이 문자열 비교, VARCHAR2 컬럼에 숫자 비교 |
| **영향** | 인덱스 사용 불가(FULL TABLE SCAN), 실행 계획 불안정, 잘못된 결과 가능 |

```sql
-- BAD: VARCHAR2 컬럼에 NUMBER 바인딩 — 암묵적 TO_NUMBER 발생
-- CUST_CD VARCHAR2(20 CHAR) 컬럼에 숫자 비교
SELECT * FROM TB_CUSTOMER_MST WHERE CUST_CD = 12345;  -- FULL SCAN 유발!

-- BAD: DATE 컬럼에 TO_DATE 없이 문자열 비교
SELECT * FROM TB_ORDER_MST WHERE ORD_DT = '2024-01-01';  -- NLS_DATE_FORMAT 의존

-- GOOD: 타입 명시적 일치
SELECT * FROM TB_CUSTOMER_MST WHERE CUST_CD = '12345';  -- VARCHAR2 → 문자열 리터럴

-- GOOD: DATE 컬럼 비교는 TO_DATE 또는 DATE 리터럴 사용
SELECT * FROM TB_ORDER_MST
WHERE ORD_DT >= DATE '2024-01-01'
  AND ORD_DT <  DATE '2024-02-01';  -- DATE 리터럴 사용
```

---

## AP-017: 시퀀스 CACHE 미설정 (Missing Sequence Cache)

| 항목 | 내용 |
|------|------|
| **카테고리** | 성능 |
| **심각도** | Minor |
| **설명** | 시퀀스를 NOCACHE 또는 낮은 CACHE 값으로 생성하는 패턴. 높은 동시성 INSERT 환경에서 시퀀스 경합이 발생한다. |
| **탐지 신호** | `ALL_SEQUENCES`에서 `CACHE_SIZE = 0` (NOCACHE) 또는 `CACHE_SIZE < 100` |
| **영향** | 높은 동시 INSERT 시 시퀀스 row cache lock 경합, 성능 저하 |

```sql
-- BAD: NOCACHE — 매번 데이터 파일에서 읽음
CREATE SEQUENCE SQ_TB_ORDER_MST
    START WITH 1
    INCREMENT BY 1
    NOCACHE      -- 매 NEXTVAL마다 I/O 발생
    NOCYCLE;

-- GOOD: CACHE 1000 설정 — 메모리에서 빠르게 채번
CREATE SEQUENCE SQ_TB_ORDER_MST
    START WITH 1
    INCREMENT BY 1
    CACHE 1000   -- 1000개씩 메모리 캐시 (고부하 환경: 5000~10000)
    NOCYCLE
    ORDER;       -- RAC 환경에서 순서 보장 필요 시
```

---

## AP-018: 테이블스페이스 미분리 (Missing Tablespace Separation)

| 항목 | 내용 |
|------|------|
| **카테고리** | 성능 |
| **심각도** | Minor |
| **설명** | 데이터, 인덱스, LOB 세그먼트가 모두 동일한 테이블스페이스(USERS 또는 기본)에 저장되는 패턴. |
| **탐지 신호** | `ALL_TABLES`, `ALL_INDEXES`의 `TABLESPACE_NAME = 'USERS'` 또는 TABLESPACE 미지정 |
| **영향** | I/O 경합, 백업/복구 단위 분리 불가, 공간 관리 어려움 |

```sql
-- BAD: 테이블스페이스 미지정 — 기본값(USERS) 사용
CREATE TABLE TB_ORDER_MST (
    ORD_ID  NUMBER(18) NOT NULL,
    CONSTRAINT PK_TB_ORDER_MST PRIMARY KEY (ORD_ID)
);
CREATE INDEX IX_TB_ORDER_MST_CUST ON TB_ORDER_MST (CUST_ID);

-- GOOD: 데이터/인덱스/LOB 테이블스페이스 분리
CREATE TABLE TB_ORDER_MST (
    ORD_ID  NUMBER(18) NOT NULL,
    RMK     CLOB,
    CONSTRAINT PK_TB_ORDER_MST PRIMARY KEY (ORD_ID)
        USING INDEX TABLESPACE TS_OMS_INDEX
)
TABLESPACE TS_OMS_DATA
LOB (RMK) STORE AS SECUREFILE (TABLESPACE TS_OMS_LOB);

CREATE INDEX IX_TB_ORDER_MST_CUST ON TB_ORDER_MST (CUST_ID)
    TABLESPACE TS_OMS_INDEX;
```

---

## AP-019: 순환 외래 키 (Circular Foreign Keys)

| 항목 | 내용 |
|------|------|
| **카테고리** | 구조 |
| **심각도** | Critical |
| **설명** | A → B → C → A 형태로 FK가 순환하는 패턴. INSERT/DELETE 시 제약조건 위반으로 데이터 입력 자체가 불가능해진다. |
| **탐지 신호** | FK 관계 그래프에서 사이클 발견 |
| **영향** | 데이터 입력 불가(닭-달걀 문제), 특정 DELETE 불가, 아키텍처 결함 |

```sql
-- BAD: 순환 참조 — A팀은 반드시 리더가 있고, 리더는 반드시 팀이 있어야 함
CREATE TABLE TB_TEAM (
    TEAM_ID    NUMBER(18) NOT NULL,
    TEAM_NM    VARCHAR2(100 CHAR) NOT NULL,
    LEADER_ID  NUMBER(18) NOT NULL,  -- TB_EMP_MST 참조
    CONSTRAINT PK_TB_TEAM PRIMARY KEY (TEAM_ID)
);
CREATE TABLE TB_EMP_MST (
    EMP_ID   NUMBER(18) NOT NULL,
    EMP_NM   VARCHAR2(100 CHAR) NOT NULL,
    TEAM_ID  NUMBER(18) NOT NULL,   -- TB_TEAM 참조 → 순환!
    CONSTRAINT PK_TB_EMP_MST PRIMARY KEY (EMP_ID)
);
-- INSERT 불가! 팀 없이 직원 불가, 직원 없이 팀 리더 불가.

-- GOOD: 순환 제거 — 리더 FK를 NULL 허용하거나 구조 변경
CREATE TABLE TB_TEAM (
    TEAM_ID    NUMBER(18)         NOT NULL,
    TEAM_NM    VARCHAR2(100 CHAR) NOT NULL,
    LEADER_ID  NUMBER(18),         -- NULL 허용: 팀 먼저 생성 후 리더 지정
    REGR_ID    VARCHAR2(50 CHAR)   NOT NULL,
    REG_DT     DATE                NOT NULL,
    MODR_ID    VARCHAR2(50 CHAR)   NOT NULL,
    MOD_DT     DATE                NOT NULL,
    CONSTRAINT PK_TB_TEAM PRIMARY KEY (TEAM_ID)
);
```

---

## AP-020: DEFAULT 값 누락 (Missing Default Values)

| 항목 | 내용 |
|------|------|
| **카테고리** | 제약조건 |
| **심각도** | Minor |
| **설명** | USE_YN, SORT_SEQ 등 명확한 기본값이 있는 컬럼에 DEFAULT가 없는 패턴. |
| **탐지 신호** | CHAR(1) 타입의 YN 컬럼, NUMBER 타입의 SEQ/CNT 컬럼에 DEFAULT 없음 |
| **영향** | 애플리케이션에서 매번 명시적으로 값을 넣어야 함, 누락 시 NULL 저장 |

```sql
-- BAD: 명확한 기본값이 있는 컬럼에 DEFAULT 없음
CREATE TABLE TB_MENU_MST (
    MENU_ID   NUMBER(18)         NOT NULL,
    MENU_NM   VARCHAR2(100 CHAR) NOT NULL,
    USE_YN    CHAR(1)            NOT NULL,  -- 기본값 Y가 당연한데 없음
    SORT_SEQ  NUMBER(5)          NOT NULL,  -- 기본값 0이 당연한데 없음
    CONSTRAINT PK_TB_MENU_MST PRIMARY KEY (MENU_ID)
);

-- GOOD: 의미 있는 DEFAULT 값 설정
CREATE TABLE TB_MENU_MST (
    MENU_ID   NUMBER(18)         NOT NULL,
    MENU_NM   VARCHAR2(100 CHAR) NOT NULL,
    USE_YN    CHAR(1)            NOT NULL DEFAULT 'Y',   -- 기본 활성
    SORT_SEQ  NUMBER(5)          NOT NULL DEFAULT 0,     -- 기본 순서
    REGR_ID   VARCHAR2(50 CHAR)  NOT NULL,
    REG_DT    DATE               NOT NULL DEFAULT SYSDATE,
    MODR_ID   VARCHAR2(50 CHAR)  NOT NULL,
    MOD_DT    DATE               NOT NULL DEFAULT SYSDATE,
    CONSTRAINT PK_TB_MENU_MST        PRIMARY KEY (MENU_ID),
    CONSTRAINT CK_TB_MENU_MST_USE_YN CHECK (USE_YN IN ('Y', 'N'))
);
```

---

## AP-021: 과도한 인덱싱 (Over-Indexing)

| 항목 | 내용 |
|------|------|
| **카테고리** | 성능 |
| **심각도** | Minor |
| **설명** | OLTP 테이블에 5개 이상의 인덱스가 있는 패턴. |
| **탐지 신호** | `ALL_INDEXES`에서 동일 테이블에 인덱스 5개 초과 |
| **영향** | INSERT/UPDATE/DELETE 시 인덱스 유지 비용 급증, 블록 분할 증가 |

```sql
-- BAD: OLTP 테이블에 너무 많은 인덱스 (7개)
-- PK + 6개 추가 인덱스
CREATE INDEX IX_TB_ORDER_MST_CUST_ID   ON TB_ORDER_MST (CUST_ID);
CREATE INDEX IX_TB_ORDER_MST_ORD_DT    ON TB_ORDER_MST (ORD_DT);
CREATE INDEX IX_TB_ORDER_MST_STATUS    ON TB_ORDER_MST (STATUS_CD);
CREATE INDEX IX_TB_ORDER_MST_PAY_DT    ON TB_ORDER_MST (PAY_DT);
CREATE INDEX IX_TB_ORDER_MST_PROD_ID   ON TB_ORDER_MST (PRD_ID);
CREATE INDEX IX_TB_ORDER_MST_AMT       ON TB_ORDER_MST (TOTAL_AMT);  -- 범위 조회용?

-- GOOD: 주요 쿼리 패턴 분석 후 복합 인덱스로 통합 (3개로 줄임)
CREATE INDEX IX_TB_ORDER_MST_CUST_DT ON TB_ORDER_MST (CUST_ID, ORD_DT);  -- 고객별 기간 조회
CREATE INDEX IX_TB_ORDER_MST_STATUS  ON TB_ORDER_MST (STATUS_CD, ORD_DT); -- 상태별 기간 조회
-- PAY_DT, PRD_ID, AMT는 사용 빈도 재확인 후 Invisible Index로 테스트
CREATE INDEX IX_TB_ORDER_MST_PAY_DT ON TB_ORDER_MST (PAY_DT) INVISIBLE;  -- 검증 중
```

---

## AP-022: FK 컬럼 인덱스 부재 — 재강조 (FK Without Index / Deadlock Risk)

| 항목 | 내용 |
|------|------|
| **카테고리** | 성능 |
| **심각도** | Critical |
| **설명** | AP-005와 동일하나, 특히 **다수의 자식 테이블**이 있는 부모 테이블 삭제 시 발생하는 데드락을 강조한다. |
| **탐지 신호** | FK 컬럼에 인덱스 없음, 특히 자식 테이블 데이터가 수백만 건 이상 |
| **영향** | 부모 DELETE 시 자식 테이블 전체 잠금(TM Lock), 동시 DML 불가, 데드락 |

```sql
-- Oracle 데드락 시나리오
-- Session 1: TB_ORDER_MST 삭제 시도 → TB_ORDER_DTL 전체 TM Lock 획득
-- Session 2: TB_ORDER_DTL INSERT 시도 → TM Lock 대기 → 데드락!

-- 진단 쿼리: FK 있지만 인덱스 없는 컬럼 찾기
SELECT ac.table_name,
       ac.constraint_name,
       acc.column_name,
       'MISSING INDEX' AS issue
FROM all_constraints ac
JOIN all_cons_columns acc
  ON ac.constraint_name = acc.constraint_name
 AND ac.owner = acc.owner
WHERE ac.constraint_type = 'R'  -- Foreign Key
  AND ac.owner = 'YOUR_SCHEMA'
  AND NOT EXISTS (
    SELECT 1 FROM all_ind_columns aic
    WHERE aic.table_name  = acc.table_name
      AND aic.column_name = acc.column_name
      AND aic.column_position = 1
      AND aic.index_owner = ac.owner
  );
```

---

## AP-023: 파티션 프루닝 기회 누락 (Missing Partition Pruning)

| 항목 | 내용 |
|------|------|
| **카테고리** | 성능 |
| **심각도** | Minor |
| **설명** | 파티션은 있으나 쿼리에서 파티션 키 컬럼을 WHERE 조건으로 사용하지 않아 파티션 프루닝이 되지 않는 패턴. |
| **탐지 신호** | 파티션 키가 아닌 컬럼으로만 조회하는 주요 쿼리 패턴 |
| **영향** | 파티션 구성에도 불구하고 전 파티션 스캔 발생, 파티션 도입 효과 없음 |

```sql
-- BAD: PAY_DT로 파티셔닝했는데 STATUS_CD로만 조회 (프루닝 안 됨)
SELECT * FROM TB_PAY_HST
WHERE STATUS_CD = 'FAIL';  -- PAY_DT 조건 없음 → 전 파티션 스캔

-- GOOD: 파티션 키 컬럼을 반드시 WHERE에 포함
SELECT * FROM TB_PAY_HST
WHERE PAY_DT  >= DATE '2024-01-01'   -- 파티션 프루닝 가능
  AND PAY_DT  <  DATE '2024-02-01'
  AND STATUS_CD = 'FAIL';
```

---

## AP-024: 트리거 기반 비즈니스 로직 (Business Logic in Triggers)

| 항목 | 내용 |
|------|------|
| **카테고리** | 구조 |
| **심각도** | Major |
| **설명** | 비즈니스 규칙(재고 차감, 포인트 적립 등)을 트리거로 구현하는 패턴. 트리거는 감사 컬럼 자동 설정 등 순수 기술적 목적으로만 사용해야 한다. |
| **탐지 신호** | 트리거 내에 DML 문(INSERT/UPDATE INTO 비감사 테이블), 비즈니스 계산 로직 존재 |
| **영향** | 숨겨진 로직으로 디버깅 어려움, 성능 예측 불가, 상호 트리거 발생 위험 |

```sql
-- BAD: 트리거로 재고 차감 (비즈니스 로직)
CREATE OR REPLACE TRIGGER TRG_AIR_TB_ORDER_DTL
AFTER INSERT ON TB_ORDER_DTL
FOR EACH ROW
BEGIN
    -- 비즈니스 로직을 트리거에 구현 → 문제!
    UPDATE TB_INVENTORY
       SET STOCK_QTY = STOCK_QTY - :NEW.ORD_QTY
     WHERE PRD_ID = :NEW.PRD_ID;
END;
/

-- GOOD: 트리거는 감사 컬럼 자동화 등 기술적 목적만
CREATE OR REPLACE TRIGGER TRG_BIR_TB_ORDER_DTL
BEFORE INSERT ON TB_ORDER_DTL
FOR EACH ROW
BEGIN
    IF :NEW.REGR_ID IS NULL THEN :NEW.REGR_ID := SYS_CONTEXT('USERENV', 'SESSION_USER'); END IF;
    IF :NEW.REG_DT  IS NULL THEN :NEW.REG_DT  := SYSDATE; END IF;
    :NEW.MODR_ID := SYS_CONTEXT('USERENV', 'SESSION_USER');
    :NEW.MOD_DT  := SYSDATE;
END;
/
-- 비즈니스 로직(재고 차감)은 저장 프로시저 또는 애플리케이션 서비스 레이어로 이동
```

---

## AP-025: LONG 타입 사용 (Using LONG Instead of CLOB)

| 항목 | 내용 |
|------|------|
| **카테고리** | 데이터 타입 |
| **심각도** | Critical |
| **설명** | Oracle 8i부터 deprecated된 LONG/LONG RAW 타입을 사용하는 패턴. |
| **탐지 신호** | `ALL_TAB_COLUMNS`에서 `DATA_TYPE IN ('LONG', 'LONG RAW')` |
| **영향** | 테이블당 LONG 컬럼 1개 제한, GROUP BY/ORDER BY 불가, CLOB 함수 사용 불가, 향후 Oracle 버전에서 지원 중단 가능 |

```sql
-- BAD: deprecated LONG 타입 사용
CREATE TABLE TB_DOCUMENT (
    DOC_ID   NUMBER(18) NOT NULL,
    DOC_CN   LONG,               -- deprecated! 사용 금지
    CONSTRAINT PK_TB_DOCUMENT PRIMARY KEY (DOC_ID)
);

-- GOOD: CLOB 또는 BLOB으로 마이그레이션
CREATE TABLE TB_DOCUMENT (
    DOC_ID   NUMBER(18)        NOT NULL,
    DOC_CN   CLOB,              -- LONG → CLOB 마이그레이션
    REGR_ID  VARCHAR2(50 CHAR) NOT NULL,
    REG_DT   DATE              NOT NULL,
    MODR_ID  VARCHAR2(50 CHAR) NOT NULL,
    MOD_DT   DATE              NOT NULL,
    CONSTRAINT PK_TB_DOCUMENT PRIMARY KEY (DOC_ID)
)
LOB (DOC_CN) STORE AS SECUREFILE (
    TABLESPACE TS_DOC_LOB
    COMPRESS
);

-- LONG → CLOB 마이그레이션 스크립트
ALTER TABLE TB_DOCUMENT ADD (DOC_CN_CLOB CLOB);
UPDATE TB_DOCUMENT SET DOC_CN_CLOB = TO_CLOB(DOC_CN);
ALTER TABLE TB_DOCUMENT DROP COLUMN DOC_CN;
ALTER TABLE TB_DOCUMENT RENAME COLUMN DOC_CN_CLOB TO DOC_CN;
```

---

## AP-026: 문서 없는 비정규화 (Undocumented Denormalization)

| 항목 | 내용 |
|------|------|
| **카테고리** | 유지보수성 |
| **심각도** | Major |
| **설명** | 성능 또는 업무 편의를 위해 의도적으로 비정규화한 컬럼/테이블에 그 이유가 주석/COMMENT로 기록되지 않은 패턴. |
| **탐지 신호** | 정규화 원칙 위반 컬럼(파생 컬럼, 중복 저장 컬럼)에 COMMENT 없음, DDL 헤더에 비정규화 사유 없음 |
| **영향** | 신규 개발자가 버그로 오인하고 수정, 이중 업데이트 누락으로 데이터 불일치 |

```sql
-- BAD: 비정규화 사유 없이 중복 컬럼 존재
CREATE TABLE TB_ORDER_MST (
    ORD_ID      NUMBER(18)        NOT NULL,
    CUST_ID     NUMBER(18)        NOT NULL,
    CUST_NM     VARCHAR2(100 CHAR),  -- 비정규화? 의도적? 알 수 없음!
    TOTAL_AMT   NUMBER(15,2),        -- 계산값? 저장값? 알 수 없음!
    CONSTRAINT PK_TB_ORDER_MST PRIMARY KEY (ORD_ID)
);

-- GOOD: 비정규화 사유를 COMMENT에 명시
CREATE TABLE TB_ORDER_MST (
    ORD_ID    NUMBER(18)         NOT NULL,
    CUST_ID   NUMBER(18)         NOT NULL,
    CUST_NM   VARCHAR2(100 CHAR),            -- 비정규화 컬럼 (이유는 COMMENT에)
    TOTAL_AMT NUMBER(15,2)       NOT NULL,  -- 파생 컬럼 (이유는 COMMENT에)
    REGR_ID   VARCHAR2(50 CHAR)  NOT NULL,
    REG_DT    DATE               NOT NULL,
    MODR_ID   VARCHAR2(50 CHAR)  NOT NULL,
    MOD_DT    DATE               NOT NULL,
    CONSTRAINT PK_TB_ORDER_MST PRIMARY KEY (ORD_ID)
);

COMMENT ON COLUMN TB_ORDER_MST.CUST_NM
    IS '고객명 [비정규화: 주문 시점 고객명 이력 보존용, TB_CUSTOMER_MST와 동기화 불필요]';
COMMENT ON COLUMN TB_ORDER_MST.TOTAL_AMT
    IS '주문 총액 [파생 컬럼: ORDER_DTL.ORD_AMT 합계, 주문 확정 시 스냅샷 저장]';
```

---

## 빠른 참조표 (Quick Reference)

| ID | 안티패턴 | 카테고리 | 심각도 |
|----|----------|----------|--------|
| AP-001 | God Table | 구조 | Major |
| AP-002 | 감사 컬럼 누락 | 제약조건 | Major |
| AP-003 | VARCHAR2 BYTE 시맨틱스 | 데이터 타입 | Major |
| AP-004 | CHAR 남용 | 데이터 타입 | Minor |
| AP-005 | FK 인덱스 누락 | 성능 | **Critical** |
| AP-006 | 이름 없는 제약조건 | 유지보수성 | Major |
| AP-007 | 대용량 테이블 미파티셔닝 | 성능 | Major |
| AP-008 | 과도한 CLOB 사용 | 데이터 타입 | Minor |
| AP-009 | COMMENT 문 누락 | 유지보수성 | Minor |
| AP-010 | EAV 패턴 | 구조 | Major |
| AP-011 | One True Lookup Table | 구조 | Major |
| AP-012 | 다형성 연관 | 구조 | Major |
| AP-013 | 필수 컬럼 NOT NULL 누락 | 제약조건 | Major |
| AP-014 | 과도한 정규화 | 구조 | Minor |
| AP-015 | 반복 그룹 | 구조 | Major |
| AP-016 | 암묵적 타입 변환 | 성능 | Major |
| AP-017 | 시퀀스 CACHE 미설정 | 성능 | Minor |
| AP-018 | 테이블스페이스 미분리 | 성능 | Minor |
| AP-019 | 순환 외래 키 | 구조 | **Critical** |
| AP-020 | DEFAULT 값 누락 | 제약조건 | Minor |
| AP-021 | 과도한 인덱싱 | 성능 | Minor |
| AP-022 | FK 인덱스 부재 (데드락) | 성능 | **Critical** |
| AP-023 | 파티션 프루닝 기회 누락 | 성능 | Minor |
| AP-024 | 트리거 기반 비즈니스 로직 | 구조 | Major |
| AP-025 | LONG 타입 사용 | 데이터 타입 | **Critical** |
| AP-026 | 문서 없는 비정규화 | 유지보수성 | Major |

**Critical 4개**: AP-005, AP-019, AP-022, AP-025
**Major 15개**: AP-001, AP-002, AP-003, AP-006, AP-007, AP-010, AP-011, AP-012, AP-013, AP-015, AP-016, AP-024, AP-026
**Minor 7개**: AP-004, AP-008, AP-009, AP-014, AP-017, AP-018, AP-020, AP-021, AP-023
