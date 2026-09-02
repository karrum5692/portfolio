# Forest of Learning — 스터디 서비스

스터디 그룹이 집중 시간을 기록하고 포인트로 보상받는 서비스

**기간** 2026.04.08 ~ 2026.04.27 (3주) · **인원** 6명
**담당** 집중(Focus) 타이머, 포인트 지급 로직 (프론트엔드 · 백엔드)

[Demo](https://forest-of-learning-frontend.vercel.app/) · [Backend](https://github.com/juengseulki/Forest-of-Learning-Backend) · [Frontend](https://github.com/juengseulki/Forest-of-Learning-Frontend)

> 팀 리더가 개설한 레포에 PR로 기여했습니다. 타이머 하나를 3주 동안 열네 번 고치면서, 시간을 무엇으로 정의하느냐가 코드보다 먼저라는 것을 배웠습니다.

---

## Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)

---

## 시간을 무엇으로 정의할 것인가

### 문제

스터디원이 목표 시간을 정하고 타이머로 집중한 뒤, 달성 정도에 따라 포인트를 받는 기능을 맡았습니다.

초기 구현은 브라우저에서 `Date.now()`로 경과 시간을 계산하고, 그 값으로 포인트까지 계산해 서버에 저장하는 구조였습니다. 처음에는 문제없이 동작했습니다.

**일시정지 기능을 추가하면서 시간 계산이 무너졌습니다.**

- 일시정지 후 새로고침하면 타이머가 계속 흐름
- 멈춰 있는 동안에도 점수가 쌓임

포인트가 걸린 기능이라 "대략 맞는" 수준으로는 둘 수 없었고, 계산의 근거를 신뢰할 수 있게 만들어야 했습니다.

PR 이력에 그 과정이 남아 있습니다. 4월 8일 `feat`로 만든 뒤, 4월 9일부터 21일까지 같은 기능에 `fix`가 계속 붙습니다. 중간에 `refactoring` 라벨이 두 번 나옵니다.

### 원인

시간 계산 자체가 어려웠던 게 아니라, **시간을 무엇으로 정의할지 정하지 않은 채 코드를 쓴 것**이 문제였습니다.

"매초 1씩 더한다"는 방식은 화면이 계속 떠 있다는 암묵적 전제 위에 있었습니다. 일시정지와 새로고침이 그 전제를 깼습니다.

### 해결

**1. 누적 카운터를 버리고 시각 차이로 계산했습니다.**

매초 값을 더해가는 방식은 새로고침이나 탭 비활성화에 취약합니다. `pausedAt`, `totalPausedMs` 필드를 세션 상태에 추가하고, 실제 공부 시간을 **`전체 경과 − 누적 일시정지`** 로 도출했습니다. 남은 시간도 마찬가지로, 일시정지한 만큼 `plannedEndAt`을 뒤로 밀어 카운트다운 정확도를 유지했습니다.

**2. 시간이 흐르는 조건을 명시했습니다.**

`status === RUNNING`일 때만 현재 시각을 갱신하도록 해서, 일시정지 중에는 타이머와 점수 집계가 함께 멈추게 했습니다. 재개 시점에 시각을 다시 동기화해 화면이 튀는 현상도 없앴습니다.

**3. 포인트 계산 시점과 주체를 바꿨습니다.**

기존에는 1차·2차 포인트가 타이머가 도는 동안 실시간으로 쌓이는 구조였습니다. 그래서 일시정지 중에도 점수가 올라갔습니다. **지급 시점을 세션 종료 버튼을 누른 순간으로 옮겨**, 확정된 세션 기록을 근거로 한 번에 계산하도록 바꿨습니다.

계산 주체도 클라이언트에서 서버로 옮겼습니다. 클라이언트가 계산한 포인트를 그대로 저장하던 구조에서, 서버가 세션 기록을 근거로 직접 계산하도록 했습니다. 지급 이력은 로그로 남겼습니다.

→ [Frontend #32](https://github.com/juengseulki/Forest-of-Learning-Frontend/pull/32) · [#37](https://github.com/juengseulki/Forest-of-Learning-Frontend/pull/37)

### 결과

일시정지·새로고침·장시간 세션 어느 경우에도 실제 공부 시간과 지급 포인트가 일치하게 됐습니다.

포인트 계산이 서버로 이동하면서 **클라이언트 시각 조작으로 점수를 얻을 수 없게 됐고**, 지급 이력이 로그로 남아 문제가 생겼을 때 근거를 확인할 수 있게 됐습니다.

프론트 14건, 백엔드 11건의 PR을 올렸고, 타이머 로직은 리팩터링을 거쳐 상태 관리와 표시 책임이 분리된 구조가 됐습니다.

레포를 개설한 팀 리더가 아니었기 때문에, 개인 계정으로 fork를 뜬 뒤 upstream에 PR을 보내는 방식으로 기여했습니다. 주요 변경 건은 멘토에게 코드리뷰를 요청해 확인받았습니다.

---

## 배운 것

처음에 어려웠던 건 시간 계산 자체가 아니라, **시간을 무엇으로 정의할지 정하지 않은 채 코드를 쓴 것**이었습니다. 두 시각의 차이로 정의하고 나서야 예외가 사라졌습니다.

그리고 **클라이언트가 계산한 값은 결과가 아니라 입력**이라는 것을 배웠습니다. 포인트처럼 신뢰가 필요한 값은 서버가 판단해야 하고, 클라이언트는 화면을 보여주는 역할까지입니다.

다음 프로젝트에서는 시간·금액·포인트처럼 정확성이 필요한 값은 **계산 주체와 기준 시각을 먼저 정하고** 코드를 쓰기로 했습니다.

한 가지 더 남은 아쉬움이 있습니다. 이 프로젝트의 PR 제목은 `[심현수] focus-1` 형태라, 지금 보면 무슨 작업이었는지 알기 어렵습니다. 기록이 없으면 판단의 근거도 남지 않는다는 것을 여기서 느꼈고, 이후 프로젝트에서 커밋 컨벤션과 PR 템플릿을 직접 도입하는 계기가 됐습니다.

---

## 팀 구성

| 이름 | 역할 | 담당 기능 |
|---|---|---|
| 정슬기 | PM / Focus | 요구사항 정의, 데이터 구조 설계, API 명세, ERD 작성 |
| 전강민 | API / Habit | API 구현, Prisma 연동, 습관 상태 관리 |
| 박소정 | Study | 스터디 CRUD, 목록 조회, 검색, 정렬, 페이지네이션 |
| 원세빈 | Detail | 상세 페이지 데이터 연결, 응원 이모지 |
| 최광헌 | Habit | 습관 CRUD, 체크/해제 기능 |
| **심현수** | **Focus** | 타이머 UI, 집중 기능, 집중 완료 흐름 구현, 포인트 로그 UI |
