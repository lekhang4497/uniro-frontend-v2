// Catalog of signal types, plugins, and when-clause operators for the
// router builder. Mirrors the schema documented in
// UniRo_backend/exp/custom_routers/.../yaml_structure.md and full_example.yaml.
//
// Each signal type lists the fields it accepts in `config`. Field shapes:
//   { key, label, kind: 'string'|'number'|'bool'|'select'|'string-list'|'yaml',
//     options?, placeholder?, default?, help? }
// Complex nested shapes (maps of lists, list of records) are exposed as raw
// YAML text via kind: 'yaml' — keeps the UI tractable without sacrificing
// completeness.

export const SIGNAL_CATEGORIES = [
  { key: "language", label: "Language" },
  { key: "topic", label: "Topic & intent" },
  { key: "complexity", label: "Complexity" },
  { key: "content", label: "Content & modality" },
  { key: "identity", label: "Identity & role" },
  { key: "conversation", label: "Conversation" },
  { key: "time", label: "Time" },
  { key: "safety", label: "Safety" },
];

export const SIGNAL_TYPES = [
  {
    type: "language_detector",
    label: "Language detector",
    category: "language",
    icon: "Languages",
    summary: "Auto-detect language code (vi/en/zh/ja/\u2026)",
    fields: [],
  },
  {
    type: "utterance_set_classifier",
    label: "Utterance set classifier",
    category: "topic",
    icon: "MessagesSquare",
    summary: "Multi-class topic classifier (BoW + cosine)",
    fields: [
      { key: "threshold", label: "Threshold", kind: "number", default: 0.3 },
      {
        key: "utterances",
        label: "Utterances (YAML map)",
        kind: "yaml",
        placeholder: "complaint:\n  - I want to complain\nrefund:\n  - I want a refund",
        help: "Map of category \u2192 list of example utterances.",
      },
    ],
  },
  {
    type: "embedding_real",
    label: "Embedding classifier",
    category: "topic",
    icon: "Sparkles",
    summary: "Sentence-transformer classifier (needs sentence-transformers)",
    fields: [
      { key: "model_name", label: "Model", kind: "string", default: "all-MiniLM-L6-v2" },
      { key: "threshold", label: "Threshold", kind: "number", default: 0.55 },
      {
        key: "utterances",
        label: "Utterances (YAML map)",
        kind: "yaml",
        placeholder: "product_inquiry:\n  - How do I install this?",
      },
    ],
  },
  {
    type: "domain_mmlu",
    label: "MMLU domain",
    category: "topic",
    icon: "GraduationCap",
    summary: "Domain classifier with 57 built-in categories",
    fields: [
      { key: "threshold", label: "Threshold", kind: "number", default: 0.4 },
      { key: "force_bow", label: "Force BoW (skip ML)", kind: "bool", default: false },
      {
        key: "extra_examples",
        label: "Extra examples (YAML map)",
        kind: "yaml",
        placeholder: "custom_legal:\n  - What are the GDPR requirements...?",
      },
    ],
  },
  {
    type: "complexity_classifier",
    label: "Complexity classifier",
    category: "complexity",
    icon: "Gauge",
    summary: "Tiers prompts as easy / medium / hard",
    fields: [
      { key: "threshold", label: "Threshold", kind: "number", default: 0.3 },
      { key: "easy_examples", label: "Easy examples", kind: "string-list" },
      { key: "medium_examples", label: "Medium examples", kind: "string-list" },
      { key: "hard_examples", label: "Hard examples", kind: "string-list" },
    ],
  },
  {
    type: "pii_regex",
    label: "PII regex",
    category: "safety",
    icon: "Lock",
    summary: "Regex-based PII (email/phone/ssn/cc)",
    fields: [
      {
        key: "patterns",
        label: "Built-in patterns",
        kind: "string-list",
        placeholder: "email, phone, ssn, cc",
        help: "Names of built-in pattern groups to enable.",
      },
      {
        key: "custom_patterns",
        label: "Custom patterns (YAML map)",
        kind: "yaml",
        placeholder: "order_id: '\\bORD-\\d{6}\\b'",
      },
    ],
  },
  {
    type: "pii_learned",
    label: "PII (learned)",
    category: "safety",
    icon: "LockKeyhole",
    summary: "Presidio/spaCy-backed PII detector",
    fields: [
      {
        key: "entities",
        label: "Entities",
        kind: "string-list",
        placeholder: "PERSON, EMAIL_ADDRESS, PHONE_NUMBER",
      },
      { key: "score_threshold", label: "Score threshold", kind: "number", default: 0.5 },
      { key: "language", label: "Language", kind: "string", default: "en" },
    ],
  },
  {
    type: "token_estimator",
    label: "Token estimator",
    category: "complexity",
    icon: "Ruler",
    summary: "Estimate token count from char length",
    fields: [
      { key: "chars_per_token", label: "Chars per token", kind: "number", default: 4 },
    ],
  },
  {
    type: "reasoning",
    label: "Reasoning marker",
    category: "complexity",
    icon: "Brain",
    summary: "Count CoT-style markers (\"step 1:\", \"let me think\"\u2026)",
    fields: [
      { key: "min_markers", label: "Min markers", kind: "number", default: 2 },
    ],
  },
  {
    type: "vision",
    label: "Vision",
    category: "content",
    icon: "Image",
    summary: "Fires when message contains image content",
    fields: [],
  },
  {
    type: "modality",
    label: "Modality",
    category: "content",
    icon: "Layers",
    summary: "text / image / audio / video / multimodal",
    fields: [],
  },
  {
    type: "keyword_match",
    label: "Keyword match",
    category: "content",
    icon: "Search",
    summary: "Single regex (binary true/false)",
    fields: [
      { key: "pattern", label: "Pattern (regex)", kind: "string", placeholder: "\\b(urgent|asap)\\b" },
      {
        key: "flags",
        label: "Flags",
        kind: "string",
        placeholder: "I",
        help: "I=ignorecase, M=multiline, S=dotall",
      },
      { key: "lowercase", label: "Lowercase input", kind: "bool", default: false },
    ],
  },
  {
    type: "time_of_day",
    label: "Time of day",
    category: "time",
    icon: "Clock",
    summary: "Route by clock \u2014 peak vs off-hours",
    fields: [
      {
        key: "output",
        label: "Output",
        kind: "select",
        options: ["hour", "dow", "business_hours"],
        default: "business_hours",
      },
      { key: "timezone", label: "Timezone", kind: "string", placeholder: "Asia/Ho_Chi_Minh" },
      {
        key: "business_hours",
        label: "Business hours (YAML map)",
        kind: "yaml",
        placeholder: "start: 9\nend: 17\ndays: [0, 1, 2, 3, 4]",
      },
    ],
  },
  {
    type: "request_metadata",
    label: "Request metadata",
    category: "identity",
    icon: "Tag",
    summary: "Pull a field from request.metadata",
    fields: [
      { key: "field", label: "Field path", kind: "string", placeholder: "metadata.user_tier" },
      { key: "default", label: "Default value", kind: "string", placeholder: "free" },
    ],
  },
  {
    type: "conversation_depth",
    label: "Conversation depth",
    category: "conversation",
    icon: "MessageCircle",
    summary: "# of turns so far in this thread",
    fields: [
      {
        key: "output",
        label: "Output",
        kind: "select",
        options: [
          "message_count",
          "user_turns",
          "assistant_turns",
          "tool_turns",
          "total_chars",
        ],
        default: "user_turns",
      },
    ],
  },
  {
    type: "reask",
    label: "Re-ask",
    category: "conversation",
    icon: "RotateCcw",
    summary: "Latest user message similar to a recent prior",
    fields: [
      { key: "threshold", label: "Threshold", kind: "number", default: 0.7 },
      { key: "lookback", label: "Lookback (turns)", kind: "number", default: 3 },
    ],
  },
  {
    type: "jailbreak_regex",
    label: "Jailbreak (regex)",
    category: "safety",
    icon: "ShieldAlert",
    summary: "Pattern-based prompt injection detection",
    fields: [
      {
        key: "output",
        label: "Output",
        kind: "select",
        options: ["score", "bool"],
        default: "score",
      },
      { key: "threshold", label: "Threshold (bool only)", kind: "number", default: 0.5 },
    ],
  },
  {
    type: "jailbreak_learned",
    label: "Jailbreak (learned)",
    category: "safety",
    icon: "ShieldX",
    summary: "ML jailbreak classifier",
    fields: [
      {
        key: "model_name",
        label: "Model",
        kind: "string",
        default: "jackhhao/jailbreak-classifier",
      },
      { key: "threshold", label: "Threshold", kind: "number", default: 0.5 },
      {
        key: "output",
        label: "Output",
        kind: "select",
        options: ["score", "bool"],
        default: "bool",
      },
      { key: "positive_label", label: "Positive label", kind: "string", default: "JAILBREAK" },
    ],
  },
  {
    type: "feedback",
    label: "Feedback (sentiment)",
    category: "conversation",
    icon: "ThumbsUp",
    summary: "Sentiment of latest user message",
    fields: [],
  },
  {
    type: "authz",
    label: "AuthZ (RBAC)",
    category: "identity",
    icon: "UserCheck",
    summary: "Kubernetes-style RBAC from request.metadata",
    fields: [
      { key: "user_field", label: "User field", kind: "string", default: "metadata.user" },
      {
        key: "groups_field",
        label: "Groups field",
        kind: "string",
        default: "metadata.user_groups",
      },
      {
        key: "role_bindings",
        label: "Role bindings (YAML list)",
        kind: "yaml",
        placeholder: "- {role: vip, groups: [enterprise, vip]}",
      },
    ],
  },
  {
    type: "agentic",
    label: "Agentic",
    category: "complexity",
    icon: "Cog",
    summary: "Heuristic for tool-use / agent requests",
    fields: [
      { key: "threshold", label: "Threshold", kind: "number", default: 0.35 },
    ],
  },
  {
    type: "fact_check_heuristic",
    label: "Fact-check heuristic",
    category: "complexity",
    icon: "CheckCircle2",
    summary: "Flags messages with N+ unverifiable claims",
    fields: [
      { key: "threshold", label: "Threshold", kind: "number", default: 2 },
    ],
  },
  {
    type: "knowledge_base_inmem",
    label: "KB (in-mem)",
    category: "topic",
    icon: "Library",
    summary: "Tag message with nearest KB entry",
    fields: [
      { key: "source", label: "Source path", kind: "string", placeholder: "data/kb/support_kb.yaml" },
      { key: "threshold", label: "Threshold", kind: "number", default: 0.4 },
      {
        key: "target",
        label: "Target",
        kind: "select",
        options: ["label", "group"],
        default: "label",
      },
      { key: "kb_name", label: "KB name", kind: "string" },
    ],
  },
  {
    type: "preference_llm",
    label: "Preference (LLM)",
    category: "topic",
    icon: "Wand",
    summary: "LLM-as-router (uses sparingly \u2014 per-request LLM call)",
    fields: [
      { key: "model", label: "Routing model", kind: "string", default: "gpt-4o-mini" },
      {
        key: "routes",
        label: "Routes (YAML list)",
        kind: "yaml",
        placeholder: "- {name: chitchat, description: \"small talk\"}",
      },
    ],
  },
];

export const SIGNAL_TYPE_BY_KEY = Object.fromEntries(
  SIGNAL_TYPES.map((s) => [s.type, s])
);

// =====================================================================
// Projection types (Layer 2)
// =====================================================================

export const PROJECTION_CATEGORIES = [
  { key: "partition", label: "Partition" },
  { key: "score", label: "Score" },
  { key: "mapping", label: "Mapping" },
];

export const PROJECTION_TYPES = [
  {
    type: "partition",
    label: "Partition",
    category: "partition",
    icon: "Split",
    summary: "Mutually-exclusive bucket from signal values",
    fields: [
      {
        key: "members",
        label: "Members (YAML list)",
        kind: "yaml",
        placeholder: "- technical_support\n- account_management\n- billing",
        help: "Ordered list of exclusive member names.",
      },
      {
        key: "default",
        label: "Default member",
        kind: "string",
        placeholder: "technical_support",
        help: "Member returned when no input matches.",
      },
      {
        key: "semantics",
        label: "Semantics",
        kind: "select",
        options: ["exclusive", "inclusive"],
        default: "exclusive",
        help: "exclusive = one match wins; inclusive = multiple can fire.",
      },
    ],
  },
  {
    type: "weighted_sum",
    label: "Weighted sum",
    category: "score",
    icon: "Calculator",
    summary: "Linear combination of signal scores",
    fields: [
      {
        key: "inputs",
        label: "Inputs (YAML list)",
        kind: "yaml",
        placeholder:
          "- type: complexity\n  name: hard\n  weight: 0.4\n- type: domain\n  name: mathematics\n  weight: 0.6",
        help: "List of {type, name, weight} triples.",
      },
    ],
  },
  {
    type: "threshold_bands",
    label: "Threshold bands",
    category: "mapping",
    icon: "Gauge",
    summary: "Map a continuous score to named bands",
    fields: [
      {
        key: "source",
        label: "Source projection",
        kind: "string",
        placeholder: "request_difficulty",
        help: "Name of the score projection feeding this band.",
      },
      {
        key: "outputs",
        label: "Bands (YAML list)",
        kind: "yaml",
        placeholder: "- name: low\n  lt: 0.3\n- name: medium\n  gte: 0.3\n  lt: 0.7\n- name: high\n  gte: 0.7",
        help: "List of {name, gte?, lt?} ranges.",
      },
    ],
  },
  {
    type: "round_robin",
    label: "Round-robin",
    category: "score",
    icon: "Repeat",
    summary: "Distribute load across N items evenly",
    fields: [
      {
        key: "items",
        label: "Items (YAML list)",
        kind: "yaml",
        placeholder: "- claude-sonnet-4\n- claude-haiku-4-5",
        help: "Ordered list of items to cycle through.",
      },
    ],
  },
];

export const PROJECTION_TYPE_BY_KEY = Object.fromEntries(
  PROJECTION_TYPES.map((p) => [p.type, p])
);

// =====================================================================
// Decision types (Layer 3) — renamed to "Route" internally
// =====================================================================

export const PLUGINS = [
  { type: "semantic_cache", label: "Semantic cache", summary: "Check response cache before calling the model" },
  { type: "response_jailbreak", label: "Response jailbreak", summary: "Screen model output for injection attempts" },
  { type: "pii_redact", label: "PII redact", summary: "Remove PII from request and/or response" },
  { type: "prompt_cache", label: "Prompt cache", summary: "Cache prompt tokens (OpenAI/AWS only)" },
  { type: "cost_cap", label: "Cost cap", summary: "Enforce per-decision cost ceiling" },
  { type: "system_prompt", label: "System prompt", summary: "Inject a system prompt template" },
  { type: "hallucination", label: "Hallucination guard", summary: "Verify factual claims in the response" },
  { type: "bon", label: "Best-of-N", summary: "Sample N responses and pick the best by score" },
];

export const PLUGIN_BY_TYPE = Object.fromEntries(
  PLUGINS.map((p) => [p.type, p])
);

export const PLUGIN_SUMMARY = Object.fromEntries(
  PLUGINS.map((p) => [p.type, p.summary])
);

export const ON_NO_MATCH = ["route_to_default", "reject", "use_operator_router"];

export const CREATED_BY_METHOD = ["direct", "composer", "chat-edit", "restored"];

// when-clause leaf operators
export const LEAF_OPERATORS = [
  { key: "equals", label: "equals", valueKind: "string" },
  { key: "in", label: "in (list)", valueKind: "string-list" },
  { key: "gte", label: ">=", valueKind: "number" },
  { key: "lte", label: "<=", valueKind: "number" },
  { key: "matches", label: "matches (regex)", valueKind: "string" },
  { key: "exists", label: "exists", valueKind: "bool" },
];

export const LEAF_OPERATOR_BY_KEY = Object.fromEntries(
  LEAF_OPERATORS.map((op) => [op.key, op])
);

// kinds of when-clause node
export const WHEN_KINDS = ["leaf", "all", "any", "not", "always"];
