# Oracle DB 네이밍 컨벤션 가이드

## 1. 일반 규칙

| 규칙 | 내용 |
|------|------|
| 대소문자 | **UPPER_CASE** + 언더스코어 구분 (Oracle 기본 대소문자 무시) |
| 최대 길이 | **30자** (Oracle 12.1 이하), 128자 (12.2+ 확장 식별자, 비권장) — 안전하게 30자 준수 |
| 구분자 | 언더스코어(`_`) 사용, 하이픈/공백 금지 |
| 예약어 | Oracle 예약어(DATE, LEVEL, NUMBER 등) 단독 사용 금지 |
| 약어 규칙 | 표준 용어 사전(`standard-dictionary.md`) 기준 약어 사용 |

---

## 2. 오브젝트별 접두사/접미사

### 테이블 (Table)

| 종류 | 접두사 | 접미사 | 예시 |
|------|--------|--------|------|
| 일반 테이블 | `TB_` | — | `TB_CUSTOMER` |
| 마스터 테이블 | `TB_` | `_MST` | `TB_PRODUCT_MST` |
| 상세/트랜잭션 | `TB_` | `_DTL` | `TB_ORDER_DTL` |
| 이력 테이블 | `TB_` | `_HST` | `TB_PRICE_HST` |
| 로그 테이블 | `TB_` | `_LOG` | `TB_ACCESS_LOG` |
| 코드/공통코드 | `TB_` | `_CD` | `TB_COMM_CD` |
| 매핑 테이블 | `TB_` | `_MAP` | `TB_PRODUCT_CATEGORY_MAP` |
| 임시 테이블 | `TB_` | `_TMP` | `TB_BATCH_TMP` |
| 통계 테이블 | `TB_` | `_STAT` | `TB_DAILY_SALES_STAT` |
| 관계 테이블 | `TB_` | `_REL` | `TB_USER_ROLE_REL` |

### 뷰 (View)

| 종류 | 접두사 | 예시 |
|------|--------|------|
| 일반 뷰 | `VW_` | `VW_CUSTOMER_ORDER` |
| Materialized View | `MV_` | `MV_DAILY_SALES` |

### 인덱스 (Index)

| 종류 | 접두사 | 예시 |
|------|--------|------|
| 일반 B-tree 인덱스 | `IX_` | `IX_ORDER_ORD_DT` |
| 유니크 인덱스 | `UIX_` | `UIX_CUSTOMER_EMAIL` |
| Bitmap 인덱스 | `BIX_` | `BIX_ORDER_STATUS_CD` |
| 함수 기반 인덱스 | `FIX_` | `FIX_CUSTOMER_UPPER_NM` |

**인덱스 네이밍 형식**: `{접두사}_{테이블약어}_{컬럼약어1}[_{컬럼약어2}...]`

```
-- 단일 컬럼
IX_TB_ORDER_ORD_DT

-- 복합 컬럼 (최대 3개 컬럼명 표기)
IX_TB_ORDER_CUST_ID_ORD_DT
```

### 시퀀스 (Sequence)

| 형식 | 예시 |
|------|------|
| `SQ_{테이블약어}` | `SQ_CUSTOMER`, `SQ_ORDER` |

### 트리거 (Trigger)

| 형식 | 타이밍+이벤트 코드 | 예시 |
|------|------------------|------|
| `TRG_{테이블약어}_{타이밍이벤트}` | BIR(Before Insert Row), AIR(After Insert Row), BUR(Before Update Row), BDR(Before Delete Row) | `TRG_ORDER_BIR` |

### 동의어 (Synonym)

| 형식 | 예시 |
|------|------|
| `SYN_{원본오브젝트명}` | `SYN_TB_CUSTOMER` |

### DB 링크 (Database Link)

| 형식 | 예시 |
|------|------|
| `DBL_{대상시스템약어}` | `DBL_LEGACY_ERP`, `DBL_DW` |

---

## 3. 제약조건 네이밍

| 제약 유형 | 형식 | 예시 |
|----------|------|------|
| Primary Key | `PK_{테이블약어}` | `PK_ORDER` |
| Foreign Key | `FK_{자식테이블약어}_{부모테이블약어}` | `FK_ORDER_DTL_ORDER` |
| Unique Key | `UK_{테이블약어}_{컬럼약어}` | `UK_CUSTOMER_EMAIL` |
| Check | `CK_{테이블약어}_{컬럼약어}` | `CK_ORDER_STATUS_CD` |
| Not Null | `NN_{테이블약어}_{컬럼약어}` | `NN_ORDER_CUST_ID` (선택적) |

> **주의**: Oracle이 자동 생성하는 `SYS_C00XXXXXX` 형태를 피하기 위해 **반드시 명시적으로 이름 부여**.

---

## 4. PL/SQL 오브젝트 네이밍

### 패키지 / 패키지 바디

| 형식 | 예시 |
|------|------|
| `PKG_{도메인약어}[_{기능영역}]` | `PKG_ORDER_MGMT`, `PKG_CUSTOMER` |

### 프로시저

| 형식 | 예시 |
|------|------|
| `PRC_{동사}_{대상}` | `PRC_CREATE_ORDER`, `PRC_CANCEL_ORDER` |

### 함수

| 형식 | 예시 |
|------|------|
| `FN_{동사}_{대상}` | `FN_GET_CUSTOMER_NM`, `FN_CALC_ORDER_AMT` |

### 파라미터 접두사

| 방향 | 접두사 | 예시 |
|------|--------|------|
| IN | `p_` | `p_customer_id`, `p_order_dt` |
| OUT | `x_` | `x_order_id`, `x_error_msg` |
| IN OUT | `px_` | `px_order_status` |

### PL/SQL 내부 선언 접두사

| 구분 | 접두사 | 예시 |
|------|--------|------|
| 로컬 변수 | `v_` | `v_total_amt` |
| 상수 | `C_` | `C_DEFAULT_STATUS` |
| Record 타입 | `T_` | `T_ORDER_REC` |
| Table/Array 타입 | `TT_` | `TT_ORDER_LIST` |
| 커서 | `CUR_` | `CUR_ORDER` |
| 예외 | `E_` | `E_ORDER_NOT_FOUND` |

---

## 5. 테이블스페이스 / 스키마 네이밍

| 형식 | 예시 |
|------|------|
| 데이터 테이블스페이스 | `TS_{시스템약어}_DATA` | `TS_OMS_DATA` |
| 인덱스 테이블스페이스 | `TS_{시스템약어}_INDEX` | `TS_OMS_INDEX` |
| LOB 테이블스페이스 | `TS_{시스템약어}_LOB` | `TS_OMS_LOB` |
| 임시 테이블스페이스 | `TS_TEMP` | — |
| 아카이브 테이블스페이스 | `TS_{시스템약어}_ARCH` | `TS_OMS_ARCH` |
| 스키마(사용자) | `{시스템약어}` 또는 `{시스템약어}_{환경}` | `OMS`, `OMS_DEV`, `OMS_PRD` |

---

## 6. Good vs Bad 예시

### 테이블/컬럼

| 구분 | Bad ❌ | Good ✅ | 이유 |
|------|--------|---------|------|
| 테이블명 | `orders` | `TB_ORDER` | 소문자, 접두사 누락 |
| 테이블명 | `customer_information` | `TB_CUSTOMER_MST` | 접미사 없음, 불필요한 information |
| 컬럼명 | `customerName` | `CUST_NM` | camelCase, 표준 약어 미사용 |
| 컬럼명 | `date` | `ORD_DT` | Oracle 예약어, 도메인 접두사 없음 |
| 컬럼명 | `flag` | `USE_YN` | 의미 불명확, _YN 접미사 미사용 |

### 제약조건/인덱스

| 구분 | Bad ❌ | Good ✅ | 이유 |
|------|--------|---------|------|
| PK | (미명명) `SYS_C001234` | `PK_ORDER` | 자동생성명 → 유지보수 불가 |
| FK | `FK1` | `FK_ORDER_DTL_ORDER` | 의미 없는 이름 |
| Index | `IDX1` | `IX_TB_ORDER_ORD_DT` | 추적 불가 |

### PL/SQL

| 구분 | Bad ❌ | Good ✅ | 이유 |
|------|--------|---------|------|
| 프로시저 | `process_order` | `PRC_PROCESS_ORDER` | 접두사 없음, 소문자 |
| 파라미터 | `order_id IN NUMBER` | `p_order_id IN NUMBER` | 방향 접두사 없음 |
| 패키지 | `order` | `PKG_ORDER_MGMT` | 예약어 위험, 기능 불명확 |
