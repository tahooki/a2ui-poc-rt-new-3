# A2UI Agent Integration Cases

## 1. 문서 목적

이 문서는 "이미 잘 작동하는 agent가 있다"는 전제를 두고, 그 agent에 A2UI를 어떻게 쉽게 추가할 수 있는지 설명하는 기획 문서다.

핵심 관점은 다음과 같다.

- 기존 agent의 본체를 갈아엎지 않는다.
- 기존 tool, memory, workflow, planner는 최대한 그대로 둔다.
- A2UI는 새 agent를 만드는 방식이 아니라, 기존 응답 흐름에 끼워 넣는 capability로 붙는다.
- 저수준 MCP 함수들을 agent 코드 여기저기에 흩뿌리지 않고, agent library의 상위 함수 한두 개로 감싼다.

관련 상위 문서는 [docs/20260406_a2ui-platform-planning.md](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260406_a2ui-platform-planning.md) 를 참고한다.

---

## 2. 가장 중요한 전제

기존 agent 입장에서 A2UI는 다음처럼 보여야 한다.

- "템플릿 목록 조회"
- "권한 체크"
- "payload 조립"
- "MCP 호출"

같은 저수준 작업들의 집합이 아니다.

대신 다음처럼 보여야 한다.

- "이번 응답을 A2UI로 표현할지 판단"
- "표현 가능하면 surface를 생성"
- "실패하면 기존 텍스트 응답으로 fallback"

즉, 기존 agent 코드에 들어가는 것은 MCP 함수 여러 개가 아니라 A2UI step 하나여야 한다.

---

## 3. 권장 통합 모양

### 3.1 저수준 함수는 내부용

아래 함수들은 내부적으로 필요할 수 있다.

- `listTemplates()`
- `getTemplateContract()`
- `checkAccess()`
- `resolveTemplateData()`

하지만 기존 agent 코드가 이 함수를 직접 조합하는 구조는 권장하지 않는다.

### 3.2 실제 통합용 고수준 함수

외부 agent가 주로 쓰는 API는 이런 형태가 적합하다.

- `maybeRenderA2UI(context)`
- `renderOrFallback(context)`
- `handleA2UIAction(event, context)`

이 함수들이 내부적으로 다음 순서를 알아서 수행한다.

1. A2UI 사용 여부 판단
2. 템플릿 후보 탐색
3. 템플릿 선택
4. 권한 체크
5. resolver chain 실행
6. schema validation
7. surface envelope 생성

---

## 4. 기존 agent에서 실제로 바뀌는 것

기존 agent가 이미 잘 동작한다면, 보통 변경은 아래 3군데 중 하나에만 들어가면 된다.

### 4.1 응답 직전 삽입

가장 단순한 방식이다.

- 기존 agent가 텍스트 초안을 만든다.
- 최종 반환 직전에 A2UI step을 실행한다.
- A2UI가 적절하면 UI surface를 추가한다.
- 아니면 기존 응답을 그대로 반환한다.

이 방식은 기존 workflow를 거의 건드리지 않는다.

### 4.2 Tool 실행 후 삽입

어떤 agent는 tool 결과가 나온 뒤에야 UI로 보여줄 가치가 생긴다.

예시:

- 승인 목록 조회 후 inbox template 표시
- 배포 후보 조회 후 launchpad template 표시

이 경우는 tool 결과가 facts/state에 쌓인 시점에 A2UI step을 넣는다.

### 4.3 Action loop 진입점 추가

한 번 UI를 띄우고 끝나는 게 아니라, 버튼 클릭이나 선택 변경이 다시 agent 흐름으로 이어져야 하는 경우다.

이 경우는 프론트 이벤트를 받는 진입점에 아래 함수를 추가한다.

- `handleA2UIAction(event, context)`

---

## 5. 공통 응답 모델

A2UI를 쉽게 붙이려면 agent 응답 형식이 너무 복잡하면 안 된다.

권장 응답 모델은 다음 정도로 단순한 형태다.

```ts
type AgentResponse = {
  text?: string;
  surface?: {
    templateId: string;
    payload: unknown;
    actions?: Array<{
      id: string;
      label: string;
      kind?: "submit" | "select" | "refresh" | "navigate";
    }>;
  };
  meta?: Record<string, unknown>;
};
```

핵심은 이렇다.

- 텍스트만 있는 응답도 가능
- 텍스트 + surface 같이 보내는 것도 가능
- surface 생성 실패 시 text만 반환 가능

---

## 6. 일반 API 스타일 통합 케이스

이 케이스는 특정 agent 프레임워크 없이, 기존 API 서버가 직접 agent를 호출해 결과를 반환하는 구조를 가정한다.

### 6.1 Before

```ts
export async function handleChat(req) {
  const input = await req.json();
  const result = await agent.run(input);

  return Response.json({
    text: result.text,
  });
}
```

### 6.2 After

```ts
export async function handleChat(req) {
  const input = await req.json();
  const result = await agent.run(input);

  const a2ui = await a2uiAgent.renderOrFallback({
    userInput: input.message,
    agentResult: result,
    session: input.session,
  });

  return Response.json({
    text: a2ui.text ?? result.text,
    surface: a2ui.surface,
  });
}
```

### 6.3 포인트

- 기존 `agent.run()`은 그대로 둔다.
- 응답 직전에 A2UI step 하나만 추가한다.
- 실패해도 기존 텍스트 응답을 유지할 수 있다.

---

## 7. Node Agent 통합 케이스

이 케이스는 Node/TypeScript 기반 custom agent를 가정한다.

### 7.1 Before

```ts
const tools = [searchTool, approvalTool, deployTool];

export async function runAgentTurn(input: AgentInput): Promise<AgentResponse> {
  const state = await planner.plan(input);
  const toolResult = await executor.run(state, tools);
  const answer = await narrator.generate({ input, toolResult });

  return { text: answer };
}
```

### 7.2 After

```ts
const tools = [searchTool, approvalTool, deployTool];

export async function runAgentTurn(input: AgentInput): Promise<AgentResponse> {
  const state = await planner.plan(input);
  const toolResult = await executor.run(state, tools);
  const answer = await narrator.generate({ input, toolResult });

  return a2uiAgent.renderOrFallback({
    userInput: input,
    workflowState: state,
    toolResult,
    text: answer,
  });
}
```

### 7.3 최소 수정 포인트

- 기존 planner/executor/narrator는 유지
- 마지막 return 단계만 A2UI runtime으로 감싼다
- `renderOrFallback()`가 내부에서 MCP 호출과 payload 검증을 처리한다

### 7.4 Node용 있으면 좋은 helper

- Express/Fastify/Next handler adapter
- streaming response adapter
- typed surface envelope helper
- action webhook handler

---

## 8. Python Agent 통합 케이스

이 케이스는 Python 기반 custom agent 또는 orchestration 코드를 가정한다.

### 8.1 Before

```python
async def run_agent_turn(user_input: str, state: dict) -> dict:
    plan = planner.plan(user_input, state)
    tool_result = await executor.run(plan)
    text = await narrator.generate(user_input=user_input, tool_result=tool_result)

    return {
        "text": text,
    }
```

### 8.2 After

```python
async def run_agent_turn(user_input: str, state: dict) -> dict:
    plan = planner.plan(user_input, state)
    tool_result = await executor.run(plan)
    text = await narrator.generate(user_input=user_input, tool_result=tool_result)

    return await a2ui_agent.render_or_fallback(
        user_input=user_input,
        workflow_state=state,
        tool_result=tool_result,
        text=text,
    )
```

### 8.3 최소 수정 포인트

- Python 쪽도 개념은 Node와 동일하다
- low-level MCP client를 직접 조합하는 대신 `render_or_fallback()`를 호출한다
- 프레임워크와 무관하게 붙일 수 있다

### 8.4 Python용 있으면 좋은 helper

- FastAPI/Flask response adapter
- Pydantic schema validation helper
- async MCP session wrapper
- event/action bridge helper

---

## 9. LangChain 통합 케이스

LangChain에서는 기존 chain 마지막에 A2UI output parser 혹은 post-processing step을 추가하는 그림이 자연스럽다.

### 9.1 Before

```ts
const chain = prompt.pipe(model).pipe(outputParser);

const result = await chain.invoke({
  messages,
  tools,
});

return {
  text: result.answer,
};
```

### 9.2 After

```ts
const chain = prompt.pipe(model).pipe(outputParser);

const result = await chain.invoke({
  messages,
  tools,
});

return a2uiAgent.renderOrFallback({
  messages,
  chainResult: result,
  text: result.answer,
});
```

### 9.3 LangChain에서 중요한 점

- LangChain 자체를 바꾸는 게 아니라 chain 바깥쪽에 A2UI adapter를 붙인다
- 혹은 Runnable 단계 하나를 추가해서 결과를 A2UI surface로 확장할 수 있다
- prompt 안에서 템플릿 ID를 직접 강하게 결정하기보다, 런타임이 상황 보고 판단하는 편이 안전하다

### 9.4 LangChain 친화적 확장 아이디어

- `A2UIRunnable`
- `A2UIOutputAdapter`
- `A2UIActionTool`

---

## 10. LangGraph 통합 케이스

LangGraph는 state graph에 node를 추가하는 식으로 끼워 넣는 방식이 가장 잘 맞는다.

### 10.1 Before

```python
graph = StateGraph(State)

graph.add_node("plan", plan_node)
graph.add_node("tools", tool_node)
graph.add_node("respond", respond_node)

graph.add_edge("plan", "tools")
graph.add_edge("tools", "respond")
```

### 10.2 After

```python
graph = StateGraph(State)

graph.add_node("plan", plan_node)
graph.add_node("tools", tool_node)
graph.add_node("a2ui", a2ui_node)
graph.add_node("respond", respond_node)

graph.add_edge("plan", "tools")
graph.add_edge("tools", "a2ui")
graph.add_edge("a2ui", "respond")
```

`a2ui_node`는 내부적으로 다음 일을 한다.

- 현재 state가 A2UI 대상인지 판단
- 필요하면 MCP/admin 기반으로 surface 생성
- state에 `surface`를 넣음
- 실패하면 그대로 pass

### 10.3 LangGraph에서 특히 좋은 점

- A2UI를 독립 node로 분리할 수 있다
- 기존 plan/tool/respond 구조를 거의 그대로 유지할 수 있다
- action event도 별도 node나 branch로 연결하기 좋다

### 10.4 LangGraph 확장 아이디어

- `a2ui_decision_node`
- `a2ui_render_node`
- `a2ui_action_router_node`

---

## 11. 기존 agent가 이미 잘 돌아갈수록 왜 이 방식이 좋은가

기존 agent가 잘 돌아간다는 것은 보통 아래가 이미 안정적이라는 뜻이다.

- intent 판단
- tool 호출
- memory/state 관리
- text generation

이때 A2UI를 붙인다고 해서 이 핵심 루프를 흔들면 리스크가 커진다.

그래서 좋은 통합 방식은 다음 조건을 만족해야 한다.

- 기존 planner 교체 없음
- 기존 tool registry 교체 없음
- 기존 memory 포맷 대수술 없음
- 기존 응답 포맷에 `surface`만 추가 가능
- 실패 시 기존 텍스트 응답 유지

즉 A2UI는 "새 엔진"이 아니라 "표현 계층 확장"으로 들어가야 한다.

---

## 12. UI Action까지 포함한 확장 케이스

단순 렌더링만 하면 A2UI의 가치가 반쯤만 나온다.
버튼 클릭, 선택 변경, 제출 같은 UI action을 다시 agent loop로 연결하면 더 강해진다.

### 12.1 예시 흐름

1. agent가 `approval_queue` surface를 띄운다.
2. 유저가 특정 row를 선택한다.
3. 프론트가 action event를 전달한다.
4. agent library가 `handleA2UIAction()`를 실행한다.
5. 내부적으로 필요한 MCP resolver/action을 호출한다.
6. 다음 surface 또는 텍스트 응답을 반환한다.

### 12.2 이때 중요한 점

- action도 템플릿 contract 일부여야 한다
- action payload도 schema validation 대상이어야 한다
- agent 쪽에서는 action handling entrypoint 하나만 있으면 좋다

---

## 13. 프레임워크별 권장 포지션 요약

### 13.1 일반 API 서버

- 응답 직전 post-processing 단계

### 13.2 Node custom agent

- narrator 이후 final response builder 단계

### 13.3 Python custom agent

- orchestration 함수의 마지막 return 직전

### 13.4 LangChain

- chain invoke 이후 post-processor 또는 runnable adapter

### 13.5 LangGraph

- tools 이후 respond 이전의 독립 node

---

## 14. SDK에 있으면 좋은 패키지 구성

실제 agent library는 언어별로 다음 구성까지 있으면 통합이 쉬워진다.

### 14.1 공통 코어

- MCP client
- render runtime
- schema validator
- action handler
- fallback policy

### 14.2 Node 패키지

- `@a2ui/agent-core`
- `@a2ui/agent-node`
- `@a2ui/agent-langchain`

### 14.3 Python 패키지

- `a2ui_agent_core`
- `a2ui_agent_fastapi`
- `a2ui_agent_langgraph`

이름은 예시지만, 핵심은 "core + framework adapter" 구조다.

---

## 15. 최소 성공 기준

기획상 첫 버전에서 최소한 달성해야 하는 기준은 다음과 같다.

1. 기존 agent 응답 직전에 A2UI step 하나를 넣을 수 있다.
2. A2UI가 적합하지 않으면 기존 텍스트 응답이 그대로 유지된다.
3. 특정 intent나 tool result에 대해 템플릿 surface를 띄울 수 있다.
4. surface payload는 contract validation을 통과해야 한다.
5. 버튼 클릭 같은 action 하나 이상을 다시 agent 흐름으로 연결할 수 있다.

---

## 16. 한 줄 결론

잘 동작하는 기존 agent에 A2UI를 붙이는 가장 좋은 방법은 "MCP 함수를 여기저기 추가하는 것"이 아니라, 응답 루프나 graph/node 흐름에 `A2UI orchestration step` 하나를 삽입하는 방식이다.

이 방식이면 일반 API, Node, Python, LangChain, LangGraph 어디서든 기존 구조를 크게 흔들지 않고 A2UI를 녹여 넣을 수 있다.
