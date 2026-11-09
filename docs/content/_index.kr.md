---
title: Theme Builder 기술 문서
weight: 10
---

Theme Builder 패키지는 Machbase Neo 웹 UI의 색 테마를 실시간 미리보기를 보면서 직접 만들고, 클릭 한 번으로 바꿀 수 있게 해 줍니다.

내장된 Dark나 패키지에 포함된 프리셋 **Light**, **Cyberpunk**, **Aemeath**, **Cement 98** 중 하나에서 시작하세요. 프리셋은 그대로 쓸 수도 있습니다. 패키지를 설치하면 **Settings → Theme**에 나타납니다.

## 설치

Machbase Neo 왼쪽 바의 App Store에는 사용 가능한 패키지 목록이 표시됩니다.  
여기서 Theme Builder 패키지(`neo-pkg-theme-builder`)를 선택하고 `Install` 버튼을 누르면 설치할 수 있습니다.

설치에는 약간의 시간이 걸릴 수 있으므로, 완료될 때까지 잠시 기다립니다.

{{< shot src="images/package-install.png" alt="패키지 목록의 Theme Builder 패키지" width="262" >}}

### 요구 사항

- Machbase Neo 8.7.4 이상

### 제거

왼쪽 패널에서 `neo-pkg-theme-builder`를 선택하고 **Uninstall**을 누릅니다. 프리셋을 사용 중이었다면 웹 UI는 Dark로 돌아갑니다. 직접 만든 테마는 브라우저에 그대로 남으며, **Settings → Theme**에서 삭제할 수 있습니다.

## 프리셋

| Dark | Light |
| :--- | :--- |
| ![Dark의 New 탭](/images/newtab-dark.png) | ![Light의 New 탭](/images/newtab-light.png) |
| **Cyberpunk** | **Aemeath** |
| ![Cyberpunk의 New 탭](/images/newtab-cyberpunk.png) | ![Aemeath의 New 탭](/images/newtab-aemeath.png) |
| **Cement 98** | |
| ![Cement 98의 New 탭](/images/newtab-cement98.png) | |

## 이 문서에서 다루는 내용

- 패키지 설치
- Theme Builder 열기와 시작할 테마 선택
- 기본 색 설정과 개별 부품 Customize
- 미리보기와 대비 검사로 결과 확인
- 커서 효과, 로그인 그림, 개별 토큰
- 테마 저장과 전환, 다른 브라우저로 옮기기

## 기본 작업 순서

1. App Store에서 Theme Builder 패키지를 설치합니다.
2. **Settings → Theme → Open Theme Builder**를 엽니다.
3. **Start from**에서 테마를 고르고 내 테마의 이름을 정합니다.
4. **Colors**에서 기본 색을 정합니다.
5. **Using it**에서 다르게 하고 싶은 부품을 Customize합니다.
6. 미리보기의 각 장면과 그 아래의 대비 검사를 확인합니다.
7. **Use this theme**를 눌러 테마를 저장하고 전환합니다.

## 화면 구성

- 상단 바
  - 테마 이름
  - CSS (Import CSS, Export CSS)
  - Save와 Save as new theme
  - Use this theme
- 왼쪽 패널
  - Start from
  - Colors
  - Cursor effect
  - Sign-in page
  - All tokens
- 오른쪽 영역
  - 장면 탭
  - 미리보기
  - 대비 검사

![Theme Builder 화면](/images/builder-overview.png)

## 문서 목록

| 문서 | 내용 |
| :--- | :--- |
| [시작하기]({{< relref "getting-started" >}}) | **처음이라면 여기부터** — Theme Builder 열기 · 시작할 테마 선택 · 테마 이름 정하기 |
| [색 설정]({{< relref "colors" >}}) | 기본 색 · 색 그룹 · 부품 하나만 Customize · 라이트와 다크 |
| [미리보기]({{< relref "preview" >}}) | 여섯 장면 · 색이 칠하는 곳 보기 · 대비 검사 |
| [커서·로그인 페이지·토큰]({{< relref "cursor-sign-in-and-tokens" >}}) | 커서 효과 · 로그인 그림 · 모든 토큰 |
| [저장과 사용]({{< relref "save-and-use" >}}) | Use this theme · Save · 테마 전환 · 다른 브라우저로 옮기기 |
| [릴리스 노트]({{< relref "release-notes" >}}) | 버전별 변경 사항 |

## 문서 이동

- [다음: 시작하기]({{< relref "getting-started" >}})
