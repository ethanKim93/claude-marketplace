---
name: read-briefing
description: 프로젝트 폴더의 작업지시서(BRIEFING.md)를 파싱하여 job_context.json을 생성합니다. 폴더 기반 워크플로우의 첫 번째 단계입니다. BRIEFING.md, BRIEFING.yaml, BRIEFING.json, 작업지시서.md 순서로 파일을 탐색합니다.
allowed-tools:
  - Read
  - Bash
  - Write
---

# Read Briefing

작업지시서(BRIEFING 파일)를 파싱하여 영상 제작 컨텍스트를 추출합니다.

## Instructions

이 스킬은 **폴더 기반 워크플로우의 첫 번째 단계**입니다.

### 실행 흐름

```
1. --folder 경로에서 BRIEFING 파일 탐색
   탐색 순서: BRIEFING.md → BRIEFING.yaml → BRIEFING.json → briefing.md → 작업지시서.md

2. BriefingParser로 YAML frontmatter 파싱

3. 기본값 정규화 (누락 필드 채우기)

4. {folder}/output/job_context.json 저장

5. 파싱 결과 요약 출력
```

### Python 실행 코드

```python
PYTHONIOENCODING=utf-8 "C:/Users/kimminhyeon/miniconda3/python.exe" - << 'EOF'
import sys
sys.path.insert(0, "D:/workspace/Claude Studio")
import json
from pathlib import Path
from src.video_studio.briefing_parser import BriefingParser

folder = Path("FOLDER_PATH")
parser = BriefingParser()

try:
    context = parser.parse(folder)
    output_dir = folder / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "job_context.json"
    output_file.write_text(json.dumps(context, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ 파싱 완료: {output_file}")
    print(f"   제목: {context.get('title')}")
    print(f"   주제: {context.get('theme')}")
    print(f"   작가: {context.get('author')}")
    print(f"   장면: {context.get('scene_count')}개")
    print(f"   Draft 모드: {context.get('draft', {}).get('enabled')}")
    print(f"   Research: {context.get('research', {}).get('enabled')}")
except FileNotFoundError as e:
    print(f"❌ 오류: {e}")
    sys.exit(1)
EOF
```

## Usage

```bash
# 기본 사용
/read-briefing --folder "projects/my-project"

# examples 폴더 테스트
/read-briefing --folder "examples/sample-project"
```

### 파라미터

- `--folder`: 프로젝트 폴더 경로 (BRIEFING 파일이 있는 폴더)

## Output

### 성공 시

```
📄 작업지시서 발견: BRIEFING.md
✅ 파싱 완료: projects/my-project/output/job_context.json
   제목: 마르쿠스 아우렐리우스 스토아 명언
   주제: 내면의 평정
   작가: 마르쿠스 아우렐리우스
   장면: 10개
   Draft 모드: false
   Research: true
```

### 생성 파일

```
{folder}/
└── output/
    └── job_context.json    ← 파싱된 작업 컨텍스트
```

### `job_context.json` 구조

```json
{
  "title": "마르쿠스 아우렐리우스 스토아 명언",
  "theme": "내면의 평정",
  "author": "마르쿠스 아우렐리우스",
  "scene_count": 10,
  "additional_context": "스토아 철학의 핵심 가르침...",
  "style": {
    "tone": "차분하고 권위 있는",
    "image_style": "notion_sketch",
    "narration_length": "medium",
    "background_color": "1a1a2e"
  },
  "research": {
    "enabled": true,
    "depth": "standard",
    "queries": []
  },
  "draft": {
    "enabled": false,
    "background": "dark",
    "preview_image": false
  },
  "output": {
    "filename": "stoic_quotes.mp4",
    "bgm": "assets/bgm/gymnopedie.mp3"
  },
  "_source_file": "projects/my-project/BRIEFING.md",
  "_folder": "projects/my-project"
}
```

## Error Handling

| 오류 | 원인 | 해결 |
|------|------|------|
| `FileNotFoundError` | BRIEFING 파일 없음 | 폴더에 BRIEFING.md 생성 |
| YAML 파싱 오류 | frontmatter 문법 오류 | YAML 형식 확인 |
| 권한 오류 | output/ 폴더 생성 불가 | 폴더 권한 확인 |

## Related

- `create-video-auto --folder`: 전체 워크플로우에서 자동 호출
- `source-analyst-agent`: 소스 파일 분석 (다음 단계)
- `examples/sample-project/BRIEFING.md`: 작업지시서 예시
