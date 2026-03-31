# DDL 생성 템플릿

## DDL 실행 순서

올바른 DDL 실행 순서를 반드시 준수한다:

```
1. 테이블스페이스 생성 (DBA 권한 필요 시)
2. 사용자/스키마 생성
3. 권한 부여 (GRANT)
4. 시퀀스 생성 (CREATE SEQUENCE)
5. 테이블 생성 (CREATE TABLE) — 부모 테이블 먼저
6. Primary Key 제약
7. Unique Key 제약
8. Check 제약
9. Foreign Key 제약 (모든 테이블 생성 후)
10. 인덱스 생성 (CREATE INDEX)
11. 뷰 생성 (CREATE VIEW)
12. Materialized View 생성
13. 동의어 생성 (CREATE SYNONYM)
14. 트리거 생성 (CREATE OR REPLACE TRIGGER)
15. 패키지/프로시저/함수 생성
16. 데이터 초기값 INSERT (공통코드 등)
```

---

## 1. CREATE TABLE 템플릿

```sql
-- ===========================================================
-- 테이블: TB_{테이블명}
-- 설명  : {테이블 설명}
-- 생성일: {생성일}
-- 작성자: {작성자}
-- ===========================================================
CREATE TABLE TB_{테이블명} (
    -- PK
    {PK컬럼}       NUMBER(10)              NOT NULL,

    -- 업무 컬럼
    {컬럼명}       VARCHAR2(100 CHAR)      NOT NULL,
    {컬럼명}       NUMBER(18, 2)           DEFAULT 0 NOT NULL,
    {컬럼명}       DATE,
    {컬럼명}       CHAR(1)                 DEFAULT 'Y' NOT NULL
        CONSTRAINT CK_TB_{테이블}_USE_YN CHECK ({컬럼명} IN ('Y', 'N')),

    -- 공통 감사 컬럼
    REGR_ID        VARCHAR2(50 CHAR)       NOT NULL,
    REG_DT         DATE                    DEFAULT SYSDATE NOT NULL,
    MODR_ID        VARCHAR2(50 CHAR)       NOT NULL,
    MOD_DT         DATE                    DEFAULT SYSDATE NOT NULL,

    -- 제약조건
    CONSTRAINT PK_{테이블명} PRIMARY KEY ({PK컬럼})
        USING INDEX TABLESPACE TS_{시스템}_INDEX
)
TABLESPACE TS_{시스템}_DATA
;

-- 테이블 코멘트
COMMENT ON TABLE TB_{테이블명} IS '{테이블 한글 설명}';

-- 컬럼 코멘트 (모든 컬럼)
COMMENT ON COLUMN TB_{테이블명}.{PK컬럼}   IS '{PK컬럼} 시퀀스 번호';
COMMENT ON COLUMN TB_{테이블명}.{컬럼명}   IS '{컬럼 한글 설명}';
COMMENT ON COLUMN TB_{테이블명}.REGR_ID    IS '등록자 ID';
COMMENT ON COLUMN TB_{테이블명}.REG_DT     IS '등록일시';
COMMENT ON COLUMN TB_{테이블명}.MODR_ID    IS '수정자 ID';
COMMENT ON COLUMN TB_{테이블명}.MOD_DT     IS '수정일시';
```

---

## 2. 파티션 테이블 템플릿

### Range Partitioning (날짜 기반, 가장 일반적)

```sql
CREATE TABLE TB_ORDER (
    ORD_ID      NUMBER(10)       NOT NULL,
    ORD_DT      DATE             NOT NULL,    -- 파티션 키
    CUST_ID     NUMBER(10)       NOT NULL,
    ORD_AMT     NUMBER(18, 2)    DEFAULT 0 NOT NULL,
    STATUS_CD   VARCHAR2(20 CHAR) NOT NULL,
    -- 감사 컬럼
    REGR_ID     VARCHAR2(50 CHAR) NOT NULL,
    REG_DT      DATE             DEFAULT SYSDATE NOT NULL,
    MODR_ID     VARCHAR2(50 CHAR) NOT NULL,
    MOD_DT      DATE             DEFAULT SYSDATE NOT NULL,
    CONSTRAINT PK_ORDER PRIMARY KEY (ORD_ID, ORD_DT)  -- 파티션 키 포함
        USING INDEX LOCAL                              -- LOCAL 인덱스
)
TABLESPACE TS_OMS_DATA
PARTITION BY RANGE (ORD_DT)
INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'))               -- 월별 자동 파티션 생성
(
    PARTITION P_INIT VALUES LESS THAN (DATE '2024-01-01')
)
;
```

### List Partitioning (범주 기반)

```sql
CREATE TABLE TB_ORDER (
    ORD_ID      NUMBER(10)       NOT NULL,
    REGION_CD   VARCHAR2(10 CHAR) NOT NULL,   -- 파티션 키
    ...
)
PARTITION BY LIST (REGION_CD)
(
    PARTITION P_SEOUL   VALUES ('SEOUL'),
    PARTITION P_BUSAN   VALUES ('BUSAN'),
    PARTITION P_INCHEON VALUES ('INCHEON'),
    PARTITION P_ETC     VALUES (DEFAULT)       -- 나머지 값
)
;
```

### Hash Partitioning (균등 분산)

```sql
CREATE TABLE TB_CUSTOMER (
    CUST_ID     NUMBER(10)       NOT NULL,    -- 파티션 키
    CUST_NM     VARCHAR2(100 CHAR) NOT NULL,
    ...
)
PARTITION BY HASH (CUST_ID)
PARTITIONS 8                                  -- 2의 거듭제곱 권장
STORE IN (TS_OMS_DATA)
;
```

### Composite Partitioning (Range-List)

```sql
CREATE TABLE TB_SALES (
    SALE_ID     NUMBER(10)       NOT NULL,
    SALE_DT     DATE             NOT NULL,    -- Range 파티션 키
    REGION_CD   VARCHAR2(10 CHAR) NOT NULL,   -- List 서브파티션 키
    SALE_AMT    NUMBER(18, 2),
    ...
    CONSTRAINT PK_SALES PRIMARY KEY (SALE_ID, SALE_DT)
)
PARTITION BY RANGE (SALE_DT)
INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'))
SUBPARTITION BY LIST (REGION_CD)
SUBPARTITION TEMPLATE (
    SUBPARTITION SP_SEOUL   VALUES ('SEOUL'),
    SUBPARTITION SP_BUSAN   VALUES ('BUSAN'),
    SUBPARTITION SP_ETC     VALUES (DEFAULT)
)
(
    PARTITION P_INIT VALUES LESS THAN (DATE '2024-01-01')
)
;
```

### Reference Partitioning (자식 테이블)

```sql
-- 부모(TB_ORDER)가 Range 파티션일 때 자식도 동일 파티션 구조
CREATE TABLE TB_ORDER_DTL (
    ORD_DTL_ID  NUMBER(10)       NOT NULL,
    ORD_ID      NUMBER(10)       NOT NULL,
    ORD_DT      DATE             NOT NULL,    -- 부모 파티션 키 포함 (FK 참조용)
    PRD_ID      NUMBER(10)       NOT NULL,
    ORD_QTY     NUMBER(10)       NOT NULL,
    CONSTRAINT PK_ORDER_DTL PRIMARY KEY (ORD_DTL_ID, ORD_DT)
        USING INDEX LOCAL,
    CONSTRAINT FK_ORDER_DTL_ORDER FOREIGN KEY (ORD_ID, ORD_DT)
        REFERENCES TB_ORDER (ORD_ID, ORD_DT)
)
PARTITION BY REFERENCE (FK_ORDER_DTL_ORDER)  -- 부모 파티션 자동 상속
;
```

---

## 3. 제약조건 템플릿

```sql
-- Primary Key (테이블 생성 시 또는 ALTER로 추가)
ALTER TABLE TB_ORDER
    ADD CONSTRAINT PK_ORDER PRIMARY KEY (ORD_ID)
    USING INDEX TABLESPACE TS_OMS_INDEX;

-- Unique Key
ALTER TABLE TB_CUSTOMER
    ADD CONSTRAINT UK_CUSTOMER_EMAIL UNIQUE (EMAIL)
    USING INDEX TABLESPACE TS_OMS_INDEX;

-- Foreign Key
ALTER TABLE TB_ORDER_DTL
    ADD CONSTRAINT FK_ORDER_DTL_ORDER
    FOREIGN KEY (ORD_ID) REFERENCES TB_ORDER (ORD_ID)
    ON DELETE CASCADE;                  -- 또는 ON DELETE SET NULL, 기본은 RESTRICT

-- Check Constraint
ALTER TABLE TB_ORDER
    ADD CONSTRAINT CK_ORDER_STATUS_CD
    CHECK (STATUS_CD IN ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'));
```

---

## 4. 인덱스 템플릿

```sql
-- B-tree 인덱스 (기본)
CREATE INDEX IX_TB_ORDER_CUST_ID
    ON TB_ORDER (CUST_ID)
    TABLESPACE TS_OMS_INDEX;

-- 복합 인덱스 (선택도 높은 컬럼 먼저)
CREATE INDEX IX_TB_ORDER_CUST_ID_ORD_DT
    ON TB_ORDER (CUST_ID, ORD_DT)
    TABLESPACE TS_OMS_INDEX;

-- 파티션 테이블 LOCAL 인덱스
CREATE INDEX IX_TB_ORDER_CUST_ID
    ON TB_ORDER (CUST_ID) LOCAL
    TABLESPACE TS_OMS_INDEX;

-- Bitmap 인덱스 (DW/저카디널리티, OLTP 금지)
CREATE BITMAP INDEX BIX_TB_ORDER_STATUS_CD
    ON TB_ORDER (STATUS_CD)
    TABLESPACE TS_OMS_INDEX;

-- 함수 기반 인덱스
CREATE INDEX FIX_TB_CUSTOMER_UPPER_NM
    ON TB_CUSTOMER (UPPER(CUST_NM))
    TABLESPACE TS_OMS_INDEX;

-- Invisible 인덱스 (테스트 후 활성화)
CREATE INDEX IX_TB_ORDER_TEST
    ON TB_ORDER (ORD_DT) INVISIBLE
    TABLESPACE TS_OMS_INDEX;
-- 테스트: ALTER SESSION SET OPTIMIZER_USE_INVISIBLE_INDEXES = TRUE;
-- 활성화: ALTER INDEX IX_TB_ORDER_TEST VISIBLE;
```

---

## 5. 시퀀스 템플릿

```sql
-- 기본 시퀀스
CREATE SEQUENCE SQ_ORDER
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9999999999   -- NUMBER(10) 범위
    NOCYCLE               -- 최대값 초과 시 오류 (데이터 무결성)
    CACHE 1000            -- 성능: RAC 환경에서는 ORDER 추가 검토
    NOORDER;              -- RAC에서 순서 보장이 필요하면 ORDER

-- 사용 예시
INSERT INTO TB_ORDER (ORD_ID, ...) VALUES (SQ_ORDER.NEXTVAL, ...);

-- Identity Column (Oracle 12c+, 단일 테이블 전용)
CREATE TABLE TB_LOG (
    LOG_ID  NUMBER(19) GENERATED ALWAYS AS IDENTITY,
    ...
);
```

---

## 6. 뷰 / Materialized View 템플릿

```sql
-- 일반 뷰
CREATE OR REPLACE VIEW VW_CUSTOMER_ORDER AS
SELECT
    c.CUST_ID,
    c.CUST_NM,
    o.ORD_ID,
    o.ORD_DT,
    o.ORD_AMT
FROM
    TB_CUSTOMER c
    JOIN TB_ORDER o ON c.CUST_ID = o.CUST_ID
WHERE
    c.USE_YN = 'Y'
;
COMMENT ON TABLE VW_CUSTOMER_ORDER IS '고객-주문 통합 뷰';

-- Materialized View (배치 갱신)
CREATE MATERIALIZED VIEW MV_DAILY_SALES
BUILD IMMEDIATE
REFRESH COMPLETE ON DEMAND           -- 수동 갱신: DBMS_MVIEW.REFRESH
-- 또는 REFRESH FAST ON COMMIT       -- 트랜잭션마다 증분 갱신
ENABLE QUERY REWRITE                 -- 옵티마이저 쿼리 리라이트
AS
SELECT
    TRUNC(ORD_DT, 'MM')  AS SALE_MM,
    COUNT(*)             AS ORD_CNT,
    SUM(ORD_AMT)         AS SALE_AMT
FROM TB_ORDER
WHERE STATUS_CD = 'DELIVERED'
GROUP BY TRUNC(ORD_DT, 'MM')
;
```

---

## 7. 동의어 / GRANT 템플릿

```sql
-- 동의어 (다른 스키마 객체 접근 단순화)
CREATE SYNONYM SYN_TB_PRODUCT FOR PMS.TB_PRODUCT_MST;

-- 권한 부여
GRANT SELECT ON TB_CUSTOMER TO REPORTING_USER;
GRANT SELECT, INSERT, UPDATE ON TB_ORDER TO APP_USER;
GRANT EXECUTE ON PKG_ORDER_MGMT TO APP_USER;
```

---

## 8. 롤백 스크립트 템플릿

```sql
-- 롤백 스크립트 (DDL의 역순으로 실행)
-- !! 주의: 실행 전 데이터 백업 확인 !!

-- 트리거 삭제
DROP TRIGGER TRG_ORDER_BIR;

-- 패키지 삭제
DROP PACKAGE PKG_ORDER_MGMT;

-- 뷰 삭제
DROP VIEW VW_CUSTOMER_ORDER;
DROP MATERIALIZED VIEW MV_DAILY_SALES;

-- 동의어 삭제
DROP SYNONYM SYN_TB_PRODUCT;

-- 인덱스 삭제
DROP INDEX IX_TB_ORDER_CUST_ID;

-- 테이블 삭제 (자식 → 부모 순서)
DROP TABLE TB_ORDER_DTL CASCADE CONSTRAINTS PURGE;
DROP TABLE TB_ORDER CASCADE CONSTRAINTS PURGE;
DROP TABLE TB_CUSTOMER CASCADE CONSTRAINTS PURGE;

-- 시퀀스 삭제
DROP SEQUENCE SQ_ORDER;
DROP SEQUENCE SQ_CUSTOMER;
```
