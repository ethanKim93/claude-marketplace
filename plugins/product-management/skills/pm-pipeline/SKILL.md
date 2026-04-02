---
name: pm-pipeline
description: |
  제품 관리 파이프라인의 현재 단계를 자동 감지하고 다음에 실행할 스킬을 추천합니다. (옵셔널) DDD 분류 → DDD→BRD 변환 → BRD → PRD → 로드맵 → 실행 → 릴리즈 → 회고의 전체 사이클을 관리하며, 각 스킬 간 파일 경로와 컨텍스트를 자동으로 전달합니다.

  다음 상황에서 반드시 이 스킬을 사용하세요:
  - "지금 어디서 시작해야 하나?", "다음 단계는?" 등 파이프라인 방향을 물을 때
  - 프로젝트를 처음 시작하거나 중간에 합류할 때
  - 어떤 문서가 있고 무엇이 빠졌는지 전체 현황을 파악하고 싶을 때
  - "pm 파이프라인", "전체 프로세스", "제품 사이클" 등을 언급할 때
  - "DDD에서 시작", "도메인 분류부터", "DDD 파이프라인" 등을 언급할 때
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# PM 파이프라인 오케스트레이터

제품 관리 파이프라인의 현재 단계를 진단하고 최적의 다음 액션을 안내합니다.
단계를 건너뛰지 말고 각 Phase를 순서대로 진행하세요.

---

## 파이프라인 전체 구조

```
── DDD 경로 (옵셔널) ──────────────────────────────────────
[0A단계] ddd-classifier      → DDD 도메인 분류 문서 생성
                               ※ architecture 플러그인 소속
[0B단계] ddd-to-brd-converter → DDD → BRD 자동 변환
         ↓ (2단계로 직행 — BRD가 이미 생성됨)

── 직접 시작 경로 ────────────────────────────────────────
[0C단계] req-intake    → 요구사항 원재료 수집·정제 (옵셔널)
                         이메일·대화·회의록·메모 등 → REQUIREMENTS-INTAKE.md
         ↓ (1단계로 진행 — brd-writer가 자동 로드)
[1단계] brd-writer     → BRD 작성
         ↓

── 공통 파이프라인 ───────────────────────────────────────
[2단계] brd-reviewer   → BRD 검토 & 보완
[3단계] brd-to-prd-converter → BRD → PRD 자동 변환
[4단계] prd-writer     → PRD 보완 & 완성
[5단계] prd-reviewer   → PRD 다관점 검토 (PM/엔지니어/디자이너)

── DB 설계 경로 (옵셔널) ──────────────────────────────────
[5-1단계] oracle-db-designer → DB 설계 (PRD 데이터 요구사항 기반)
                               ※ database 플러그인 소속
[5-2단계] oracle-db-reviewer → DB 설계 리뷰
                               ※ database 플러그인 소속
         ↓ (6단계로 진행)
───────────────────────────────────────────────────────────

[6단계] roadmap-generator → 로드맵 & 태스크 생성
[7단계] task-runner    → 태스크 실행 & 진행 관리
[8단계] release-notes-generator → 릴리즈 노트 생성
[9단계] retro-generator → 회고 & 다음 사이클 인사이트
         ↓
    (다음 BRD 사이클)
```

---

## 단계 감지 규칙

도메인별로 독립 감지한다. `docs/*/PIPELINE-STATUS.md` Glob으로 기존 도메인 목록을 먼저 탐색하고, 도메인이 여러 개면 사용자에게 대상 도메인을 선택하게 한다.

| 발견 파일 | 감지 단계 |
|---------|---------|
| 아무 문서 없음 | 진입 경로 선택 제안 (DDD 경로: 0A단계 / 직접 시작: 0C→1단계) |
| `docs/{domain}/REQUIREMENTS-INTAKE.md` 만 있음 | 1단계 (brd-writer — INTAKE 자동 로드) |
| `docs/_project/DDD-Classification.md` 만 있음 (BRD 없음) | 0B단계 (DDD→BRD 변환) |
| `docs/_project/DDD-Classification.md` + `docs/_project/BRD-master.md` 있음 | 2단계 (BRD 검토) — DDD 경로 완료 |
| `docs/{domain}/BRD.md` 만 있음 | 2단계 (BRD 검토) |
| `docs/{domain}/BRD-REVIEW.md` 있음 | 3단계 (BRD→PRD 변환) |
| `docs/{domain}/PRD.md` 있음 (ROADMAP 없음) | 4단계 또는 5단계 |
| `docs/{domain}/PRD-REVIEW.md` 있음 + PRD에 "데이터 요구사항" 섹션 + DDL 없음 | 5-1단계 (DB 설계) 제안 |
| `*-ddl.sql` 또는 `docs/{domain}/DB-REVIEW.md` 있음 | 5-2단계 완료, 6단계 진행 |
| `docs/{domain}/PRD-REVIEW.md` 있음 | 6단계 (로드맵 생성) |
| `docs/{domain}/ROADMAP.md` 있음 (기능별 TASKS 없음) | 6단계 완료, 7단계 시작 |
| `docs/{domain}/*/TASKS.md` 있음 | 7단계 (실행 중) |
| 모든 TASKS.md의 DONE 비율 > 80% | 8단계 제안 (릴리즈 노트) |
| `docs/{domain}/RELEASE-NOTES-*.md` 있음 | 9단계 제안 (회고) |
| `docs/{domain}/RETRO-*.md` 있음 | 새 사이클 시작 제안 |

---

## 대화 프로세스

### Phase 0: 프로젝트 현황 스캔

**목표**: 현재 프로젝트에 존재하는 문서를 파악하고 파이프라인 단계를 진단한다.

1. `docs/` 디렉터리를 `Glob`으로 스캔한다:

   ```
   # 프로젝트 전체 산출물
   docs/_project/DDD-Classification.md
   docs/_project/BRD-master.md
   docs/_project/BRD-supplement.md

   # 도메인별 산출물 (모든 도메인)
   docs/*/PIPELINE-STATUS.md
   docs/*/REQUIREMENTS-INTAKE.md
   docs/*/BRD.md
   docs/*/BRD-REVIEW.md
   docs/*/BRD-QA.md
   docs/*/PRD.md
   docs/*/PRD-REVIEW.md
   docs/*/PRD-QA.md
   docs/*/ROADMAP.md
   docs/*/RELEASE-NOTES-*.md
   docs/*/RETRO-*.md

   # 기능별 TASKS
   docs/*/*/TASKS.md
   ```

2. `docs/*/PIPELINE-STATUS.md` Glob으로 기존 도메인 목록을 파악한다.
   - 도메인이 하나면 자동 선택
   - 도메인이 여러 개면 사용자에게 대상 도메인 선택 요청
   - 없으면 새 도메인 생성 안내

3. 선택된 도메인의 `PIPELINE-STATUS.md`가 있으면 읽어 이전 세션의 컨텍스트를 복원한다.

3. 발견된 파일 목록으로 현재 단계를 진단한다.

---

### Phase 1: 파이프라인 현황 보고

**목표**: 전체 파이프라인 상태를 시각적으로 보여준다.

```
📊 PM 파이프라인 현황 — {프로젝트명} / 도메인: {domain}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
단계              상태        파일
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[DDD 경로 사용 시에만 표시]
0A. DDD 분류      ✅ 완료     docs/_project/DDD-Classification.md
0B. DDD→BRD 변환  ✅ 완료     docs/_project/BRD-master.md
1.  BRD 작성      ⏭️ 건너뜀   (DDD 경로 — 0B에서 생성됨)
[DDD 경로 미사용 시]
1.  BRD 작성      ✅ 완료     docs/{domain}/BRD.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. BRD 검토       ✅ 완료     docs/{domain}/BRD-REVIEW.md
3. PRD 변환       ✅ 완료     docs/{domain}/PRD.md
4. PRD 완성       ⚠️ 진행중   docs/{domain}/PRD.md (TBD 3개)
5. PRD 검토       ❌ 미완료
6. 로드맵         ❌ 미완료
7. 태스크 실행    ❌ 미완료   (기능: login, profile, registration)
8. 릴리즈 노트    ❌ 미완료
9. 회고           ❌ 미완료
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 현재 단계: 4단계 — PRD 완성
💡 권장 다음 액션: /prd-writer (TBD 항목 3개 보완)
```

> DDD 파일(`docs/_project/DDD-Classification.md`)이 없으면 0A/0B 행을 생략하고 1-9단계만 표시한다.
> 도메인이 여러 개면 각 도메인별로 현황 테이블을 반복 출력한다.

---

### Phase 2: 다음 액션 추천

**목표**: 현재 단계에 맞는 구체적인 실행 안내를 제공한다.

단계별 추천 액션:

#### 진입 경로 선택 — 아무 문서 없음
```
🚀 프로젝트를 시작하려면 진입 경로를 선택하세요.

📌 경로 A — DDD 도메인 분류부터 시작 (권장: 기존 코드베이스 또는 복잡한 도메인)
   기존 소스코드나 문서를 분석하여 도메인을 분류하고,
   분류 결과로 BRD를 자동 생성합니다.
   실행: /ddd-classifier

📌 경로 B — BRD 직접 작성 (권장: 신규 프로젝트 또는 단순한 도메인)
   비즈니스 요구사항 문서를 처음부터 직접 작성합니다.
   실행: /brd-writer

💡 판단 기준:
   - 기존 코드베이스가 있거나 도메인이 복잡하면 → 경로 A
   - 완전히 새로운 프로젝트이거나 도메인이 명확하면 → 경로 B
```

#### 0A단계 완료 — DDD 분류 문서 있음, BRD 없음
```
✅ DDD 도메인 분류 문서가 작성되었습니다. BRD를 자동 생성하세요.

발견: docs/_project/DDD-Classification.md

DDD 분류 결과를 기반으로 Master BRD + 도메인별 BRD를 자동 생성합니다.
각 서브도메인은 docs/{domain}/BRD.md로 저장됩니다.

실행: /ddd-to-brd-converter
```

#### 0B단계 완료 — DDD→BRD 변환 완료, BRD 검토 필요
```
✅ DDD→BRD 변환이 완료되었습니다. 도메인별 BRD 검토를 진행하세요.

발견:
  docs/_project/BRD-master.md
  docs/{domain}/BRD.md (N개 도메인)

다음: 각 도메인 BRD의 품질을 점검하고 보완 질문을 도출합니다.

실행: /brd-reviewer  (도메인 선택 후 자동 탐색)
```

#### 0C단계 완료 — REQUIREMENTS-INTAKE.md 있음, BRD 없음
```
📋 요구사항 정제 문서가 준비되어 있습니다. BRD를 바로 작성하세요.

발견: docs/{domain}/REQUIREMENTS-INTAKE.md
  총 {N}건 — FEAT {n} / NFR {n} / BUG {n} / IMPR {n}
  확인 필요: {n}건 | 충돌: {n}건

brd-writer가 이 파일을 자동으로 로드하여 BRD에 매핑합니다.

실행: /brd-writer
```

#### 1단계 — BRD 없음 (새 프로젝트 시작 — 직접 시작 경로)
```
🚀 프로젝트를 시작하려면 BRD(비즈니스 요구사항 문서)부터 작성하세요.

도메인명을 준비해 주세요 (예: user-management, payment).
처음 시작이면 brd-writer가 도메인 폴더를 자동 생성합니다.

💡 이메일·회의록·메모 등 원재료가 있다면 먼저 /req-intake를 실행하세요.
   정제된 요구사항을 brd-writer가 자동으로 로드합니다.

실행: /brd-writer  (또는 원재료가 있으면 먼저 /req-intake)
```

#### 2단계 — BRD 있음, 검토 미완료
```
📝 BRD가 작성되었습니다. 검토를 진행하세요.

발견: docs/{domain}/BRD.md
다음: BRD 품질을 점검하고 보완 질문을 도출합니다.

실행: /brd-reviewer
```

#### 3단계 — BRD 검토 완료, PRD 없음
```
✅ BRD 검토가 완료되었습니다. PRD 초안을 자동 생성하세요.

BRD의 목표·요구사항·범위를 PRD 구조로 자동 변환합니다.
섹션 7은 기능별 챕터(Feature: xxx)로 자동 구조화됩니다.

실행: /brd-to-prd-converter
```

#### 4단계 — PRD 있음, TBD 항목 존재
```
📋 PRD 초안이 있습니다. 보완이 필요한 항목을 채우세요.

발견: docs/{domain}/PRD.md
TBD 항목: {N}개 발견
주요 미완성 섹션: {섹션명 목록}

실행: /prd-writer
```

#### 5단계 — PRD 완성, 검토 필요
```
🔍 PRD가 완성되었습니다. 다관점 검토를 진행하세요.

PM, 엔지니어링, 디자인 3개 관점에서 동시 검토합니다.

실행: /prd-reviewer
```

#### 5-1단계 — PRD에 데이터 요구사항 있음, DB 설계 미완료
```
🗄️ PRD에 데이터 요구사항이 포함되어 있습니다. DB 설계를 진행하세요.

발견: docs/{domain}/PRD.md (데이터 요구사항 섹션 포함)

PRD의 데이터 요구사항(엔티티, 규모, 특수 요건)을 기반으로
Oracle DB 설계를 진행합니다.

실행: /oracle-db-designer
(기존 스키마 리뷰가 필요하면: /oracle-db-reviewer)
```

#### 6단계 — PRD 검토 완료, 로드맵 없음
```
🗺️ PRD 검토가 완료되었습니다. 로드맵과 기능별 태스크를 생성하세요.

PRD의 기능 챕터를 분석하여 기능별로 TASKS.md를 분리 생성합니다.
- docs/{domain}/ROADMAP.md (통합 의존성 + 스프린트 배치)
- docs/{domain}/{feature}/TASKS.md (기능별)

실행: /roadmap-generator
```

#### 7단계 — TASKS.md 있음, 실행 중
```
⚙️ 태스크가 생성되었습니다. 실행을 시작하세요.

기능별 진행 현황:
  login:        DONE {N}% / BLOCKED {N}건
  profile:      DONE {N}% / BLOCKED {N}건
  registration: DONE {N}% / BLOCKED {N}건

실행: /task-runner  (기능 선택 후 자동 탐색)
```

#### 7단계 (피드백 루프 감지) — BLOCKED가 PRD 불명확 원인
```
⚠️ PRD 불명확으로 인한 BLOCKED 태스크가 {N}건 감지되었습니다.

영향받는 태스크: {태스크 ID 목록}
권장 액션: PRD 해당 Feature 챕터를 보완하고 재검토합니다.

실행: /prd-writer (해당 Feature 챕터 보완) → /prd-reviewer
```

#### 8단계 — DONE 비율 높음
```
🎉 전체 태스크 완료율이 {%}%입니다. 릴리즈 노트를 생성하세요.

완료된 {N}개 기능을 PRD 요구사항과 BRD 목표에 매핑합니다.
모든 기능 폴더의 TASKS.md를 순회하여 집계합니다.

실행: /release-notes-generator
```

#### 9단계 — 릴리즈 노트 완료
```
📋 릴리즈 노트가 생성되었습니다. 팀 회고를 진행하세요.

BLOCKED 패턴, 추정 정확도, 스프린트 속도를 분석합니다.
다음 BRD/PRD 사이클에 반영할 인사이트를 도출합니다.

실행: /retro-generator
```

#### 완료 — 회고까지 완료
```
🔄 이번 사이클이 완료되었습니다!

회고 인사이트를 반영하여 다음 BRD를 작성하세요.
기존 docs/{domain}/ 산출물은 다음 사이클의 참고 자료로 활용됩니다.

실행: /brd-writer (새 사이클 시작)
```

---

### Phase 3: PIPELINE-STATUS.md 업데이트

**목표**: 파이프라인 상태를 파일로 저장하여 다음 세션에서도 컨텍스트를 유지한다.

PIPELINE-STATUS.md는 `docs/{domain}/PIPELINE-STATUS.md`에 도메인별로 생성한다.

```markdown
# PIPELINE-STATUS.md

| 항목 | 내용 |
|------|------|
| 마지막 업데이트 | {YYYY-MM-DD} |
| 도메인 | {domain} |
| 현재 단계 | {N단계 — 설명} |
| 진입 경로 | DDD 경로 / 직접 시작 |

## 문서 현황

| 문서 | 경로 | 상태 |
|------|------|------|
| DDD 분류 | `docs/_project/DDD-Classification.md` | ✅ 완료 / ❌ 미사용 |
| Master BRD | `docs/_project/BRD-master.md` | ✅ 완료 / ❌ 미사용 |
| 요구사항 인테이크 | `docs/{domain}/REQUIREMENTS-INTAKE.md` | ✅ 완료 / ❌ 미사용 |
| BRD | `docs/{domain}/BRD.md` | ✅ 완료 |
| PRD | `docs/{domain}/PRD.md` | ⚠️ TBD {N}개 |
| DB 설계 | `{경로 또는 —}` | ✅ 완료 / ❌ 미사용 |
| 로드맵 | `docs/{domain}/ROADMAP.md` | ❌ 미생성 |
| 기능별 태스크 | `docs/{domain}/*/TASKS.md` | ❌ 미생성 |

## 기능 목록

| 기능 | 경로 | 태스크 진행률 |
|------|------|------------|
| {feature-1} | `docs/{domain}/{feature-1}/TASKS.md` | DONE {N}% |
| {feature-2} | `docs/{domain}/{feature-2}/TASKS.md` | ❌ 미생성 |

## 다음 액션

{Phase 2에서 추천한 액션}
```

---

## 피드백 루프 감지

다음 신호를 감지하면 파이프라인을 이전 단계로 되돌린다:

| 신호 | 감지 방법 | 권장 액션 |
|------|---------|---------|
| PRD 불명확 BLOCKED | TASKS.md BLOCKED 원인에 "요구사항 불명확" | `/prd-writer` → `/prd-reviewer` |
| 범위 변경 요청 | 사용자 메시지에 "추가 기능", "범위 수정" | `/prd-writer` (범위 섹션 수정) → `/roadmap-generator` 재실행 |
| BRD 목표 미달 | 릴리즈 노트에서 달성률 < 80% | 다음 BRD에 원인 분석 포함 |
| DDD 분류 변경 필요 | BRD 검토 시 도메인 구조 변경 필요 판단 | `/ddd-classifier` 재실행 → `/ddd-to-brd-converter` 재실행 |

---

## 출력 원칙

- **컨텍스트 유지**: 세션 간에 PIPELINE-STATUS.md를 통해 컨텍스트를 보존한다.
- **명확한 다음 액션**: "무엇을 해야 하는가"를 한 줄로 명확히 제시한다.
- **파일 경로 자동 전달**: 다음 스킬을 추천할 때 항상 관련 파일 경로를 포함한다.
- **단계 강제 없음**: 사용자가 단계를 건너뛰길 원하면 그 결과를 알리되 실행을 막지 않는다.
