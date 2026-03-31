---
name: generate-briefing
description: 프로젝트 폴더의 소스 파일을 분석하여 BRIEFING.md 초안을 자동 생성합니다. sources/ 폴더의 텍스트/이미지/영상/URL 파일을 스캔하여 content_type, theme 등을 추론합니다. 기존 BRIEFING.md가 있으면 덮어쓰지 않고 경고합니다.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Generate Briefing

프로젝트 폴더를 분석하여 BRIEFING.md 초안을 자동 생성합니다.

## Instructions

이 스킬은 `sources/` 폴더의 파일들을 분석하여 BRIEFING.md 초안을 생성합니다.
생성된 파일에는 `# TODO: 확인/수정하세요` 주석이 포함되어 있어 작업자가 쉽게 검토할 수 있습니다.

### 1. 실행 방식

```python
PYTHONIOENCODING=utf-8 "C:/Users/kimminhyeon/miniconda3/python.exe" - << 'EOF'
import sys
sys.path.insert(0, "D:/workspace/Claude Studio")
from pathlib import Path
from src.video_studio.briefing_generator import BriefingGenerator

folder = Path("FOLDER_PATH")
generator = BriefingGenerator()

briefing_path = folder / "BRIEFING.md"
if briefing_path.exists():
    print(f"⚠️  BRIEFING.md가 이미 존재합니다: {briefing_path}")
    print("   --overwrite 옵션으로 덮어쓸 수 있습니다.")
else:
    result = generator.create_briefing(folder)
    print(f"\n📋 다음 단계:")
    print("   1. BRIEFING.md를 열어 TODO 항목 확인/수정")
    print("   2. theme 필드에 주제 입력 (필수)")
    print("   3. /create-video-auto --folder 로 영상 제작 시작")
EOF
```

### 2. 출력

- `{folder}/BRIEFING.md` — 생성된 초안 파일

## Usage

```bash
# 기본 사용
/generate-briefing --folder "projects/my-project"

# 강제 덮어쓰기
/generate-briefing --folder "projects/my-project" --overwrite
```

### 파라미터

- `--folder`: 프로젝트 폴더 경로 (필수)
- `--overwrite`: 기존 BRIEFING.md 덮어쓰기 (선택, 기본: false)

## Output

### 성공 시

```
📂 폴더 분석 중: projects/my-project
   발견된 소스: 3개
✅ BRIEFING.md 생성 완료: projects/my-project/BRIEFING.md
   추론된 content_type: quote
   추론된 주제: 내면의 평정

📋 다음 단계:
   1. BRIEFING.md를 열어 TODO 항목 확인/수정
   2. theme 필드에 주제 입력 (필수)
   3. /create-video-auto --folder 로 영상 제작 시작
```

### 생성된 BRIEFING.md 예시

```yaml
---
title: "my-project"
theme: "내면의 평정"
author: ""  # TODO: 작가명 입력 (선택사항)
scene_count: 10
content_type: "quote"  # quote | narration | storytelling | educational | custom
voice: "Enceladus"
...
---
```

## Features

1. **자동 content_type 추론**: 파일명으로 quote/narration/storytelling/educational 추론
2. **theme 추론**: 텍스트 파일 첫 줄에서 주제 추출 시도
3. **scene_count 조정**: 이미지 파일 수 기반으로 자동 조정
4. **TODO 주석**: 검토 필요 항목에 명시적 주석 삽입
5. **안전한 덮어쓰기 방지**: 기존 파일 보호

## Workflow

```
1. sources/ 폴더 스캔
   ↓
2. 파일 유형별 분류
   - 텍스트: content_type, theme 추론
   - 이미지: scene_count 조정
   - URLs: research 활성화
   ↓
3. BRIEFING.md 초안 생성 (TODO 주석 포함)
   ↓
4. 작업자 검토 안내 출력
   ↓
5. (선택) /create-video-auto --folder 실행
```

## Related

- `briefing-generator-agent`: 이 스킬을 내부적으로 실행하는 에이전트
- `read-briefing`: 완성된 BRIEFING.md를 파싱하여 job_context.json 생성
- `create-video-auto`: 전체 워크플로우 자동화
- [src/video_studio/briefing_generator.py](../../src/video_studio/briefing_generator.py) - 구현 코드
