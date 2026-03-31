---
name: generate-subtitle
description: Whisper로 오디오에서 정확한 타임스탬프를 추출하고 SRT 자막을 생성합니다. 한국어 음성의 자막이 필요할 때, 타이밍 동기화가 중요할 때 사용하세요.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Generate Subtitle

Whisper를 사용하여 오디오에서 타임스탬프를 추출하고 SRT 자막을 생성합니다.

## Instructions

1. **사용 시점**
   - TTS 오디오에서 자막을 생성해야 할 때
   - 정확한 타이밍 동기화가 필요할 때
   - 한국어 음성을 텍스트로 변환할 때

2. **입력 형식**
   - `audio_path`: 오디오 파일 경로 (.wav, .mp3 등)
   - `output_path`: 저장할 SRT 파일 경로 (.srt)

3. **출력**
   - SRT 형식의 자막 파일
   - 단어 단위 타임스탬프 포함

## Usage

### 단일 자막 생성

```python
from src.video_studio.subtitle_sync import SubtitleSync
from pathlib import Path

sync = SubtitleSync()
srt_path = sync.generate_srt(
    audio_path=Path("output/audio/narration_001.wav"),
    output_path=Path("output/subtitles/narration_001.srt")
)
print(f"자막 생성 완료: {srt_path}")
```

### 일괄 자막 생성

```python
audio_paths = [
    Path("output/audio/narration_001.wav"),
    Path("output/audio/narration_002.wav"),
]

srt_paths = sync.generate_batch(
    audio_paths=audio_paths,
    output_dir=Path("output/subtitles")
)
```

### 타임스탬프만 추출

```python
result = sync.extract_timestamps(
    audio_path=Path("output/audio/narration_001.wav")
)

# 세그먼트 확인
for segment in result['segments']:
    print(f"{segment['start']:.2f}s - {segment['end']:.2f}s: {segment['text']}")
```

## Config

| 항목 | 값 | 설명 |
|------|-----|------|
| 모델 | `large-v3` | Whisper large-v3 (고정) |
| 언어 | `ko` | 한국어 (고정) |
| 타임스탬프 | Word-level | 단어 단위 정확도 |

## Features

1. **최고 정확도**: Whisper large-v3 모델로 한국어 인식률 최고
2. **단어 단위 타임스탬프**: 세밀한 동기화 가능
3. **일괄 처리 지원**: 여러 오디오 파일을 한 번에 처리
4. **SRT 자동 생성**: 표준 SRT 형식으로 자동 변환
5. **자동 파일명 매칭**: 오디오 파일명에 맞춰 SRT 파일명 생성

## SRT Format

생성되는 SRT 형식:

```
1
00:00:00,000 --> 00:00:03,500
삶이 그대를 속일지라도

2
00:00:03,500 --> 00:00:06,200
슬퍼하거나 노하지 말라.
```

## Performance

- **모델 로드**: 초기 1회만 (약 10초)
- **처리 속도**: 오디오 길이의 약 1/5 (10초 오디오 → 2초 처리)
- **메모리**: 약 3GB VRAM (GPU) 또는 8GB RAM (CPU)

## Notes

- 첫 실행 시 Whisper 모델 다운로드 필요 (약 3GB)
- GPU 사용 시 처리 속도 대폭 향상
- 배경 소음이 적을수록 정확도 향상
- TTS 생성 음성은 인식률 거의 100%
