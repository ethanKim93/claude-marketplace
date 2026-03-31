# 표준 용어 사전 (Standard Word Dictionary)

## 1. 개념

표준 용어 사전은 데이터베이스 내 모든 테이블/컬럼명의 **기준이 되는 공식 어휘집**이다.
한국 엔터프라이즈 환경에서 팀/시스템 간 일관된 네이밍을 보장하고, 신규 컬럼 추가 시 자의적 약어 생성을 방지한다.

**운영 원칙**:
- 모든 컬럼명은 사전에 등록된 단어의 조합으로만 구성
- 신규 용어 추가 시 DA(데이터 아키텍트) 승인 필요
- 복합 컬럼명: `{도메인약어}_{속성약어}` 형식 (예: `CUST_NM` = 고객 + 이름)

---

## 2. 사전 구조 템플릿

프로젝트별 용어 사전은 아래 형식으로 관리한다:

| 표준용어(한글) | 영문 전체명 | 영문 약어 | 데이터 타입 | 길이 | 설명 |
|--------------|-----------|---------|------------|------|------|
| 고객 | Customer | CUST | — | — | 서비스 이용 고객 |
| 고객명 | Customer Name | CUST_NM | VARCHAR2 CHAR | 100 | 고객의 성명 |
| 주문번호 | Order Number | ORD_NO | VARCHAR2 CHAR | 20 | 시스템 생성 주문 식별번호 |

---

## 3. 공통 표준 약어 목록

### 3.1 식별자 (Identifier)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 일련번호/순번 | SEQ | NUMBER(10) | 자동증가 PK |
| 식별번호 | ID | NUMBER(10) or NUMBER(19) | 대용량 시 19 |
| 번호 | NO | VARCHAR2(20 CHAR) | 업무 번호 (주문번호 등) |
| 코드 | CD | VARCHAR2(20 CHAR) | 분류 코드 |
| 키 | KEY | VARCHAR2(100 CHAR) | 외부 시스템 키 |

### 3.2 인적/조직 (Person & Organization)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 고객 | CUST | — | 도메인 접두사 |
| 직원/사원 | EMP | — | 도메인 접두사 |
| 사용자 | USER | — | 도메인 접두사 |
| 부서 | DEPT | — | 도메인 접두사 |
| 조직 | ORG | — | 도메인 접두사 |
| 이름/명칭 | NM | VARCHAR2(100 CHAR) | 사람/사물 이름 |
| 성명 | FULL_NM | VARCHAR2(200 CHAR) | 성+이름 |
| 성 | LAST_NM | VARCHAR2(100 CHAR) | |
| 이름 | FIRST_NM | VARCHAR2(100 CHAR) | |
| 이메일 | EMAIL | VARCHAR2(200 CHAR) | |
| 전화번호 | TEL_NO | VARCHAR2(20 CHAR) | |
| 팩스번호 | FAX_NO | VARCHAR2(20 CHAR) | |
| 휴대폰번호 | MOBILE_NO | VARCHAR2(20 CHAR) | |
| 성별 | GENDER_CD | CHAR(1) | M/F |
| 생년월일 | BIRTH_DT | DATE | |

### 3.3 주소 (Address)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 주소 | ADDR | VARCHAR2(500 CHAR) | 전체 주소 |
| 도로명 주소 | ROAD_ADDR | VARCHAR2(500 CHAR) | |
| 우편번호 | ZIP_CD | VARCHAR2(10 CHAR) | |
| 시/도 | SIDO_NM | VARCHAR2(50 CHAR) | |
| 시/군/구 | SIGUNGU_NM | VARCHAR2(50 CHAR) | |
| 상세주소 | ADDR_DTL | VARCHAR2(200 CHAR) | |
| 국가코드 | COUNTRY_CD | CHAR(2) | ISO 3166-1 alpha-2 |

### 3.4 상품/서비스 (Product & Service)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 상품 | PRD or PROD | — | 도메인 접두사 |
| 상품명 | PRD_NM | VARCHAR2(200 CHAR) | |
| 상품코드 | PRD_CD | VARCHAR2(30 CHAR) | |
| 카테고리 | CATEG | — | 도메인 접두사 |
| 브랜드 | BRAND | — | 도메인 접두사 |
| 모델 | MODEL | — | 도메인 접두사 |
| 규격 | SPEC | VARCHAR2(500 CHAR) | |
| 설명 | DESC_CN | VARCHAR2(4000 CHAR) | 상세 설명 |

### 3.5 주문/거래 (Order & Transaction)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 주문 | ORD | — | 도메인 접두사 |
| 주문번호 | ORD_NO | VARCHAR2(20 CHAR) | |
| 주문일 | ORD_DT | DATE | |
| 결제 | PAY | — | 도메인 접두사 |
| 배송 | DLVR | — | 도메인 접두사 |
| 반품 | RTN | — | 도메인 접두사 |
| 취소 | CNCL | — | 도메인 접두사 |

### 3.6 금융/수치 (Finance & Numeric)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 금액 | AMT | NUMBER(18, 2) | 원화 기준 |
| 가격 | PRC | NUMBER(18, 2) | |
| 수량 | QTY | NUMBER(10, 0) | |
| 건수/횟수 | CNT | NUMBER(10, 0) | |
| 비율/요율 | RT | NUMBER(7, 4) | 0.0001 단위 |
| 세금 | TAX | NUMBER(18, 2) | |
| 할인 | DISC | NUMBER(18, 2) | |
| 포인트 | POINT | NUMBER(15, 0) | |
| 잔액 | BAL | NUMBER(18, 2) | |
| 합계 | TOTAL | NUMBER(18, 2) | |
| 소계 | SUB_TOTAL | NUMBER(18, 2) | |
| 환율 | EXCH_RT | NUMBER(12, 6) | |
| 통화코드 | CURR_CD | CHAR(3) | ISO 4217 |

### 3.7 날짜/시간 (Date & Time)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 일자/날짜 | DT | DATE | 연월일 + 시분초 |
| 일시 | DTM | TIMESTAMP(6) | 분수 초 포함 |
| 년도 | YR | NUMBER(4) | |
| 월 | MM | NUMBER(2) | |
| 일 | DD | NUMBER(2) | |
| 시간 | HH | NUMBER(2) | |
| 분 | MI | NUMBER(2) | |
| 초 | SS | NUMBER(2) | |
| 시작일 | START_DT | DATE | |
| 종료일 | END_DT | DATE | |
| 만료일 | EXPIRE_DT | DATE | |
| 기간 | PERIOD | NUMBER(5) | 일 단위 |

### 3.8 상태/구분 (Status & Classification)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 상태 | ST or STATUS | VARCHAR2(20 CHAR) | |
| 상태코드 | STATUS_CD | VARCHAR2(20 CHAR) | 코드 테이블 참조 |
| 유형/타입 | TP or TYPE | VARCHAR2(20 CHAR) | |
| 구분코드 | DIV_CD | VARCHAR2(20 CHAR) | |
| 분류 | CLASS | VARCHAR2(20 CHAR) | |
| 여부 | YN | CHAR(1) | Y/N |
| 사용여부 | USE_YN | CHAR(1) | Y/N DEFAULT 'Y' |
| 삭제여부 | DEL_YN | CHAR(1) | Y/N DEFAULT 'N' |
| 활성여부 | ACTIVE_YN | CHAR(1) | Y/N DEFAULT 'Y' |
| 플래그 | FLG | CHAR(1) | Y/N |
| 순서/정렬 | SORT_SEQ | NUMBER(5) | 정렬 순번 |

### 3.9 문서/내용 (Document & Content)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 제목 | TTL | VARCHAR2(500 CHAR) | |
| 내용 | CN | CLOB | 대용량 텍스트 |
| 설명 | DESC_CN | VARCHAR2(4000 CHAR) | 짧은 설명 |
| 비고 | RMK | VARCHAR2(4000 CHAR) | |
| 메모 | MEMO | VARCHAR2(4000 CHAR) | |
| 파일명 | FILE_NM | VARCHAR2(500 CHAR) | |
| 파일경로 | FILE_PATH | VARCHAR2(2000 CHAR) | |
| 파일크기 | FILE_SIZE | NUMBER(15) | 바이트 |
| 첨부파일수 | ATCH_FILE_CNT | NUMBER(5) | |
| URL | URL | VARCHAR2(2000 CHAR) | |
| 이미지 | IMG | — | 도메인 접두사 |

### 3.10 시스템/감사 (System & Audit)

| 한글 | 약어 | 타입 | 비고 |
|------|------|------|------|
| 등록자 ID | REGR_ID | VARCHAR2(50 CHAR) | 공통 감사 컬럼 |
| 등록일시 | REG_DT | DATE | 공통 감사 컬럼 |
| 수정자 ID | MODR_ID | VARCHAR2(50 CHAR) | 공통 감사 컬럼 |
| 수정일시 | MOD_DT | DATE | 공통 감사 컬럼 |
| 버전 | VER | NUMBER(5) | Optimistic Lock |
| IP주소 | IP_ADDR | VARCHAR2(50 CHAR) | |
| 세션ID | SESSION_ID | VARCHAR2(100 CHAR) | |

---

## 4. 공통 감사 컬럼 (모든 테이블 필수)

```sql
REGR_ID   VARCHAR2(50 CHAR)  NOT NULL,  -- 등록자 ID
REG_DT    DATE               NOT NULL,  -- 등록일시 (SYSDATE 기본값 가능)
MODR_ID   VARCHAR2(50 CHAR)  NOT NULL,  -- 수정자 ID
MOD_DT    DATE               NOT NULL   -- 수정일시
```

---

## 5. 복합 용어 조합 규칙

컬럼명 = `{도메인약어}_{속성약어}` 형식으로 표준 단어를 조합한다.

| 한글 의미 | 도메인 | 속성 | 결과 컬럼명 |
|----------|--------|------|-----------|
| 주문 금액 | ORD | AMT | `ORD_AMT` |
| 고객 이름 | CUST | NM | `CUST_NM` |
| 상품 가격 | PRD | PRC | `PRD_PRC` |
| 등록 일시 | REG | DT | `REG_DT` |
| 사용 여부 | USE | YN | `USE_YN` |
| 주문 수량 | ORD | QTY | `ORD_QTY` |
| 배송지 주소 | DLVR | ADDR | `DLVR_ADDR` |
| 결제 상태 코드 | PAY | STATUS_CD | `PAY_STATUS_CD` |

---

## 6. 테이블 접미사 가이드

| 접미사 | 의미 | 특징 | 예시 |
|--------|------|------|------|
| `_MST` | 마스터 | 변경이 드문 기준/참조 데이터 | `TB_PRODUCT_MST` |
| `_DTL` | 상세 | 마스터의 하위 상세 데이터 | `TB_ORDER_DTL` |
| `_HST` | 이력 | 변경 이력 추적 (풀 스냅샷 또는 변경분) | `TB_PRICE_HST` |
| `_LOG` | 로그 | 이벤트/액세스 로그 (INSERT ONLY) | `TB_LOGIN_LOG` |
| `_MAP` | 매핑 | M:N 관계 연결 테이블 | `TB_USER_ROLE_MAP` |
| `_REL` | 관계 | 관계성 데이터 | `TB_DEPT_MEMBER_REL` |
| `_CD` | 코드 | 공통코드/분류코드 | `TB_COMM_CD` |
| `_TMP` | 임시 | 배치/중간 처리용 임시 테이블 | `TB_MIGRATION_TMP` |
| `_STAT` | 통계 | 집계/통계 데이터 (주로 배치 생성) | `TB_DAILY_SALES_STAT` |
| `_CONF` | 설정 | 시스템 설정/환경값 | `TB_SYSTEM_CONF` |
