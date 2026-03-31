---
name: run-pipeline
description: scenes 데이터를 받아 VideoPipeline을 실행합니다. Python 코드를 직접 작성하지 않고 JSON 형식의 장면 데이터만 제공하면 자동으로 영상을 생성합니다. 토큰 절약에 매우 효과적입니다.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Run Pipeline

JSON 형식의 장면 데이터를 받아 VideoPipeline을 실행하는 스킬입니다.

## Instructions

이 스킬은 Python 코드를 직접 작성할 필요 없이 JSON 데이터만 제공하면 자동으로 영상을 생성합니다.

### 1. 입력 형식

#### JSON 파일로 제공
```json
{
  "scenes": [
    {
      "narration": "한국어 명언 텍스트",
      "image_prompt": "영어 장면 설명"
    },
    {
      "narration": "다음 명언...",
      "image_prompt": "다음 장면..."
    }
  ],
  "output_name": "my_video.mp4",
  "bgm_path": "assets/bgm/gymnopedie.mp3",
  "keep_intermediates": false
}
```

#### 필수 필드
- `scenes`: 장면 배열
  - `narration`: 한국어 나레이션 (20-60자 권장)
  - `image_prompt`: 영어 이미지 프롬프트

#### 선택 필드
- `output_name`: 출력 파일명 (기본값: "quote_video.mp4")
- `bgm_path`: BGM 파일 경로 (선택)
- `keep_intermediates`: 중간 파일 보존 여부 (기본값: false)

### 2. 실행 방식

스킬이 자동으로 다음 Python 스크립트를 생성하고 실행합니다:

```python
from src.video_studio.pipeline import VideoPipeline
from pathlib import Path
import json

# 설정 파일 읽기
with open('temp_pipeline_config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

# 파이프라인 실행
pipeline = VideoPipeline()

# BGM 경로 처리
bgm_path = None
if config.get('bgm_path'):
    bgm_path = Path(config['bgm_path'])

# 영상 생성
result = pipeline.create_video(
    scenes=config['scenes'],
    output_name=config.get('output_name', 'quote_video.mp4'),
    bgm_path=bgm_path,
    keep_intermediates=config.get('keep_intermediates', False)
)

print(f"VIDEO_PATH:{result}")
```

### 3. 출력

- 최종 영상 파일 경로
- 생성 통계 (장면 수, 소요 시간)
- 중간 파일 경로 (keep_intermediates=true인 경우)

## Usage

### 방법 1: JSON 파일 사용

**1단계: JSON 파일 생성**
```bash
# scenes.json
{
  "scenes": [
    {
      "narration": "삶이 그대를 속일지라도 슬퍼하거나 노하지 말라.",
      "image_prompt": "A solitary figure standing on a peaceful hill under starry night sky"
    }
  ],
  "output_name": "pushkin_quotes.mp4",
  "bgm_path": "assets/bgm/gymnopedie.mp3"
}
```

**2단계: 스킬 실행**
```bash
/run-pipeline --config scenes.json
```

### 방법 2: 인라인 JSON (짧은 데이터)

```bash
/run-pipeline --scenes '[{"narration":"명언","image_prompt":"Scene"}]' --output "test.mp4"
```

### 방법 3: 기존 스크립트 데이터 활용

```bash
# generate-script 스킬로 생성된 JSON 사용
/run-pipeline --config output/scripts/script_20260218_092000.json
```

## Output Format

### 진행 상황

```
==================================================
🎬 명언 영상 제작 시작: 8개 장면
==================================================

파이프라인 초기화 중...
✅ 파이프라인 준비 완료

==================================================
1️⃣ 이미지 생성
==================================================
🎨 이미지 생성 중: A solitary figure...
✅ 이미지 저장: output/temp/images/scene_000.png
...
✅ 총 8개 이미지 생성 완료

==================================================
2️⃣ TTS 나레이션 생성
==================================================
🎙️ TTS 생성 중: 삶이 그대를...
✅ TTS 저장: output/temp/audio/narration_000.wav
...
✅ 총 8개 나레이션 생성 완료

==================================================
3️⃣ 자막 동기화
==================================================
📝 Whisper 모델 로드 중: large-v3
✅ Whisper 모델 로드 완료
...
✅ 총 8개 SRT 생성 완료

==================================================
4️⃣ 영상 합성
==================================================
🎬 영상 합성 중: scene_000.mp4
...
✅ 총 8개 영상 생성 완료

==================================================
5️⃣ 최종 영상 생성
==================================================
🔗 8개 영상 연결 중...
✅ 최종 영상 저장: output/pushkin_quotes.mp4

==================================================
🎉 영상 제작 완료!
==================================================
📁 출력 파일: output/pushkin_quotes.mp4
📊 총 장면 수: 8
⏱️ 소요 시간: 약 2분
```

### 결과

```
VIDEO_PATH:output/pushkin_quotes.mp4

통계:
- 장면 수: 8개
- 영상 길이: 약 1분 20초
- 해상도: 1920x1080
- FPS: 30
- 중간 파일: output/temp/ (keep_intermediates=true)
```

## Error Handling

### 입력 오류

```
Error: Invalid JSON format

해결:
1. JSON 형식 확인 (괄호, 따옴표)
2. scenes 배열 존재 확인
3. narration, image_prompt 필드 확인
```

### API 오류

```
Error: GEMINI_API_KEY not found

해결:
1. .env 파일 확인
2. run-test 스킬로 환경 검증
```

### 경로 오류

```
Error: BGM file not found

해결:
1. bgm_path 경로 확인
2. assets/bgm/ 폴더에 파일 존재 확인
3. 또는 bgm_path 필드 제거
```

### 메모리 오류

```
Error: Out of memory (Whisper)

해결:
# config.py에서 Whisper 모델 변경
WHISPER_MODEL = "medium"  # 또는 "small"
```

## Features

1. **토큰 절약**: 긴 Python 코드 불필요 (약 50줄 → 1줄 스킬 호출)
2. **간단한 입력**: JSON만 제공하면 자동 실행
3. **유연성**: 파일 또는 인라인으로 데이터 제공 가능
4. **재사용성**: 동일한 scenes 데이터로 여러 영상 생성 가능
5. **통합성**: generate-script 스킬과 완벽 연동

## Comparison

### Before (Python 스크립트 직접 작성)

```python
from src.video_studio.pipeline import VideoPipeline
from pathlib import Path

pipeline = VideoPipeline()

scenes = [
    {
        "narration": "...",
        "image_prompt": "..."
    },
    # ... more scenes
]

video_path = pipeline.create_video(
    scenes=scenes,
    output_name="video.mp4",
    bgm_path=Path("assets/bgm/music.mp3"),
    keep_intermediates=False
)

print(f"완료: {video_path}")
```

**토큰 사용**: ~50줄 × 1.5토큰 = **75토큰**

### After (run-pipeline 스킬 사용)

```bash
/run-pipeline --config scenes.json
```

**토큰 사용**: ~1줄 = **1-2토큰**

**절약**: **~73토큰 (97% 감소)**

## Advanced Usage

### 배치 처리

```bash
# 여러 주제의 영상을 순차 생성
/run-pipeline --config scripts/life_quotes.json
/run-pipeline --config scripts/love_quotes.json
/run-pipeline --config scripts/freedom_quotes.json
```

### 디버깅 모드

```json
{
  "scenes": [...],
  "output_name": "debug_test.mp4",
  "keep_intermediates": true  // 중간 파일 보존
}
```

중간 파일 확인:
- `output/temp/images/` - 생성된 이미지
- `output/temp/audio/` - TTS 오디오
- `output/temp/subtitles/` - SRT 자막
- `output/temp/videos/` - 개별 씬 영상

### 품질 테스트

```json
{
  "scenes": [
    {
      "narration": "테스트 명언",
      "image_prompt": "Test scene"
    }
  ],
  "output_name": "quality_test.mp4",
  "bgm_path": null  // BGM 없이 테스트
}
```

## Notes

- 이 스킬은 **기존 Python 모듈을 래핑**한 것이므로 모든 pipeline 기능을 그대로 사용합니다.
- **토큰 절약**이 주 목적이지만, 사용 편의성도 대폭 향상됩니다.
- generate-script 스킬과 함께 사용하면 완전 자동화 가능합니다.
- 대량의 장면(20개 이상)을 처리할 때는 메모리와 시간을 고려하세요.

## Related Skills

- **run-test**: 환경 검증 및 테스트
- **generate-script**: 자동 대본 생성
- **create-video-auto**: 완전 자동화 마스터 스킬

## Related Documents

- [examples/README.md](../../examples/README.md) - 예제 가이드
- [src/video_studio/pipeline.py](../../src/video_studio/pipeline.py) - 파이프라인 구현
