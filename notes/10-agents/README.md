# Agents & Subagents

Reference: [`src/tools/AgentTool/`](../../src/tools/AgentTool/), [`src/utils/forkedAgent.ts`](../../src/utils/forkedAgent.ts)

## Overview

A subagent is a full recursive query loop — its own system prompt, message history, tool set, and turn limit. From the model's perspective it's a tool call (`AgentTool`); from the runtime's perspective it's an independent agent that can itself call tools and spawn further agents.

## Contents

- [agent-tool.md](./agent-tool.md) — `AgentTool` entry point: fork vs named agent, sync/async decision, isolation modes, context inheritance via `createSubagentContext`
