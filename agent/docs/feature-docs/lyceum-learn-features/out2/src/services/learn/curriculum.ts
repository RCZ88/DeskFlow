// The Mastery Curriculum, encoded as data.
//
// This is the single source of truth that powers: the curriculum showcase, the
// per-topic "things to learn" checklists, and the mapping from a curriculum part
// to the system prompt used to author a lesson for it.
//
// Lifted directly from "Clement — North Star: The Unified Path" so the app and the
// planning doc never drift apart.

import type { MasteryLevel } from '../../shared/learn/types';

export interface CurriculumTrailer {
  what: string;
  why: string;
  where: string;
}

export interface CurriculumPart {
  /** Curriculum part number, 0–12. Maps 1:1 to LdocLesson.part. */
  part: number;
  /** Stable slug used in routes / anchors. */
  slug: string;
  emoji: string;
  title: string;
  /** Rarity 1–5 (★ common … ★★★★★ genuinely rare). */
  rarity: number;
  /** Which timeline phase this part first appears in. */
  phase: 1 | 2 | 3;
  trailer: CurriculumTrailer;
  intro: string;
  /** Suggested mastery target for a generated lesson on this part. */
  defaultMasteryTarget: MasteryLevel;
  /** The concrete "things to learn" — these become the checklist + the lesson scope. */
  checklist: string[];
}

export const CURRICULUM: CurriculumPart[] = [
  {
    part: 0,
    slug: 'what-ai-engineers-do',
    emoji: '🧭',
    title: 'What AI Engineers Actually Do',
    rarity: 3,
    phase: 1,
    trailer: {
      what: 'The real landscape of AI/ML roles and where the value actually lives.',
      why: 'Clears the myth so you aim at the right target before investing years.',
      where: 'Every “does this even need ML, and who owns it?” decision.',
    },
    intro:
      'The vast majority of AI/ML engineers make existing algorithms work reliably, cheaply, and at scale — ~90% of the value is the engineering around the model, not inventing new math.',
    defaultMasteryTarget: 'L2',
    checklist: [
      'Distinguish Research Scientist / ML Engineer / AI Engineer / Data Scientist / MLOps in one breath',
      'For any problem, decide first: does this even need ML, or is a heuristic better?',
      'Internalize that “discovery” is the researcher’s job; “make it reliable, cheap, shipped” is the engineer’s',
      'Adopt the reliability / scalability / maintainability / adaptability mental model',
    ],
  },
  {
    part: 1,
    slug: 'cs-systems-foundations',
    emoji: '🏛️',
    title: 'CS & Systems Foundations',
    rarity: 4,
    phase: 1,
    trailer: {
      what: 'How computers, languages, and networks actually work under the abstractions.',
      why: 'Every performance, reliability, and scaling decision traces back here.',
      where: 'Debugging the “impossible” bug and reasoning about behavior before running code.',
    },
    intro:
      'The most senior engineers predict how a system behaves without running it. AI assistants hallucinate most at exactly this layer — so your depth here is a force multiplier.',
    defaultMasteryTarget: 'L3',
    checklist: [
      'Memory hierarchy & the machine — stack vs heap, cache lines/misses, RAM vs SSD vs disk latency',
      'How code runs — compilation vs interpretation, JIT, bytecode, GC; JVM vs CPython',
      'Concurrency & parallelism — threads/processes/async, race conditions, deadlocks, the GIL',
      'Networking — TCP/IP, HTTP/1.1 vs HTTP/2, the TLS handshake, DNS',
      'Operating systems — processes, scheduling, virtual memory, syscalls, file descriptors',
      'Complexity in practice — Big-O and constants; when O(n²) beats O(n log n) for small n',
      'Latency numbers every engineer should know',
    ],
  },
  {
    part: 2,
    slug: 'software-design-architecture',
    emoji: '🎨',
    title: 'Software Design & Architecture',
    rarity: 4,
    phase: 1,
    trailer: {
      what: 'Structuring code and systems so they stay changeable as they grow.',
      why: 'Code is read and changed 10× more than written; bad architecture compounds into paralysis.',
      where: 'Every decision about modules, boundaries, and dependencies.',
    },
    intro:
      'The graduate course on the OOP you already love. The most durable skill, because it is about taste and trade-offs, which AI imitates poorly.',
    defaultMasteryTarget: 'L3',
    checklist: [
      'Abstraction & API design — hide the right things; the cost of a leaky abstraction',
      'Coupling & cohesion — dependency direction, dependency inversion',
      'Design patterns — and when NOT to use them',
      'SOLID & composition over inheritance — the real lessons behind the buzzwords',
      'Domain modeling / DDD — model the problem, not the database table',
      'System design at scale — load balancing, caching, queues, CDNs, statelessness',
      'Distributed systems — CAP, eventual consistency, idempotency, retries/backoff, consensus',
      'Evolving large codebases — safe refactoring, strangler-fig migrations',
    ],
  },
  {
    part: 3,
    slug: 'performance-efficiency',
    emoji: '⚡',
    title: 'Performance & Efficiency',
    rarity: 5,
    phase: 2,
    trailer: {
      what: 'Making software fast and cheap — measured, not guessed.',
      why: 'Efficiency is the line between a tool that scales and one that dies under load; at AI scale it is literally dollars.',
      where: 'Hot loops, inference paths, data pipelines.',
    },
    intro:
      'Genuinely rare, because most developers guess. Top engineers measure, then optimize only the thing that matters.',
    defaultMasteryTarget: 'L3',
    checklist: [
      'Measure first — profiling (CPU, memory, flame graphs), avoiding premature optimization',
      'Latency vs throughput, and tail latency (p50 vs p99) — why averages lie',
      'Algorithmic vs systems optimization — sometimes a better data structure wins',
      'Memory — allocation cost, object pooling, GC pressure, cache locality',
      'Data-oriented design — arrays over pointer-chasing for cache friendliness',
      'Throughput tricks — batching, pipelining, backpressure',
      'Lower-level levers — SIMD/vectorization; why NumPy & PyTorch are fast; row vs column layout',
      'The cost mindset — treat compute/memory/network as a budget',
    ],
  },
  {
    part: 4,
    slug: 'databases-deep',
    emoji: '🗄️',
    title: 'Databases, Deep',
    rarity: 4,
    phase: 1,
    trailer: {
      what: 'How databases store, index, and protect data — and how to choose and use them well.',
      why: 'Almost every app is a thin layer over a database; the DB is usually the bottleneck and the risk.',
      where: 'Schema design, query tuning, scaling, and your RAG / vector work.',
    },
    intro:
      'Knowing how the engine works (not just SQL syntax) is a classic senior differentiator.',
    defaultMasteryTarget: 'L3',
    checklist: [
      'Storage & indexes — B-trees vs LSM-trees, how an index speeds a query, write amplification',
      'Query planning — EXPLAIN, why a query is slow, the N+1 problem',
      'Transactions & ACID — isolation levels, MVCC, locking, deadlocks, anomalies',
      'Normalization vs denormalization — and when to break the rules',
      'Scaling — replication, partitioning/sharding, read replicas, connection pooling',
      'SQL vs NoSQL vs NewSQL — pick by access pattern, not hype',
      'Vector databases & embeddings — HNSW/IVF, similarity search (powers RAG)',
      'Caching — Redis patterns, and cache invalidation',
    ],
  },
  {
    part: 5,
    slug: 'security',
    emoji: '🔐',
    title: 'Security (app + data + AI)',
    rarity: 5,
    phase: 1,
    trailer: {
      what: 'Building systems that resist attackers, and protecting data.',
      why: 'One breach can end a product; security is assumed of senior engineers but truly learned by few.',
      where: 'Auth, data handling, dependencies, and AI-specific attack surfaces.',
    },
    intro:
      'A real years-of-experience domain, because it is an adversarial mindset — you must think like an attacker.',
    defaultMasteryTarget: 'L3',
    checklist: [
      'Threat modeling — STRIDE, attack surfaces, think like an attacker',
      'OWASP Top 10 — injection (SQLi), XSS, CSRF, SSRF, broken access control',
      'AuthN vs AuthZ — sessions, OAuth2/OIDC, JWT pitfalls, RBAC/ABAC',
      'Cryptography fundamentals — hashing vs encryption, salting (bcrypt/argon2), never roll your own',
      'Secrets management — vaults vs env vars, no secrets in repos, key rotation',
      'Supply-chain security — dependency audits, lockfiles, typosquatting, SBOMs',
      'AI/LLM security — direct & indirect prompt injection, data poisoning',
      'The lethal trifecta — untrusted input + private data + exfiltration path; guardrails',
    ],
  },
  {
    part: 6,
    slug: 'ml-dl-math-theory',
    emoji: '➗',
    title: 'ML/DL Math & Theory',
    rarity: 4,
    phase: 2,
    trailer: {
      what: 'The mathematics underneath learning algorithms.',
      why: 'Separates someone who calls model.fit() from someone who knows why it works and can invent.',
      where: 'Every model decision and every “why isn’t this training” moment.',
    },
    intro:
      'You are already math-first (SVM Extended Essay, backprop by hand) — this is your moat. Deepen it.',
    defaultMasteryTarget: 'L4',
    checklist: [
      'Linear algebra (deep) — eigenvalues, SVD, why everything is matrix multiplication',
      'Calculus — gradients, chain rule, Jacobians — the math of backprop',
      'Probability & statistics — Bayes, MLE/MAP, expectation, variance',
      'Optimization — SGD/momentum/Adam, convex vs non-convex, loss landscapes',
      'Information theory — entropy, cross-entropy, KL divergence',
      'Generalization — bias-variance, regularization, inductive bias',
      'Architectures (conceptual) — MLP → CNN → RNN/LSTM → Transformer → diffusion',
      'The “why” — why attention beat recurrence, why depth helps',
    ],
  },
  {
    part: 7,
    slug: 'pytorch-dl-engineering',
    emoji: '🔥',
    title: 'PyTorch & DL Engineering',
    rarity: 5,
    phase: 1,
    trailer: {
      what: 'Mastery of the framework top AI builders live in — down to its internals.',
      why: 'The gap between following tutorials and debugging real training.',
      where: 'Every model you build, train, and ship (your Stage 3 frontier).',
    },
    intro:
      'Principal-level PyTorch roles literally list these: autograd internals, distributed training, performance engineering. Aim there.',
    defaultMasteryTarget: 'L4',
    checklist: [
      'Tensors deeply — dtypes, devices, strides, views vs copies, broadcasting, contiguous memory',
      'Autograd internals — the dynamic graph, how .backward() walks it, custom autograd.Function',
      'nn.Module — custom layers/models, parameters vs buffers, the forward pass',
      'Training-loop mastery — optimizers, schedulers, gradient accumulation & clipping',
      'Data pipeline — Dataset/DataLoader, collation, avoiding the data-loading bottleneck',
      'Debugging training — exploding/vanishing gradients, NaNs, overfitting diagnosis',
      'Mixed precision (AMP), distributed training (DDP/FSDP, NCCL)',
      'Performance — torch.profiler, torch.compile, the dispatcher/ATen/CUDA path; inference optimization',
    ],
  },
  {
    part: 8,
    slug: 'applied-ai-llm-engineering',
    emoji: '🤖',
    title: 'Applied AI / LLM Engineering',
    rarity: 4,
    phase: 2,
    trailer: {
      what: 'Building real products on top of models — the day-to-day of a modern AI Engineer.',
      why: 'This is the current job market and your product wedge.',
      where: 'Your DeskFlow / FM-AI agentic systems, RAG, and MCP work.',
    },
    intro: 'This is your home turf — formalize it into rare depth.',
    defaultMasteryTarget: 'L4',
    checklist: [
      'Prompt engineering as a discipline — few-shot, CoT, structured output, context-window management',
      'RAG done right — chunking, embeddings, retrieval, re-ranking, hybrid search; eval retrieval separately',
      'Agentic systems — tool calling, planning, memory, multi-agent, the recursion/parse loop, self-correction',
      'Fine-tuning vs RAG vs prompting — when each is right; LoRA/QLoRA, PEFT',
      'Evaluation & observability — eval sets, LLM-as-judge, regression testing, tracing',
      'Inference infrastructure — serving, batching, streaming, KV cache, vLLM, cost & latency',
      'Guardrails — output validation, safety, fallback strategies',
    ],
  },
  {
    part: 9,
    slug: 'mlops-production-ml',
    emoji: '🚢',
    title: 'MLOps & Production ML',
    rarity: 4,
    phase: 2,
    trailer: {
      what: 'Everything between “works on my machine” and “reliable in production.”',
      why: 'Models that aren’t deployed, monitored, and reproducible are worthless.',
      where: 'Shipping and operating any ML feature.',
    },
    intro: 'This is where most ML projects die — own it.',
    defaultMasteryTarget: 'L3',
    checklist: [
      'Reproducibility — experiment tracking, seeds, data + model versioning',
      'Deployment patterns — batch vs real-time, REST/gRPC, shadow/canary/blue-green',
      'Monitoring — data drift, concept drift, model decay, alerting',
      'CI/CD for ML — automated testing of data and models, pipelines',
      'Containerization & infra — Docker, Kubernetes basics, one cloud, serverless inference',
      'Data engineering basics — ETL/ELT, feature stores, streaming vs batch, data quality',
    ],
  },
  {
    part: 10,
    slug: 'meta-skills',
    emoji: '🧠',
    title: 'The Meta-Skills',
    rarity: 5,
    phase: 3,
    trailer: {
      what: 'The non-code skills that compound over a career.',
      why: 'Two engineers with equal coding skill diverge entirely on these.',
      where: 'Everywhere — and exactly where AI can’t replace you.',
    },
    intro: 'The top 1% are made here.',
    defaultMasteryTarget: 'L4',
    checklist: [
      'Debugging as a science — hypothesis → experiment → bisect; reproduce before fixing',
      'Reading source code & papers — go to the source; reimplement papers',
      'Knowing what NOT to build — scoping, saying no, the simplest thing that works',
      'Technical writing & communication — design docs, clear PRs, explaining trade-offs',
      'Taste & judgment — the aesthetic sense for good systems and UI',
      'Directing AI well — right context, fundamentals, verification loops, critical review',
    ],
  },
  {
    part: 11,
    slug: 'vision-multimodal-ai',
    emoji: '👁️',
    title: 'Vision & Multimodal AI',
    rarity: 5,
    phase: 2,
    trailer: {
      what: 'How models turn pixels into meaning — accurately, cheaply, locally.',
      why: 'Multimodal is the live frontier; “describe an image well, cheaply, locally” is a real product wedge.',
      where: 'Your local visual-critique engine and any DeskFlow feature reasoning over screenshots.',
    },
    intro:
      'The model is commodity — the real engineering is the pipeline and the levers around it (your 6GB RTX 4050).',
    defaultMasteryTarget: 'L3',
    checklist: [
      'How a VLM sees — vision encoder → patch embeddings → projection into the LLM token space → decode',
      'Vision encoders deeply — ViT/CLIP/SigLIP, patches, why resolution & patch size bound perception',
      'OCR vs captioning vs grounding — route each sub-task to the right tool',
      'Lightweight local VLMs — Florence-2, Moondream, SmolVLM, Qwen2.5-VL; match model to task & VRAM',
      'The “measure, don’t ask” principle — compute colors/contrast/spacing deterministically; VLM only synthesizes',
      'Accuracy/efficiency levers — resolution & tiling, quantization per pass, constrained decoding, caching',
      'Local inference runtimes — llama.cpp/Ollama (GGUF), quant levels and their effect on fine detail',
      'Evaluating vision output — measuring hallucination rate; verify claims against measured ground truth',
    ],
  },
  {
    part: 12,
    slug: 'training-finetuning-adaptation',
    emoji: '🛠️',
    title: 'Training, Fine-Tuning & Adaptation',
    rarity: 5,
    phase: 3,
    trailer: {
      what: 'The full spectrum of changing a model’s behavior — from pretraining to inference-time steering.',
      why: 'Knowing which lever is feasible on your hardware is the gap between “I can only prompt” and “I can make this model mine.”',
      where: 'Specializing a small local model on a 6GB GPU.',
    },
    intro:
      'Most of it does NOT require training from scratch. The craft is the cheapest intervention that produces the behavior you want.',
    defaultMasteryTarget: 'L3',
    checklist: [
      'The adaptation spectrum — pretraining → full FT → PEFT → inference-time steering → prompting/RAG',
      'What “training” actually is — weights + gradients + optimizer states + activations (why it is memory-hungry)',
      'Hyperparameters & tuning — learning rate, batch size, schedulers, weight decay; grid/random/Bayesian',
      'PEFT — LoRA & QLoRA (feasible on 6GB!), adapters, prefix/prompt tuning; the math of low-rank updates',
      'Memory-saving tricks — gradient checkpointing/accumulation, mixed precision, 4-bit base',
      'Compressing/editing the model — quantization (PTQ/QAT), pruning, distillation, merging',
      'Data — the real bottleneck; curation, synthetic data, why quality beats size',
      'Inference-time steering & evaluation — when tuning inputs beats touching weights; catastrophic forgetting',
    ],
  },
];

export function getPart(part: number): CurriculumPart | undefined {
  return CURRICULUM.find((p) => p.part === part);
}

export function getPartBySlug(slug: string): CurriculumPart | undefined {
  return CURRICULUM.find((p) => p.slug === slug);
}

/** Rarity as a ★ string, e.g. 5 -> "★★★★★". */
export function rarityStars(rarity: number): string {
  return '★'.repeat(Math.max(0, Math.min(5, rarity)));
}
