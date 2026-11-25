# FORM — Interactive Fashion Showroom

## 로컬 실행 — Windows / Mac

Node.js 22 이상을 한 번 설치합니다(무료). 이후 아래 실행 파일을 더블클릭합니다.

- Windows: `START-WINDOWS.cmd`
- Mac: `START-MAC.command`

터미널이 열리며, 최초 실행 시 무료 npm 의존성을 설치하고 프로젝트를 빌드합니다. 이어 로컬 서버와 브라우저가 열립니다. 실행 중에는 터미널을 유지하고 종료하려면 Ctrl+C를 누릅니다. 최초 의존성 설치에만 인터넷이 필요합니다. Mac에서 실행 권한 오류가 발생하면 프로젝트 폴더의 터미널에서 `chmod +x START-MAC.command`를 한 번 실행하거나 `bash START-MAC.command`로 실행합니다.

`index.html`을 직접 더블클릭하는 방식은 사용하지 않습니다. GLB는 `public/models`, 작품 목록은 `public/data/looks.json`에서 읽습니다. 모델을 내장한 대용량 HTML은 생성하지 않습니다.

## GitHub Pages

공개 저장소 main에 소스를 올리고 Settings → Pages → Source를 GitHub Actions로 선택합니다. `.github/workflows/pages.yml`이 빌드 후 `dist`를 배포합니다. 서버나 터미널을 GitHub에서 실행할 필요는 없습니다.

`node_modules`, `dist`, `local`은 업로드하지 않습니다. 로컬 실행 파일과 `scripts/start-local.mjs`도 업로드에서 제외해도 됩니다. `src`, `public`, `.github`, package.json, package-lock.json, index.html, tsconfig.json, vite.config.ts는 포함합니다.

React + Vite + TypeScript, Three.js, React Three Fiber, Drei로 만든 패션 포트폴리오 메인 페이지입니다. 다크 스튜디오, 공통 3D 뷰어, 의상 전환과 작품 정보 패널을 제공합니다. 상세 페이지와 관리자 페이지는 이번 범위에 포함하지 않습니다. FORM은 초안용 스튜디오 이름입니다.

## 포함된 의상

총 6개 룩을 제공합니다.

| 파일 | 출처와 용도 | 움직임 |
| --- | --- | --- |
| `public/models/openpattern-tuta.glb` | Open+Pattern의 TuTa Jumpsuit THAYAHT (1920), CLO3D 프로젝트와 함께 제공되는 GLB | 정적 의상 |
| `public/models/openpattern-ma1.glb` | Open+Pattern의 MA-1 Bomber Jacket 1971, CLO3D 프로젝트와 함께 제공되는 GLB | 정적 의상 |
| `public/models/look-01.glb` | 직접 생성한 Quiet Structure 테스트 모델 | 제자리 워킹 |
| `public/models/look-02.glb` | 직접 생성한 After Hours 테스트 모델 | 제자리 워킹 |
| `public/models/look-03.glb` | 직접 생성한 Soft Geometry 테스트 모델 | 제자리 워킹 |
| `public/models/Bee.glb` | 사용자가 추가한 벌 테스트 모델 | `_bee_idle` 애니메이션 |

**공개 CLO 샘플 두 개는 아바타 없는 의상 단독 모델이며 워킹 애니메이션이 없습니다.** 화면의 `STILL LOOK` 표시는 정상이며 회전·확대 기능으로 감상할 수 있습니다. 기존 테스트 모델 세 개에는 무광 마네킹과 단순 관절 워킹이 포함되어 있습니다. 테스트 워킹은 CLO 원단 시뮬레이션이 아닙니다. 웹 뷰어가 정적인 GLB에서 실제 원단 움직임이나 워킹을 자동 생성하지 않습니다.

Open+Pattern의 의상은 디자이너 본인의 포트폴리오 작품으로 소개하지 않고 출처가 있는 시연용 샘플로 표시합니다. 원작 페이지와 CC BY 4.0 라이선스는 작품 정보 패널 및 [모델 출처 문서](public/models/ATTRIBUTION.md)에 기록되어 있습니다.

## 로컬 실행

Node.js 22와 npm이 있는 환경에서 프로젝트 폴더를 엽니다. 저장된 `package-lock.json` 기준으로 설치합니다.

```sh
npm ci
npm run dev
```

터미널에 표시되는 주소(기본 `http://127.0.0.1:5173`)를 브라우저에서 엽니다. 최초 패키지 설치에는 인터넷 연결이 필요합니다.

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 로컬 개발 서버 |
| `npm run check:assets` | JSON에 등록된 GLB 구조, 파일 크기, 지정 애니메이션 확인 |
| `npm run build` | TypeScript 검사 후 `dist/`에 정적 배포 파일 생성 |
| `npm run preview` | 빌드한 `dist/`를 로컬에서 확인 |

GLB 검사 통과는 실제 화면의 재질·모션 품질까지 보증하지 않습니다. 새 모델을 넣으면 브라우저에서도 확인합니다.

## 화면 조작

- 마우스 또는 한 손가락 드래그: 360도 회전
- 마우스 휠, 두 손가락 핀치, `−`/`+` 버튼: 확대·축소
- 이전·다음 버튼 또는 키보드 `←`/`→`: 의상 선택
- `PAUSE`/`PLAY` 또는 `Space`: 워킹 애니메이션 일시정지·재생
- 초기화 버튼: 정면 시점으로 복귀
- 집중 보기 버튼: 의상을 크게 감상
- `THE COLLECTION`: 같은 메인 페이지 안에서 전체 룩 선택
- `EXPLORE THE LOOK` 또는 작품 정보: 설명·출처 확인

의상 변경은 사전 로딩, 페이드 아웃, 모델 교체, 페이드 인 순으로 진행됩니다. 현재 의상이 준비되면 다음 의상을 미리 불러옵니다. 로딩 실패 시 안내와 다시 시도 경로를 제공합니다. 운영체제의 움직임 감소 설정이 켜져 있으면 자동 워킹을 멈추고 전환 시간을 줄입니다.

## 실제 CLO 작품 등록

아바타·의상·애니메이션을 포함한 단일 GLB를 준비합니다. 제자리 워킹을 원하면 파일 안에 재생 가능한 애니메이션 클립이 있어야 합니다. CLO 버전과 내보내기 설정에 따라 애니메이션 포함 여부가 다르므로 GLB 자체를 확인합니다. 얼굴 없는 무광 화이트 마네킹도 원본 모델에 포함시키면 공통 뷰어에서 그대로 표시됩니다.

1. 새 파일을 `public/models/my-look-01.glb`에 넣습니다. 텍스처를 포함한 단일 GLB를 권장합니다.
2. `public/data/looks.json`의 `looks` 배열에 항목을 추가합니다. 기존 코드나 뷰어를 수정할 필요가 없습니다.

```json
{
  "id": "my-look-01",
  "name": "New Silhouette",
  "season": "2026 FW",
  "category": "Tailored outerwear",
  "description": "실루엣과 소재에 대한 작품 설명",
  "model": "models/my-look-01.glb",
  "animation": "Walk",
  "order": 6,
  "published": true,
  "demo": false,
  "silhouette": "Relaxed tailoring",
  "material": "Warm ivory",
  "color": "#d7cbb8",
  "origin": "Original CLO 3D work"
}
```

`animation`은 GLB 내부의 실제 클립 이름입니다. 클립 이름을 모르면 이 항목을 생략할 수 있으며 뷰어가 첫 클립을 사용합니다. 정적 파일에서는 `animation` 항목을 제거합니다. 존재하지 않는 클립 이름을 지정하면 `check:assets`가 실패합니다.

`id`는 중복되지 않아야 하며 `order`는 표시 순서입니다. `model`에는 `public/` 아래의 상대 경로를 사용합니다. `published: false`는 목록에서 숨기는 설정입니다. `rotationY`는 라디안 단위 정면 보정, `scale`은 자동 크기 맞춤 이후의 양수 배율이며 둘 다 선택 항목입니다. 뷰어가 모델 중심과 바닥을 맞추므로 실제 화면에서 크기·정면·발 위치를 마지막으로 확인합니다.

외부 모델에는 다음과 같은 `credit`을 추가하고 필요한 라이선스 문서도 보관합니다.

```json
{
  "credit": {
    "author": "원작자 이름",
    "url": "https://example.com/original-work",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "changes": "수정 사항 설명 또는 원본 그대로 사용"
  }
}
```

3. `npm run check:assets`와 `npm run build`를 실행합니다.
4. `npm run preview`에서 모델, 회전·확대, 애니메이션, 의상 전환과 모바일 레이아웃을 확인합니다.
5. 공개할 파일만 저장소에 올립니다. 모델 교체 시 새 파일명을 사용하면 이전 브라우저 캐시와 혼동하기 어렵습니다.

예제 룩을 제거하려면 JSON의 해당 항목과 연결된 GLB를 함께 삭제합니다. 공개 저장소와 배포 파일은 다운로드할 수 있습니다. `published: false`는 파일 접근을 막는 기능이 아니므로 비공개 작품은 `public/`에 두지 않습니다.

## GitHub Pages 무료 배포

1. GitHub Free에서 **공개(Public)** 저장소를 만듭니다. 예: `fashion-studio`.
2. 이 프로젝트의 내용을 `main` 브랜치에 올립니다. `.github/`, `.gitignore`, `package-lock.json`도 포함합니다. `node_modules/`, `dist/`와 CLO 원본 프로젝트는 올리지 않습니다.
3. 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
4. **Actions → Deploy portfolio to GitHub Pages → Run workflow**를 실행합니다. 이후 `main`에 푸시하면 자동으로 빌드·배포됩니다.
5. 완료된 워크플로에서 표시되는 Pages URL을 엽니다. 일반적으로 `https://사용자명.github.io/fashion-studio/` 형식입니다.

Vite는 상대 `base`를 사용하므로 저장소 하위 경로를 지원합니다. 배포 워크플로는 공개 저장소에서만 빌드하고 표준 GitHub 호스팅 러너를 사용합니다. GitHub Pages의 공개 저장소 무료 방식을 전제로 하며 결제수단, 유료 플랜, Git LFS, 유료 러너, 별도 도메인은 필요하지 않습니다. 자세한 무료 제공 범위와 제한은 [GitHub Pages 소개](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) 및 [GitHub Pages 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)을 참고합니다.

이번 프로젝트는 배포용 파일과 워크플로를 포함합니다. 실제 공개 배포 주소는 사용자의 GitHub 저장소에서 워크플로가 완료된 후 생성됩니다.

## 유지보수 구조

```text
src/
  App.tsx                       메인 화면, 룩 선택, 전환 상태, 정보 패널
  components/StudioViewer.tsx    공통 R3F 뷰어, 조명, 카메라, 로딩·캐시, 애니메이션
  types.ts                      작품 타입, 경로 처리, JSON 로딩·검사
  main.tsx                      React 진입점
  style.css                     다크 스튜디오와 PC·모바일 레이아웃
public/
  data/looks.json                작품 목록과 출처
  models/                       공개용 GLB와 ATTRIBUTION.md
scripts/
  check-assets.mjs              GLB 구조·지정 클립 검사
  generate_samples.py           기존 워킹 테스트 모델 재생성
.github/workflows/pages.yml     공개 저장소 GitHub Pages 배포
```

`generate_samples.py`는 선택적인 개발 도구이며 **Python, NumPy, trimesh**가 필요합니다. 포함된 GLB를 그대로 사용하는 경우 Python이나 이 패키지를 설치할 필요가 없습니다. 스크립트를 실행하면 기존 `look-01.glb`~`look-03.glb` 테스트 모델을 다시 생성하므로 수정한 모델을 보관한 뒤 사용합니다.

## 비용과 외부 연결

유료 API, API 키, 유료 3D 에셋, Firebase, 별도 백엔드, 결제 연동을 사용하지 않습니다. 앱 실행 시 JavaScript·CSS·JSON·GLB를 같은 정적 사이트에서 읽으며 외부 CDN 모델이나 텍스처에 의존하지 않습니다. 원작 및 라이선스 링크는 사용자가 클릭할 때만 해당 웹사이트를 엽니다. 오픈소스 패키지 설치 외에 별도 유료 서비스 설정은 필요하지 않습니다.

`sourceType: "archive"`와 `sourceNote`는 외부 시연용 샘플에만 사용합니다. 본인의 작품은 `demo: false`, `sourceType: "original"`로 등록하면 다른 제작자의 샘플이라는 문구가 붙지 않습니다.

## 이번 초안의 검증 결과

- `npm run check:assets`: 등록된 GLB 6개와 Meshopt 압축 버퍼·내장 텍스처 경로 검사 통과.
- `npm run build`: TypeScript 검사 및 Vite 프로덕션 빌드 통과. Three.js 청크가 500 KB보다 커서 크기 경고가 남지만 빌드는 성공합니다.
- 프로덕션 미리보기 브라우저: CLO 2종 렌더링, 이전/다음 및 직접 선택, 드래그 회전, 확대, 정면 복원, 워킹 재생/정지, 컬렉션·출처 패널 확인.
- 1200×800 PC 및 390×844 모바일 화면에서 레이아웃 확인. 모바일 화면에 가로 넘침 없음. 실제 스마트폰의 멀티터치 핀치는 별도 기기 검증 전입니다.
- 존재하지 않는 GLB 경로로 오류 안내를 확인한 뒤, 파일 복구 및 다시 불러오기로 정상 렌더링 복구 확인. 테스트 경로는 최종 결과에서 제거했습니다.
- 이번 제한된 Windows 작업 환경에서는 개발 서버의 esbuild 디렉터리 탐색이 접근 제한으로 중단되어, 빌드 결과를 `npm run preview`로 실행해 검증했습니다.
- GitHub Pages 워크플로를 준비했으며, 실제 공개 저장소 배포는 아직 수행하지 않았습니다.

사용자가 추가한 `Bee.glb`는 그대로 보존했습니다. JSON에서 존재하지 않는 `Walk` 클립을 실제 `_bee_idle` 클립으로 수정했습니다. 구형 `KHR_materials_pbrSpecularGlossiness` 재질의 색상 텍스처를 지원하며 광택 표현은 현대 재질로 근사합니다. 파일 및 메타데이터의 나머지 사용자 입력은 보존했습니다.
