# Chapter 3: Methodology

## 3.1 Introduction

This chapter describes the research and implementation methodology adopted for developing and evaluating the multilingual tourism assistant. The overall method is intentionally end-to-end: it begins with real user interaction modes such as map-driven context, text input, and voice input, and concludes with measurable validation through performance metrics and reliability checks. Rather than treating development and testing as separate activities, this work follows an iterative cycle in which design decisions are repeatedly tested, interpreted, and refined until the system reaches acceptable behavior.

## 3.2 Methodology Framework

The methodology framework follows a progressive processing pipeline. In the first phase, the system acquires user intent and context. User intent may arrive as typed text or spoken audio, while context is inferred from map location, selected place, and nearby discovery actions. This context is essential because tourism guidance quality depends not only on the user question but also on where the user is asking from.

In the second phase, the input is normalized and prepared for intelligence processing. Spoken input is transcribed into text, language codes are standardized, and the final query is combined with location-aware details. The resulting structured input is then passed to the response generation layer.

In the third phase, the AI layer produces a location-grounded answer. The response generation process is constrained by context so that the output remains relevant to the selected place rather than drifting into generic travel content. If the user requested a non-English language, translation and response adaptation are applied before delivery.

In the fourth phase, output is converted into an interaction-friendly form. If voice mode is enabled, text output is synthesized into speech, creating a full voice-in and voice-out experience.

In the fifth and final phase, the application enters the evaluation loop. Functional tests and load tests are executed, metric trends are analyzed, and bottlenecks are identified. The findings from this stage feed directly into optimization actions, after which the pipeline is retested.

## 3.3 Implementation Method

The system is implemented as a modular architecture to keep responsibilities clear and allow targeted optimization. The frontend layer manages map rendering, place exploration, chat interaction, and microphone controls. The API layer orchestrates request handling for chat, nearby data operations, and speech-to-text processing. The intelligence layer performs language handling, context assembly, and final response generation. Finally, a dedicated testing and reporting layer executes reproducible performance experiments and emits analysis artifacts in both Markdown and PNG formats for documentation use.

This modular approach supports both maintainability and experimental clarity. If a regression appears in latency or reliability, the affected module can be traced and tuned without destabilizing unrelated components.

## 3.4 Experimental Setup

The primary endpoint evaluated in performance experiments is the chat API route (`POST /api/chat`). Load is applied at predefined concurrency levels of 1, 3, 5, and 10 users. Each concurrency level is tested with a configurable number of requests so both quick checks and deeper benchmark runs are possible. Request timeout controls are applied to avoid indefinite waits during upstream delays.

Evaluation thresholds are parameterized to support objective interpretation. P95 latency is evaluated against a configurable SLO boundary, while reliability is measured against a configurable error-budget threshold. User-perceived performance is captured through Apdex using a configurable threshold T. The same test run also supports PNG export settings (toggle, dimensions, and resolution scale), allowing direct inclusion of visual evidence in academic reports.

## 3.5 Evaluation Metrics

The evaluation model combines speed, reliability, capacity, and user experience indicators. Mean latency reflects typical response speed, while P50 and P95 expose distribution behavior and tail-risk user experience. Error rate quantifies request failures under load and acts as a direct reliability signal. Throughput represents service capacity as requests processed per second and is used for operating-point selection. Apdex converts latency behavior into a user-centric satisfaction score between 0 and 1. SLO compliance then converts metric values into operational pass or fail decisions for both latency and reliability targets.

Together, these metrics provide a balanced view. A system can appear fast in average latency while still failing users through high tail latency or unstable error behavior; therefore, decisions are based on combined metrics rather than a single indicator.

## 3.6 Testing Method Applied

The testing strategy includes functional and non-functional validation. Functional validation checks correctness at route level and across integrated flows, especially the relationship between map context, nearby exploration, and chat response generation. Speech-path validation examines transcription and voice-response continuity. Quality validation examines relevance and multilingual response behavior. Non-functional validation focuses on load behavior, latency stability, reliability, throughput scaling, and SLO adherence.

This multi-layer test strategy ensures that improvements in one area do not silently degrade another. For example, a throughput optimization is only accepted if reliability and user-facing latency quality remain within target limits.

## 3.7 Graph Placement Strategy

For clear academic presentation, the performance visuals should be placed in Chapter 4 in the same narrative order as the analysis. The latency graph should appear first in the performance results subsection because it introduces baseline responsiveness. The error-rate graph should follow immediately, since reliability must be interpreted alongside speed. The throughput graph should then appear in the scalability subsection to show capacity trends.

After speed, reliability, and capacity are established, the Apdex graph should be placed in a user-experience subsection to connect technical behavior with perceived responsiveness. The SLO compliance graph should be placed near the conclusion of the results section because it summarizes operational pass or fail status. The KPI table and metrics analysis text should appear at the end of the chapter as the final synthesis and recommendation section.

## 3.8 Chapter Summary

The methodology in this work is not merely an implementation sequence; it is an evaluation-driven engineering cycle. By linking contextual AI generation with structured testing and metric-based interpretation, the approach produces a system that is both functionally useful and operationally measurable.

---

# Chapter 4: Results and Discussion

## 4.1 Introduction

This chapter presents the observed results from the performance dashboard and interprets system behavior under controlled concurrency levels. The purpose of this chapter is to move beyond raw numbers and explain what those numbers mean for real deployment decisions.

## 4.2 Observed Dashboard Outputs

The generated dashboard captures the full performance profile through five visual perspectives: latency behavior, error behavior, throughput scaling, user satisfaction via Apdex, and SLO compliance status. In addition, the report includes a KPI summary table and automated textual analysis. This combined output allows both quick screening and deeper interpretation.

## 4.3 Discussion of Result Dimensions

Latency results reveal how quickly the system responds as load increases and where tail behavior becomes risky. P95 is particularly important because it captures near worst-case user experience rather than typical averages. Error-rate behavior reveals whether concurrency pressure causes instability, partial failures, or service saturation effects. Throughput reveals effective capacity and helps identify whether increasing load improves productive output or only increases contention.

Apdex adds an explicitly user-centered view by mapping latency outcomes into a satisfaction scale. A technically acceptable response time can still produce weak user experience if too many responses cross the tolerance threshold. SLO compliance provides the final operational gate by converting metric outcomes into binary pass/fail judgments for service governance.

## 4.4 Interpretation Method

Interpretation in this chapter follows a consistency-first policy. Candidate concurrency levels are first filtered by SLO success, meaning they must satisfy both latency and error constraints. Among the passing candidates, the preferred operating point is the one with the strongest throughput while preserving acceptable Apdex behavior. Any level that fails SLO is treated as a risk condition even when mean latency appears attractive. This interpretation method avoids premature optimization based on incomplete indicators.

## 4.5 Limitations and Validity Considerations

The observed behavior can be influenced by upstream model latency, network conditions, and temporary provider-side variance. For this reason, isolated runs should be interpreted as indicative rather than definitive. Robust conclusions require repeated runs, larger request volumes, and trend comparison across time. Even with these limitations, the dashboard methodology remains valuable because it exposes relative behavior patterns and clear pass/fail boundaries.

## 4.6 Chapter Summary

The results framework demonstrates that performance assessment is most useful when speed, reliability, capacity, and user perception are interpreted together. The dashboard structure supports actionable conclusions by combining visual trend analysis with threshold-driven decision logic.

---

# Chapter 5: Conclusion and Future Work

## 5.1 Conclusion

This project achieves its core objective of building a multilingual, voice-enabled, location-aware tourism assistant supported by measurable evaluation. The implemented testing framework transforms system behavior into interpretable evidence, allowing decisions to be made on data rather than assumptions. As a result, development shifts from feature-only progress to quality-governed progress.

## 5.2 Contributions of the Work

The work contributes an integrated interaction model that combines map context, nearby place intelligence, chat interaction, and voice modalities in a single user flow. It also contributes a reproducible performance assessment pipeline with automated chart generation and exportable artifacts for technical reporting. Most importantly, it contributes an SLO-oriented interpretation model that turns raw metrics into operational recommendations.

## 5.3 Practical Significance

The application demonstrates how intelligent tourism interfaces can remain accessible across language preferences and interaction styles. The inclusion of performance observability ensures that system quality can be validated before deployment and monitored after changes. This is especially useful for applications that depend on external AI providers where latency and reliability can fluctuate.

## 5.4 Future Work

Future work should focus on deeper statistical robustness, including repeated benchmarks and time-series trend baselining. Speech quality evaluation can be strengthened through standardized multilingual datasets and explicit word error rate analysis. Operational maturity can be improved through end-to-end tracing, automated alerting, and adaptive routing strategies that choose providers based on live latency, quality, and cost signals.

Another strong direction is personalization. By learning user preferences and travel context over time, the system can produce responses that are not only correct and fast but also more relevant to individual intent.

## 5.5 Final Remark

The developed system forms a strong foundation for intelligent tourism guidance. With continued optimization in latency stability, reliability governance, and multilingual interaction quality, it can evolve from a validated prototype into a production-ready digital travel companion.

---

# Appendix: Placement of Existing Graphs in the Report

In the final document, the latency figure should be inserted in the first subsection of Chapter 4 that discusses responsiveness under load, using the file `reports/performance-png/latency-vs-concurrency.png`. The error-rate figure should be placed immediately after the latency discussion in the reliability subsection, using `reports/performance-png/error-rate-vs-concurrency.png`.

The throughput figure should follow in the scalability subsection, using `reports/performance-png/throughput-vs-concurrency.png`. The Apdex figure should be placed in the user-experience discussion subsection, using `reports/performance-png/apdex-vs-concurrency.png`. The SLO compliance figure should be positioned near the end of Chapter 4 in the operational validation subsection, using `reports/performance-png/slo-compliance-vs-concurrency.png`.

The consolidated metrics and narrative interpretation should reference the generated dashboard report file `reports/chat-performance-report.md`, especially in the synthesis and recommendation paragraphs at the end of Chapter 4.
