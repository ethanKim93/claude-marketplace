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
PRD(제품 요구사항 문서) 작성. 문제 정의부터 인수 조건까지 대화형으로 안내하며 팀이 바로 티켓으로 전환할 수 있는 실행 가능한 문서를 생성.

| 커맨드 | 역할 |
|--------|------|
| `/write-prd` | 대화형 PRD 작성 (표준 13섹션 / 경량 5섹션 / PR-FAQ 선택) |

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
