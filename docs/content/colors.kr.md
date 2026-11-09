---
title: 색 설정
weight: 30
---

기본 색부터 정한 뒤, 눈에 띄게 하고 싶은 부분을 조정합니다.

## 기본 색

- **Frame**: 작업 영역을 둘러싼 바
- **Content**: 각 탭 안쪽의 페이지 — 에디터, 결과, New 탭
- **Text**: 모든 부분의 기본 글자
- **Accent**: 활성 표시, Primary 버튼, 링크, 포커스 윤곽선이 이 색을 따라갑니다
- **Borders**: 구분선과 카드·메뉴·대화상자·입력란의 테두리 등 모든 선
- **Hover**: 포인터가 올라간 곳
- **Selection**: 선택된 행

나머지는 모두 이 색들을 따라가므로, 기본 색만 정해도 테마 하나가 완성됩니다. 입력 중인 입력란이나 Tab 키로 이동한 버튼에는 **Focus outline** 색의 윤곽선이 그려지며, 이 색은 Accent를 따라갑니다.

{{< shot src="images/colors-basics.png" alt="예시 테마의 기본 색" width="390" >}}

## 색 그룹

기본 색 아래의 그룹에는 나머지 공용 색이 있습니다. 하나를 바꾸면 그 색을 쓰는 화면의 모든 부분이 따라 바뀝니다. 예를 들어 Hover를 바꾸면 모든 hover가 한꺼번에 바뀝니다.

- **Surfaces**: Layer(카드, 대화상자, 메뉴)
- **Text**: Sub text, Icons, Text on color
- **Controls**: Scrollbar
- **Signals**: Success, Warning, Error, Info, Neutral 회색과 각각의 글자색

## 부품 하나만 Customize

각 공용 색 아래의 **Using it**에는 그 색을 쓰는 모든 것이 나옵니다. 화면의 부품(왼쪽 바, 탭 바와 열린 탭, 사이드 패널, 콘솔, 표, 입력란, 대화상자, 메뉴, 툴팁)과 그 색을 그대로 따라가는 공용 색(Frame 아래의 *Section headers*, Content 아래의 *Drawers*, Accent 아래의 *Primary button*과 *Focus outline*)입니다.

각 항목은 **Customize**하기 전까지 그 색을 따라갑니다. Customize하면 다른 어떤 것도 그 항목을 바꾸지 않고, **Use \<color\>** 버튼을 누르면 다시 따라갑니다. 예를 들어 표의 hover만 다른 hover와 다르게 할 수 있습니다.

{{< shot src="images/using-it.png" alt="Hover 아래의 Using it에서 표의 hover만 Customize한 모습" width="383" >}}

## 색이 보이는 곳

각 공용 색 아래에는 그 색이 어디에 보이는지 표시됩니다(*Tab bar · Console…* 형태이고, 포인터를 올리면 전체 목록이 나옵니다). 부품 행에는 무엇을 따라가는지 표시됩니다.

- 기본 색의 행에는 함께 바뀌는 공용 색도 나옵니다(Accent 아래의 *Moves: Primary button · Focus outline…*).
- 계산으로 만들어진 색에는 어디서 왔는지 나옵니다(*from Content*).
- 시작한 테마가 어떤 부품을 해당 색의 음영으로 그린다면 행에 그렇게 표시됩니다(*follows Accent · darker, as Light has it*).

**Selection**(선택된 행)과 success / warning / error / info 색은 독립된 색이라서 Accent나 Content를 바꿔도 그대로입니다.

## 라이트와 다크

코드 에디터, 차트, 터미널의 라이트 또는 다크 모양은 Content 색에 따라 자동으로 정해집니다. 라이트 테마를 만들 때는 Light 프리셋에서 시작하는 것이 가장 빠릅니다.

바탕색은 글자색을 절대 바꾸지 않습니다. **Content**를 밝은 색으로 바꿔도 **Text**를 바꾸기 전까지 글자색은 그대로이며, 미리보기 아래의 대비 검사가 읽기 어려워진 부분을 알려 줍니다.

## 문서 이동

- [이전: 시작하기]({{< relref "getting-started" >}})
- [목차로 돌아가기]({{< relref "/" >}})
- [다음: 미리보기]({{< relref "preview" >}})
