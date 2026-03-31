---
name: create-video-auto
description: 주제와 작가만 입력하면 대본 생성부터 최종 영상 제작까지 완전 자동으로 수행합니다. 폴더 기반 모드(--folder)도 지원하여 BRIEFING.md 작업지시서를 읽고 소스 분석 + 리서치 + 대본 + 영상을 자동 처리합니다. 내부적으로 generate-script와 run-pipeline 스킬을 순차 호출하여 전체 워크플로우를 자동화합니다.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Create Video Auto (v2)

완전 자동화 마스터 스킬 - 텍스트 입력 또는 폴더 기반으로 최종 영상 생성

## Instructions

두 가지 모드를 지원합니다:
- **모드 1**: 텍스트 입력 (`--theme`/`--author`) — 기존 방식
- **모드 2**: 폴더 입력 (`--folder`) — BRIEFING.md 기반 완전 자동화

---

## 모드 1: 텍스트 입력 (기존)

### 실행 흐름

```
입력: 주제, 작가, 옵션
    ↓
1️⃣ generate-script 스킬 호출
    → output/scripts/script_{timestamp}.json
    ↓
2️⃣ run-pipeline 스킬 호출
    → output/{output_name}.mp4
    ↓
3️⃣ 통합 리포트 출력
```

### 자동화 프로세스

```python
# Phase 1: 대본 생성
script_result = generate_script(theme, author, count, style, context)
script_path = save_script(script_result)

# Phase 2: 영상 제작
video_result = run_pipeline(
    scenes=script_result['scenes'],
    output_name=output_name,
    bgm_path=bgm_path,
    keep_intermediates=keep_intermediates
)

# Phase 3: 통합 리포트
report = generate_report(script_result, video_result)
```

---

## 모드 2: 폴더 입력 (신규)

```bash
/create-video-auto --folder "projects/my-project"
```

### 실행 흐름

```
[0단계] BRIEFING.md 존재 확인
  → 없으면 [에이전트] briefing-generator-agent 호출
    → BRIEFING.md 초안 자동 생성
    → ⚠️ 작업자 검토 대기 (theme, author 등 필수 항목 확인)
      ↓
[스킬] read-briefing
  → BRIEFING.md 파싱 → job_context.json
      ↓
[에이전트] source-analyst-agent  ← sources/ 폴더 존재 시
  → txt/md/jpg/mp4/urls.txt 자율 분석
  → sources_context.json
      ↓
[에이전트] research-agent  ← research.enabled=true 시
  → WebSearch 반복 실행
  → research_context.json
      ↓
[에이전트] context-orchestrator-agent
  → briefing + sources + research 통합
  → final_context.txt
      ↓
[스킬] generate-script  (보강된 컨텍스트 사용)
      ↓
┌────────────────────────────────────┐
│ draft.preview_image=true 시        │
│ [스킬] preview-image               │
│   → 샘플 이미지 1장 확인           │
└────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│ draft.enabled=true    draft=false        │
│ [스킬] draft-video    [스킬] run-pipeline│
└─────────────────────────────────────────┘
      ↓
[스킬] batch-video  ← batch.enabled=true 시
      ↓
output/report.md 생성
```

### 폴더 옵션

```bash
# 기본 폴더 모드
/create-video-auto --folder "projects/my-project"

# 이미지 없는 초안만 생성 (무료, 빠름)
/create-video-auto --folder "projects/my-project" --draft

# 샘플 이미지 1장 먼저 확인
/create-video-auto --folder "projects/my-project" --preview

# 온라인 조사 건너뜀
/create-video-auto --folder "projects/my-project" --no-research

# 소스 폴더 처리 건너뜀
/create-video-auto --folder "projects/my-project" --no-sources
```

---

## Usage

### 가장 간단한 사용법

```bash
# 주제만 지정 (모드 1)
/create-video-auto --theme "인생"

# 주제 + 작가 (모드 1)
/create-video-auto --theme "자유" --author "사르트르"

# 폴더 모드 (모드 2)
/create-video-auto --folder "projects/my-project"
```

### 전체 옵션

```bash
/create-video-auto \
  --theme "사랑" \
  --author "에리히 프롬" \
  --count 10 \
  --style "따뜻하고 공감적" \
  --context "성숙한 사랑의 예술" \
  --bgm "assets/bgm/gymnopedie.mp3" \
  --output "love_quotes.mp4" \
  --keep-temp
```

### 파라미터

#### 모드 1 필수
- `--theme`: 주제 (예: "인생", "사랑", "자유")

#### 모드 2 필수
- `--folder`: 프로젝트 폴더 경로 (BRIEFING.md 포함)

#### 모드 2 선택
- `--draft`: 이미지 없이 초안 영상만 생성
- `--preview`: 영상 전 샘플 이미지 1장 미리 확인
- `--no-research`: 온라인 조사 건너뜀
- `--no-sources`: sources/ 폴더 처리 건너뜀

#### 선택
- `--author`: 작가 (예: "쇼펜하우어")
- `--count`: 장면 개수 (기본값: 12)
- `--style`: 스타일 (기본값: "철학적")
- `--content-type`: 콘텐츠 타입 (기본값: "quote") — quote | narration | storytelling | educational | custom
- `--voice`: TTS 보이스명 (예: "Enceladus", "Charon")
- `--context`: 추가 컨텍스트
- `--bgm`: BGM 파일 경로
- `--output`: 출력 파일명 (기본값: "output_video.mp4")
- `--keep-temp`: 중간 파일 보존 (디버깅용)

## Output Format

### 진행 상황

```
🚀 명언 영상 자동 생성 시작

입력 정보:
  주제: 자유
  작가: 사르트르
  개수: 8개
  BGM: assets/bgm/gymnopedie.mp3

==================================================
1️⃣ 대본 생성 (generate-script)
==================================================

📝 대본 생성 시작
   주제: 자유
   작가: 사르트르
   개수: 8개
   스타일: 철학적

🤖 LLM으로 대본 생성 중...
✅ 8개 장면 생성 완료

💾 대본 저장: output/scripts/script_자유_20260218_092500.json
📊 장면 수: 8개
⏱️ 예상 영상 길이: 약 1분 20초

장면 미리보기 (처음 3개):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] "인간은 자유롭도록 선고받았다."
    → A person standing at a crossroads under vast open sky
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2] "우리는 우리가 선택한 것이다."
    → A figure drawing their own path on blank canvas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3] "자유란 선택할 수 있는 능력이 아니라 선택해야만 하는 운명이다."
    → A person facing multiple doors, one slightly open
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 1단계 완료 (15초 소요)

==================================================
2️⃣ 영상 제작 (run-pipeline)
==================================================

🎬 명언 영상 제작 시작: 8개 장면

파이프라인 초기화 중...
✅ 파이프라인 준비 완료

--------------------------------------------------
이미지 생성
--------------------------------------------------
🎨 이미지 생성 중: A person standing at a crossroads...
✅ 이미지 저장: output/temp/images/scene_000.png
[...]
✅ 총 8개 이미지 생성 완료 (40초)

--------------------------------------------------
TTS 나레이션 생성
--------------------------------------------------
🎙️ TTS 생성 중: 인간은 자유롭도록...
✅ TTS 저장: output/temp/audio/narration_000.wav
[...]
✅ 총 8개 나레이션 생성 완료 (24초)

--------------------------------------------------
자막 동기화
--------------------------------------------------
📝 Whisper 모델 로드 중: large-v3
✅ Whisper 모델 로드 완료
[...]
✅ 총 8개 SRT 생성 완료 (16초)

--------------------------------------------------
영상 합성
--------------------------------------------------
🎬 영상 합성 중: scene_000.mp4
[...]
✅ 총 8개 영상 생성 완료 (40초)

--------------------------------------------------
최종 영상 생성
--------------------------------------------------
🔗 8개 영상 연결 중...
✅ 최종 영상 저장: output/freedom_quotes.mp4

✅ 2단계 완료 (2분 10초 소요)

==================================================
🎉 완료!
==================================================

📁 최종 영상: output/freedom_quotes.mp4
📁 대본 파일: output/scripts/script_자유_20260218_092500.json

⏱️ 총 소요 시간: 2분 25초
📊 영상 길이: 1분 18초
📈 장면 수: 8개
💾 파일 크기: 5.2MB

중간 파일:
  - 이미지: output/temp/images/
  - 오디오: output/temp/audio/
  - 자막: output/temp/subtitles/
  - 씬 영상: output/temp/videos/

다음 단계:
  1. 영상 확인: output/freedom_quotes.mp4
  2. 대본 재사용: /run-pipeline --config output/scripts/script_자유_20260218_092500.json
  3. 대본 수정 후 재생성: JSON 파일 편집 → /run-pipeline
```

## Use Cases

### Use Case 1: 빠른 프로토타입

```bash
# 주제만 지정하여 빠르게 영상 생성
/create-video-auto --theme "행복" --count 5

# 5개 장면의 짧은 영상 (약 40초)
# 프로토타입 확인 후 본격 제작
```

### Use Case 2: 작가 시리즈

```bash
# 동일 작가의 여러 주제
/create-video-auto --theme "인생" --author "쇼펜하우어" --output "schopenhauer_life.mp4"
/create-video-auto --theme "의지" --author "쇼펜하우어" --output "schopenhauer_will.mp4"
/create-video-auto --theme "고통" --author "쇼펜하우어" --output "schopenhauer_pain.mp4"

# 시리즈 영상 제작
```

### Use Case 3: 컨텍스트 활용

```bash
# 특정 관점의 명언 생성
/create-video-auto \
  --theme "명상" \
  --author "틱낫한" \
  --count 10 \
  --context "마음챙김, 호흡, 현재 순간에 집중" \
  --bgm "assets/bgm/meditation.mp3" \
  --output "mindfulness.mp4"
```

### Use Case 4: 품질 테스트

```bash
# 디버깅 모드로 중간 파일 확인
/create-video-auto \
  --theme "테스트" \
  --count 3 \
  --keep-temp \
  --output "quality_test.mp4"

# 생성된 이미지, 오디오, 자막 개별 확인
# output/temp/ 폴더 검토
```

## Features

1. **완전 자동화**: 한 줄 명령으로 영상 완성
2. **토큰 최대 절약**: 반복 코드 제거 (~100줄 → 1줄)
3. **통합 리포트**: 전체 프로세스 가시성
4. **유연성**: 각 단계별 옵션 조정 가능
5. **재사용성**: 생성된 대본 재활용 가능

## Error Handling

### Phase 1 실패 (대본 생성)

```
Error: 대본 생성 실패

원인:
- API 키 오류
- LLM 응답 파싱 오류
- 네트워크 오류

해결:
1. .env 파일에서 GEMINI_API_KEY 확인
2. 인터넷 연결 확인
3. 재시도 또는 수동 대본 작성
```

**Fallback**: 수동으로 scenes.json 작성 후 `/run-pipeline` 사용

### Phase 2 실패 (영상 제작)

```
Error: 영상 제작 중 오류

원인:
- FFmpeg 오류
- Whisper 모델 로드 실패
- 메모리 부족

해결:
1. FFmpeg 설치 확인
2. 메모리 확인 (최소 8GB)
3. Whisper 모델 크기 축소 (config.py에서 WHISPER_MODEL="medium")
```

**Fallback**: 생성된 대본은 보존되므로 환경 수정 후 `/run-pipeline --config <script_path>` 재시도

### 부분 성공

```
Warning: 일부 장면 실패

8개 중 6개 장면 성공
실패한 장면:
  - 장면 3: 이미지 생성 오류
  - 장면 7: TTS 생성 오류

✅ 성공한 6개 장면으로 영상 생성됨
```

**Action**:
1. 실패한 장면의 narration/image_prompt 수정
2. 전체 재실행 또는 실패한 장면만 재생성

## Performance

| 단계 | 예상 시간 (8개 장면) |
|------|-------------------|
| 대본 생성 | 10-20초 |
| 이미지 생성 | 40-80초 |
| TTS 생성 | 20-40초 |
| 자막 생성 | 15-30초 |
| 영상 합성 | 40-80초 |
| 영상 연결 | 5-10초 |
| **합계** | **2-4분** |

*실제 시간은 장면 수, 네트워크 속도, 하드웨어에 따라 다름*

## Comparison

### Before (수동 프로세스)

```bash
# 1. 대본 작성 (수동, 30분)
# scenes.py 파일 작성

# 2. Python 스크립트 작성 (5분)
from src.video_studio.pipeline import VideoPipeline
...

# 3. 실행 (3분)
python myscript.py

# 총 소요 시간: 38분
```

### After (자동화 스킬)

```bash
/create-video-auto --theme "주제" --author "작가"

# 총 소요 시간: 3분 (대기 시간만)
```

**효율성 향상**: **90% 시간 절약**

## Advanced Usage

### 대본 재사용

```bash
# Step 1: 대본 생성
/generate-script --theme "인생" --author "쇼펜하우어" --count 12
# → output/scripts/script_인생_TIMESTAMP.json

# Step 2: 대본 수정 (JSON 파일 편집)
# 특정 명언이나 이미지 프롬프트 조정

# Step 3: 수정된 대본으로 영상 재생성
/run-pipeline --config output/scripts/script_인생_TIMESTAMP.json
```

### 배치 작업

```bash
# 여러 주제를 순차 생성
/create-video-auto --theme "인생" --output "life.mp4"
/create-video-auto --theme "사랑" --output "love.mp4"
/create-video-auto --theme "자유" --output "freedom.mp4"

# output/ 폴더에 3개 영상 생성
```

### 품질 프리셋 (수동 조정)

```bash
# Draft (빠른 테스트)
/create-video-auto --theme "테스트" --count 3

# Standard (기본)
/create-video-auto --theme "주제" --count 12

# High (긴 영상)
/create-video-auto --theme "주제" --count 20
```

## Notes

- 이 스킬은 **generate-script**와 **run-pipeline**을 내부적으로 호출합니다.
- 두 스킬 모두 독립적으로도 사용 가능합니다.
- 생성된 대본은 **자동 저장**되므로 재사용이 가능합니다.
- 첫 실행 시 Whisper 모델 다운로드가 필요할 수 있습니다 (약 3GB).

## Related Skills

- **generate-script**: 대본만 생성
- **run-pipeline**: 대본으로 영상 제작
- **run-test**: 환경 검증

## Related Documents

- [QUICKSTART.md](../../QUICKSTART.md) - 빠른 시작 가이드
- [src/video_studio/script_generator.py](../../src/video_studio/script_generator.py) - 대본 생성 구현
- [src/video_studio/pipeline.py](../../src/video_studio/pipeline.py) - 파이프라인 구현
