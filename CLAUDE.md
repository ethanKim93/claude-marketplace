# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

이 저장소는 Claude Code 플러그인 마켓플레이스입니다. 개인 스킬(슬래시 커맨드)과 서브에이전트를 플러그인으로 관리하고 배포합니다.

## 디렉터리 구조

```
claude-marketplace/
├── .claude-plugin/
│   └── marketplace.json        # 마켓플레이스 진입점 — 플러그인 목록 정의
└── plugins/
    ├── architecture/           # DDD 아키텍처 설계 스킬 플러그인
    │   ├── .claude-plugin/
    │   │   └── plugin.json     # 플러그인 메타데이터 및 커맨드 등록
    │   └── skills/             # 각 스킬 = 슬래시 커맨드 1개
    │       └── {skill-name}/
    │           └── SKILL.md
    └── product-management/     # 제품 관리 스킬 플러그인
        ├── .claude-plugin/
        │   └── plugin.json
        └── skills/
            └── write-prd/
                └── SKILL.md
```

## 마켓플레이스 설정 파일

### `.claude-plugin/marketplace.json`
마켓플레이스의 루트 설정 파일. `plugins` 배열에 각 플러그인의 `name`과 `source`(상대 경로)를 등록한다.

### `plugins/{plugin}/.claude-plugin/plugin.json`
개별 플러그인 설정 파일. `commands` 배열에 스킬 이름과 SKILL.md 경로를 등록한다.

### `plugins/{plugin}/skills/{skill}/SKILL.md`
슬래시 커맨드의 실제 동작을 정의하는 파일. YAML 프론트매터에 `name`, `description`, `allowed-tools`를 선언하고, 본문에 Claude가 따를 지시사항을 마크다운으로 작성한다.

## 플러그인 추가 방법

### 새 스킬 추가 (기존 플러그인에)

1. `plugins/{plugin}/skills/{skill-name}/SKILL.md` 파일 생성
2. `plugins/{plugin}/.claude-plugin/plugin.json`의 `commands` 배열에 항목 추가:
   ```json
   { "name": "{skill-name}", "source": "./skills/{skill-name}" }
   ```

### 새 플러그인 추가

1. `plugins/{plugin-name}/.claude-plugin/plugin.json` 생성
2. `plugins/{plugin-name}/skills/` 아래 스킬 디렉터리 생성
3. `.claude-plugin/marketplace.json`의 `plugins` 배열에 등록:
   ```json
   { "name": "{plugin-name}", "source": "./plugins/{plugin-name}" }
   ```

## SKILL.md 작성 규칙

```markdown
---
name: skill-name          # 슬래시 커맨드명 (/skill-name)
description: 설명         # Claude가 이 스킬을 언제 사용할지 판단하는 기준
allowed-tools:            # 스킬이 사용할 수 있는 도구 목록
  - Bash
  - Read
  - Write
---

# 스킬 본문
Claude에게 전달할 지시사항을 마크다운으로 작성
```

## 현재 플러그인 목록

### architecture
DDD 아키텍처 설계. Bounded Context → Aggregate → Domain Event → 패키지 구조를 단계별 안내.

| 커맨드 | 역할 |
|--------|------|
| `/ddd` | DDD 분석 및 헥사고날 아키텍처 설계 |

### product-management
BRD → PRD → 로드맵 → 실행 → 릴리즈 → 회고의 전체 제품 관리 라이프사이클을 지원하는 스킬 모음.

**파이프라인 흐름**: `brd-writer → brd-reviewer → brd-to-prd-converter → prd-writer → prd-reviewer → roadmap-generator → task-runner → release-notes-generator → retro-generator`

| 커맨드 | 역할 |
|--------|------|
| `/pm-pipeline` | 파이프라인 현황 진단 — 현재 단계 감지, 다음 스킬 자동 추천, PIPELINE-STATUS.md 관리 |
| `/brd-writer` | BRD(비즈니스 요구사항 문서) 작성 — 경영진 승인용, SMART 목표, MoSCoW 우선순위 |
| `/brd-reviewer` | 기존 BRD 평가 — 13섹션 완성도 분석, SMART/MoSCoW/REQ-ID 품질 검사, 개선 Q&A 문서 생성 |
| `/brd-to-prd-converter` | BRD → PRD 자동 변환 — SMART 목표·REQ-ID·범위 추출, PRD 초안 60% 자동 완성 |
| `/prd-writer` | 대화형 PRD 작성 (표준 13섹션 / 경량 5섹션 / PR-FAQ 선택) |
| `/prd-reviewer` | PRD 다관점 평가 — PM·Engineering·Design 3개 관점 병렬 리뷰, 관점별 Q&A 문서 생성 |
| `/roadmap-generator` | PRD 기반 의존성 로드맵 생성 및 태스크 분해 — Mermaid 시각화, RICE 우선순위, 스프린트 계획 |
| `/task-runner` | TASKS.md 기반 태스크 실행 및 상태 관리 — 의존성 기반 추천, 진행률 대시보드, 인수조건 검증 |
| `/release-notes-generator` | 릴리즈 노트 자동 생성 — DONE 태스크를 PRD FR·BRD 목표에 역매핑, 달성률 리포트 |
| `/retro-generator` | 스프린트 회고 생성 — BLOCKED 패턴·추정 정확도·속도 분석, Keep/Stop/Start 리포트 |
| `/ppt-maker` | 순수 HTML/CSS/JS 단일 파일 웹 프레젠테이션 생성 |

### productivity
생산성 도구 모음. 디렉터리 구조를 분석하고 베스트 프랙티스 기반으로 정리 방안을 제안하며 사용자 승인 후 실행.

| 커맨드 | 역할 |
|--------|------|
| `/folder-organizer` | 디렉터리 구조 분석 — 프로젝트 유형 감지, 13가지 진단 검사, 건강 점수 산출, 정리 실행 |

### database
Oracle Database 설계. 요구사항 수집 → 개념/논리/물리 설계 → DDL 생성 → 최적화 검토를 단계별 안내. 확인 사항이 많으면 설문서 파일을 생성하여 사용자가 답변을 채우는 방식으로 진행.

| 커맨드 | 역할 |
|--------|------|
| `/oracle-db-designer` | 대화형 Oracle DB 설계 — 표준 용어 사전, 네이밍 컨벤션, 파티션 키 설계, DDL 자동 생성, 안티패턴 검토 |

## 마켓플레이스 검증

```bash
# 마켓플레이스 구조 검증 (Claude Code CLI 필요)
claude plugin validate .claude-plugin/marketplace.json

# 특정 플러그인 검증
claude plugin validate plugins/architecture/.claude-plugin/plugin.json
```

## GitHub 호스팅 후 설치

저장소를 GitHub에 push한 뒤:

```bash
# 마켓플레이스 등록
claude marketplace add github:kimminhyeon/claude-marketplace

# 플러그인 설치
claude plugin install architecture
claude plugin install product-management
```
