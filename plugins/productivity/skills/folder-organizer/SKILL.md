---
name: folder-organizer
description: |
  디렉터리 구조를 분석하고 베스트 프랙티스에 따라 정리 방안을 제안합니다.
  프로젝트 유형(웹 프론트엔드, 백엔드 API, 데이터/ML, 모노레포, 일반 업무 공간, 개인 파일)을
  자동 감지하고 13가지 진단 검사를 실행하여 건강 점수(0-100)를 산출합니다.
  사용자 승인 후 이름 변경, 이동, 아카이브, 삭제를 안전하게 실행합니다.

  다음 상황에서 반드시 이 스킬을 사용하세요:
  - "폴더 정리", "디렉터리 정리", "파일 정리" 요청 시
  - "폴더 구조 분석", "디렉터리 구조 분석", "폴더 구조 개선" 요청 시
  - "프로젝트 구조 리팩터링", "파일 네이밍 정리" 요청 시
  - "중복 파일 찾기", "빈 폴더 제거", "오래된 파일 정리" 요청 시
  - "네이밍 컨벤션 통일", "폴더 이름 정리" 요청 시
  - ".DS_Store 정리", "Thumbs.db 삭제", "빌드 아티팩트 정리" 요청 시
  - "folder organize", "directory cleanup", "file structure review" 언급 시
  - 디렉터리가 지저분하다고 느끼거나 구조를 개선하고 싶다는 표현 시
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# 폴더 정리 스킬 (folder-organizer)

디렉터리 구조를 단계적으로 분석하고, 베스트 프랙티스에 기반하여 정리 방안을 제안한 뒤 사용자 승인 하에 실행합니다. 모든 파괴적 작업은 소프트 삭제 방식으로 안전하게 처리합니다.

> **플랫폼**: Windows(Git Bash), macOS, Linux 모두 지원. 상세 커맨드는 `references/diagnostic-rules.md` 참조.

---

## 프로젝트 유형 감지 기준

| 프로젝트 유형 | 감지 시그널 |
|--------------|------------|
| Web Frontend | `package.json` + react/vue/angular/svelte 의존성 |
| Backend API | express/nestjs/fastapi/django/flask/gin/spring 의존성, `pom.xml`, `go.mod` |
| Data/ML | pandas/numpy/torch/sklearn 의존성, `*.ipynb`, `data/raw/` |
| Monorepo | `packages/`, `apps/`, `lerna.json`, `pnpm-workspace.yaml`, `turbo.json` |
| General Workspace | 코드 시그널 없음, 문서/이미지 혼합 |
| Personal Files | `Documents/`, `Downloads/` 구조, 미디어 파일 다수 |

프로젝트 유형별 이상 구조 템플릿은 `./references/project-templates.md` 참조.

---

## 진단 검사 목록 (13가지)

| ID | 검사명 | 임계값 | 심각도 |
|----|--------|--------|--------|
| D01 | Excessive Depth — 과도한 깊이 | 루트에서 5레벨 초과 | Warning |
| D02 | Empty Directories — 빈 디렉터리 | `.gitkeep` 제외 빈 폴더 | Info |
| D03 | Naming Inconsistency — 네이밍 혼용 | 같은 레벨에 2가지 이상 컨벤션 | Warning |
| D04 | Special Chars / Spaces — 특수문자/공백 | 이름에 공백·특수문자 포함 | Warning |
| D05 | Stale Markers — 낡은 마커 | old_, new_, _final, (1) 등 | Warning |
| D06 | Generic Names — 모호한 이름 | stuff, misc, 기타, 임시 등 | Warning |
| D07 | Duplicate Files — 중복 파일 | 동일 해시, 다른 경로 (10MB 이하) | Major |
| D08 | Single-child Chains — 단일 하위 체인 | 파일 없이 서브폴더 1개만 있는 폴더 | Info |
| D09 | Large Flat Directories — 항목 과다 | 직접 하위 항목 20개 초과 | Warning |
| D10 | OS Artifacts — OS 생성 파일 | .DS_Store, Thumbs.db 등 | Info |
| D11 | Build Artifacts in VCS — 빌드산출물 추적 | node_modules 등이 git에 추적됨 | Major |
| D12 | .gitignore Gaps — gitignore 누락 | 필수 패턴이 .gitignore에 없음 | Warning |
| D13 | Orphan Config Files — 고아 설정 파일 | 대응 도구 흔적 없이 설정 파일만 존재 | Info |

상세 검사 규칙, 정규식, 커맨드는 `./references/diagnostic-rules.md` 참조.

---

## 건강 점수 공식

```
시작: 100점
Major 발견 (D07, D11): -10점/건 (검사당 최대 -30점)
Warning 발견 (D01~D06, D08, D09, D12): -3점/건 (검사당 최대 -15점)
Info 발견 (D02, D10, D13): -1점/건 (검사당 최대 -5점)
최종 점수 = max(0, 합산)
```

| 점수 | 등급 |
|------|------|
| 90–100 | Excellent — 잘 정리됨 |
| 70–89 | Good — 소폭 개선 여지 |
| 50–69 | Needs Work — 정리 필요 |
| 0–49 | Critical — 즉각 조치 필요 |

---

## Phase 0: 대상 디렉터리 선택

1. 사용자가 경로를 제공했는지 확인. 없으면 물어본다.
   - 기본값: 현재 작업 디렉터리 (`pwd`)
2. `references/diagnostic-rules.md`와 `references/project-templates.md`를 미리 읽어 둔다.
3. OS 감지:
   ```bash
   uname -s 2>/dev/null || echo "Windows"
   ```
4. 대상 경로가 존재하는지 확인:
   ```bash
   [ -d "<path>" ] && echo "존재" || echo "경로를 찾을 수 없음"
   ```
5. 사용자에게 확인: "**`<path>`** 디렉터리를 분석하겠습니다. 계속 진행할까요?"

---

## Phase 1: 스캔 및 시각화

**목표**: 전체 구조 파악 및 프로젝트 유형 결정

1. 디렉터리 트리 생성 (최대 깊이 6, node_modules/.git 제외):
   ```bash
   find "<path>" -maxdepth 6 \
     -not -path '*/node_modules/*' \
     -not -path '*/.git/*' \
     -not -path '*/\.*' \
     2>/dev/null | head -150
   ```
2. 기본 통계 수집:
   ```bash
   # 전체 파일/폴더 수 (node_modules 제외)
   find "<path>" -not -path '*/node_modules/*' -not -path '*/.git/*' -type f 2>/dev/null | wc -l
   find "<path>" -not -path '*/node_modules/*' -not -path '*/.git/*' -type d 2>/dev/null | wc -l
   ```
3. 프로젝트 유형 감지 (위 감지 기준 표 적용, `package.json`/`requirements.txt` 등 읽기)
4. 트리와 통계를 사용자에게 출력한다.
5. 감지된 프로젝트 유형 알리고 확인: "**[프로젝트 유형]** 으로 감지했습니다. 맞나요? 틀리다면 올바른 유형을 알려주세요."

> 트리가 150줄 초과 시 상위 2레벨만 표시하고 "총 N개 항목이 있어 축약하여 표시합니다"라고 안내한다.

---

## Phase 2: 진단 분석

**목표**: 13가지 검사 실행 후 건강 점수 산출

`./references/diagnostic-rules.md`의 커맨드를 순서대로 실행한다.

- D11, D12는 `.git` 폴더가 존재할 때만 실행
- 각 검사는 발견 건수가 0이면 "이상 없음"으로 표시
- 발견 건수가 많으면 상위 10건만 표시 ("외 N건 추가 발견")

결과를 다음 형식으로 표시한다:

```
## 진단 결과

| ID | 검사명 | 발견 | 심각도 | 점수 영향 |
|----|--------|------|--------|-----------|
| D01 | 과도한 깊이 | 3건 | Warning | -9 |
| D02 | 빈 디렉터리 | 2건 | Info | -2 |
...

**건강 점수: 74/100 (Good)**
```

이후 사용자에게 묻는다: "권장사항을 확인하시겠습니까?"

---

## Phase 3: 권장사항 제안

**목표**: 우선순위별 정리 방안 제시

1. Major → Warning → Info 순으로 그룹핑하여 표시
2. 감지된 프로젝트 유형의 이상 구조(`references/project-templates.md`)와 현재 구조 비교
3. 각 권장사항은 다음 형식:

```
### [R01] 중복 파일 제거 (Major)
- 대상: `src/utils/helper.js` (원본: `lib/helper.js`와 동일)
- 제안 액션: `src/utils/helper.js` 삭제 또는 아카이브
```

4. 변경 유형별 기본 액션:
   - OS artifact / 빌드 산출물 → 삭제 (소프트)
   - 빈 디렉터리 → 삭제 (의도적 빈 폴더라면 `.gitkeep` 추가 제안)
   - Stale marker / 모호한 이름 → 이름 변경 (구체적 제안명 포함)
   - 네이밍 불일치 → 다수 컨벤션으로 통일 이름 제안
   - 깊이 과다 / 단일 하위 체인 → 납작하게(flatten) 병합 제안
   - 항목 과다 → 서브디렉터리 그룹핑 제안
   - 중복 파일 → 최신 파일 유지, 나머지 아카이브

5. 사용자에게 묻는다: "어떤 항목을 실행할까요? (전체 / 특정 ID 입력 / 분석 리포트만 저장)"

---

## Phase 4: 변경 실행

**목표**: 승인된 변경 사항을 안전하게 실행

> **안전 원칙**: 파일·폴더 삭제 시 반드시 `__folder-organizer-trash/` 로 이동(소프트 삭제)한다. 영구 삭제는 별도로 확인 후에만 실행.

각 권장사항마다:
1. 실행할 커맨드를 사용자에게 미리 보여준다
2. 승인받은 후 실행
3. 성공/실패 결과 보고

**소프트 삭제 패턴**:
```bash
# 대상: <file_or_dir>
TRASH="<path>/__folder-organizer-trash/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TRASH"
mv "<target>" "$TRASH/"
echo "이동 완료: $TRASH/<target_name>"
```

**이름 변경 패턴**:
```bash
mv "<old_name>" "<new_name>"
```

**디렉터리 납작하게 병합**:
```bash
# a/b/c/ → a/c/ (중간 빈 디렉터리 제거)
mv "<path>/a/b/c" "<path>/a/c" && rmdir "<path>/a/b"
```

모든 변경 완료 후: "변경이 완료되었습니다. `__folder-organizer-trash/` 에 소프트 삭제된 항목이 있습니다. 영구 삭제를 원하시면 알려주세요."

---

## Phase 5: 리포트 생성

**목표**: 분석 결과와 변경 내역을 문서로 저장

```bash
# 변경 후 새 트리 생성
find "<path>" -maxdepth 4 -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -100
```

리포트를 아래 템플릿으로 작성하고 `<path>/FOLDER-ORGANIZER-REPORT-<YYYY-MM-DD>.md` 에 저장한다.

---

## 분석 리포트 템플릿

```markdown
# 디렉터리 분석 리포트

| 항목 | 내용 |
|------|------|
| 분석 대상 | `<path>` |
| 분석 일시 | YYYY-MM-DD |
| 프로젝트 유형 | <감지된 유형> |
| 총 파일 수 | N개 |
| 총 폴더 수 | N개 |

## 건강 점수

| 구분 | 점수 |
|------|------|
| 분석 전 | NN/100 (<등급>) |
| 분석 후 | NN/100 (<등급>) |

## 진단 결과 요약

| ID | 검사명 | 발견 건수 | 심각도 |
|----|--------|-----------|--------|
...

## 실행된 변경 사항

| # | 유형 | 대상 | 변경 내용 |
|---|------|------|-----------|
...

## 변경 전 구조

\```
<before tree>
\```

## 변경 후 구조

\```
<after tree>
\```

## 남은 권장사항

(실행하지 않은 항목 목록)

## 메모

- 소프트 삭제 위치: `__folder-organizer-trash/`
- 정기 재실행 권장: 월 1회
```

---

## 운영 원칙

- **단계별 진행**: 사용자 확인 없이 다음 Phase로 넘어가지 않는다
- **안전 우선**: 파괴적 작업(삭제, 이동)은 항상 사전에 커맨드를 보여주고 승인받는다
- **소프트 삭제**: `rm` 명령어 직접 사용 금지. 반드시 `__folder-organizer-trash/` 로 이동
- **플랫폼 인식**: OS에 따라 커맨드를 분기한다 (`md5sum` vs `certutil -hashfile`)
- **Git 인식**: `.git` 존재 시 `git ls-files`와 `.gitignore`를 활용, VCS 추적 파일을 고려
- **범위 제한**: `node_modules/`, `.git/` 내부는 분석 대상에서 제외
- **한국어 출력**: 모든 결과와 안내 메시지는 한국어로 출력

---

## 빠른 참조 결정 트리

```
폴더 정리 요청
│
├─ 경로 제공됨?
│   ├─ YES → Phase 0 (경로 확인)
│   └─ NO → 경로 질문 후 Phase 0
│
├─ 프로젝트 유형?
│   ├─ 코드 프로젝트 → 프로젝트 유형 템플릿 적용
│   ├─ 개인 파일 → 중복/네이밍/조직화 집중
│   └─ 혼합 → 사용자에게 주요 용도 확인
│
├─ 변경 실행?
│   ├─ YES → Phase 4 (항목별 승인 필수)
│   └─ NO → Phase 5 (리포트만 저장)
│
└─ 소프트 삭제 복구?
    └─ __folder-organizer-trash/ 확인 후 복원 가능
```
