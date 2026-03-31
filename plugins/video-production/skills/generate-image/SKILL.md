---
name: generate-image
description: Gemini 3 Pro로 Notion 스타일 미니멀 일러스트를 생성합니다. 영상의 배경 이미지가 필요할 때, 철학적/예술적 스케치 이미지를 만들 때 사용하세요.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Generate Image

Gemini 3 Pro를 사용하여 연필 스케치 스타일의 미니멀 일러스트를 생성합니다.

## Instructions

1. **사용 시점**
   - 영상의 배경 이미지가 필요할 때
   - 철학적이고 예술적인 장면을 표현하고 싶을 때
   - Notion 스타일의 깔끔한 일러스트가 필요할 때

2. **입력 형식**
   - `image_prompt`: 영어로 작성된 장면 설명
   - `output_path`: 저장할 파일 경로 (.png)

3. **출력**
   - PNG 형식의 이미지 파일
   - 1920x1080 해상도에 최적화된 비율

## Usage

### 단일 이미지 생성

```python
from src.video_studio.image_generator import ImageGenerator
from pathlib import Path

generator = ImageGenerator()
image_path = generator.generate(
    prompt="A solitary figure standing at the edge of a cliff, contemplating the vast ocean below",
    output_path=Path("output/images/scene_001.png")
)
print(f"이미지 생성 완료: {image_path}")
```

### 일괄 이미지 생성

```python
scenes = [
    {
        "image_prompt": "A person reading a book under a tree",
        "index": 0
    },
    {
        "image_prompt": "Rain drops falling on a window",
        "index": 1
    }
]

image_paths = generator.generate_batch(
    scenes=scenes,
    output_dir=Path("output/images")
)
```

## Config

| 항목 | 값 | 설명 |
|------|-----|------|
| 모델 | `gemini-3-pro-image-preview` | Gemini 3 Pro (고정) |
| 스타일 | Notion 스타일 미니멀 일러스트 | 연필 스케치 느낌 |
| 배경 | 크림/베이지 빈티지 종이 | 따뜻한 톤 |
| 선 | 굵은 검정 라인 | 손그림 느낌 |
| 구도 | 중앙 배치, 심플 | 미니멀리즘 |

## Features

1. **자동 스타일 적용**: IMAGE_STYLE_PROMPT가 자동으로 추가되어 일관된 스타일 유지
2. **일괄 생성 지원**: 여러 장면을 한 번에 생성 가능
3. **인덱싱**: 파일명에 자동으로 인덱스 번호 부여 (scene_001.png)
4. **에러 핸들링**: API 키 검증 및 생성 실패 시 명확한 오류 메시지

## Example Prompts

명언 영상에 적합한 프롬프트 예시:

- "A lone tree on a hill under starry night sky"
- "An open book with pages turning in the wind"
- "A path through a misty forest at dawn"
- "A candle flame in darkness"
- "Mountains reflected in a calm lake"
- "A clock without hands floating in clouds"

## Notes

- 프롬프트는 반드시 **영어**로 작성
- 장면 설명은 구체적이고 시각적으로 작성
- 복잡한 디테일보다는 심플한 구도 권장
- 철학적/명상적 분위기를 강조
