---
name: compose-video
description: FFmpeg로 이미지, 오디오, 자막, BGM을 합성하여 최종 영상을 제작합니다. 모든 에셋을 하나의 영상으로 통합할 때, fade-in/out 효과와 자막이 필요할 때 사용하세요.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Compose Video

FFmpeg를 사용하여 이미지, 오디오, 자막, BGM을 합성하여 전문가급 영상을 제작합니다.

## Instructions

1. **사용 시점**
   - 이미지, 오디오, 자막을 하나의 영상으로 합성할 때
   - fade-in/out 효과가 필요할 때
   - BGM을 배경음악으로 믹싱할 때
   - 여러 장면을 하나의 영상으로 연결할 때

2. **입력 형식**
   - `image_path`: 이미지 파일 경로
   - `audio_path`: 오디오 파일 경로
   - `srt_path`: SRT 자막 파일 경로
   - `output_path`: 출력 영상 파일 경로
   - `bgm_path`: BGM 파일 경로 (선택)

3. **출력**
   - MP4 형식의 영상 파일
   - 1920x1080, 30fps

## Usage

### 단일 장면 영상 합성

```python
from src.video_studio.video_composer import VideoComposer
from pathlib import Path

composer = VideoComposer()
video_path = composer.compose_scene(
    image_path=Path("output/images/scene_001.png"),
    audio_path=Path("output/audio/narration_001.wav"),
    srt_path=Path("output/subtitles/narration_001.srt"),
    output_path=Path("output/videos/scene_001.mp4"),
    bgm_path=Path("assets/bgm/gymnopedie.mp3")
)
print(f"영상 생성 완료: {video_path}")
```

### 일괄 영상 합성

```python
scenes = [
    {
        "index": 0,
        "image": Path("output/images/scene_000.png"),
        "audio": Path("output/audio/narration_000.wav"),
        "srt": Path("output/subtitles/narration_000.srt")
    },
    {
        "index": 1,
        "image": Path("output/images/scene_001.png"),
        "audio": Path("output/audio/narration_001.wav"),
        "srt": Path("output/subtitles/narration_001.srt")
    }
]

video_paths = composer.compose_batch(
    scenes=scenes,
    output_dir=Path("output/videos"),
    bgm_path=Path("assets/bgm/gymnopedie.mp3")
)
```

### 영상 연결

```python
video_paths = [
    Path("output/videos/scene_000.mp4"),
    Path("output/videos/scene_001.mp4"),
]

final_video = composer.concatenate_videos(
    video_paths=video_paths,
    output_path=Path("output/final_video.mp4")
)
```

## Config

| 항목 | 값 | 설명 |
|------|-----|------|
| 해상도 | 1920x1080 | Full HD |
| FPS | 30 | 부드러운 재생 |
| 비디오 코덱 | libx264 | 범용 호환성 |
| 오디오 코덱 | aac | 표준 오디오 |
| 비디오 비트레이트 | 5000k | 고품질 |
| 오디오 비트레이트 | 192k | CD 수준 |
| 페이드 시간 | 0.5초 | 자연스러운 전환 |
| BGM 볼륨 | 15% | 나레이션 방해 없음 |

## Subtitle Style

| 항목 | 값 |
|------|-----|
| 폰트 | KOTRA_SONGEULSSI (손글씨체) |
| 크기 | 48pt |
| 색상 | 흰색 |
| 외곽선 | 검정, 2px |
| 위치 | 하단 80px 마진 |

## Features

1. **자동 길이 조절**: 오디오 길이에 맞춰 이미지 재생 시간 자동 조절
2. **Fade 효과**: 페이드 인/아웃 자동 적용 (0.5초)
3. **자막 렌더링**: SRT 파일을 영상에 직접 렌더링
4. **BGM 믹싱**: 나레이션과 BGM을 자동으로 믹싱 (15% 볼륨)
5. **일괄 처리**: 여러 장면을 한 번에 처리
6. **영상 연결**: 여러 영상을 끊김 없이 하나로 연결

## Processing Flow

```
이미지 → 리사이징(1920x1080) → Fade In/Out
  ↓
오디오 → 길이 측정
  ↓
SRT → 자막 렌더링
  ↓
BGM → 볼륨 조절(15%) → 믹싱
  ↓
최종 MP4 출력
```

## Performance

- **단일 장면**: 약 3-5초 (10초 오디오 기준)
- **영상 연결**: 장면 수에 비례 (거의 즉시 복사)
- **메모리**: 장면당 약 500MB

## Notes

- FFmpeg 설치 필수
- 폰트 파일(`assets/font/KOTRA_SONGEULSSI.ttf`) 필요
- BGM은 오디오 길이만큼 자동 반복
- 중간 파일은 자동으로 정리 가능
