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
    ├── video-production/       # AI 영상 제작 자동화 스킬 플러그인
    │   ├── .claude-plugin/
    │   │   └── plugin.json     # 플러그인 메타데이터 및 커맨드 등록
    │   └── skills/             # 각 스킬 = 슬래시 커맨드 1개
    │       └── {skill-name}/
    │           └── SKILL.md
    └── architecture/           # DDD 아키텍처 설계 스킬 플러그인
        ├── .claude-plugin/
        │   └── plugin.json
        └── skills/
            └── ddd/
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

### video-production
AI 기반 영상 제작 자동화. Gemini API(이미지/TTS), Whisper(자막), FFmpeg(합성)을 연결하는 워크플로우.

| 커맨드 | 역할 |
|--------|------|
| `/create-video-auto` | 주제 입력 → 대본+영상 완전 자동화 (마스터 커맨드) |
| `/generate-script` | Gemini로 영상 대본(scenes JSON) 생성 |
| `/run-pipeline` | scenes JSON → 최종 MP4 영상 제작 |
| `/batch-video` | BRIEFING.md의 batch 작업 순차 처리 |
| `/compose-video` | FFmpeg로 이미지+오디오+자막 합성 |
| `/draft-video` | 이미지 없이 컬러 배경으로 초안 영상 생성 |
| `/generate-briefing` | 프로젝트 소스 분석 → BRIEFING.md 자동 생성 |
| `/generate-image` | Gemini로 Notion 스타일 일러스트 생성 |
| `/generate-subtitle` | Whisper로 오디오 → SRT 자막 생성 |
| `/generate-tts` | Gemini TTS로 나레이션 음성 생성 |
| `/preview-image` | 영상 제작 전 샘플 이미지 1장 미리보기 |
| `/read-briefing` | BRIEFING.md 파싱 → job_context.json 생성 |
| `/run-test` | 환경(API 키, FFmpeg, Whisper) 검증 |

### architecture
DDD 아키텍처 설계. Bounded Context → Aggregate → Domain Event → 패키지 구조를 단계별 안내.

| 커맨드 | 역할 |
|--------|------|
| `/ddd` | DDD 분석 및 헥사고날 아키텍처 설계 |

## 마켓플레이스 검증

```bash
# 마켓플레이스 구조 검증 (Claude Code CLI 필요)
claude plugin validate .claude-plugin/marketplace.json

# 특정 플러그인 검증
claude plugin validate plugins/video-production/.claude-plugin/plugin.json
```

## GitHub 호스팅 후 설치

저장소를 GitHub에 push한 뒤:

```bash
# 마켓플레이스 등록
claude marketplace add github:kimminhyeon/claude-marketplace

# 플러그인 설치
claude plugin install video-production
claude plugin install architecture
```
