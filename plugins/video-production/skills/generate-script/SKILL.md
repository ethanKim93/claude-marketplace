---
name: generate-script
description: 주제, 작가, 컨텍스트를 입력받아 LLM(Gemini)으로 영상 대본을 자동 생성합니다. content_type으로 명언/나레이션/스토리텔링/교육/커스텀 형식을 선택합니다. 생성된 대본은 JSON 파일로 저장되어 run-pipeline 스킬에 바로 사용할 수 있습니다.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Generate Script

LLM 기반 영상 대본 자동 생성 스킬입니다.

## Instructions

이 스킬은 주제와 작가를 입력받아 자동으로 영상 대본을 생성합니다.

### 1. 입력 파라미터

#### 필수
- `--theme`: 주제 (예: "인생", "사랑", "자유", "행복")

#### 선택
- `--author`: 특정 작가 (예: "쇼펜하우어", "니체", "사르트르")
- `--count`: 장면 개수 (기본값: 12)
- `--style`: 스타일 (기본값: "철학적")
- `--content-type`: 콘텐츠 타입 (기본값: "quote") — quote | narration | storytelling | educational | custom
- `--context`: 추가 컨텍스트 (예: "실존주의 철학", "동양 사상")

### 2. 실행 방식

스킬이 자동으로 다음을 수행합니다:

```python
from src.video_studio.script_generator import ScriptGenerator

generator = ScriptGenerator()

result = generator.generate(
    theme="인생",
    author="쇼펜하우어",
    count=12,
    style="철학적",
    context="비관주의 철학",
    content_type="quote"  # quote | narration | storytelling | educational | custom
)

# 대본 저장
filepath = generator.save_script(result)
```

### 3. 출력

- **JSON 파일**: `output/scripts/script_{theme}_{timestamp}.json`
- **장면 미리보기**: 처음 3개 장면 출력
- **통계**: 장면 수, 예상 영상 길이

## Usage

### 기본 사용

```bash
# 주제만 지정
/generate-script --theme "인생"

# 주제 + 작가
/generate-script --theme "자유" --author "사르트르"

# 모든 옵션 지정
/generate-script \
  --theme "사랑" \
  --author "에리히 프롬" \
  --count 8 \
  --style "따뜻하고 공감적" \
  --context "성숙한 사랑의 예술"
```

### 사용 예시

#### 예시 1: 쇼펜하우어의 인생 명언
```bash
/generate-script --theme "인생" --author "쇼펜하우어" --count 12
```

**생성 결과**:
```
📝 대본 생성 시작
   주제: 인생
   작가: 쇼펜하우어
   개수: 12개
   스타일: 철학적

🤖 LLM으로 대본 생성 중...
✅ 12개 장면 생성 완료

📁 저장 위치: output/scripts/script_인생_20260218_092000.json
📊 장면 수: 12개
⏱️ 예상 영상 길이: 약 2분

장면 미리보기 (처음 3개):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] "삶의 지혜는 원하는 것을 얻는 기술이 아니라, 원하는 것을 바꾸는 기술이다."
    → A person sitting on a mountain peak, watching clouds change shapes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2] "우리는 행복을 찾는 것이 아니라, 불행을 피하는 것이다."
    → A lighthouse standing firm against stormy waves
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3] "인생은 고통스럽거나 따분하다. 그 중간은 없다."
    → A pendulum swinging between light and shadow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 예시 2: 자유 주제 (작가 미지정)
```bash
/generate-script --theme "자유" --count 10
```

**생성 결과**: 다양한 철학자들의 자유 관련 명언 10개

#### 예시 3: 컨텍스트 추가
```bash
/generate-script \
  --theme "행복" \
  --author "달라이 라마" \
  --count 8 \
  --context "내면의 평화, 마음챙김, 자비"
```

## Output Format

### 생성된 JSON 파일 구조

```json
{
  "scenes": [
    {
      "narration": "한국어 명언 (20-60자)",
      "image_prompt": "영어 장면 설명 (Notion 스타일)",
      "source": "작가명"
    },
    ...
  ],
  "metadata": {
    "theme": "주제",
    "author": "작가명",
    "total_count": 12,
    "estimated_duration": "약 2분",
    "generated_at": "2026-02-18T09:20:00",
    "style": "철학적",
    "context": "추가 컨텍스트"
  }
}
```

### 장면 데이터 예시

```json
{
  "narration": "삶이 그대를 속일지라도 슬퍼하거나 노하지 말라.",
  "image_prompt": "A solitary figure standing on a peaceful hill under starry night sky, contemplative mood, pencil sketch style, minimalist, philosophical",
  "source": "푸시킨"
}
```

## Features

1. **자동 대본 생성**: 주제만 입력하면 LLM이 명언 자동 생성
2. **이미지 프롬프트 포함**: 각 명언에 어울리는 시각적 장면 자동 설명
3. **JSON 형식**: run-pipeline 스킬과 즉시 호환
4. **메타데이터**: 생성 시간, 예상 길이 등 추가 정보 포함
5. **유연성**: 작가, 스타일, 컨텍스트 등 다양한 옵션 지원

## LLM 프롬프트 전략

이 스킬은 다음과 같은 프롬프트 전략을 사용합니다:

### 명언 생성 가이드
- **길이**: 20-60자 (적절한 TTS 길이)
- **톤**: 심오하고 보편적인 진리
- **언어**: 자연스러운 한국어
- **시대 초월**: 누구나 공감할 수 있는 메시지

### 이미지 프롬프트 가이드
- **스타일**: Notion 스타일 미니멀 일러스트
- **특징**: 연필 스케치, 손그림 느낌, 크림/베이지 배경
- **구도**: 중앙 집중, 심플하고 깔끔
- **분위기**: 철학적, 명상적, 고요함
- **요소**: 자연(산, 바다, 나무), 추상적 개념의 시각화

## Error Handling

### API 키 오류
```
Error: GEMINI_API_KEY not found

해결:
1. .env 파일 확인
2. GEMINI_API_KEY=실제키값 입력
```

### JSON 파싱 오류
```
Warning: JSON 파싱 오류 발생

Fallback 동작:
- 기본 장면 1개 반환
- 수동으로 scenes 확인 및 수정 가능
```

### LLM 응답 오류
```
Error: LLM API 호출 실패

해결:
1. 인터넷 연결 확인
2. API 할당량 확인
3. 잠시 후 재시도
```

## Advanced Usage

### 생성된 대본 수정

```bash
# 1. 대본 생성
/generate-script --theme "인생" --count 10

# 2. JSON 파일 수동 편집
# output/scripts/script_인생_YYYYMMDD_HHMMSS.json

# 3. 수정된 대본으로 영상 생성
/run-pipeline --config output/scripts/script_인생_YYYYMMDD_HHMMSS.json
```

### 여러 주제 일괄 생성

```bash
# 여러 주제의 대본을 순차 생성
/generate-script --theme "인생" --count 12
/generate-script --theme "사랑" --count 10
/generate-script --theme "자유" --count 8

# 생성된 모든 대본 확인
ls output/scripts/
```

### 품질 검증

```json
// 생성된 대본 검토 체크리스트
{
  "narration": {
    "길이": "20-60자 확인",
    "톤": "철학적이고 심오한가",
    "문법": "자연스러운 한국어인가"
  },
  "image_prompt": {
    "언어": "영어로 작성되었는가",
    "스타일": "Notion 스타일 포함되었는가",
    "구체성": "시각화 가능한 장면인가"
  }
}
```

## Integration

### run-pipeline 스킬과 연동

```bash
# Step 1: 대본 생성
/generate-script --theme "자유" --author "사르트르" --count 8

# Step 2: 자동으로 영상 제작
/run-pipeline --config output/scripts/script_자유_YYYYMMDD_HHMMSS.json
```

### create-video-auto 스킬과 통합

```bash
# 대본 생성 + 영상 제작을 한 번에
/create-video-auto --theme "자유" --author "사르트르" --count 8
```

## Performance

| 항목 | 값 |
|------|-----|
| LLM 모델 | Gemini 2.0 Flash Thinking |
| 생성 시간 | 5-15초 (개수에 비례) |
| 토큰 사용 | 입력 ~500토큰, 출력 ~2000토큰 |
| 정확도 | 95% 이상 (JSON 형식) |

## Notes

- 이 스킬은 **Gemini API**를 사용하므로 GEMINI_API_KEY가 필요합니다.
- LLM 응답이 항상 완벽하지 않을 수 있으므로, 생성된 대본을 검토하는 것을 권장합니다.
- 동일한 주제/작가로 여러 번 실행하면 **다양한 결과**를 얻을 수 있습니다.
- 생성된 JSON은 **바로 run-pipeline에 사용 가능**합니다.

## Related Skills

- **run-pipeline**: 생성된 대본으로 영상 제작
- **create-video-auto**: 대본 생성 + 영상 제작 통합
- **run-test**: 환경 검증

## Related Documents

- [src/video_studio/script_generator.py](../../src/video_studio/script_generator.py) - 구현 코드
- [examples/schopenhauer_quotes.py](../../examples/schopenhauer_quotes.py) - 수동 대본 예시
