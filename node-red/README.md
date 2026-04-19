# Node-RED Flows

이 폴더는 Node-RED에서 Import 할 flow JSON 파일을 GitHub로 함께 관리하기 위한 공간입니다.

## 위치 규칙

Node-RED import JSON은 아래 폴더에 둡니다.

```text
node-red/flows/
```

현재 관리 중인 파일:

```text
node-red/flows/시트1.센서데이터수신및인리치먼트.json
node-red/flows/시트2.룰엔진.json
node-red/flows/시트3.AI에이전트-현장분석가.json
node-red/flows/시트4.AI에이전트-관리자.json
node-red/flows/시트5.2D대시보드.json
```

신규 파일을 추가할 경우:

```text
node-red/flows/시트N.기능명.json
```

## 연동 기준

- 시뮬레이터와 같은 MQTT 브로커를 사용합니다.
- 시뮬레이터와 같은 `{uniq-user-id}`를 사용합니다.
- 기본 room id는 `room-01`입니다.
- 기본 토픽 prefix는 `kiot/{uniq-user-id}/factory/room-01`입니다.
- AI 에이전트 flow를 사용하는 경우 Node-RED 실행 환경에 `GEMINI_API_KEY`를 설정합니다.
- 필요 시 `GEMINI_API_MODEL`, `GEMINI_API_ENDPOINT`로 Gemini 모델과 엔드포인트를 조정할 수 있습니다.

## 주의

Node-RED flow JSON 안에 개인 비밀번호, 토큰, 브로커 인증정보 같은 민감값은 커밋하지 않습니다.
