# Facility Environment Simulator

설비환경시뮬레이터를 제로베이스에서 TDD(Test-Driven Development) 방식으로 개발하기 위한 프로젝트다.

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

문서는 집중도를 위해 아래 2개만 유지한다.

- `docs/중요_시뮬레이터_개발_전달_명세.md`
- `docs/TDD_개발로드맵_실습가이드.md`

## 실행 준비
```bash
npm install
```

`.env.example`을 참고해 `.env`를 만든다.

필수 환경변수:
- `MQTT_UNIQ_USER_ID`

선택 환경변수:
- `MQTT_BROKER_URL`
- `CONTROL_PANEL_ENABLED`
- `CONTROL_PANEL_PORT`
- `CONTROL_PANEL_AUTO_OPEN`

기본 브로커 주소는 `mqtt://broker.emqx.io:1883`이다.
원격 조정 패널은 기본적으로 `http://localhost:3000`에서 실행되고 자동으로 열린다.

## 실행 명령
개발 모드:
```bash
npm run dev
```

빌드 후 실행:
```bash
npm start
```

예시:
```bash
MQTT_UNIQ_USER_ID=student-01 npm run dev
```

```bash
MQTT_UNIQ_USER_ID=student-01 MQTT_BROKER_URL=mqtt://broker.emqx.io:1883 npm run dev
```

종료는 터미널에서 `Ctrl+C`를 사용한다.

## 원격 조정 패널
시뮬레이터 실행 시 로컬 제어 패널 서버가 함께 실행된다.

기본 URL:
```text
http://localhost:3000
```

패널 자동 오픈을 끄는 예:
```bash
MQTT_UNIQ_USER_ID=student-01 CONTROL_PANEL_AUTO_OPEN=false npm run dev
```

패널 서버를 완전히 끄는 예:
```bash
MQTT_UNIQ_USER_ID=student-01 CONTROL_PANEL_ENABLED=false npm run dev
```

패널에서는 컨베이어벨트 `power`, 컨베이어벨트 `overheatMode`, 에어컨 `power`를 조정할 수 있다. 패널 조작은 새로운 MQTT 토픽을 만들지 않고 기존 시뮬레이터 내부 제어 로직을 호출한 뒤 actuator status를 즉시 발행한다.

## 테스트 명령
```bash
npm run build
npm run test:unit
npm run test:integration
npm run verify
```

외부 브로커 연동 테스트:
```bash
npm run test:external
```

외부 브로커와 고유 사용자 ID를 지정하는 예시:
```bash
EXTERNAL_BROKER_URL=mqtt://broker.emqx.io:1883 \
EXTERNAL_TEST_UNIQ_USER_ID=manual-run-001 \
npm run test:external
```

`npm run verify`는 로컬 검증 게이트이며, `npm run test:external`은 실제 네트워크 환경의 publish/subscribe 경로를 확인하는 연동 테스트다. 외부 브로커 실패는 구현 문제와 브로커/네트워크 환경 문제를 구분해서 해석한다.

## Node-RED Flow
Node-RED import용 JSON 파일은 아래 위치에서 관리한다.

```text
node-red/flows/
```

권장 파일명:
```text
node-red/flows/factory-room-01.flow.json
```

시트별로 분리할 경우:
```text
node-red/flows/시트1.센서데이터수신및인리치먼트.json
node-red/flows/시트2.룰엔진.json
node-red/flows/시트3.AI에이전트-현장분석가.json
node-red/flows/시트4.AI에이전트-관리자.json
node-red/flows/시트5.2D대시보드.json
```

AI 에이전트 flow를 사용하는 경우 Node-RED 실행 환경에 `GEMINI_API_KEY`를 설정해야 한다.

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
