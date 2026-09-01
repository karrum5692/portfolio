# 최애의 포토 — 포토카드 거래 플랫폼

포토카드를 등록·판매하고 포인트로 교환하는 웹 서비스

**기간** 2026.06.01 ~ 2026.06.23 (4주) · **인원** 6명
**역할** PM · 공통 기반 · 도메인 통합

[Demo](https://my-favorite-photo-frontend.vercel.app) · [Backend](https://github.com/karrum5692/my-favorite-photo-backend) · [Frontend](https://github.com/karrum5692/my-favorite-photo-frontend)

> 6명이 도메인을 나눠 맡는 구조에서 PM을 맡았습니다. 프론트에서는 공통 컴포넌트를 만들고, 백엔드에서는 도메인 경계에서 깨지는 지점을 메웠습니다. 백엔드 PR 17건 중 14건이 `[fix]`입니다.

---

## Tech Stack

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)

**Frontend**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)

**Auth & Logging**

![Passport](https://img.shields.io/badge/Passport-34E27A?style=flat-square&logo=passport&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![OAuth 2.0](https://img.shields.io/badge/OAuth_2.0-EB5424?style=flat-square&logo=auth0&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white)
![Winston](https://img.shields.io/badge/Winston-231F20?style=flat-square)
![Morgan](https://img.shields.io/badge/Morgan-231F20?style=flat-square)

---

## 1. 만든 것과 메운 것

담당이 두 갈래였습니다. **프론트에서는 여러 도메인이 공유할 기반을 만들었고, 백엔드에서는 도메인이 만나는 지점에서 깨지는 것을 메웠습니다.**

PR 성격이 그대로 갈립니다.

| | 총 PR | `[feat]` | `[fix]` |
|---|---|---|---|
| Frontend | 15건 | 8건 | 7건 |
| Backend | 17건 | 1건 | 14건 |

### 프론트 — 팀이 공유할 기반

| PR | 내용 |
|---|---|
| [#3](https://github.com/karrum5692/my-favorite-photo-frontend/pull/3) | 공통 Header |
| [#9](https://github.com/karrum5692/my-favorite-photo-frontend/pull/9) | 공통 버튼 컴포넌트 |
| [#15](https://github.com/karrum5692/my-favorite-photo-frontend/pull/15) | Axios 인스턴스 설정 |
| [#28](https://github.com/karrum5692/my-favorite-photo-frontend/pull/28) | 페이지네이션 공통 모달 |
| [#34](https://github.com/karrum5692/my-favorite-photo-frontend/pull/34) | 결과 처리 공통 모달 |
| [#46](https://github.com/karrum5692/my-favorite-photo-frontend/pull/46) | 랜덤포인트 이벤트, 로그인 인증 가드 |
| [#47](https://github.com/karrum5692/my-favorite-photo-frontend/pull/47) | 알림 모달 및 알림 전체 보기 페이지 |

공통 컴포넌트와 알림 매핑 규칙을 먼저 정해둔 결과, 팀원들이 같은 것을 각자 만드는 상황을 줄일 수 있었습니다.

### 백엔드 — 경계에서 나는 문제

6명이 인증·포토카드·거래·포인트·알림을 나눠 맡았습니다. 분할은 팀원들과 함께 정했고, 각자 영역은 잘 돌아갔는데 합치면 깨졌습니다.

**문제가 한 사람의 코드 안이 아니라 경계에서 났습니다.** 담당자를 특정하기 어려우니 서로 "내 쪽은 맞다"로 끝났고, 그사이 통합 브랜치가 계속 깨진 상태로 남았습니다.

| PR | 내용 |
|---|---|
| [#17](https://github.com/karrum5692/my-favorite-photo-backend/pull/17) · [#19](https://github.com/karrum5692/my-favorite-photo-backend/pull/19) · [#34](https://github.com/karrum5692/my-favorite-photo-backend/pull/34) | 인증 미들웨어 export 구조 및 라우터 연결 정리 |
| [#37](https://github.com/karrum5692/my-favorite-photo-backend/pull/37) | OAuth 흐름 및 `app.js` 정리 |
| [#50](https://github.com/karrum5692/my-favorite-photo-backend/pull/50) | 미들웨어 에러 코드 체계 |
| [#53](https://github.com/karrum5692/my-favorite-photo-backend/pull/53) · [#66](https://github.com/karrum5692/my-favorite-photo-backend/pull/66) · [#67](https://github.com/karrum5692/my-favorite-photo-backend/pull/67) | 포인트 로직, 포인트 테이블 누락, 가입 시 포인트 미지급 |
| [#57](https://github.com/karrum5692/my-favorite-photo-backend/pull/57) | 거래 로직 수정 |
| [#60](https://github.com/karrum5692/my-favorite-photo-backend/pull/60) · [#61](https://github.com/karrum5692/my-favorite-photo-backend/pull/61) | 인증·Passport 하드코딩 제거 |
| [#68](https://github.com/karrum5692/my-favorite-photo-backend/pull/68) | 구글 인증 응답 오류 |

하드코딩을 미리 걷어낸 덕에 배포 시 인증 관련 장애가 발생하지 않았습니다.

---

## 2. 문제를 고치기 전에 보이게 만들었습니다

결함 하나마다 원인 추적에 시간이 반복적으로 들었습니다. "어디서 깨졌나"를 서로 묻는 대화가 디버깅의 대부분을 차지했습니다.

프로젝트 중반인 6월 15일, `winston` · `morgan` · `Sentry`로 로그 수집 체계를 세웠습니다. → [#52](https://github.com/karrum5692/my-favorite-photo-backend/pull/52)

요청 로그와 에러가 남으니, 원인을 묻는 대신 로그를 확인하면 되는 상태가 됐습니다.

PR 이력에 그 변화가 남아 있습니다.

| 구간 | 기간 | 백엔드 PR |
|---|---|---|
| 로그 이전 | 6/5 ~ 6/12 (8일) | 7건 |
| 로그 이후 | 6/15 ~ 6/19 (5일) | 9건 |

프로젝트 후반이라 결함이 더 드러난 영향도 있겠지만, **원인을 찾는 데 쓰던 시간을 고치는 데 쓸 수 있게 된 것이 체감상 가장 큰 변화였습니다.**

---

## 3. 팀이 같은 방식으로 일하게 만들었습니다

PM으로서 일정 관리와 회의 진행, 코드리뷰 배분, 외부 보고를 담당했습니다. 그중 코드에 남은 것은 **개발 환경 표준화**입니다.

| 도구 | 목적 |
|---|---|
| Husky | 커밋·푸시 시점에 검사를 강제 |
| Commitlint | 커밋 메시지 형식 통일 |
| ESLint · Prettier | 코드 스타일 자동 정렬 |
| CodeRabbit | PR 자동 리뷰 |
| PR 템플릿 | 작업 내용·테스트 결과·체크리스트 기재 |
| 라벨 체계 | 담당자 축 + 작업 종류 축(`feat` / `fix` / `refactor`) |

전부 제가 세팅했고, 팀원 5명이 그 위에서 작업했습니다. **레포에 남은 79건의 PR 전체에 담당자·작업 종류 라벨이 붙어 있고, PR 템플릿의 체크리스트가 모두 채워져 있습니다.** 규칙을 만드는 것과 그 규칙이 끝까지 지켜지는 것은 다른 문제인데, 이력이 그 답을 대신합니다.

경계에서 문제가 반복된 것과 같은 이유였습니다. **규칙이 없으면 각자의 방식이 부딪히는 지점에서 비용이 생깁니다.** 라벨을 담당자와 작업 종류 두 축으로 나눈 것도, 나중에 "누가 무엇을 했나"를 코드 밖에서 찾을 수 있게 하기 위해서였습니다.

---

## 배운 것

**팀 프로젝트에서 가장 자주 깨지는 곳은 코드가 아니라 코드 사이입니다.** 각자 자기 영역만 보면 아무도 경계를 안 봅니다. 누군가 그 자리를 맡아야 하고, 이번엔 제가 맡았습니다.

그리고 문제를 고치는 것보다 **문제를 보이게 만드는 것이 먼저**라는 것을 배웠습니다. 로그가 없을 때는 결함 하나에 원인 추적으로 시간을 다 썼고, 로그가 생긴 뒤에야 고치는 데 시간을 쓸 수 있었습니다.

다만 이런 역할은 눈에 잘 남지 않습니다. 백엔드 PR 17건 중 14건이 `[fix]`라, "무슨 기능을 만들었나"로는 설명하기 어렵습니다. 그래서 다음 프로젝트에서는 이런 작업이 왜 필요했는지를 기록으로 남겨, 팀이 그 가치를 공유할 수 있게 하려 합니다.

---

## 팀 구성

| 팀원 | 역할 | 담당 기능 |
|---|---|---|
| 김상우 | 유저/인증 | 회원가입, 로그인, 인증 세션 구성 |
| 정다희 | 마켓플레이스 | 검색, 조회, 상세, 생성 |
| 임주연 | 포토카드 거래 | 구매/판매 기능 |
| 최광헌 | 포토카드 교환 | 양측 수락 로직 및 상태 관리 |
| 윤이준 | 마이갤러리, 포토카드 생성 | 유저 프로필, 포토 목록, 포인트 관리 |
| **심현수** | **PM, 공통 기반** | 공통 모달, 헤더, 랜딩 페이지, 랜덤 포인트, 알림 |
