# QueryEngine

The coordinator for each conversation turn. It holds everything that needs to survive across multiple turns, and orchestrates the steps that happen within one turn.

## What it remembers

- The full message history of the session
- How many tokens have been used and what it has cost so far
- Which tool permissions have been denied by the user
- A running transcript of everything that happened

## What happens each turn

When a user message arrives, QueryEngine runs through four stages before handing back a response:

1. **Prepare** — figures out what instructions to give the model for this turn (which tools are available, what the current context is)
2. **Understand** — reads the user's message, handles any special commands, decides whether an actual AI call is even needed
3. **Save** — writes the user message to disk before anything else happens, so nothing is lost if something goes wrong
4. **Run** — hands off to the query loop, which does the actual back-and-forth with the model until it's done

## Its relationship to the query loop

QueryEngine is the **session manager** — it knows who the user is and what has happened so far. The query loop is the **turn executor** — it knows what to do right now, this iteration. Neither does the other's job.
