---
name: run-test
description: 환경 설정을 확인하고 테스트를 자동으로 실행합니다. Python 가상환경, API 키, FFmpeg 등을 검증한 후 simple_test.py를 실행하여 시스템이 올바르게 작동하는지 확인합니다.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Run Test

환경 설정 검증 및 자동 테스트 실행 스킬입니다.

## Instructions

이 스킬은 다음 순서로 실행됩니다:

### 1. 환경 검증

#### API 키 확인
```bash
# .env 파일 읽기
cat .env | grep GEMINI_API_KEY
```

- GEMINI_API_KEY가 설정되어 있는지 확인
- 없으면 사용자에게 설정 요청

#### FFmpeg 설치 확인
```bash
ffmpeg -version
```

- FFmpeg가 설치되어 있는지 확인
- 없으면 설치 가이드 제공 (SETUP_WINDOWS.md 참조)

#### Python 환경 확인
```bash
# 가상환경 존재 확인
ls venv/

# Python 버전 확인
python --version
```

#### 의존성 확인
```bash
# 가상환경 활성화 (Windows)
# venv\Scripts\activate

# 의존성 설치 여부 확인
pip list | grep google-genai
pip list | grep whisper
pip list | grep ffmpeg-python
```

### 2. 테스트 실행

모든 검증이 통과되면 `examples/simple_test.py` 실행:

```bash
python examples/simple_test.py
```

### 3. 결과 보고

- ✅ 성공: 생성된 영상 경로 출력
- ❌ 실패: 상세한 오류 메시지 및 해결 방법 제공

## Usage

### 기본 사용

```bash
# 스킬 직접 호출 (Claude Code에서)
/run-test
```

### 실행 흐름

```
1. 환경 검증
   ├─ API 키 확인 ✓
   ├─ FFmpeg 확인 ✓
   ├─ Python 환경 확인 ✓
   └─ 의존성 확인 ✓

2. 테스트 실행
   └─ examples/simple_test.py

3. 결과
   └─ output/test_simple.mp4 생성 ✓
```

## Output Format

### 성공 케이스

```
==================================================
🧪 환경 검증 시작
==================================================

✅ API 키 확인: GEMINI_API_KEY 설정됨
✅ FFmpeg 확인: 버전 6.1.1
✅ Python 확인: 3.11.5
✅ 의존성 확인: 모든 패키지 설치됨

==================================================
🎬 테스트 실행
==================================================

[simple_test.py 출력...]

==================================================
✅ 테스트 완료!
==================================================

📁 생성된 영상: output/test_simple.mp4
⏱️ 소요 시간: 18초
📊 파일 크기: 2.3MB
```

### 실패 케이스

```
==================================================
🧪 환경 검증 시작
==================================================

❌ API 키 확인: GEMINI_API_KEY가 설정되지 않음

해결 방법:
1. .env 파일 열기
2. GEMINI_API_KEY=your_api_key_here 입력
3. API 키는 https://aistudio.google.com/ 에서 발급

QUICKSTART.md를 참조하세요.
```

## Error Handling

### API 키 오류
```
Error: GEMINI_API_KEY not found

해결:
1. .env 파일 확인
2. GEMINI_API_KEY=실제키값 입력
3. Google AI Studio에서 키 발급
```

### FFmpeg 오류
```
Error: FFmpeg not found

해결:
# Windows
SETUP_WINDOWS.md 참조

# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

### 의존성 오류
```
Error: Missing dependencies

해결:
# 가상환경 활성화
venv\Scripts\activate

# 의존성 재설치
pip install -r requirements.txt
```

### 테스트 실행 오류
```
Error: Test failed

로그:
[오류 메시지...]

해결:
1. 오류 메시지 확인
2. 중간 파일 확인: output/temp/
3. INSTALLATION.md 문제 해결 섹션 참조
```

## Features

1. **자동 환경 검증**: 모든 필수 구성 요소 확인
2. **명확한 오류 메시지**: 문제 발생 시 해결 방법 제공
3. **단계별 진행**: 각 단계의 성공/실패 명확히 표시
4. **결과 요약**: 생성된 파일, 소요 시간 등 통계 제공

## Notes

- 이 스킬은 **최초 설정 후** 또는 **환경 변경 시** 실행하여 시스템 상태를 확인합니다.
- 테스트는 단일 장면(약 5-10초 영상)으로 빠르게 완료됩니다.
- 문제가 발생하면 자동으로 상세한 해결 방법을 제공합니다.
- Windows 환경의 경우 PowerShell 실행 정책 오류에 주의하세요.

## Related Documents

- [QUICKSTART.md](../../QUICKSTART.md) - 빠른 시작 가이드
- [SETUP_WINDOWS.md](../../SETUP_WINDOWS.md) - Windows 설정
- [INSTALLATION.md](../../INSTALLATION.md) - 상세 설치 가이드
