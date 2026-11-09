---
title: Theme Builder
weight: 10
---

machbase-neo 웹 UI의 색 테마를 실시간 미리보기를 보면서 직접 만들고, 클릭 한 번으로 바꿀 수 있습니다.
내장된 Dark나 패키지에 포함된 프리셋 **Light**, **Cyberpunk**, **Aemeath**, **Cement 98** 중 하나에서 시작하세요.
프리셋은 그대로 쓸 수도 있습니다. 패키지를 설치하면 **Settings → Theme**에 나타납니다.

| Dark | Light |
| --- | --- |
| ![Dark의 New 탭]({{< asset "images/newtab-dark.png" >}}) | ![Light의 New 탭]({{< asset "images/newtab-light.png" >}}) |
| **Cyberpunk** | **Aemeath** |
| ![Cyberpunk의 New 탭]({{< asset "images/newtab-cyberpunk.png" >}}) | ![Aemeath의 New 탭]({{< asset "images/newtab-aemeath.png" >}}) |
| **Cement 98** | |
| ![Cement 98의 New 탭]({{< asset "images/newtab-cement98.png" >}}) | |

machbase-neo 8.7.2 이상이 필요합니다.

## 열기

App Store에서 패키지를 설치한 뒤 **Settings**(왼쪽 바 아래쪽의 톱니바퀴) → **Theme** → **Open Theme Builder**를 엽니다.
PACKAGES 목록에서 패키지를 열어도 됩니다.

{{< shot src="images/settings-menu.png" alt="Theme 항목이 강조된 Settings 메뉴" width="230" >}}

{{< shot src="images/theme-dialog.png" alt="Open Theme Builder 버튼이 있는 Theme 대화상자" width="480" >}}

## 테마 만들기

{{< shot src="images/builder-overview.png" alt="왼쪽은 단계별 설정, 오른쪽은 실시간 미리보기인 Theme Builder 화면" >}}

1. **Start from**에서 시작할 테마를 고릅니다. 지금 쓰고 있는 테마, Dark, 프리셋, 직접 만든 테마 중에서 고를 수 있습니다.
   프리셋 자체는 바뀌지 않으며, 무언가를 바꿔서 저장하면 내 사본이 됩니다.

   {{< shot src="images/start-from.png" alt="Dark와 프리셋 네 개가 있는 Start from 섹션" width="400" >}}

2. **Colors** — 기본 색부터 정합니다. **Frame**(작업 영역을 둘러싼 바), **Content**(각 탭 안쪽의 페이지 — 에디터, 결과, New 탭),
   **Text**, **Accent**, **Borders**(구분선과 카드·메뉴·대화상자·입력란의 테두리 등 모든 선), 그리고 두 가지 상태 색
   **Hover**(포인터가 올라간 곳)와 **Selection**(선택된 행)입니다. 나머지는 모두 이 색들을 따라가므로, 기본 색만 정해도
   테마 하나가 완성됩니다. 입력 중인 입력란이나 Tab 키로 이동한 버튼에는 **Focus outline** 색의 윤곽선이 그려지며,
   이 색은 Accent를 따라갑니다.

   {{< shot src="images/colors-basics.png" alt="예시 테마의 기본 색" width="390" >}}

3. 그다음 눈에 띄게 하고 싶은 부분을 조정합니다.
   - **기본 색 아래의 그룹** — **Surfaces**(Layer: 카드, 대화상자, 메뉴), **Text**(Sub text, Icons, Text on color),
     **Controls**(Scrollbar), **Signals**(Success, Warning, Error, Info, Neutral 회색과 각각의 글자색)가 있습니다.
     하나를 바꾸면 그 색을 쓰는 화면의 모든 부분이 따라 바뀝니다. 예를 들어 Hover를 바꾸면 모든 hover가 한꺼번에 바뀝니다.
   - **Using it** — 각 공용 색 아래에 그 색을 쓰는 모든 것이 나옵니다. 화면의 부품(왼쪽 바, 탭 바와 열린 탭, 사이드 패널,
     콘솔, 표, 입력란, 대화상자, 메뉴, 툴팁)과 그 색을 그대로 따라가는 공용 색(Frame 아래의 *Section headers*,
     Content 아래의 *Drawers*, Accent 아래의 *Primary button*과 *Focus outline*)입니다. 각 항목은 **Customize**하기 전까지
     그 색을 따라갑니다. Customize하면 다른 어떤 것도 그 항목을 바꾸지 않고, **Use \<color\>** 버튼을 누르면 다시 따라갑니다.
     예를 들어 표의 hover만 다른 hover와 다르게 할 수 있습니다.

   {{< shot src="images/using-it.png" alt="Hover 아래의 Using it에서 표의 hover만 Customize한 모습" width="383" >}}

   각 공용 색 아래에는 그 색이 어디에 보이는지 표시됩니다(*Tab bar · Console…* 형태이고, 포인터를 올리면 전체 목록이 나옵니다).
   부품 행에는 무엇을 따라가는지 표시됩니다. 기본 색의 행에는 함께 바뀌는 공용 색도 나오고
   (Accent 아래의 *Moves: Primary button · Focus outline…*), 계산으로 만들어진 색에는 어디서 왔는지 나옵니다(*from Content*).
   **Selection**(선택된 행)과 success / warning / error / info 색은 독립된 색이라서 Accent나 Content를 바꿔도 그대로입니다.
   시작한 테마가 어떤 부품을 해당 색의 음영으로 그린다면 행에 그렇게 표시됩니다(*follows Accent · darker, as Light has it*).
   바탕색은 글자색을 절대 바꾸지 않습니다. **Content**를 밝은 색으로 바꿔도 **Text**를 바꾸기 전까지 글자색은 그대로이며,
   미리보기 아래의 대비 검사가 읽기 어려워진 부분을 알려 줍니다.

   {{< shot src="images/contrast-checks.png" alt="Content를 밝게 바꾼 뒤의 대비 검사. 읽기 어려워진 글자에 LOW가 표시됩니다" >}}

4. **미리보기를 보세요.** 장면은 여섯 개이고, 각각 웹 UI를 내 색으로 그린 것입니다. **Workspace**(왼쪽 바, 탭, 사이드 패널,
   에디터, 결과, 콘솔), **Explorer**(사이드 패널의 목록인 DB 탐색기와 패키지, 표 페이지), **New tab**(Customize가 열린 상태 — Widgets 패널이 드로어입니다),
   **Dialogs**(배경 위의 대화상자, 입력란, 버튼, 메뉴, 툴팁), **Status**(배지, 상태 점, 메시지, 알림, 로그 레벨, 그리기에 실패한 탭, 토스트),
   **Sign-in**입니다. 각 탭에는 담고 있는 색의 개수가 표시됩니다.

   | Workspace | Explorer |
   | --- | --- |
   | {{< shot src="images/scene-work.png" alt="Workspace 장면" >}} | {{< shot src="images/scene-explorer.png" alt="Explorer 장면" >}} |
   | **New tab** | **Dialogs** |
   | {{< shot src="images/scene-newtab.png" alt="New tab 장면" >}} | {{< shot src="images/scene-dialogs.png" alt="Dialogs 장면" >}} |
   | **Status** | **Sign-in** |
   | {{< shot src="images/scene-status.png" alt="Status 장면" >}} | {{< shot src="images/scene-login.png" alt="Sign-in 장면" >}} |

   색의 행에 포인터를 올리면 그 색이 쓰인 장면이 나타나 칠해진 부분에 윤곽선이 그려지고, 그 색이 보이는 모든 장면의 탭에 불이 들어옵니다.
   미리보기의 아무 부분이나 클릭하면 해당 색으로 바로 이동합니다. 글자가 읽기 어려워지면 미리보기 아래의 대비 검사가 경고합니다.

   {{< shot src="images/preview-outline.png" alt="Accent에 포인터를 올린 모습. 칠해진 부분에 윤곽선이 그려지고 장면 탭에 불이 들어옵니다" >}}

5. **Sign-in page** — **Choose a picture…** 버튼으로 로그인 상자 뒤에 직접 고른 그림을 넣을 수 있고, 미리보기의 *Sign-in* 탭에 표시됩니다.
   그림은 테마와 함께 원본 그대로 보관됩니다(SVG나 10MB를 넘는 파일은 너비 최대 1920px의 WebP로 변환됩니다).
   **Use the web UI's picture**를 누르면 그림이 다시 제거됩니다.

   {{< shot src="images/sign-in-page.png" alt="Sign-in page 섹션과 Sign-in 장면에 표시된 직접 고른 그림" >}}

6. **All tokens**에는 웹 UI의 모든 색이 나열되어 있어 특정 값을 정확히 지정할 때 씁니다. 색의 행과 마찬가지로 포인터를 올리면
   미리보기에서 칠해진 부분에 윤곽선이 그려집니다. **Cursor effect**로 포인터 효과를 추가할 수도 있습니다(선택 사항).

   {{< shot src="images/all-tokens.png" alt="accent로 필터링한 All tokens" width="400" >}}

코드 에디터, 차트, 터미널의 라이트 또는 다크 모양은 Content 색에 따라 자동으로 정해집니다.
라이트 테마를 만들 때는 Light 프리셋에서 시작하는 것이 가장 빠릅니다.

## 저장하고 사용하기

- **Use this theme**는 테마를 저장하고 웹 UI를 바로 그 테마로 바꿉니다. **Undo**로 되돌릴 수 있습니다.
  아무것도 바꾸지 않았다면 시작한 테마(Dark, 프리셋, 내 테마)로 그대로 전환하고 사본은 저장하지 않습니다.

  {{< shot src="images/use-this-theme.png" alt="Use this theme를 누른 뒤 표시되는 메시지와 Undo" width="451" >}}

- **Save**는 전환하지 않고 저장만 합니다. **Save ▾ → Save as new theme**은 다른 버전으로 하나 더 저장합니다.
  둘 다 무언가를 바꿔야 활성화됩니다. 프리셋을 그대로 쓸 때는 사본이 필요 없기 때문입니다.

  {{< shot src="images/save-menu.png" alt="Save as new theme가 있는 Save 메뉴" width="317" >}}

- 언제든 **Settings → Theme**에서 바꿀 수 있습니다. Dark와 프리셋은 *Ready to use*에, 내 테마는 *My themes*에 있습니다.
  각 카드에는 해당 테마의 색이 표시되고, 내 테마의 **Edit**(연필 아이콘)를 누르면 여기서 편집할 수 있습니다.

  {{< shot src="images/theme-dialog-my-themes.png" alt="My themes에 저장한 테마가 사용 중인 Theme 대화상자" width="480" >}}

내 테마는 서버가 아니라 **이 브라우저**에 보관되며, 누가 로그인하든 같은 브라우저라면 같은 테마를 씁니다.
로그인 페이지에는 이 브라우저에서 고른 테마와 그 그림이 표시됩니다. 테마를 다른 브라우저나 컴퓨터로 옮기려면
**CSS ▾ → Export CSS**로 내보낸 뒤 그곳에서 **Import CSS**로 가져오세요. CSS에는 색만 담기므로 로그인 그림은 그곳에서 다시 골라야 합니다.

{{< shot src="images/css-menu.png" alt="Import CSS와 Export CSS가 있는 CSS 메뉴" width="404" >}}
