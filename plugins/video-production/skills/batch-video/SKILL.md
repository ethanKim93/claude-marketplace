---
name: batch-video
description: BRIEFING.md의 batch 섹션에 정의된 여러 작업을 순차적으로 처리합니다. 각 job이 실패해도 다음 job을 계속 진행하며, 완료 후 성공/실패/소요시간 리포트를 생성합니다.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Batch Video

여러 영상 작업을 배치로 처리합니다.

## Instructions

이 스킬은 **BRIEFING.md의 batch.jobs를 순차 처리**합니다.

### batch.jobs 형식 (BRIEFING.md)

```yaml
batch:
  enabled: true
  jobs:
    - theme: "인생"
      author: "쇼펜하우어"
      output: "schopenhauer_life.mp4"
    - theme: "자유"
      author: "사르트르"
      output: "sartre_freedom.mp4"
    - theme: "명상"
      author: "틱낫한"
      output: "thich_meditation.mp4"
```

### 실행 흐름

```
1. job_context.json 로드 (read-briefing 결과)

2. batch.jobs 순회:
   각 job:
   a. 이전 job과 독립적으로 처리
   b. generate-script 호출 (job별 theme/author/context)
   c. run-pipeline 또는 draft-video 호출
   d. 실패 시 오류 기록 후 다음 job 계속

3. 완료 리포트 생성
   - 성공/실패 수
   - 각 job 소요 시간
   - 생성된 영상 목록
```

### Python 실행 코드

```python
PYTHONIOENCODING=utf-8 "C:/Users/kimminhyeon/miniconda3/python.exe" - << 'EOF'
import sys, json, time
sys.path.insert(0, "D:/workspace/Claude Studio")
from pathlib import Path
from src.video_studio.script_generator import ScriptGenerator
from src.video_studio.pipeline import VideoPipeline
from src.video_studio.draft_pipeline import DraftPipeline
from src.video_studio.config import OUTPUT_DIR

folder = Path("FOLDER_PATH")
job_context_path = folder / "output" / "job_context.json"

if not job_context_path.exists():
    print("❌ job_context.json 없음. /read-briefing를 먼저 실행하세요.")
    sys.exit(1)

job_context = json.loads(job_context_path.read_text(encoding="utf-8"))
batch = job_context.get("batch", {})

if not batch.get("enabled"):
    print("⚠️ batch.enabled가 false입니다. BRIEFING.md의 batch.enabled를 true로 설정하세요.")
    sys.exit(0)

jobs = batch.get("jobs", [])
if not jobs:
    print("⚠️ batch.jobs가 비어있습니다.")
    sys.exit(0)

print(f"\n🔄 배치 작업 시작: {len(jobs)}개 job")
print("=" * 50)

results = []
total_start = time.time()

for i, job in enumerate(jobs):
    job_start = time.time()
    theme = job.get("theme", job_context.get("theme", "인생"))
    author = job.get("author", job_context.get("author", ""))
    output_name = job.get("output", f"batch_{i+1:02d}_{theme}.mp4")
    context = job.get("context", "")
    count = job.get("scene_count", job_context.get("scene_count", 10))
    draft_mode = job.get("draft", job_context.get("draft", {}).get("enabled", False))

    print(f"\n[Job {i+1}/{len(jobs)}] {theme} / {author}")

    try:
        # 대본 생성
        generator = ScriptGenerator()
        scenes = generator.generate(
            theme=theme,
            author=author,
            count=count,
            context=context,
        )

        # 영상 제작
        if draft_mode:
            pipeline = DraftPipeline()
            pipeline.create_draft(
                scenes=scenes,
                output_name=output_name,
                output_dir=folder / "output",
                background=job_context.get("draft", {}).get("background", "dark"),
            )
        else:
            pipeline = VideoPipeline()
            pipeline.run(scenes=scenes, output_name=output_name)

        elapsed = time.time() - job_start
        results.append({"job": i+1, "theme": theme, "output": output_name,
                        "status": "success", "elapsed": elapsed})
        print(f"  ✅ 완료 ({elapsed:.0f}초): {output_name}")

    except Exception as e:
        elapsed = time.time() - job_start
        results.append({"job": i+1, "theme": theme, "output": output_name,
                        "status": "failed", "error": str(e), "elapsed": elapsed})
        print(f"  ❌ 실패 ({elapsed:.0f}초): {e}")

# 최종 리포트
total_elapsed = time.time() - total_start
success = [r for r in results if r["status"] == "success"]
failed = [r for r in results if r["status"] == "failed"]

report = {
    "total_jobs": len(jobs),
    "success": len(success),
    "failed": len(failed),
    "total_elapsed": total_elapsed,
    "results": results
}

report_path = folder / "output" / "batch_report.json"
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"\n{'=' * 50}")
print(f"📊 배치 완료: {len(success)}/{len(jobs)} 성공, {len(failed)} 실패")
print(f"⏱️ 총 소요 시간: {total_elapsed:.0f}초")
print(f"📄 리포트: {report_path}")
EOF
```

## Usage

```bash
# 폴더 기반 배치 작업
/batch-video --folder "projects/my-project"

# draft 모드로 배치
/batch-video --folder "projects/my-project" --draft
```

### 파라미터

| 파라미터 | 설명 |
|---------|------|
| `--folder` | 프로젝트 폴더 (batch.jobs가 있는 BRIEFING.md) |
| `--draft` | 모든 job을 draft 모드로 실행 |

## BRIEFING.md 배치 설정

```yaml
---
batch:
  enabled: true
  jobs:
    - theme: "인생"
      author: "쇼펜하우어"
      output: "schopenhauer_life.mp4"
      scene_count: 8
    - theme: "자유"
      author: "사르트르"
      output: "sartre_freedom.mp4"
      draft: true          # 이 job만 draft 모드
    - theme: "명상"
      author: "틱낫한"
      output: "thich_meditation.mp4"
      context: "마음챙김, 현재 순간"
---
```

## Output

```
projects/my-project/
└── output/
    ├── schopenhauer_life.mp4
    ├── sartre_freedom.mp4
    ├── thich_meditation.mp4
    └── batch_report.json    ← 성공/실패 리포트
```

### `batch_report.json` 예시

```json
{
  "total_jobs": 3,
  "success": 2,
  "failed": 1,
  "total_elapsed": 540.2,
  "results": [
    {"job": 1, "theme": "인생", "status": "success", "elapsed": 180.3},
    {"job": 2, "theme": "자유", "status": "failed", "error": "...", "elapsed": 5.1},
    {"job": 3, "theme": "명상", "status": "success", "elapsed": 195.8}
  ]
}
```

## Notes

- 한 job이 실패해도 **나머지 job은 계속 진행**됩니다
- 각 job은 독립적인 대본/영상으로 생성됩니다
- 대용량 배치 작업 시 메모리/API 제한에 주의하세요

## Related

- `read-briefing`: batch.enabled 포함 컨텍스트 파싱
- `create-video-auto`: 단일 영상 자동화
- `run-pipeline`: 개별 영상 제작
