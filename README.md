# 보송송의 보안 노트

시스템 해킹과 임베디드 시스템에 대한 관심을 담은 GitHub Pages용 블로그이다. 자기소개, 6개 카테고리, 글 목록·본문, 검색, 밝은 화면·어두운 화면 전환, 모바일 메뉴를 갖추고 있다.

**먼저 `START-HERE.html`을 열면 사용 안내를 볼 수 있다. 블로그 화면은 `docs/index.html`을 더블클릭해 확인한다.**

이 압축 파일은 블로그 소스와 미리 생성한 웹페이지를 함께 제공한다. 실제 GitHub 계정에 저장소를 만들거나 공개 배포한 상태는 아니다.

## 1. GitHub Pages의 개념

GitHub Pages는 저장소의 HTML·CSS·JavaScript 파일을 웹사이트로 제공하는 정적 사이트 호스팅 서비스이다. 별도의 웹서버를 운영하지 않고 개인 소개, 기술 문서, 블로그를 공개할 수 있다. 무료 개인 계정에서는 공개 저장소를 사용한다. 자세한 범위는 [GitHub 공식 소개](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)에 설명되어 있다.

| 저장소 이름 | 기본 공개 주소 형식 |
| --- | --- |
| `아이디.github.io` | `https://아이디.github.io/` |
| `blog` | `https://아이디.github.io/blog/` |

이 프로젝트는 Markdown 원고를 Node.js로 HTML로 바꾸어 `docs/`에 저장한다. 브라우저에는 이미 완성된 정적 파일이 전달되므로 방문자에게 Node.js 설치가 필요하지 않다. 아래 두 배포 방법 중 하나를 선택하면 된다.

## 2. 처음 공개하기 — 웹사이트에서 파일 업로드

첫 배포는 로컬 프로그램이나 Git 명령어 없이 진행할 수 있다. **이 방법에서는 생성된 `docs` 폴더만 업로드한다.**

1. 압축을 완전히 풀고 `docs/index.html`을 열어 화면을 확인한다.
2. GitHub에 로그인한 뒤 [새 저장소](https://github.com/new)를 만든다. 이름은 실제 계정 사용자명을 넣은 `아이디.github.io`, 공개 범위는 `Public`, `Add README`는 켜기로 설정한다.
3. 저장소에서 **Add file → Upload files**로 이동한다.
4. 압축을 푼 위치의 **`docs` 폴더째** 업로드하고 **Commit changes**를 누른다. 저장소 파일 목록에서 `docs/index.html`이 보여야 한다. `bosongsong-blog/docs/index.html`처럼 상위 폴더가 하나 더 생기면 위치가 잘못된 것이다.
5. **Settings → Pages → Build and deployment**에서 다음 값을 선택하고 **Save**를 누른다.

| 설정 | 값 |
| --- | --- |
| Source | `Deploy from a branch` |
| Branch | `main` |
| Folder | `/docs` |

6. **Actions**에서 배포 상태를 확인한다. 성공하면 **Settings → Pages → Visit site**로 접속한다.

브랜치의 루트 또는 `/docs` 폴더에서 게시하는 방법은 [공식 게시 원본 설정 문서](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)에 설명되어 있다. 업로드 직후 바로 반영되지 않을 수 있으며, 공식 안내상 게시에는 최대 10분 정도 걸릴 수 있다. [공식 사이트 생성 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

이 방식에서 글이나 디자인을 바꾸려면 소스를 수정한 뒤 4절의 빌드를 실행하고 갱신된 `docs` 폴더를 다시 올린다. Markdown 파일만 수정하면 기존 HTML은 바뀌지 않는다. 글을 자주 작성할 예정이라면 다음 자동 배포 방법이 편하다.

## 3. 계속 글쓰기 — GitHub Actions 자동 배포

이 방법은 Markdown 원고를 GitHub에서 수정하고 커밋하면 사이트가 자동으로 다시 생성되도록 구성한다.

1. 저장소 최상위에 이 프로젝트의 **전체 내용**을 업로드한다. `assets`, `content`, `data`, `scripts`, `vendor`, `package.json` 등이 저장소 첫 화면에 있어야 한다. `bosongsong-blog` 상위 폴더 자체를 올리지 않는다.
2. **`.github/workflows/pages.yml`**이 저장소에 있는지 확인한다. 업로드 과정에서 빠졌다면 **Add file → Create new file**을 열고 파일 이름을 `.github/workflows/pages.yml`로 입력한 뒤, 압축 파일 안의 같은 파일 내용을 붙여넣고 커밋한다.
3. **Settings → Pages → Source**를 **`GitHub Actions`**로 변경한다.
4. **Actions → Publish blog to GitHub Pages → Run workflow**를 눌러 `main`에서 실행한다. 처음 업로드할 때 Pages 설정 전에 작업이 실패했더라도 설정 후 다시 실행하면 된다.
5. `build`와 `deploy`가 모두 성공하면 **Settings → Pages → Visit site**에서 확인한다.

이후 `main`에 새 커밋이 들어올 때마다 `node scripts/build.mjs`가 실행되어 글 목록, 카테고리, 검색 자료, 본문 HTML이 다시 생성된다. 필요한 Markdown 변환기는 프로젝트에 포함되어 있어 `npm install` 단계가 없다. 이 방법에서는 직접 `docs`를 갱신하지 않아도 된다.

워크플로는 [GitHub Pages 공식 사용자 지정 워크플로 구조](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 따른다. Node.js는 [공식 setup-node 액션](https://github.com/actions/setup-node)으로 준비한다. 기본 브랜치가 `main`이 아니라면 `.github/workflows/pages.yml`의 `branches: [main]`도 실제 브랜치명에 맞춰 수정한다.

## 4. 자기소개와 디자인 바꾸기

| 바꿀 내용 | 수정할 파일 | 주요 항목 |
| --- | --- | --- |
| 블로그 이름·영문 브랜드·작성자 | `data/site.json` | `title`, `shortTitle`, `author` |
| 한 줄 소개·홈 소개 | `data/site.json` | `tagline`, `description`, `intro` |
| 홈의 큰 제목 | `data/site.json` | `heroHeading`의 두 문자열 |
| 소개 페이지 본문 | `data/site.json` | `about` 배열의 각 문단 |
| 관심 분야 | `data/site.json` | `interests` |
| GitHub 링크 | `data/site.json` | `githubUrl`에 실제 프로필 주소 입력 |
| 공개 사이트 주소 | `data/site.json` | `siteUrl`에 실제 `https://아이디.github.io` 주소 입력 |
| 색상·글꼴·간격 | `assets/site.css` | 색상 변수 및 각 화면 스타일 |
| 브라우저 탭 아이콘 | `assets/favicon.svg` | 현재는 아이콘 없음. 원하는 SVG 아이콘으로 변경 가능 |

프로젝트 주소를 사용하면 `siteUrl`에 `https://아이디.github.io/blog`처럼 저장소 경로까지 포함한다. `githubUrl`과 `siteUrl`에는 실제 사용할 주소만 입력한다. JSON 파일은 기존 구조를 유지하면서 값만 수정하면 된다.

`siteUrl`이 빈 상태여도 페이지와 검색은 동작한다. 실제 주소를 입력하고 다시 빌드하면 대표 주소 태그(canonical), `sitemap.xml`, 구독용 `feed.xml`(Atom)이 함께 생성된다. 주소가 비어 있을 때는 이 항목과 화면의 RSS 링크를 생략한다. `githubUrl`이 비어 있으면 GitHub 프로필 링크도 표시하지 않는다.

로컬에서 수정 내용을 반영하려면 [Node.js](https://nodejs.org/en/download)를 설치한 뒤 프로젝트 폴더에서 다음 명령을 실행한다. Node.js 20 이상이며, 자동 배포와 맞추려면 24를 사용하면 된다.

```bash
node scripts/build.mjs
```

또는 다음 명령을 사용한다.

```bash
npm run build
```

빌드가 끝나면 `docs/index.html`을 다시 열거나 새로고침한다. `docs`는 자동 생성되는 결과물이므로 원본 수정은 `content`, `data`, `assets`, `scripts`에서 진행한다.

## 5. 새 글 작성하기

1. `content/post-template.txt`를 복사해 `content/posts/my-first-note.md`로 저장한다. 파일 이름은 영문 소문자·숫자·하이픈 조합을 사용한다. 파일 이름이 글 주소에 사용된다.
2. 맨 위의 제목, 날짜, 카테고리, 태그, 요약을 수정한다. 각 설정은 한 줄로 작성한다.
3. 구분선 `---` 아래에 Markdown으로 본문을 쓴다. 본문 소제목은 `##`부터 작성한다.
4. 직접 작성한 글은 `example: false`로 둔다. 화면의 예시 표시가 사라진다.
5. 자동 배포를 선택했다면 커밋한다. 파일 업로드 방식을 선택했다면 빌드 후 갱신된 `docs`를 업로드한다.

```markdown
---
title: "첫 번째 펌웨어 분석 기록"
date: "2026-10-27"
category: "development"
tags: ["Firmware", "Linux"]
excerpt: "파일시스템 구조와 부팅 흐름을 살펴보며 정리한 내용이다."
example: false
featured: false
draft: false
---

## 분석 목표

분석을 통해 알아보려는 질문을 적는다.

## 확인한 내용

명령어와 관찰 결과를 함께 정리한다.

## 다음에 확인할 점

아직 해결하지 못한 질문을 남긴다.
```

글은 최신 날짜부터 정렬되며, `featured: true`는 **같은 날짜의 글 가운데 먼저 배치**하는 설정이다. 항상 맨 위에 고정하는 기능은 아니다. `draft: true`인 원고는 생성되는 사이트에서 제외한다.

메타데이터는 한 줄짜리 단순 YAML 형식만 지원한다. 문자열은 예시처럼 큰따옴표로 감싸고, 날짜는 `YYYY-MM-DD`, 태그는 JSON 배열, 참·거짓 값은 따옴표 없는 `true` 또는 `false`로 적는다. 주석은 별도 줄에 `#`으로 시작한다. 여러 줄 문자열이나 값 뒤의 인라인 주석은 사용하지 않는다. 본문은 Markdown으로 작성하며, HTML 태그를 직접 쓰면 실행하지 않고 문자로 표시한다.

### 카테고리 값

화면에는 요청한 6개 이름이 그대로 표시된다. 글의 `category`에는 아래 오른쪽 값을 입력한다.

| 화면에 표시되는 이름 | `category` 값 |
| --- | --- |
| 개발 | `development` |
| CTF/Wargame | `ctf-wargame` |
| Bug Bounty | `bug-bounty` |
| 블로그/기술문서 | `blog-docs` |
| 논문/컨퍼런스 | `papers-conferences` |
| 공모전/자격증 | `contests-certifications` |

## 6. 과제 요구 사항과 구현 위치

| 요구 사항 | 구현 내용 |
| --- | --- |
| GitHub Pages의 개념과 사용 방법 이해 | 이 안내서의 개념, 파일 업로드 배포, 자동 배포 설명 |
| 자신만의 블로그 구축 | 보송송의 보안 노트 브랜딩과 개별 글 페이지 |
| 6개 카테고리 | 고정 메뉴, 카테고리별 목록, 글의 카테고리 표시 |
| 자기소개 | 시스템 해킹·임베디드 관심을 반영한 소개 페이지 |
| 메뉴 다듬기 | 홈, 카테고리, 전체 글, 소개로 이어지는 탐색 구조 |
| 디자인에 개성 반영 | 크림·잉크·라일락 색상, 보안 연구 노트 분위기, 독자적인 아이콘과 레이아웃 |
| 사용성 개선 | 모바일 화면 대응, 글 검색, 화면 테마 전환, 글 목차와 코드 복사 |

## 7. 게시 전 자신의 내용으로 다듬기

현재 블로그 이름과 자기소개는 제공된 관심사를 바탕으로 만든 초안이다. 이름·닉네임·소개·GitHub 주소를 원하는 값으로 수정한다. 6개 글에는 구성과 글쓰기 방법을 보여 주는 **예시 노트** 표시가 있다. 실제 풀이, 취약점 발견·제보, 수상, 자격증 취득 실적으로 제시하는 글이 아니다. 자신의 기록으로 교체하거나 내용을 검토한 뒤 개인 글로 발전시키면 된다.

원하는 글을 삭제하려면 `content/posts/`의 해당 `.md` 파일을 삭제하고 다시 빌드한다. 글이 없는 카테고리도 메뉴에는 유지된다.

GitHub 저장소 생성, 계정 권한, Pages 활성화, GitHub Actions의 실제 실행은 사용자의 저장소에서 확인해야 한다. 제공 파일 자체만으로 공개 URL이 생성되지는 않는다.

### 화면이 열리지 않을 때

| 증상 | 확인할 항목 |
| --- | --- |
| 404 표시 | 배포가 완료되었는지, Pages의 원본 설정이 선택한 방식과 일치하는지 확인한다. |
| 첫 배포에서 `/docs`를 선택할 수 없음 | 저장소 최상위에 `docs/index.html`이 업로드되었는지 확인한다. |
| 글 수정이 반영되지 않음 | 업로드 방식이면 다시 빌드해 `docs`를 갱신한다. 자동 방식이면 Actions 실행 결과를 확인한다. |
| 자동 배포 메뉴가 없음 | `.github/workflows/pages.yml`이 실제 저장소에 있는지 확인한다. |
| 이미지·스타일이 빠짐 | `docs`의 하위 폴더도 함께 업로드했는지 확인한다. |

## 공식 참고 자료

- [GitHub Pages 소개](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages 빠른 시작](https://docs.github.com/ko/pages/quickstart)
- [게시 원본 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [사용자 지정 Pages 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [setup-node 공식 저장소](https://github.com/actions/setup-node)

문서와 배포 구성 확인 기준일은 2026-10-27이다.
