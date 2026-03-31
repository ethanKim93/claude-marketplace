# 진단 검사 규칙 레퍼런스

이 파일은 `folder-organizer` 스킬의 13가지 진단 검사에 필요한 상세 규칙, 정규식, 플랫폼별 커맨드를 정의합니다.

## 플랫폼 감지 및 커맨드

```bash
# OS 감지
uname -s 2>/dev/null || echo "Windows"

# 디렉터리 트리 생성 (Unix)
find . -maxdepth 6 -not -path '*/node_modules/*' -not -path '*/.git/*' | head -200

# 디렉터리 트리 생성 (Windows - Git Bash)
cmd //c "tree /F /A" 2>/dev/null | head -200

# 파일 해시 (Unix)
md5sum <file>
find . -type f -not -path '*/node_modules/*' -exec md5sum {} \; 2>/dev/null

# 파일 해시 (Windows)
certutil -hashfile <file> MD5
```

---

## 진단 검사별 상세 규칙

### D01 — Excessive Depth (과도한 깊이)
- **임계값**: 루트로부터 5레벨 초과
- **커맨드**:
  ```bash
  find . -mindepth 6 -type f -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -20
  ```
- **예외**: `node_modules`, `.git` 내부는 검사 제외

---

### D02 — Empty Directories (빈 디렉터리)
- **조건**: 파일이 없는 디렉터리 (`.gitkeep` 파일만 있는 경우 제외)
- **커맨드**:
  ```bash
  find . -type d -empty -not -path '*/.git/*' -not -path '*/node_modules/*' 2>/dev/null
  ```

---

### D03 — Naming Inconsistency (네이밍 불일치)
- **감지 정규식**:
  - kebab-case: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
  - snake_case: `^[a-z][a-z0-9]*(_[a-z0-9]+)*$`
  - camelCase: `^[a-z][a-zA-Z0-9]+$`
  - PascalCase: `^[A-Z][a-zA-Z0-9]+$`
- **판단**: 같은 디렉터리 레벨에 2가지 이상 컨벤션이 섞인 경우 경고
- **우선 컨벤션**: 해당 레벨에서 가장 많이 사용된 컨벤션을 "정답"으로 판단

---

### D04 — Special Characters / Spaces (특수문자/공백)
- **금지 문자**: 공백(` `), `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, `[`, `]`, `{`, `}`, `;`, `'`, `"`, `\`, `,`, `?`
- **커맨드**:
  ```bash
  find . -name "* *" -not -path '*/.git/*' 2>/dev/null
  find . -name "*[!a-zA-Z0-9._\-]*" -not -path '*/.git/*' -not -name "*.gitkeep" 2>/dev/null | grep -v node_modules
  ```

---

### D05 — Stale Markers (낡은 마커)
- **감지 패턴** (대소문자 무시):
  - 접두사: `old_`, `new_`, `backup_`, `bak_`, `temp_`, `tmp_`, `_deprecated`, `_unused`
  - 접미사: `_old`, `_new`, `_backup`, `_bak`, `_temp`, `_tmp`, `_v1`, `_v2`, `_v3`, `_final`, `_copy`, `_orig`
  - 괄호: ` (1)`, ` (2)`, `Copy of `, `_copy`
  - 날짜 패턴: `_2023`, `_2024`, `_202[0-9]`, `_[0-9]{8}`
- **커맨드**:
  ```bash
  find . -not -path '*/.git/*' -not -path '*/node_modules/*' | grep -iE '(^|/)(old_|new_|backup_|bak_|temp_|tmp_)|(_old|_new|_backup|_bak|_temp|_tmp|_final|_copy|_orig|_v[0-9]+|copy of |\([0-9]+\))' 2>/dev/null
  ```

---

### D06 — Generic Names (모호한 이름)
- **금지 패턴** (전체 일치, 대소문자 무시):
  `stuff`, `misc`, `miscellaneous`, `data2`, `data3`, `test2`, `untitled`, `untitled folder`, `new folder`, `폴더`, `임시`, `기타`, `자료`, `자료2`, `작업`, `작업중`
- **커맨드**:
  ```bash
  find . -type d -not -path '*/.git/*' -not -path '*/node_modules/*' | grep -iE '/(stuff|misc|miscellaneous|data[2-9]|test[2-9]|untitled|new folder|임시|기타|자료[0-9]?)$' 2>/dev/null
  ```

---

### D07 — Duplicate Files (중복 파일)
- **방법**: SHA256/MD5 해시 비교 (10MB 이하 파일만 대상)
- **커맨드** (Unix):
  ```bash
  find . -type f -size -10M -not -path '*/.git/*' -not -path '*/node_modules/*' \
    -exec md5sum {} \; 2>/dev/null | sort | awk 'seen[$1]++ { print $2 " (duplicate)" }'
  ```
- **커맨드** (Windows Git Bash 대안):
  ```bash
  find . -type f -size -10M -not -path '*/.git/*' -not -path '*/node_modules/*' 2>/dev/null \
    | while read f; do certutil -hashfile "$f" MD5 2>/dev/null | grep -v "^MD5" | grep -v "^CertUtil" | tr -d ' \r' | awk -v file="$f" '{print $0 " " file}'; done \
    | sort | awk 'seen[$1]++ { print $2 " (duplicate)" }'
  ```

---

### D08 — Single-child Chains (단일 하위 디렉터리 체인)
- **조건**: 디렉터리 하위에 서브디렉터리 1개만 있고, 파일이 없는 경우
- **커맨드**:
  ```bash
  find . -type d -not -path '*/.git/*' -not -path '*/node_modules/*' | while read d; do
    count=$(ls -A "$d" 2>/dev/null | wc -l)
    dirs=$(find "$d" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
    files=$(find "$d" -maxdepth 1 -mindepth 1 -type f 2>/dev/null | wc -l)
    if [ "$dirs" -eq 1 ] && [ "$files" -eq 0 ]; then echo "$d"; fi
  done
  ```

---

### D09 — Large Flat Directories (항목 과다 디렉터리)
- **임계값**: 직접 하위 항목 20개 초과
- **커맨드**:
  ```bash
  find . -type d -not -path '*/.git/*' -not -path '*/node_modules/*' | while read d; do
    count=$(ls -A "$d" 2>/dev/null | wc -l)
    if [ "$count" -gt 20 ]; then echo "$count $d"; fi
  done | sort -rn | head -10
  ```

---

### D10 — OS Artifacts (OS 생성 파일)
- **패턴**:
  - macOS: `.DS_Store`, `._*`, `.Spotlight-V100`, `.Trashes`, `__MACOSX`
  - Windows: `Thumbs.db`, `desktop.ini`, `ehthumbs.db`, `$RECYCLE.BIN`
  - Linux: `.directory`
- **커맨드**:
  ```bash
  find . \( -name ".DS_Store" -o -name "Thumbs.db" -o -name "desktop.ini" \
    -o -name "ehthumbs.db" -o -name "__MACOSX" -o -name "._*" \) \
    -not -path '*/.git/*' 2>/dev/null
  ```

---

### D11 — Build Artifacts in VCS (빌드 산출물이 VCS에 추적됨)
- **사전 조건**: `.git` 디렉터리 존재 시에만 실행
- **패턴**:
  ```
  node_modules/, dist/, build/, .next/, out/,
  __pycache__/, *.pyc, .eggs/, *.egg-info/,
  target/ (Maven/Gradle), *.class,
  vendor/ (Go), bin/, obj/ (.NET)
  ```
- **커맨드**:
  ```bash
  git ls-files | grep -E '(node_modules|/dist/|/build/|__pycache__|\.pyc$|/target/|\.class$)' 2>/dev/null | head -20
  ```

---

### D12 — .gitignore Gaps (.gitignore 누락 패턴)
- **사전 조건**: `.git` 디렉터리 존재 시에만 실행
- **필수 패턴** (프로젝트 유형별):
  - Node.js: `node_modules/`, `dist/`, `.env`, `.next/`, `*.log`
  - Python: `__pycache__/`, `*.pyc`, `.venv/`, `*.egg-info/`, `.pytest_cache/`
  - Java/Gradle: `build/`, `.gradle/`, `*.class`, `*.jar`
  - Java/Maven: `target/`, `*.class`
  - 공통: `.DS_Store`, `Thumbs.db`, `*.log`, `*.tmp`
- **커맨드**:
  ```bash
  cat .gitignore 2>/dev/null
  git check-ignore -q node_modules 2>/dev/null && echo "node_modules: OK" || echo "node_modules: 누락"
  ```

---

### D13 — Orphan Config Files (고아 설정 파일)
- **조건**: 설정 파일이 있지만 대응하는 도구가 사용 흔적이 없는 경우
- **예시**:
  - `.eslintrc` 있는데 JS 파일 없음
  - `jest.config.js` 있는데 `*.test.js` 없음
  - `docker-compose.yml` 있는데 `Dockerfile` 없음
- **커맨드**:
  ```bash
  # 예시: .eslintrc 있지만 JS 파일 없는지 확인
  ls .eslintrc* 2>/dev/null && find . -name "*.js" -not -path '*/node_modules/*' 2>/dev/null | wc -l
  ```

---

## 건강 점수 계산 공식

```
시작 점수: 100

Major 발견 (D07, D11):  -10점/건 (최대 -30점)
Warning 발견 (D01, D03, D04, D05, D06, D08, D09, D12): -3점/건 (최대 -15점)
Info 발견 (D02, D10, D13): -1점/건 (최대 -5점)

최종 점수 = max(0, 계산 결과)
```

| 점수 구간 | 등급 | 의미 |
|-----------|------|------|
| 90 – 100 | Excellent | 매우 잘 정리됨 |
| 70 – 89  | Good       | 양호, 소폭 개선 가능 |
| 50 – 69  | Needs Work | 개선 필요 |
| 0 – 49   | Critical   | 즉각 정리 필요 |
