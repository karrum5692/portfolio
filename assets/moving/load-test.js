import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

/**
 * 무빙 백엔드 부하 테스트 — 병목 탐색용
 *
 * ── 목적 ───────────────────────────────────────────────────────────────
 * 개별 쿼리는 이미 최적화했지만(관리자 대시보드 부분 인덱스 등), 동시 요청이
 * 몰릴 때도 그 개선이 유효한지는 확인하지 않았다. 어디가 먼저 무너지는지
 * 찾는 것이 목적이다.
 *
 * ── 대상 선정 기준 ─────────────────────────────────────────────────────
 * 실사용 빈도가 높으면서, 쿼리 구조상 부하에 취약할 가능성이 있는 것.
 *
 *   1. 기사 목록   — 매 요청 count() 로 User 11만 행 스캔 (인덱스로 못 줄인 부분)
 *   2. 기사 상세   — 리뷰가 함께 붙는다. 기사당 리뷰 p90=38, max=123
 *   3. 기사 리뷰   — 리뷰 많은 기사의 깊은 페이지에서 offset 부담
 *   4. 견적 요청   — 인증 필요. 고객당 요청 p90=12
 *   5. 공지/FAQ    — 대조군. 가벼운 쿼리가 부하에서도 가벼운지 확인
 *
 * 5번 대조군이 중요하다. 부하가 오를 때 1~3만 느려지면 "쿼리 구조 문제"이고,
 * 5번까지 같이 느려지면 "인스턴스 한계"다. 이 구분이 병목 판단의 핵심이다.
 *
 * ── 의도적으로 제외한 것 ───────────────────────────────────────────────
 *   · AI 예상 견적 — Gemini/카카오 외부 호출. 부하를 걸면 실제 과금과 쿼터 소진
 *   · SSE 알림     — 연결 유지형이라 별도 시나리오가 필요
 *   · 관리자 API   — 동시 접속이 현실적으로 낮아 병목 대상이 아님
 *   · 쓰기 작업    — 데이터를 오염시킨다. 읽기 위주로 측정
 *
 * ── 실행 ───────────────────────────────────────────────────────────────
 *   k6 run -e BASE_URL=<API_URL> -e TEST_PASSWORD=<시드 계정 비밀번호> load-test.js
 *
 *   STAGE 로 부하 프로파일을 고른다. 기본값은 load.
 *     -e STAGE=smoke    저부하 검증 (5 VU)
 *     -e STAGE=load     정상 트래픽 가정 (50 VU)
 *     -e STAGE=stress   한계 탐색 (300 VU)
 */

const BASE_URL = __ENV.BASE_URL;
const TEST_PASSWORD = __ENV.TEST_PASSWORD;
const STAGE = __ENV.STAGE || "load";

/*
 * 값이 없으면 undefined 가 URL 에 붙어 엉뚱한 곳에서 실패한다.
 * 시작 전에 막아서 원인을 바로 알 수 있게 한다.
 */
if (!BASE_URL || !TEST_PASSWORD) {
  throw new Error(
    "BASE_URL 과 TEST_PASSWORD 를 환경변수로 지정하세요.\n" +
      "  k6 run -e BASE_URL=https://api.example.com -e TEST_PASSWORD=... load-test.js",
  );
}

// 시드가 만든 앵커 계정. 5~6번 위치는 OPEN 요청 + 견적 도착 상태라 조회할 데이터가 있다.
const CUSTOMER_POOL = [5, 6, 15, 16, 25, 26, 35, 36, 45, 46];

/* ── 커스텀 지표 ──────────────────────────────────────────────────────
 * 엔드포인트별로 나눠야 어디가 병목인지 보인다.
 * k6 기본 http_req_duration 은 전체 평균이라 범인을 특정할 수 없다.
 */
const moverListDuration = new Trend("d_mover_list");
const moverDetailDuration = new Trend("d_mover_detail");
const moverReviewDuration = new Trend("d_mover_reviews");
const estimateListDuration = new Trend("d_estimate_requests");
const noticeDuration = new Trend("d_notice_control"); // 대조군

const loginFailures = new Counter("login_failures");
const businessErrors = new Rate("business_error_rate");

/* ── 부하 프로파일 ────────────────────────────────────────────────────
 * smoke : 시나리오가 제대로 도는지 확인 (측정 아님)
 * load  : 정상 트래픽 가정. 여기서 p95 가 기준을 넘으면 문제
 * stress: 한계 탐색. 어디서 무너지는지 본다
 */
const STAGES = {
  smoke: [{ duration: "30s", target: 5 }],
  load: [
    { duration: "1m", target: 20 }, // 워밍업 — 버퍼 캐시를 채운다
    { duration: "2m", target: 50 },
    { duration: "2m", target: 50 }, // 유지 구간에서 안정화되는지 확인
    { duration: "1m", target: 0 },
  ],
  stress: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "2m", target: 300 },
    { duration: "1m", target: 0 },
  ],
};

if (!STAGES[STAGE]) {
  throw new Error(`STAGE 는 smoke · load · stress 중 하나여야 합니다. 입력값: ${STAGE}`);
}

export const options = {
  stages: STAGES[STAGE],
  thresholds: {
    // 전체 기준
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],

    // 엔드포인트별 — 위반한 것이 곧 병목 후보
    d_mover_list: ["p(95)<1000"],
    d_mover_detail: ["p(95)<1000"],
    d_mover_reviews: ["p(95)<1000"],
    d_estimate_requests: ["p(95)<1000"],
    d_notice_control: ["p(95)<500"], // 대조군은 더 엄격하게

    business_error_rate: ["rate<0.01"],
  },
  // 임계값을 넘어도 끝까지 돌려서 어디까지 버티는지 본다
  noConnectionReuse: false,
};

/* ── 셋업: 토큰을 미리 확보 ────────────────────────────────────────────
 * VU 마다 로그인하면 인증 API 부하가 측정에 섞인다.
 * setup 에서 한 번만 받아 각 VU 에 나눠준다.
 */
export function setup() {
  const tokens = [];

  for (const index of CUSTOMER_POOL) {
    const email = `customer${String(index).padStart(3, "0")}@test.com`;

    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email, password: TEST_PASSWORD, role: "CUSTOMER" }),
      { headers: { "Content-Type": "application/json" }, tags: { name: "setup_login" } },
    );

    if (res.status !== 200) {
      loginFailures.add(1);
      console.error(`로그인 실패 ${email}: ${res.status}`);
      continue;
    }

    const token = res.json("data.tokens.accessToken");

    if (token) {
      tokens.push(token);
    }
  }

  if (tokens.length === 0) {
    throw new Error(
      "토큰을 하나도 확보하지 못했습니다. 시드가 적재되어 있는지, TEST_PASSWORD 가 맞는지 확인하세요.",
    );
  }

  console.log(`토큰 ${tokens.length}개 확보`);

  // 기사 목록을 한 번 조회해 실제 moverId 를 확보한다.
  // UUID 를 하드코딩하면 시드를 다시 돌릴 때마다 깨진다.
  const moverRes = http.get(`${BASE_URL}/api/movers?limit=50`, { tags: { name: "setup_movers" } });
  const moverIds = (moverRes.json("data") || []).map((m) => m.id).filter(Boolean);

  if (moverIds.length === 0) {
    throw new Error("기사 목록이 비어 있습니다. 시드 적재 상태를 확인하세요.");
  }

  console.log(`기사 ${moverIds.length}명 확보`);

  return { tokens, moverIds };
}

/* ── 시나리오 ────────────────────────────────────────────────────────
 * 실제 사용자 흐름을 흉내낸다.
 * 목록 → 상세 → 리뷰 순으로 이동하는 것이 자연스럽다.
 */
export default function (data) {
  const token = data.tokens[__VU % data.tokens.length];
  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` },
  };

  group("기사 탐색", () => {
    // 1. 기사 목록 — 정렬/페이지를 섞어 캐시 편중을 피한다
    const sorts = ["reviewCount", "rating", "career", "confirmedCount"];
    const sort = sorts[randomIntBetween(0, sorts.length - 1)];
    const page = randomIntBetween(1, 5); // 실사용자는 앞쪽 페이지를 본다

    const listRes = http.get(`${BASE_URL}/api/movers?sort=${sort}&page=${page}&limit=10`, {
      tags: { name: "mover_list" },
    });

    moverListDuration.add(listRes.timings.duration);
    businessErrors.add(listRes.status !== 200);

    check(listRes, {
      "기사 목록 200": (r) => r.status === 200,
      "기사 목록에 데이터 있음": (r) => (r.json("data") || []).length > 0,
    });

    sleep(randomIntBetween(1, 3)); // 사용자가 목록을 훑는 시간

    // 2. 기사 상세
    const moverId = data.moverIds[randomIntBetween(0, data.moverIds.length - 1)];

    const detailRes = http.get(`${BASE_URL}/api/movers/${moverId}`, {
      tags: { name: "mover_detail" },
    });

    moverDetailDuration.add(detailRes.timings.duration);
    businessErrors.add(detailRes.status !== 200);

    check(detailRes, { "기사 상세 200": (r) => r.status === 200 });

    sleep(randomIntBetween(1, 2));

    // 3. 기사 리뷰 목록 — 리뷰가 많은 기사의 깊은 페이지도 섞는다
    const reviewPage = randomIntBetween(1, 3);

    const reviewRes = http.get(
      `${BASE_URL}/api/movers/${moverId}/reviews?page=${reviewPage}&limit=10`,
      { tags: { name: "mover_reviews" } },
    );

    moverReviewDuration.add(reviewRes.timings.duration);
    businessErrors.add(reviewRes.status !== 200);

    check(reviewRes, { "기사 리뷰 200": (r) => r.status === 200 });
  });

  sleep(randomIntBetween(1, 3));

  group("마이페이지", () => {
    // 4. 내 견적 요청 목록 (인증 필요)
    const res = http.get(`${BASE_URL}/api/estimate-requests?page=1&limit=10`, {
      ...authHeaders,
      tags: { name: "estimate_requests" },
    });

    estimateListDuration.add(res.timings.duration);
    businessErrors.add(res.status !== 200);

    check(res, { "견적 요청 목록 200": (r) => r.status === 200 });
  });

  sleep(randomIntBetween(1, 2));

  group("대조군", () => {
    /*
     * 공지는 쿼리가 가볍고 데이터도 적다(40건).
     * 이것까지 느려지면 쿼리 구조가 아니라 인스턴스/커넥션 한계라는 뜻이다.
     */
    const res = http.get(`${BASE_URL}/api/notices?page=1&limit=10`, {
      tags: { name: "notice_control" },
    });

    noticeDuration.add(res.timings.duration);
    businessErrors.add(res.status !== 200);

    check(res, { "공지 목록 200": (r) => r.status === 200 });
  });

  sleep(randomIntBetween(2, 5)); // 다음 순회까지의 사용자 대기
}

export function teardown(data) {
  console.log(`테스트 종료. 사용한 토큰 ${data.tokens.length}개`);
}
