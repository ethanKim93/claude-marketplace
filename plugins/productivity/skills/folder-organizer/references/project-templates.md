# 프로젝트 유형별 이상적 디렉터리 구조 템플릿

`folder-organizer` 스킬이 프로젝트 유형 감지 후 현재 구조와 비교할 때 사용합니다.

---

## 1. Web Frontend (React / Vue / Angular / Svelte)

**감지 시그널**: `package.json` + react/vue/angular/svelte 의존성, `src/`, `public/`

```
project/
├── public/                  # 정적 파일 (favicon, index.html 등)
├── src/
│   ├── components/          # 재사용 가능한 UI 컴포넌트
│   │   └── ui/              # 기본 UI 컴포넌트 (Button, Input 등)
│   ├── features/            # 기능별 모듈 (페이지 + 로직)
│   │   └── auth/
│   │       ├── AuthPage.tsx
│   │       ├── auth.service.ts
│   │       └── auth.types.ts
│   ├── hooks/               # 커스텀 훅 (React) / composables (Vue)
│   ├── utils/               # 순수 유틸리티 함수
│   ├── services/            # API 클라이언트
│   ├── types/               # 공유 타입 정의
│   ├── styles/              # 전역 스타일
│   └── App.tsx              # 루트 컴포넌트
├── tests/
│   └── e2e/                 # E2E 테스트 (단위 테스트는 소스 옆에 위치)
├── docs/                    # 프로젝트 문서
├── .gitignore
├── package.json
└── README.md
```

**핵심 원칙**: 기능 기반 그룹핑, 단위 테스트는 소스와 동일 위치 (`*.test.ts`)

---

## 2. Backend API (Node.js / Python / Go / Java)

**감지 시그널**: `package.json`(express/nestjs/fastify) 또는 `requirements.txt`(flask/django/fastapi) 또는 `go.mod` 또는 `pom.xml`/`build.gradle`

```
project/
├── src/
│   ├── modules/             # 기능별 모듈
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   └── users.dto.ts
│   │   └── orders/
│   ├── common/              # 공통 유틸리티, 미들웨어, 가드
│   ├── config/              # 앱 설정
│   └── database/            # 마이그레이션, 시드
├── tests/
│   ├── unit/
│   └── integration/
├── scripts/                 # 빌드/배포 스크립트
├── docs/
│   └── api/                 # API 문서
├── .env.example             # 환경 변수 예시 (실제 .env는 gitignore)
├── .gitignore
└── README.md
```

**핵심 원칙**: 레이어드 아키텍처, Controller → Service → Repository

---

## 3. Data / ML (Python)

**감지 시그널**: `requirements.txt`(pandas/numpy/torch/sklearn) 또는 `*.ipynb` 파일, `data/` 디렉터리

```
project/                     # Cookiecutter Data Science 기반
├── data/
│   ├── raw/                 # 원본 데이터 (불변, 절대 수정 금지)
│   ├── processed/           # 전처리된 데이터
│   └── external/            # 외부 소스 데이터
├── notebooks/               # 탐색/실험용 Jupyter 노트북
│   ├── 01_eda.ipynb
│   └── 02_modeling.ipynb
├── src/
│   ├── data/                # 데이터 로딩/처리
│   ├── features/            # 피처 엔지니어링
│   ├── models/              # 모델 정의
│   └── evaluation/          # 메트릭 및 평가
├── models/                  # 저장된 학습 모델 (바이너리)
├── reports/
│   └── figures/             # 생성된 시각화
├── configs/                 # 실험 설정 파일
├── requirements.txt
├── .gitignore
└── README.md
```

**핵심 원칙**: `data/raw/` 는 읽기 전용, 노트북 번호 접두사로 순서 표현

---

## 4. Monorepo

**감지 시그널**: `packages/`, `apps/`, `lerna.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`

```
monorepo/
├── apps/                    # 배포 가능한 애플리케이션
│   ├── web/                 # 프론트엔드 앱
│   └── api/                 # 백엔드 앱
├── packages/                # 공유 라이브러리/패키지
│   ├── ui/                  # 공통 UI 컴포넌트
│   ├── config/              # 공유 설정 (eslint, tsconfig 등)
│   └── utils/               # 공유 유틸리티
├── tools/                   # 개발 도구 및 스크립트
├── docs/                    # 모노레포 전체 문서
├── .github/
│   └── workflows/
├── turbo.json               # 또는 nx.json / lerna.json
├── pnpm-workspace.yaml      # 또는 package.json (workspaces)
├── .gitignore
└── README.md
```

**핵심 원칙**: `apps/` 는 배포 단위, `packages/` 는 재사용 단위로 명확히 분리

---

## 5. General Workspace (일반 업무 공간)

**감지 시그널**: 코드 프로젝트 시그널 없음, 혼합된 파일 타입, 문서/이미지 위주

```
workspace/
├── projects/                # 현재 진행 중인 프로젝트
│   ├── 2024-website-redesign/
│   └── 2025-q1-report/
├── archive/                 # 완료/비활성 프로젝트
│   └── 2023-old-project/
├── references/              # 참고 자료
│   ├── guidelines/
│   └── templates/
├── templates/               # 재사용 가능한 템플릿
├── inbox/                   # 미분류 신규 파일 (주기적으로 정리)
└── temp/                    # 임시 작업 파일 (주기적으로 비움)
```

**핵심 원칙**: `inbox/` 에 새 파일 수집 후 주 1회 이상 정리, `temp/` 는 30일 후 자동 비움

---

## 6. Personal Files (개인 파일)

**감지 시그널**: `Documents/`, `Downloads/`, `Desktop/`, 미디어 파일(`.jpg`, `.mp4`, `.pdf`) 다수

```
personal/
├── Documents/
│   ├── work/                # 업무 문서
│   ├── personal/            # 개인 문서
│   └── archive/             # 보관 문서
├── Photos/
│   ├── 2024/
│   │   ├── 01-january/
│   │   └── 12-december/
│   └── events/
│       └── 2024-wedding/
├── Downloads/               # 정기적으로 정리 필요
├── Projects/                # 개인 프로젝트
└── Archive/                 # 오래된 파일 보관
```

**핵심 원칙**: 사진은 연도/월 기반 정리, `Downloads/` 는 인박스로 취급

---

## 구조 비교 방법

스킬이 현재 구조를 위 템플릿과 비교할 때 확인할 항목:

1. **필수 디렉터리 존재 여부** — 감지된 프로젝트 유형에 맞는 표준 디렉터리가 있는가?
2. **잘못된 위치** — 프로젝트 루트에 무관한 파일이 있는가?
3. **빠진 구분** — `src/`와 `tests/`가 혼용되고 있는가?
4. **중첩 과도** — 계층이 너무 깊은 부분이 있는가?
5. **표준 파일 누락** — `README.md`, `.gitignore`, `.env.example` 등이 있는가?
