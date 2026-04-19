# Facility Environment Simulator

설비환경시뮬레이터를 제로베이스에서 TDD(Test-Driven Development)와 하네스 엔지니어링 방식으로 개발하기 위한 프로젝트다.

## 목표
- MQTT 기반 설비/환경 시뮬레이터 구현
- 테스트 우선 개발 루프 고정
- 단위 테스트와 통합 테스트를 분리한 검증 레일 구축
- 상수, 메시지 규약, 계산 규칙을 문서와 코드로 동기화

## 기본 개발 사이클
1. 테스트 케이스를 먼저 추가한다.
2. 실패를 확인한다.
3. 최소 코드로 테스트를 통과시킨다.
4. 리팩터링한다.
5. 기능 단위 완료 시 `npm run verify`로 build + unit + integration을 모두 통과시킨다.

자세한 운영 기준은 아래 문서를 따른다.

- `docs/중요_시뮬레이터_개발_전달_명세.md`
- `docs/TDD_운영사이클.md`
- `docs/TDD_개발로드맵_학생가이드.md`
- `docs/하네스엔지니어링_도입전략.md`
- `docs/실행가이드.md`
- `docs/외부브로커연동테스트.md`
- `docs/테스트전략_케이스목록.md`

`.env.example` 파일을 참고해서 `.env`를 생성한 뒤 실행해야 한다.

## 실행 명령
- `npm install`
- `npm run build`
- `npm run dev`
- `npm start`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:external`
- `npm run verify`

## 현재 합의된 핵심 규칙
- 설계 담당자와의 소통 문서는 `docs/중요_시뮬레이터_개발_전달_명세.md` 1개만 사용한다.
- 내부 시뮬레이션 tick은 1초다.
- MQTT 정기 발행 주기는 10초다.
- actuator control을 받으면 해당 status를 즉시 추가 발행한다.
- 온도 변화는 10초 단위로만 반영한다.
- 에어컨만 ON이면 10초마다 `-0.3`
- 에어컨 냉각 하한은 `22도`다.
- 기준 온도는 `25도`다.
- 컨베이어만 ON이면 10초마다 `+0.2`
- 컨베이어 오버히트 모드 ON이면 추가로 `+1.0`이 더해진다.
- 컨베이어 가열 상한은 `50도`다.
- 둘 다 ON이면 10초마다 `-0.1`
- 둘 다 OFF면 기준 온도로 10초마다 `0.1`씩 복귀
- 발행 메시지는 별도의 묶음 ID 없이 topic별 독립 payload로 보낸다.
- 숫자 리터럴은 비즈니스 로직에 직접 넣지 않는다.
