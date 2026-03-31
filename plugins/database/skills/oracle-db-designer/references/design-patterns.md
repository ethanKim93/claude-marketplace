# DB 설계 패턴 가이드

## 목차
1. [정규화 가이드](#1-정규화-가이드)
2. [반정규화 패턴](#2-반정규화-패턴)
3. [파티션 키 설계](#3-파티션-키-설계)
4. [Data Vault 2.0](#4-data-vault-20)
5. [디멘셔널 모델링](#5-디멘셔널-모델링)
6. [DDD-DB 매핑](#6-ddd-db-매핑)

---

## 1. 정규화 가이드

### 정규화 단계별 규칙

| 단계 | 규칙 | 위반 예시 | 해결 방법 |
|------|------|----------|----------|
| **1NF** | 원자값, 반복 그룹 제거 | `PHONE1, PHONE2, PHONE3` 컬럼 | `TB_CUSTOMER_PHONE` 별도 테이블 |
| **2NF** | 부분 함수 종속 제거 (복합 PK일 때) | PK(ORD_ID, PRD_ID)에서 PRD_NM은 PRD_ID에만 종속 | PRD_NM을 `TB_PRODUCT` 이동 |
| **3NF** | 이행 함수 종속 제거 | DEPT_ID → DEPT_NM → DEPT_MGR_NM | `TB_DEPT` 분리 |
| **BCNF** | 모든 결정자가 후보 키 | 3NF이지만 결정자가 후보키 아닐 때 | 분리 후 뷰로 통합 |

### OLTP 설계 전략

```
기본 원칙: 3NF를 목표로 정규화 → 성능 문제 측정 후 선택적 반정규화
```

**정규화 판단 기준**:
- 데이터 무결성이 최우선 → 3NF 유지
- 특정 쿼리 응답 시간이 SLA 초과 → 반정규화 검토
- DML 빈도가 SELECT보다 높음 → 정규화 유지

---

## 2. 반정규화 패턴

### 적용 전 체크리스트

반정규화는 반드시 **측정된 성능 문제**를 근거로 결정하고, **변경 이유를 DDL 주석에 기록**한다.

- [ ] 인덱스 추가로 해결 불가능한가?
- [ ] 읽기/쓰기 비율이 10:1 이상인가?
- [ ] 데이터 동기화 비용을 감당할 수 있는가?

### 패턴 1: 테이블 병합 (1:1 또는 1:N 소규모)

```sql
-- Before: TB_EMPLOYEE + TB_EMPLOYEE_CONTACT (1:1)
-- After: 하나의 테이블로 병합
CREATE TABLE TB_EMPLOYEE (
    EMP_ID      NUMBER(10) PRIMARY KEY,
    EMP_NM      VARCHAR2(100 CHAR) NOT NULL,
    -- contact 컬럼 직접 포함
    EMAIL       VARCHAR2(200 CHAR),
    TEL_NO      VARCHAR2(20 CHAR),
    ...
)
```

**적용 조건**: 항상 함께 조회, 두 테이블의 라이프사이클 동일, 자식 레코드가 항상 1개

### 패턴 2: 컬럼 중복 (Redundant Column)

```sql
-- TB_ORDER_DTL에 TB_PRODUCT.PRD_NM 복사 (잦은 JOIN 제거)
CREATE TABLE TB_ORDER_DTL (
    ORD_DTL_ID  NUMBER(10) PRIMARY KEY,
    ORD_ID      NUMBER(10) NOT NULL,
    PRD_ID      NUMBER(10) NOT NULL,
    PRD_NM      VARCHAR2(200 CHAR),  -- 반정규화: 주문 시점 상품명 고정
    ORD_QTY     NUMBER(10) NOT NULL,
    ...
)
```

**주의**: 원본 변경 시 복사본도 갱신하는 로직 필수. 주문 시점 데이터 스냅샷 용도로도 유효.

### 패턴 3: 파생 컬럼 (Derived/Computed Column)

```sql
-- TB_ORDER에 합계 금액 미리 계산하여 저장
ALTER TABLE TB_ORDER ADD (
    ORD_TOTAL_AMT  NUMBER(18, 2)  -- SUM(ORD_DTL.ORD_AMT) 캐시
);
-- 갱신 트리거 또는 배치로 관리
```

**적용 조건**: 집계 쿼리가 매우 빈번하고, 실시간 정확도보다 응답속도 우선

### 패턴 4: 집계 테이블 (Summary Table)

```sql
-- 일별 매출 통계 사전 집계 (배치 갱신)
CREATE TABLE TB_DAILY_SALES_STAT (
    STAT_DT      DATE          NOT NULL,  -- 통계 기준일
    CATEG_CD     VARCHAR2(20 CHAR) NOT NULL,
    SALE_CNT     NUMBER(10)    NOT NULL,
    SALE_AMT     NUMBER(18,2)  NOT NULL,
    CONSTRAINT PK_DAILY_SALES_STAT PRIMARY KEY (STAT_DT, CATEG_CD)
);
```

**대안**: Oracle Materialized View (자동 갱신 + 쿼리 리라이트 기능)

### 패턴 5: 테이블 분할 (Table Splitting)

```sql
-- 수직 분할: 자주 쓰는 컬럼 / 덜 쓰는 컬럼 분리
-- TB_PRODUCT_MST: ID, NM, PRC, STATUS (빈번한 조회)
-- TB_PRODUCT_DETAIL: 상세 설명, 이미지 URL, 스펙 (가끔 조회)

-- 수평 분할: 파티셔닝으로 해결 권장 (Oracle 네이티브 지원)
```

---

## 3. 파티션 키 설계

### 3.1 파티셔닝 필요 여부 판단

```
파티셔닝이 필요한가?
├── 예상 데이터 1,000만 건 이상인가?  ─── Yes ──→ 파티셔닝 검토
├── 데이터 보관 정책이 있는가?        ─── Yes ──→ 파티셔닝 검토
│   (예: 3년 이후 데이터 삭제)
└── 둘 다 No  ───────────────────────────────── 파티셔닝 불필요
```

### 3.2 파티션 키 선정 기준

| 기준 | 설명 | 실패 예시 |
|------|------|----------|
| **쿼리 Pruning 효과** | WHERE절에 자주 등장 → 불필요한 파티션 스캔 제거 | 파티션 키가 WHERE절에 없으면 FULL PARTITION SCAN |
| **카디널리티 적합성** | Range=연속값, List=이산값(10~50개), Hash=고카디널리티 | STATUS_CD('ACTIVE' 90%) → List 부적합 (Hot Partition) |
| **데이터 분포 균일성** | 파티션 간 크기 편차 최소화 | 연도별 Range인데 최근 연도에 데이터 집중 |
| **관리 단위 일치** | 보관 정책과 파티션 경계 일치 | 월별 삭제인데 연별 파티션 → DROP 불가 |
| **조인 관계** | 자식 테이블은 부모와 동일 키로 Reference Partitioning 검토 | 부모/자식 파티션 불일치 → Partition-Wise Join 불가 |
| **병렬 DML** | Hash 파티션으로 대량 배치 병렬 처리 극대화 | 대용량 배치 대상 테이블에 파티션 없으면 직렬 처리 |

### 3.3 파티션 유형 선택 트리

```
파티션 키 컬럼의 특성은?
├── 날짜/시간 연속값 (주문일, 등록일 등)
│   ├── 파티션이 자동 생성되어야 하는가? → Interval Partitioning
│   └── 수동 관리 가능한가? → Range Partitioning
│
├── 이산 범주값 (지역코드, 사업부코드 등, 10~50개)
│   ├── 데이터 분포가 균일한가? → List Partitioning
│   └── 특정 값에 집중되는가? → Hash 혼합 검토
│
├── 고유값 (고객ID, 주문번호 등), 균등 분산 목적
│   └── Hash Partitioning
│
└── 날짜 + 범주 모두 필요한가?
    ├── 날짜 Range + 지역 List → Composite (Range-List)
    └── 날짜 Range + 고객ID Hash → Composite (Range-Hash)
```

### 3.4 자식 테이블 처리

```
자식 테이블(FK로 부모 참조)의 파티셔닝 방법은?
├── 부모와 항상 함께 조회되는가?
│   └── YES → Reference Partitioning (부모 파티션 키 자동 상속)
│
├── 자식 독자적으로 조회되는가?
│   ├── 자체 파티션 키가 있는가? → 독자 파티셔닝
│   └── 볼륨이 크지 않은가? → 비파티션 유지
```

### 3.5 파티션 키와 PK/인덱스 관계

Oracle에서 LOCAL 인덱스를 사용하려면 **파티션 키가 인덱스의 Leading Column에 포함**되어야 한다.

```sql
-- 권장: 파티션 키(ORD_DT)를 PK에 포함
CONSTRAINT PK_ORDER PRIMARY KEY (ORD_ID, ORD_DT)  -- ORD_DT 포함

-- 이렇게 하면 LOCAL 인덱스 사용 가능
CREATE INDEX IX_TB_ORDER_CUST_ID ON TB_ORDER(CUST_ID, ORD_DT) LOCAL;

-- GLOBAL 인덱스: 파티션 키 미포함 가능하지만 파티션 DROP 시 UNUSABLE 됨
```

### 3.6 파티션 설계 체크리스트

- [ ] 파티션당 예상 크기 계산 (권장: 1~10GB)
- [ ] WHERE절 분석 → 파티션 Pruning 가능 여부 확인
- [ ] LOCAL vs GLOBAL 인덱스 결정
- [ ] 자식 테이블 Reference Partitioning 검토
- [ ] Interval 파티션이면 최대 파티션 수 제한 확인 (1,048,575개)
- [ ] 데이터 보관/삭제 계획 수립 (DROP PARTITION or EXCHANGE)
- [ ] 배치 Exchange Loading 활용 여부

---

## 4. Data Vault 2.0

### 적용 대상

- 다수 소스 시스템의 데이터를 통합하는 엔터프라이즈 DW
- 전체 변경 이력 추적이 필수인 환경 (금융, 공공)
- 애자일하게 스키마를 확장해야 하는 환경

### 핵심 컴포넌트

| 컴포넌트 | 역할 | 네이밍 | 필수 컬럼 |
|----------|------|--------|----------|
| **Hub** | 비즈니스 키 저장 (불변) | `HUB_{비즈니스개념}` | HK(해시키), BK(비즈니스키), LOAD_DTS, REC_SRC |
| **Link** | Hub 간 관계 | `LNK_{HUB1}_{HUB2}` | HK, HK_HUB1, HK_HUB2, LOAD_DTS, REC_SRC |
| **Satellite** | 서술 속성 + 이력 | `SAT_{부모}_{소스약어}` | HK, LOAD_DTS, LOAD_END_DTS, REC_SRC, HASH_DIFF, 속성들 |

```sql
-- Hub 예시
CREATE TABLE HUB_CUSTOMER (
    HK_CUSTOMER    RAW(16)        NOT NULL,  -- 비즈니스키의 MD5/SHA1 해시
    CUST_BK        VARCHAR2(50)   NOT NULL,  -- 비즈니스 키 (원본 ID)
    LOAD_DTS       TIMESTAMP      NOT NULL,  -- 적재 일시
    REC_SRC        VARCHAR2(100)  NOT NULL,  -- 소스 시스템
    CONSTRAINT PK_HUB_CUSTOMER PRIMARY KEY (HK_CUSTOMER)
);

-- Satellite 예시 (이력 포함)
CREATE TABLE SAT_CUSTOMER_CRM (
    HK_CUSTOMER    RAW(16)        NOT NULL,
    LOAD_DTS       TIMESTAMP      NOT NULL,
    LOAD_END_DTS   TIMESTAMP,               -- NULL = 현재 최신 레코드
    REC_SRC        VARCHAR2(100)  NOT NULL,
    HASH_DIFF      RAW(16)        NOT NULL,  -- 변경 감지용
    CUST_NM        VARCHAR2(100 CHAR),
    EMAIL          VARCHAR2(200 CHAR),
    CONSTRAINT PK_SAT_CUST_CRM PRIMARY KEY (HK_CUSTOMER, LOAD_DTS)
);
```

---

## 5. 디멘셔널 모델링

### Star Schema vs Snowflake

| 항목 | Star Schema | Snowflake Schema |
|------|------------|-----------------|
| 차원 테이블 구조 | 비정규화 (단일 테이블) | 정규화 (다단계 테이블) |
| 쿼리 복잡도 | 단순 (조인 적음) | 복잡 (조인 많음) |
| 스토리지 | 상대적으로 많음 | 절약 |
| 권장 | **BI/OLAP 기본 선택** | 차원이 매우 크고 중복이 심할 때 |

### Fact 테이블 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| **Transaction** | 이벤트 1건 = 1행, 가장 낮은 Grain | 개별 주문 건 |
| **Periodic Snapshot** | 주기적 상태 스냅샷 | 월말 재고 잔량 |
| **Accumulating Snapshot** | 프로세스 전체 라이프사이클 | 주문→배송→완료 단계별 날짜 |

### SCD (Slowly Changing Dimension)

| 타입 | 처리 방식 | 이력 보존 | 예시 |
|------|----------|----------|------|
| **Type 1** | 덮어쓰기 | 없음 | 단순 오류 수정 |
| **Type 2** | 새 행 추가 (START_DT, END_DT) | 완전 이력 | 고객 주소 변경 |
| **Type 3** | 이전값 컬럼 추가 | 직전값만 | 담당자 변경 |

```sql
-- SCD Type 2 예시
CREATE TABLE DIM_CUSTOMER (
    CUST_SK        NUMBER(10)  PRIMARY KEY,  -- 대리키
    CUST_BK        VARCHAR2(50) NOT NULL,    -- 비즈니스 키
    CUST_NM        VARCHAR2(100 CHAR),
    ADDR           VARCHAR2(500 CHAR),
    EFF_START_DT   DATE         NOT NULL,    -- 유효 시작일
    EFF_END_DT     DATE,                     -- NULL = 현재 최신
    CURR_YN        CHAR(1)     DEFAULT 'Y'   -- 현재 레코드 여부
);
```

---

## 6. DDD-DB 매핑

### Aggregate → 테이블 구조

| DDD 개념 | DB 매핑 |
|----------|---------|
| Aggregate Root | 메인 테이블 (PK를 가진 대표 테이블) |
| Entity (자식) | 별도 테이블 (Aggregate Root의 FK 보유) |
| Value Object | 컬럼으로 내장 또는 별도 테이블 (불변) |
| 인터-Aggregate 참조 | FK가 아닌 ID만 저장 (느슨한 결합) |

```sql
-- Order Aggregate: Order(Root) + OrderItem(Entity) + Address(Value Object)
CREATE TABLE TB_ORDER (             -- Aggregate Root
    ORD_ID          NUMBER(10)  PRIMARY KEY,
    -- Address Value Object → 컬럼 내장
    DLVR_ADDR       VARCHAR2(500 CHAR),
    DLVR_ZIP_CD     VARCHAR2(10 CHAR),
    -- 외부 Aggregate 참조: FK 아닌 ID만
    CUST_ID         NUMBER(10)  NOT NULL,   -- Customer Aggregate의 ID
    ...
);

CREATE TABLE TB_ORDER_DTL (         -- Entity
    ORD_DTL_ID  NUMBER(10)  PRIMARY KEY,
    ORD_ID      NUMBER(10)  NOT NULL,       -- Root를 FK로 참조
    PRD_ID      NUMBER(10)  NOT NULL,       -- 외부 Aggregate ID
    ...
    CONSTRAINT FK_ORDER_DTL_ORDER FOREIGN KEY (ORD_ID)
        REFERENCES TB_ORDER (ORD_ID)
);
```

### Bounded Context → 스키마

```sql
-- Bounded Context별로 Oracle Schema 분리
-- 주문 컨텍스트
CREATE USER OMS IDENTIFIED BY ...;    -- Order Management System
GRANT CONNECT, RESOURCE TO OMS;

-- 상품 컨텍스트
CREATE USER PMS IDENTIFIED BY ...;    -- Product Management System

-- 컨텍스트 간 참조: DB Link 또는 API (직접 조인 금지)
CREATE DATABASE LINK DBL_PMS CONNECT TO PMS IDENTIFIED BY ...;
```

### Domain Event → 이력/아웃박스 테이블

```sql
-- Transactional Outbox Pattern: 이벤트를 DB 트랜잭션으로 안전하게 발행
CREATE TABLE TB_DOMAIN_EVENT_OUTBOX (
    EVENT_ID        NUMBER(19)  PRIMARY KEY,
    AGGREGATE_TYPE  VARCHAR2(100 CHAR) NOT NULL,  -- 'Order'
    AGGREGATE_ID    VARCHAR2(50 CHAR)  NOT NULL,  -- ORD_ID
    EVENT_TYPE      VARCHAR2(100 CHAR) NOT NULL,  -- 'OrderPlaced'
    PAYLOAD         CLOB        NOT NULL,          -- JSON
    CREATED_DTM     TIMESTAMP   NOT NULL,
    PUBLISHED_YN    CHAR(1)     DEFAULT 'N' NOT NULL,
    PUBLISHED_DTM   TIMESTAMP
);
```
