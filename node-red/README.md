# Node-RED Flows

이 폴더는 Node-RED에서 Import 할 flow JSON 파일을 GitHub로 함께 관리하기 위한 공간입니다.

## 위치 규칙

Node-RED import JSON은 아래 폴더에 둡니다.

```text
node-red/flows/
```

기본 권장 파일명:

```text
node-red/flows/factory-room-01.flow.json
```

시트별로 분리할 경우:

```text
node-red/flows/sheet-01-factory-to-dt.flow.json
node-red/flows/sheet-02-rule-engine.flow.json
node-red/flows/sheet-03-ai-ops.flow.json
```

## 연동 기준

- 시뮬레이터와 같은 MQTT 브로커를 사용합니다.
- 시뮬레이터와 같은 `{uniq-user-id}`를 사용합니다.
- 기본 room id는 `room-01`입니다.
- 기본 토픽 prefix는 `kiot/{uniq-user-id}/factory/room-01`입니다.

## 주의

Node-RED flow JSON 안에 개인 비밀번호, 토큰, 브로커 인증정보 같은 민감값은 커밋하지 않습니다.
