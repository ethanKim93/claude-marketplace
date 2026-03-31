---
name: generate-tts
description: Gemini TTS Pro로 저음의 진지한 나레이션을 생성합니다. 나레이션 낭독, 수면 콘텐츠, 명상 가이드 등 차분한 음성이 필요할 때 사용하세요.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Generate TTS

Gemini TTS Pro를 사용하여 깊고 낮은 저음의 나레이션을 생성합니다.

## Instructions

1. **사용 시점**
   - 나레이션을 음성으로 낭독해야 할 때
   - 수면/명상 콘텐츠를 제작할 때
   - 차분하고 진지한 나레이션이 필요할 때

2. **입력 형식**
   - `narration`: 한국어로 작성된 나레이션 텍스트
   - `output_path`: 저장할 파일 경로 (.wav)

3. **출력**
   - WAV 형식의 오디오 파일
   - 24000Hz, 16bit, mono

## Usage

### 단일 나레이션 생성

```python
from src.video_studio.tts_generator import TTSGenerator
from pathlib import Path

generator = TTSGenerator()
audio_path = generator.generate(
    text="삶이 그대를 속일지라도 슬퍼하거나 노하지 말라.",
    output_path=Path("output/audio/narration_001.wav")
)
print(f"TTS 생성 완료: {audio_path}")
```

### 일괄 나레이션 생성

```python
scenes = [
    {
        "narration": "행복은 삶의 의미이자 목적이다.",
        "index": 0
    },
    {
        "narration": "가장 위대한 영광은 넘어지지 않는 데 있는 것이 아니라, 넘어질 때마다 일어서는 데 있다.",
        "index": 1
    }
]

audio_paths = generator.generate_batch(
    scenes=scenes,
    output_dir=Path("output/audio")
)
```

## Config

| 항목 | 값 | 설명 |
|------|-----|------|
| 모델 | `gemini-2.5-pro-preview-tts` | Gemini TTS Pro (고정) |
| 보이스 | `Enceladus` | 깊고 낮은 저음 (고정) |
| 샘플레이트 | 24000Hz | 고품질 오디오 |
| 비트 깊이 | 16bit | 표준 품질 |
| 채널 | mono | 단일 채널 |

## Features

1. **자동 음성 설정**: Enceladus 보이스가 자동으로 적용되어 일관된 톤 유지
2. **일괄 생성 지원**: 여러 나레이션을 한 번에 생성 가능
3. **인덱싱**: 파일명에 자동으로 인덱스 번호 부여 (narration_001.wav)
4. **고품질 출력**: 24kHz 샘플레이트로 명확한 음질 보장

## Voice Characteristics

**Enceladus 보이스**:
- **톤**: 깊고 낮은 저음
- **분위기**: 진지하고 차분함
- **적합한 용도**: 명언 낭독, 수면 콘텐츠, 명상, 다큐멘터리
- **특징**: 권위 있으면서도 따뜻한 느낌

## Example Texts

명언 영상에 적합한 텍스트 예시:

- "진정한 자유는 두려움 없이 사는 것이다."
- "오늘 할 수 있는 일을 내일로 미루지 말라."
- "인생은 10%의 일어나는 일이고, 90%는 그것에 대한 반응이다."
- "가장 어두운 밤이 지나면 가장 밝은 아침이 온다."

## Notes

- 텍스트는 **한국어**로 작성
- 문장 끝에 적절한 쉼표와 마침표 사용 (자연스러운 호흡을 위해)
- 너무 긴 문장은 2-3개로 분리 권장
- 숫자는 한글로 표기 (예: "3개" → "세 개")
