---
name: preview-image
description: 영상 전체 제작 전 샘플 이미지 1장을 생성하여 스타일을 확인합니다. 이미지 API 비용은 1장만 발생합니다. 첫 장면의 image_prompt를 사용하여 BRIEFING의 image_style을 적용합니다.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Preview Image

영상 제작 전 샘플 이미지 1장을 생성하여 스타일을 미리 확인합니다.

## Instructions

이 스킬은 **이미지 스타일 확인용**입니다.

### 동작 원리

```
1. job_context.json 또는 script.json에서 첫 번째 장면의 image_prompt 추출

2. BRIEFING의 image_style 적용
   - notion_sketch: Notion 스타일 미니멀 일러스트 (기본값)
   - watercolor: 수채화 스타일
   - dark_minimal: 다크 미니멀

3. image_generator.py 재사용하여 이미지 1장 생성

4. {folder}/output/preview/sample_001.png 저장

5. 파일 경로 및 확인 메시지 출력
```

### Python 실행 코드

```python
PYTHONIOENCODING=utf-8 "C:/Users/kimminhyeon/miniconda3/python.exe" - << 'EOF'
import sys
sys.path.insert(0, "D:/workspace/Claude Studio")
import json
from pathlib import Path
from src.video_studio.image_generator import ImageGenerator

# 경로 설정
folder = Path("FOLDER_PATH")
script_path = folder / "output" / "script.json"
job_context_path = folder / "output" / "job_context.json"

# image_prompt 추출
image_prompt = None

if script_path.exists():
    data = json.loads(script_path.read_text(encoding="utf-8"))
    scenes = data.get("scenes", []) if isinstance(data, dict) else data
    if scenes:
        image_prompt = scenes[0].get("image_prompt", "")

if not image_prompt and job_context_path.exists():
    context = json.loads(job_context_path.read_text(encoding="utf-8"))
    theme = context.get("theme", "philosophy")
    author = context.get("author", "")
    image_prompt = f"A philosophical scene representing {theme} by {author}, minimalist illustration"

if not image_prompt:
    image_prompt = "IMAGE_PROMPT"

print(f"🖼️ 이미지 프롬프트: {image_prompt[:80]}...")

# 스타일 적용
style_map = {
    "notion_sketch": "Minimalist Notion-style illustration with pencil sketch aesthetics, cream background",
    "watercolor": "Soft watercolor painting, gentle colors, artistic and serene",
    "dark_minimal": "Dark minimalist illustration, deep colors, dramatic lighting",
}

image_style = "STYLE"
if job_context_path.exists():
    context = json.loads(job_context_path.read_text(encoding="utf-8"))
    image_style = context.get("style", {}).get("image_style", "notion_sketch")

style_desc = style_map.get(image_style, style_map["notion_sketch"])
full_prompt = f"{image_prompt}. Style: {style_desc}"

# 이미지 생성
output_dir = folder / "output" / "preview"
output_dir.mkdir(parents=True, exist_ok=True)
output_path = output_dir / "sample_001.png"

generator = ImageGenerator()
result = generator.generate(full_prompt, output_path)
print(f"\n✅ 샘플 이미지 저장: {result}")
print(f"\n확인 후 전체 영상 제작을 진행하려면:")
print(f"  /create-video-auto --folder {folder}")
print(f"이미지 스타일을 변경하려면 BRIEFING.md의 image_style을 수정하세요.")
EOF
```

## Usage

```bash
# 폴더 모드 (job_context.json 필요)
/preview-image --folder "projects/my-project"

# 직접 프롬프트 지정
/preview-image --prompt "A stoic philosopher meditating" --style "notion_sketch"

# 스타일 변경 테스트
/preview-image --folder "projects/my-project" --style "watercolor"
```

### 파라미터

| 파라미터 | 설명 | 기본값 |
|---------|------|-------|
| `--folder` | 프로젝트 폴더 경로 | - |
| `--prompt` | 이미지 프롬프트 직접 지정 | script.json 첫 장면 |
| `--style` | 이미지 스타일 | BRIEFING 설정값 |

### 이미지 스타일 옵션

| 값 | 설명 |
|----|------|
| `notion_sketch` | Notion 스타일 미니멀 연필 스케치 (기본값) |
| `watercolor` | 부드러운 수채화 |
| `dark_minimal` | 다크 미니멀리스트 |

## Output

```
projects/my-project/
└── output/
    └── preview/
        └── sample_001.png    ← 샘플 이미지
```

## 비용 정보

- **이미지 1장 API 비용**만 발생합니다
- 전체 영상 대비 약 1/10 ~ 1/20의 비용
- 스타일이 마음에 들면 `/create-video-auto --folder`로 전체 제작 진행

## Workflow

```
/preview-image --folder "projects/my-project"
    ↓
이미지 확인 (output/preview/sample_001.png)
    ↓
OK → /create-video-auto --folder "projects/my-project"
    ↓
NG → BRIEFING.md의 image_style 수정 → 재시도
```

## Related

- `draft-video`: 이미지 없는 초안 영상 (TTS/자막 먼저 확인)
- `create-video-auto`: 전체 워크플로우
- `generate-image`: 이미지 생성 스킬 (직접 사용)
