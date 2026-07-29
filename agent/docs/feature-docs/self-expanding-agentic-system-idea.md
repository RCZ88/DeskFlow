# Self-Expanding Agentic System — Idea Dump

## Raw Transcript

> Voice recording, 2026-07-29

While I remember there's this feature in which it's very interesting and very good, it's very unorthodox, it's not something that has been discussed in the world.  Like in terms of agentic systems, why not make a system where the AI has the capabilities to do whatever?  But there are some certain constraints, of course, whatever it is.  For example, basically it's by utilizing the data that is gathered and is able to make stuff out of it.  So first example is related to goals. For example, if I want to have a goal where I would want to sleep at 10pm for example.  And the application has the data of the sleeping and also has the data of tracking usage.  And you can see what time it is. And if it's gone beyond that, it should automatically consider the fail.  And the fact that we already have a lot of those features in front of us that we can utilize the data that are gathered and having a system where the AI is able to generate something.  So something like this confuses me as a part where how you're supposed to do it isn't supposed to be some sort of framework where there's a lot of, there's a limit to what you can make.  The app provides you on stuff that you can make and connect to one another.  For example, in this case of the goals or daily to-doos is to make so that you are able to add those goals through the AI.  The goals can be customized and it can be related to the not just user manually complete and tracks the goal by itself by the user.  But rather the system does the ones that it does the system that takes it.  It's a very judicial system where it's completely fair because the system is the one that's getting to decide whether this thing is ticked or not.  But I guess yeah, you can't really, how would you make a AI being able to be the ones that create those features?  It's a self-expanding thing that means that the AI needs to have access to the code which is not really ethical close to being ethical at all.  It's just very interesting.  We have a lot of those ideas, a lot of those features that we would like to implement but there's going to be an algorithm.  But how great is it if a certain feature where we create a certain language where by using the language we're able to limit what the AI can do, what it should do and how can we deal with the AI actually learning the language and actually use it properly.  It's very something that's very complicated. It's not just how we can design a framework where it's simply for utilizing the stuff that have already been provided with the differences between stuff that are static that is already provided.  And the stuff that you've generated because if the AI can generate and generate and stuff and using the stuff that they've generated, then that could be a problem.  So a lot of things, safety guard rails, I mean this is just something that I dream of.  It's a complex system and I for sure would mean that it needs a lot of tunings and just things of proper research, proper planning for everything aspects of this.  That's just one example, another example, for example, could be that maybe utilizing something else, for example, connecting the goals to the ID projects or connecting it to the finance or the...  Now it's very interesting the fact that you can connect those to anything really because a lot of the features on the application is have something related to goals and especially the learning page of you.  Your daily goals were to spend some amount of minutes on learning something, the fact that the learning feature now has the feature to track your usage and stuff like that.  I think it's a very wonderful thing if we can connect it.  But most of the stuff are related to like the connections and internally, right?  So it doesn't need to necessarily mean it's fully dynamic and fully customizable by the AI, right?  We can for now create a system where it is able to access and use certain data but like it's still a complex system and I feel like we do need some research and a full on engineering marvel to make sure we openly.  Anyways, that's pretty much it.

---

## Extracted Ideas

### 1. Ambient Goal Evaluation (AI Judge)

- **Concept:** The system automatically evaluates goal completion using tracked data, instead of requiring manual check-off.
- **Example:** Goal = "Sleep by 10pm." App has sleep data + screen-time data + clock. If 10pm passes and the user is still on their device, the system marks the goal as failed. No user input needed — the system is the sole arbiter ("judicial system — completely fair").
- **Cross-cutting:** Goals integrate with sleep tracking, usage tracking, IDE projects, finance, learning — anything that produces data.

### 2. App-Provided "Feature Building Blocks"

- **Concept:** Instead of giving the AI raw code access (dangerous, unethical), the app exposes a constrained set of composable primitives. The AI assembles these building blocks into features, but cannot create new ones from scratch.
- **Key insight:** "It's not some sort of framework where there's a limit to what you can make. The app provides you on stuff that you can make and connect to one another."
- **Limitation vs. freedom:** The framework intentionally bounds what the AI can do. The power comes from the *connections* between existing features, not from unbounded code generation.

### 3. Domain-Specific DSL for AI Actions

- **Concept:** A restricted language (DSL) that defines what the AI can read, write, and trigger. The AI learns this language and operates within its grammar — no arbitrary code execution.
- **Safety mechanism:** The DSL acts as a sandbox. The AI cannot "generate and generate and stuff and using the stuff that they've generated" because the DSL only references proven, audited primitives.
- **Comparison:** Like SQL for databases — powerful but bounded. You cannot delete files from SQL, no matter how clever your query.

### 4. Data-Driven Feature Connectivity Mesh

- **Concept:** Features already exist (goals, finance, IDE projects, learning, sleep, screen time). The missing layer is a *connection fabric* that lets any feature read from and write to any other feature's data.
- **Example chain:** Goal → IDE project → screen-time → sleep. If the user spends too long coding, the IDE projects feature could emit an event that the goals system reads to mark "stop coding by 9pm" as failed.
- **Current gap:** Features are internally connected but not exposed to each other in a programmable way.

### 5. Self-Expansion Without Code Access

- **Paradox stated:** "How would you make an AI be able to create those features? It's a self-expanding thing that means the AI needs to have access to the code which is not ethical."
- **Proposed resolution:** The AI expands the system by composing existing primitives in novel ways, not by writing novel code. Expansion = new *configurations*, not new *implementations*.

### 6. Safety Guardrails

- Recognized as a critical prerequisite. The entire system is "something that I dream of" — recognized as needing "a lot of tunings and just things of proper research, proper planning."
- The DSL + bounded-primitive approach is the proposed safety mechanism.

---

## Summary

| Theme | Core Idea |
|-------|-----------|
| **Goal Evaluation** | System auto-verifies goals using tracked data (no manual ticking) |
| **Building Blocks** | App exposes fixed primitives; AI composes them into features |
| **DSL Sandbox** | A constrained language limits what the AI can express/execute |
| **Connectivity Mesh** | Features read/write each other's data via a shared fabric |
| **No Code Access** | Self-expansion happens through composition, not code generation |
| **Safety First** | Full guardrails, research, and planning required before implementation |
