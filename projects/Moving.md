# MOVING — 이사 견적 중개 서비스

고객과 이사 기사님을 연결하는 견적 중개 플랫폼

**기간** 2026.07.20 ~ 2026.08.28 (6주) · **인원** 8명
**담당** 견적 요청 API · 관리자 운영 대시보드 API · 약관·통계 기능

[Backend](https://github.com/4roro-moving/moving-backend) · [Frontend](https://github.com/4roro-moving/moving-frontend) · [Admin](https://github.com/4roro-moving/moving-admin-frontend) · [Service](https://moving-frontend-p2ol.vercel.app/)

> 실사용 규모(685만 행) 데이터에서 관리자 대시보드 API를 33.8초에서 0.38초로 개선하고, k6 부하 테스트로 300 VU까지 검증했습니다. 그 과정에서 같은 도메인이 두 번 병목이 되었고, 두 번의 원인은 서로 달랐습니다.

---

## Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![AWS RDS](https://img.shields.io/badge/AWS_RDS-527FFF?style=flat-square&logo=amazonrds&logoColor=white)
![k6](https://img.shields.io/badge/k6-7D64FF?style=flat-square&logo=k6&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white)

---

## 1. 관리자 대시보드 API 33.8초 → 0.38초

### 문제

최근 7일간의 운영 지표를 한 화면에 보여주는 대시보드입니다. 열 종류가 넘는 지표 때문에 쿼리 17개를 실행하는 구조였고, 이미 `Promise.all`로 병렬 처리하고 있었습니다.

그런데 실데이터 기준 첫 응답이 **33.8초**였습니다.

병렬 실행은 동시에 던지는 것이지 각 쿼리를 빠르게 만들지 않습니다. 17개를 같이 보내도 **가장 느린 하나가 끝나야 응답이 나갑니다.**

로컬 개발 환경의 시드 데이터는 수백 건 규모여서 어떤 쿼리를 써도 빠르게 동작했습니다. 실사용 환경을 검증하기 위해 약 685만 행의 데이터를 생성해 AWS RDS로 이관한 뒤에야 드러난 문제였습니다.

| 테이블 | 행 수 |
|---|---|
| 견적 | 169만 |
| 이력 | 122만 |
| 채팅 | 61만 |
| 견적 요청 | 55만 |
| 리뷰 | 37만 |
| 회원 | 11만 |

인스턴스를 키우는 방법도 있었지만, 그러면 원인은 그대로 남습니다.

### 접근

**1. 관측 지점부터 만들었습니다.**

`src/lib/prisma.ts`를 임시로 고쳐 Prisma 쿼리 이벤트를 받고, 200ms를 넘는 것만 콘솔에 출력했습니다. 전부 찍으면 요청 하나에 수십 줄이 쏟아져 범인이 묻히기 때문입니다.

```
[SLOW 20070ms]  estimates COUNT WHERE status='CONFIRMED' AND confirmed_at >= ...
[SLOW 12334ms]  estimates GROUP BY status WHERE created_at >= ...
[SLOW  8233ms]  estimate_requests GROUP BY status ...
```

임계값 하나로 17개가 5개로 줄었고, 20초짜리가 바로 드러났습니다.

200ms에 정확한 근거가 있지는 않습니다. 로그를 육안으로 훑을 수 있는 수준으로 줄이는 것이 목적이었고, 더 낮췄으면 노이즈가, 더 높였으면 8초짜리를 놓쳤을 것입니다.

응답 시간은 `curl`에 `%{time_total}`을 붙여 측정했고, 캐시 TTL이 60초라 재측정 시에는 그만큼 기다렸습니다.

**2. 시간이 아니라 읽은 양을 측정했습니다.**

가장 느린 쿼리에 `EXPLAIN (ANALYZE, BUFFERS)`를 돌렸습니다.

시간은 결과지 원인이 아닙니다. "20초 걸렸다"만으로는 CPU인지 디스크인지 락인지 알 수 없어 다음 행동이 정해지지 않습니다. 읽은 양은 두 가지가 다릅니다. **원인을 하나로 좁혀주고, 코드로 줄일 수 있는 숫자**입니다.

```
Index Scan using estimates_status_idx on estimates
  Filter: (confirmed_at >= $1)
  Buffers: shared hit=11830
```

**인덱스는 이미 있었습니다.** 문제는 유무가 아니라 읽는 양이었습니다. `status`로 확정 견적 56만 건을 전부 찾은 뒤, 각 행의 힙을 다시 열어 날짜 조건을 확인하고 있었습니다. 최근 7일치만 필요한데 전체 기간을 뒤지고 있었던 것입니다.

**11,830 페이지, 약 92MB.** 이 숫자가 판단을 결정했습니다. RDS `t4g.micro`는 메모리가 1GiB라 92MB를 반복해서 읽으면 캐시로 감당되지 않습니다. 인스턴스를 키울 게 아니라 **읽는 양을 줄이면 된다**는 결론이 여기서 나왔습니다.

**3. 세 단계로 줄였습니다.**

| 단계 | 조치 |
|---|---|
| Query | 중복 집계를 걷어내 쿼리 17개 → 8개 |
| Index | `status = 'CONFIRMED'` 조건과 날짜를 함께 담은 **부분 인덱스** |
| Cache | 운영 지표에 60초 캐시 |

부분 인덱스는 확정 상태인 행만 담고 날짜까지 함께 가지므로 힙을 열 필요가 없어집니다. 적용 후 `Index Only Scan`, `Heap Fetches: 0`을 확인했습니다.

### 결과

| | 값 |
|---|---|
| 읽는 페이지 | 11,830 → **33** |
| 쿼리 수 | 17 → **8** |
| 응답 (DB 개선) | 33.8s → **2.2s** |
| 응답 (캐시 적중) | 2.2s → **0.38s** |

쿼리 축소와 부분 인덱스만으로 31.6초가 줄어, **전체 개선의 94%가 캐시 이전 단계**에서 발생했습니다. 캐시는 남은 시간을 다듬은 것이지 문제를 덮은 것이 아닙니다.

두 번째로 느렸던 12초 쿼리는 `created_at` 집계였는데 인덱스가 이미 있었고, 버퍼 캐시가 데워지면서 수백 밀리초대로 내려와 따로 손대지 않았습니다.

이후 팀에 인덱스 판단 기준도 공유했습니다. `User` 테이블은 쓰기가 드물어 인덱스를 추가했지만, `estimate_requests`는 이미 인덱스가 10개인 데다 쓰기가 잦은 반면 얻는 이득은 관리자 화면 1.2초여서, 읽기 빈도 대비 쓰기 비용이 맞지 않는다고 판단해 보류했습니다.

---

## 2. 개선이 부하에서도 유효한가

단일 요청 0.38초와 동시 접속 300명에서의 0.38초는 다른 문제입니다. 개선이 부하 상황에서도 유지되는지 확인하기 위해 k6로 부하 테스트를 작성했습니다.

### 대조군을 함께 측정했습니다

실사용 빈도가 높고 쿼리 구조상 부하에 취약할 수 있는 4개를 고르고, **공지 목록(40건, 가벼운 쿼리)을 대조군으로 추가**했습니다.

판별 기준을 먼저 정하기 위해서입니다. 무거운 쿼리만 느려지면 **쿼리 구조 문제**이고, 대조군까지 같이 느려지면 **인스턴스 한계**입니다. 이 구분이 없으면 느려졌다는 사실만 알고 어디를 고쳐야 할지는 모릅니다.

외부 API 호출(AI 예상 견적), 연결 유지형(SSE 알림), 쓰기 작업은 제외했습니다. 각각 실제 과금이 발생하거나, 별도 시나리오가 필요하거나, 데이터를 오염시키기 때문입니다.

→ [부하 테스트 스크립트](../assets/moving/load-test.js)

### 같은 도메인이 두 번째로 느렸습니다

| 엔드포인트 | p95 |
|---|---|
| 공지 목록 (대조군) | 182ms |
| 기사 상세 | 103ms |
| 기사 리뷰 | 127ms |
| 기사 목록 | 202ms |
| **내 견적 요청** | **5,413ms** |

대조군이 정상이므로 인스턴스 한계가 아니었습니다. 그리고 하필 앞서 대시보드에서 손댔던 `estimate_requests`였습니다.

### 또 인덱스를 의심했고, 틀렸습니다

`customerId` 필터와 `createdAt DESC` 정렬을 동시에 만족하는 인덱스가 없었습니다. 복합 인덱스를 넣자 `Index Only Scan`, `Heap Fetches: 0`이 나왔는데 — **응답은 4.5초 그대로였습니다.**

EXPLAIN으로 잰 쿼리에 `_count`가 빠져 있었기 때문입니다.

```sql
SELECT id FROM estimate_requests WHERE "customerId" = ... LIMIT 10
-- Execution Time: 0.058 ms   ← 실제 발행되는 쿼리가 아니었음
```

제가 추정한 쿼리를 재고 "DB는 무죄"라고 결론 냈습니다. 인덱스 자체는 개선이므로 남기되, 커밋에 효과 범위를 명시했습니다.

> 목록 API 지연(4.5s)의 원인은 아니며, 별건으로 추적 중.

→ [PR #201](https://github.com/4roro-moving/moving-backend/pull/201)

인덱스가 해결한 것과 해결하지 못한 것을 구분해두지 않으면, 다음에 같은 곳을 또 의심하게 되기 때문입니다.

### 용의자를 하나씩 지웠습니다

| 확인한 것 | 결과 | 알게 된 것 |
|---|---|---|
| 위조 토큰 요청 | 18ms | Express·미들웨어 체인 정상. 지연은 DB 조회 안에 있다 |
| 알림 목록 (인증 필요) | 20ms | `authenticate`의 users 조회는 무죄 |
| `/estimate-requests/active` | 20ms | 같은 select를 쓰는데 빠르다 |

**마지막 항목이 오히려 저를 오래 헤매게 했습니다.** `/active`는 완전히 같은 `estimateRequestDetailSelect`를 씁니다. 관계 6개, 2단 중첩 그대로입니다. 그게 20ms에 끝나는 걸 보고 select 구조를 용의선상에서 지웠습니다.

실제로는 `findFirst`라 1행이고 서브쿼리도 1회, 목록은 10행이라 10회였습니다.

Prisma 쿼리 로그를 켜고 실제 발행되는 SQL을 본 뒤 30초 만에 원인이 나왔습니다.

### 원인은 코드 재사용이었습니다

상세용 select에 있던 `_count`를 목록 조회가 그대로 물려받고 있었습니다.

```ts
_count: {
  select: { estimates: true },
},
```

Prisma는 이것을 `COALESCE(aggr_selection_0_Estimate...)` 형태의 상관 서브쿼리로 번역합니다. 반환되는 10행 각각에 대해 `estimates` 테이블을 집계하는 구조입니다.

같은 `where`, 같은 `orderBy`, 같은 10행에서 `_count` 유무만 바꿔 재봤습니다.

| | 응답 |
|---|---|
| `_count` 있음 | 3,300ms |
| `_count` 없음 | **17.64ms** |

### 해결

`estimates: { select: { moverId: true } }`를 이미 조회하고 있었습니다. 개수는 그 배열의 길이로 구하면 되고, 추가 쿼리가 필요 없습니다.

```ts
// repository — 상세용 select에서 _count 만 제외해 목록용을 파생
const { _count, ...estimateRequestListSelect } = estimateRequestDetailSelect;

// mapper — 길이로 복원
_count: { estimates: estimates.length },
```

응답 형태가 그대로라 프론트엔드 수정도 없었습니다.

→ [PR #202](https://github.com/4roro-moving/moving-backend/pull/202)

### 결과

| | Before | After |
|---|---|---|
| 내 견적 요청 p95 | 5,413ms | **31ms** |
| 전체 `http_req_duration` p95 | 4,100ms | **103ms** |

**손대지 않은 나머지 네 엔드포인트도 같이 빨라졌습니다.** 4초짜리 요청이 커넥션과 CPU를 붙잡고 있었기 때문입니다.

개선 전에는 부하가 올라가면서 테스트가 정상적으로 완주되지 않았습니다. 수정 후 세 단계 시나리오를 모두 통과했습니다.

| 시나리오 | VU | 전체 p95 | 실패율 |
|---|---|---|---|
| smoke | 5 | 102.65ms | 0.00% |
| load | 50 | 74.68ms | 0.00% |
| stress | 300 | 162.51ms | 0.00% |

300 VU · 8분 스트레스 테스트에서 38,676개 체크를 전부 통과했고, 대조군을 포함한 모든 임계값을 충족했습니다.

→ [실행 결과 및 시나리오 상세](../assets/moving/)

---

## 배운 것

대시보드를 고칠 때 **세 번 틀렸습니다.** CPU 크레딧을 의심했지만 288로 만점이었고, 커넥션 풀도 아니었고, 쿼리를 합치면 빨라질 거라 봤지만 7배 느려졌습니다. 측정하지 않았다면 세 번 다 반대 방향으로 갔을 판단입니다.

여기서 얻은 원칙은 "추측보다 계측"이 아니라 조금 더 구체적입니다. **무엇을 측정할지가 진단의 질을 결정한다**는 것입니다. 시간을 쟀을 때는 원인 후보가 넷이었지만, 읽은 페이지 수를 재자 하나로 좁혀졌습니다.

그리고 부하 테스트에서 그 원칙을 스스로 어겼습니다. **측정 대상을 잘못 골랐습니다.** EXPLAIN이 알려준 0.058ms는 정확한 값이었지만, 제가 손으로 적은 쿼리였지 ORM이 실제로 발행한 SQL이 아니었습니다. 정확한 도구로 엉뚱한 것을 재면 "정상"이라는 확신만 남습니다.

같은 곳에서 두 번 문제가 났고, 두 번째에는 첫 번째 경험이 함정이었습니다. 인덱스로 33.8초를 해결했으니 5.4초도 인덱스라고 봤습니다. **성공한 해법은 다음 문제의 유력한 가설이 되지만, 그만큼 다른 가설을 가립니다.** 그 인덱스가 무엇을 해결했고 무엇을 해결하지 못했는지 커밋에 남겨둔 것이, 결국 다른 방향을 보게 만든 기록이 되었습니다.

---

## 담당 기능

**1차 — 견적 요청 (Backend)**
이사 유형·일정·출발지·도착지 입력, 카카오 주소 검색 연동, 사용자 견적 요청 생성·수정, 입력 검증, 요청 상태 관리

**2차 — 관리자 운영 (Backend)**
운영 대시보드, 견적 운영, 공지사항, FAQ, Q&A 관리, 사용자 약관·운영사항 관리, 관리자 로그, 운영 통계

**공통**
Sentry 에러 추적 도입. 이전 프로젝트에서 로그 체계를 세운 뒤 원인 추적 시간이 줄어드는 것을 경험해, 이번에는 문제가 생기기 전에 먼저 붙였습니다.
