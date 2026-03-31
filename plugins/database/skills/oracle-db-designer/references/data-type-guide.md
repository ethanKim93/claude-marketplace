# Oracle 데이터 타입 선택 가이드

## 1. 문자열 타입

### VARCHAR2 vs CHAR

| 항목 | VARCHAR2 | CHAR |
|------|----------|------|
| 저장 방식 | 가변 길이 | 고정 길이 (공백 패딩) |
| 비교 | 정확 | 공백 포함 비교 (버그 원인) |
| 권장 | **기본 선택** | 진짜 고정 길이만 (예: 성별 코드 'M'/'F') |

**핵심 규칙: VARCHAR2(n **CHAR**) 형태로 반드시 문자 의미론 사용**

```sql
-- Bad: 바이트 의미론 (한글 1자 = 3바이트 → 33자 저장 시 100바이트 필요)
CUST_NM VARCHAR2(100)         -- 기본값이 BYTE일 경우 한글 33자만 저장 가능

-- Good: 문자 의미론 (한글 포함 100자 저장 가능)
CUST_NM VARCHAR2(100 CHAR)

-- 또는 세션/시스템 레벨 설정
ALTER SYSTEM SET NLS_LENGTH_SEMANTICS = CHAR;
```

### 표준 길이 가이드

| 용도 | 권장 타입 | 예시 컬럼 |
|------|----------|----------|
| 이름 (한글) | `VARCHAR2(100 CHAR)` | CUST_NM, EMP_NM |
| 코드값 | `VARCHAR2(20 CHAR)` | STATUS_CD, TYPE_CD |
| 이메일 | `VARCHAR2(200 CHAR)` | EMAIL_ADDR |
| URL | `VARCHAR2(2000 CHAR)` | IMG_URL |
| 전화번호 | `VARCHAR2(20 CHAR)` | TEL_NO |
| 주소 | `VARCHAR2(500 CHAR)` | ADDR |
| 설명/비고 | `VARCHAR2(4000 CHAR)` | RMK_CN, DESC_CN |
| 고정 단일 코드 | `CHAR(1)` | USE_YN, DEL_YN |

---

## 2. 숫자 타입

### NUMBER(p, s) 필수 명시

```sql
-- Bad: 정밀도 없이 NUMBER만 사용 (최대 38자리 → 예측 불가)
ORDER_AMT NUMBER

-- Good: 정밀도와 스케일 명시
ORDER_AMT NUMBER(18, 2)   -- 금액: 최대 18자리, 소수점 2자리
ORD_QTY   NUMBER(10, 0)   -- 수량: 정수 10자리
TAX_RT    NUMBER(7, 4)    -- 세율: 7자리, 소수점 4자리 (예: 0.0350)
```

### 도메인별 NUMBER 권장 정밀도

| 도메인 | 타입 | 범위 예시 |
|--------|------|----------|
| 기본 PK (ID) | `NUMBER(10)` | Java int 범위 |
| 대용량 PK (ID) | `NUMBER(19)` | Java long 범위 |
| 금액 (원화) | `NUMBER(18, 2)` | 최대 999조 원 |
| 금액 (외화) | `NUMBER(18, 4)` | 소수점 4자리 환율 |
| 수량/건수 | `NUMBER(10, 0)` | 정수 |
| 비율/요율 | `NUMBER(7, 4)` | 0.0001 ~ 999.9999 |
| 점수/지수 | `NUMBER(5, 2)` | 0.00 ~ 999.99 |
| 좌표 (위경도) | `NUMBER(11, 7)` | 소수점 7자리 |
| Boolean 대용 | `NUMBER(1)` | 0 or 1 |

---

## 3. 날짜/시간 타입

### DATE vs TIMESTAMP 선택 기준

| 항목 | DATE | TIMESTAMP | TIMESTAMP WITH TIME ZONE |
|------|------|-----------|--------------------------|
| 정밀도 | 초 단위 | 분수 초 (최대 9자리) | 분수 초 + 타임존 오프셋 |
| 저장 크기 | 7 bytes | 11 bytes | 13 bytes |
| 타임존 지원 | 없음 | 없음 | 있음 |
| 권장 용도 | 일반 업무 날짜/시간 | 고정밀 로그, 이벤트 | 다국가 서비스 |

```sql
-- 일반 업무 날짜: DATE
ORD_DT     DATE            -- 주문일 (2024-01-15)
REG_DT     DATE            -- 등록일시 (DATE도 시분초 포함)

-- 고정밀 이벤트: TIMESTAMP
LOG_DTM    TIMESTAMP(6)    -- 마이크로초 정밀도 로그

-- 글로벌 서비스: TIMESTAMP WITH TIME ZONE
EVENT_DTM  TIMESTAMP(3) WITH TIME ZONE
```

**Oracle DATE 주의사항**: Oracle의 DATE는 연/월/일/시/분/초를 모두 포함. `TRUNC(ORD_DT)` 없이 날짜만 비교하면 시간까지 비교됨.

```sql
-- Bad: 시간이 포함된 날짜 조회 실패 가능성
WHERE ORD_DT = TO_DATE('2024-01-15', 'YYYY-MM-DD')

-- Good: TRUNC로 시간 제거 후 비교
WHERE TRUNC(ORD_DT) = DATE '2024-01-15'
-- 또는 범위 조건
WHERE ORD_DT >= DATE '2024-01-15' AND ORD_DT < DATE '2024-01-16'
```

---

## 4. Boolean 처리 (Oracle 21c 이전)

Oracle 23ai부터 `BOOLEAN` 컬럼 타입이 지원되지만, 하위 버전 호환을 위해 다음 방식 사용:

```sql
-- 권장: CHAR(1) + CHECK 제약
USE_YN  CHAR(1) DEFAULT 'Y' NOT NULL
    CONSTRAINT CK_TB_CUSTOMER_USE_YN CHECK (USE_YN IN ('Y', 'N'))

DEL_YN  CHAR(1) DEFAULT 'N' NOT NULL
    CONSTRAINT CK_TB_CUSTOMER_DEL_YN CHECK (DEL_YN IN ('Y', 'N'))
```

---

## 5. LOB 타입

| 타입 | 용도 | 최대 크기 | 트랜잭션 |
|------|------|----------|----------|
| `CLOB` | 대용량 텍스트 (HTML, XML, JSON) | 4GB | 지원 |
| `BLOB` | 이진 데이터 (이미지, PDF, 파일) | 4GB | 지원 |
| `NCLOB` | 유니코드 대용량 텍스트 | 4GB | 지원 |
| `BFILE` | OS 파일 참조 (DB 외부 저장) | OS 제한 | 미지원 |

```sql
-- CLOB: 별도 LOB 테이블스페이스 지정 권장
PRD_DESC_CN  CLOB
    LOB (PRD_DESC_CN) STORE AS SECUREFILE (
        TABLESPACE TS_OMS_LOB
        ENABLE STORAGE IN ROW    -- 4KB 이하는 인라인 저장
        COMPRESS LOW
    )
```

**주의**: CLOB 컬럼은 WHERE절에서 `=` 비교 불가. `DBMS_LOB.COMPARE()` 또는 전문 검색 인덱스 사용.

---

## 6. JSON 타입 (Oracle 21c+)

```sql
-- Oracle 21c 이상: JSON 네이티브 타입
ORDER_META   JSON

-- Oracle 12c ~ 19c: VARCHAR2 또는 CLOB + CHECK 제약
ORDER_META   CLOB
    CONSTRAINT CK_ORDER_META_JSON CHECK (ORDER_META IS JSON)
```

---

## 7. 공통 함정 및 주의사항

| 함정 | 설명 | 해결 방법 |
|------|------|----------|
| 암묵적 형변환 | `WHERE CUST_ID = '123'` (CUST_ID가 NUMBER) → 인덱스 미사용 | 타입 맞춤: `WHERE CUST_ID = 123` |
| DATE 산술 | `ORD_DT + 1` = 1일 후 (정수 = 일 단위) | `ORD_DT + INTERVAL '1' HOUR` 명시적 사용 |
| CHAR 공백 | `CHAR(10)` 컬럼에 'A' 저장 시 'A         ' → 비교 오류 | VARCHAR2 사용 |
| NUMBER 기본형 | `NUMBER` 단독 사용 시 38자리 → 예측 불가 | 반드시 `NUMBER(p,s)` 명시 |
| NULL 비교 | `WHERE col = NULL` → 항상 FALSE | `WHERE col IS NULL` 사용 |
| CLOB 정렬 | `ORDER BY clob_col` 불가 | 인덱스 또는 `SUBSTR` 활용 |
