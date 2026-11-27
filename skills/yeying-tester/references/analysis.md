# Interpreting Tester evidence

## Overall quality and coverage

- Use the latest full-run summary as a snapshot of the full-suite scope at that run. List projects absent from full-run evidence, blocked in preflight, or lacking recent evidence. Attribute each result to its run rather than adding full-suite and single-project counts.
- Compare documented cases to current product behavior and the implemented specs, then join observed records by case ID. Report the counts of documented, implemented, observed, skipped, and unmapped cases with their respective denominators. Report priority and business workflow gaps individually. A documented case can map to several executable tests.
- Review configuration by key presence and service dependencies. Ask whether an unset value is required by the selected case, supplied through a default or generated source-mode configuration, or optional. A configured value still needs evidence that the service is reachable and that the account, feature, migration, or fixture is usable. The current snapshot checks names and presence only.

## Run investigation

- Use `stage` to identify preflight, execution or publication problems. A failed report publication can coexist with test execution. A `running` batch with no active task or later update may have been interrupted. A full batch can record that a project was selected even when preflight prevented any execution.
- Compare Tester commit, tested product commits, execution mode, environment, worker count, timeout, and retry rules. In deployed mode a product SHA may be unavailable. Interpret whole-run `runner_status` separately from project outcomes inside full batches.
- For unexpected results, inspect the spec assertion and its fixture at the recorded revision. Use attempt status and duration to find the failing step in the linked report. Distinguish an assertion on product behavior from setup, external dependencies, or test assumptions. Require a reproducible observed behavior and a valid assertion before reporting a product bug as confirmed.
- Read `expected_status` and attempt statuses when assessing release quality. Tester records marked expected failures separately from passing assertions. `flaky` records an outcome that recovered after a retry. `skipped`, `interrupted`, and `not-run` carry no successful execution evidence.
- Older JUnit results retain final outcome only. Older summaries may have missing detail, unknown mode, or unidentified project membership in full runs. The API includes a full run when evidence identifies the project as selected or executed. Browser reports provide additional detail under wallet authorization.

## Stability

- Compare the same project, run mode, evidence type, and comparable product/Tester versions. Report the observed window, batch and execution sample sizes, skip or missing counts, and whether retry evidence was available.
- Within-batch flake rate is flaky executions divided by executions that reached an outcome. Cross-batch instability requires both passing and unexpected final outcomes for the same test identity. A test that fails consistently warrants a different investigation from one that alternates between outcomes. Use expected status when interpreting expected failures.
- Use p95 duration as a signal alongside sample size, test mode, and revision. Compare retries and elapsed time together. Title changes and reporter changes can split a test identity. Use the documented case ID for cross-version review and preserve the distinction between multiple executable scenarios mapped to that ID.
- When paging through `stability`, each response summarizes that page. For a larger window, combine counts only for comparable groups and derive rates from the summed numerators and denominators. Compute a cross-page percentile from the original samples.
