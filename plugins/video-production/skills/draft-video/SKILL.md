---
name: draft-video
description: 이미지 생성 없이 컬러 배경으로 초안 영상을 제작합니다. API 비용 없이 TTS+자막만으로 빠르게 테스트할 때 사용하세요. FFmpeg lavfi color source로 배경을 생성하므로 Gemini 이미지 API를 호출하지 않습니다. 소요 시간 약 30-60초.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Draft Video

이미지 없는 초안 영상을 제작합니다.

## Instructions

이 스킬은 **API 비용 없이** 초안 영상을 빠르게 만듭니다.

### 특징

| 항목 | Draft 모드 | 전체 모드 |
|------|-----------|---------|
| 배경 | FFmpeg lavfi 컬러 배경 | Gemini 이미지 생성 |
| API 비용 | 무료 (TTS만 사용) | 이미지 API 비용 발생 |
| 소요 시간 | ~30-60초 | ~3-5분 |
| 목적 | 대본/자막/TTS 검토 | 최종 영상 |

### 실행 흐름

```
1. script.json 또는 job_context.json 로드

2. 각 장면별:
   a. TTS 생성 (tts_generator.py 재사용)
   b. Whisper 자막 생성 (subtitle_sync.py 재사용)
   c. FFmpeg lavfi color 배경 + 자막 + 오디오 합성

3. 장면 영상들을 연결

4. {folder}/output/draft_video.mp4 저장
```

### Python 실행 코드 (폴더 모드)

```python
PYTHONIOENCODING=utf-8 "C:/Users/kimminhyeon/miniconda3/python.exe" - << 'EOF'
import sys
sys.path.insert(0, "D:/workspace/Claude Studio")
import json
from pathlib import Path
from src.video_studio.draft_pipeline import DraftPipeline

folder = Path("FOLDER_PATH")
script_path = folder / "output" / "script.json"
job_context_path = folder / "output" / "job_context.json"

# 대본 로드
if script_path.exists():
    data = json.loads(script_path.read_text(encoding="utf-8"))
    scenes = data.get("scenes", data) if isinstance(data, dict) else data
elif job_context_path.exists():
    context = json.loads(job_context_path.read_text(encoding="utf-8"))
    print("⚠️ script.json 없음. 먼저 /generate-script를 실행하세요.")
    sys.exit(1)
else:
    print("❌ script.json 또는 job_context.json을 찾을 수 없습니다.")
    sys.exit(1)

# 배경 설정
job_context = {}
if job_context_path.exists():
    job_context = json.loads(job_context_path.read_text(encoding="utf-8"))
background = job_context.get("draft", {}).get("background", "dark")
bgm_path = job_context.get("output", {}).get("bgm")
if bgm_path:
    bgm_path = Path("D:/workspace/Claude Studio") / bgm_path

# 초안 영상 제작
pipeline = DraftPipeline()
output = pipeline.create_draft(
    scenes=scenes,
    output_name="draft_video.mp4",
    output_dir=folder / "output",
    background=background,
    bgm_path=bgm_path if bgm_path and bgm_path.exists() else None,
)
print(f"\n✅ 초안 영상 완성: {output}")
EOF
```

### Python 실행 코드 (스크립트 직접 지정)

```python
PYTHONIOENCODING=utf-8 "C:/Users/kimminhyeon/miniconda3/python.exe" - << 'EOF'
import sys
sys.path.insert(0, "D:/workspace/Claude Studio")
from pathlib import Path
from src.video_studio.draft_pipeline import create_draft_from_script

output = create_draft_from_script(
    script_path=Path("SCRIPT_PATH"),
    background="BACKGROUND_TYPE",
)
print(f"\n✅ 초안 영상: {output}")
EOF
```

## Usage

```bash
# 폴더 모드 (job_context.json + script.json 필요)
/draft-video --folder "projects/my-project"

# 스크립트 직접 지정
/draft-video --script "output/scripts/script_인생_20260218.json"

# 배경 지정
/draft-video --folder "projects/my-project" --background "light"

# BGM 추가
/draft-video --folder "projects/my-project" --bgm "assets/bgm/gymnopedie.mp3"
```

### 파라미터

| 파라미터 | 설명 | 기본값 |
|---------|------|-------|
| `--folder` | 프로젝트 폴더 경로 | - |
| `--script` | script.json 직접 지정 | - |
| `--background` | 배경 유형 | `dark` |
| `--bgm` | BGM 파일 경로 | BRIEFING 설정값 |

### 배경 옵션

| 값 | 색상 | 효과 |
|----|------|------|
| `dark` | #1a1a2e (짙은 남색) | 기본값, 고급스러운 분위기 |
| `light` | #f5f0e8 (크림색) | 밝고 따뜻한 분위기 |
| `gradient` | 남색 그라디언트 | 역동적인 배경 |
| `sepia` | #2c2416 (세피아) | 클래식한 분위기 |
| `slate` | #1e2a3a (슬레이트) | 모던한 분위기 |

## Output

```
projects/my-project/
└── output/
    └── draft_video.mp4     ← 생성된 초안 영상
```

## Notes

- 이미지 생성 단계가 없으므로 **API 비용이 최소화**됩니다
- TTS는 Gemini TTS API를 사용하므로 해당 비용은 발생합니다
- 자막 위치, 폰트, 타이밍은 최종 영상과 동일하게 적용됩니다
- 초안 확인 후 `/run-pipeline`으로 최종 영상을 제작하세요

## Related

- `preview-image`: 샘플 이미지 1장 확인
- `run-pipeline`: 전체 영상 제작 (이미지 포함)
- `create-video-auto --draft`: 폴더 모드에서 draft 자동 실행
