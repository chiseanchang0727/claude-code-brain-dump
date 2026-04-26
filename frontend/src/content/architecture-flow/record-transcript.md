# Record Transcript

**File:** `src/utils/sessionStorage.ts`

Persists every message to a `.jsonl` transcript file on disk. Called at multiple points in the flow.

## When it runs

| Step | What is persisted |
|------|------------------|
| Before API call | User message |
| After API response | Assistant message |
| After tool execution | Tool results |
| Final | Cost, usage, duration |

## Why before the API call

The user message is written to disk **before** the API call so that if the process crashes mid-turn, the transcript still reflects what the user asked. Recovery can resume from the last saved state.

## Format

Each entry is a JSON line (JSONL) appended to the session's transcript file. The file path is derived from the session ID.

### What the file actually looks like

Each line is one complete JSON object — no line breaks inside:

```
{"type":"user","uuid":"a1b2c3","timestamp":"2024-01-15T10:23:01.456Z","message":{"role":"user","content":[{"type":"text","text":"what files are in src?"}]}}
{"type":"assistant","uuid":"a1b2c3","timestamp":"2024-01-15T10:23:02.891Z","message":{"role":"assistant","content":[{"type":"text","text":"Here are the files..."},{"type":"tool_use","id":"tu_01","name":"Bash","input":{"command":"ls src/"}}]}}
{"type":"tool","uuid":"a1b2c3","timestamp":"2024-01-15T10:23:03.120Z","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"tu_01","content":[{"type":"text","text":"App.tsx\nmain.tsx\ntheme.ts"}]}]}}
{"type":"result","subtype":"success","uuid":"a1b2c3","timestamp":"2024-01-15T10:23:03.500Z","cost_usd":0.0042,"duration_ms":2103,"input_tokens":1840,"output_tokens":312}
```

### Expanded for readability

**User message**
```json
{ "type": "user", "uuid": "a1b2c3",
  "message": { "role": "user", "content": [{ "type": "text", "text": "what files are in src?" }] } }
```

**Assistant message**
```json
{ "type": "assistant", "uuid": "a1b2c3",
  "message": { "role": "assistant", "content": [
    { "type": "text", "text": "Here are the files..." },
    { "type": "tool_use", "id": "tu_01", "name": "Bash", "input": { "command": "ls src/" } }
  ]}}
```

**Tool result**
```json
{ "type": "tool", "uuid": "a1b2c3",
  "message": { "role": "user", "content": [
    { "type": "tool_result", "tool_use_id": "tu_01",
      "content": [{ "type": "text", "text": "App.tsx\nmain.tsx\ntheme.ts" }] }
  ]}}
```

**Final result**
```json
{ "type": "result", "subtype": "success", "uuid": "a1b2c3",
  "cost_usd": 0.0042, "duration_ms": 2103,
  "input_tokens": 1840, "output_tokens": 312 }
```
