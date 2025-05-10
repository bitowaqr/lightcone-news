<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-8 py-12">
    <article>
      <h1 class="text-4xl font-semibold mb-8 text-fg">Scenario Question Guidelines</h1>

      <!-- Scope Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4 text-fg">Scope</h2>
        <p class="mb-2 text-fg">
          Lightcone accepts scenario requests that concern significant, real-world developments with measurable outcomes. Questions should be about events or facts that can be resolved by a specific date, using public information.
        </p>
        <p class="text-fg">
          Questions about personal matters, trivial events, or topics that cannot be objectively verified are not accepted.
        </p>
      </section>

      <!-- Why Good Questions Matter -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4 text-fg">Writing good scenario questions</h2>
        <p class="mb-2 text-fg">
          The quality of a forecast depends on the clarity of the question. A well-formed scenario question is unambiguous, objective, and specific. The outcome can be determined by public evidence, not opinion. The event, timeframe, and resolution method are all defined.
        </p>
        
        <ul class="list-disc pl-6 text-fg space-y-2">
          <li>Use plain, precise language. Avoid abbreviations. Define any technical terms.</li>
          <li>State the event and the deadline for resolution.</li>
          <li>Describe exactly how the outcome will be judged, including sources.</li>
          <li>Consider edge cases and clarify how they should be handled.</li>
        </ul>
      </section>

      <!-- Good and Bad Examples Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4 text-fg">Examples</h2>
        <div class="mb-6">
          <div class="font-semibold mb-2">Good Questions</div>
          <ul class="list-disc pl-6 text-fg space-y-2">
            <li>Will Colossal successfully produce a living woolly mammoth by December 31, 2030?</li>
            <li>Will India's Central Electricity Authority report that rooftop solar installations exceed 50 GW cumulative capacity by December 31, 2025?</li>
            <li>Will the World Health Organization certify the eradication of wild poliovirus type 1 in Nigeria by August 1, 2026?</li>
          </ul>
        </div>
        <div>
          <div class="font-semibold mb-2">Bad Questions</div>
          <ul class="list-disc pl-6 text-fg space-y-2">
            <li>Will the global economy experience 'significant disruption' due to climate change before 2035? <span class="block text-fg-muted text-sm">("Significant disruption" is subjective and undefined.)</span></li>
            <li>Will fusion power become commercially viable and widely adopted by 2050? <span class="block text-fg-muted text-sm">("Commercially viable" and "widely adopted" are vague and open to interpretation.)</span></li>
            <li>Will there be peace in the Middle East by 2030? <span class="block text-fg-muted text-sm">("Peace" is not precisely defined and is not a binary, objectively resolvable outcome.)</span></li>
            <li>Will a major hurricane hit Florida in 2025? <span class="block text-fg-muted text-sm">("Major hurricane" is ambiguous unless a specific category or definition is provided.)</span></li>
            <li>Will Bitcoin reach $100k by mid‑2026? <span class="block text-fg-muted text-sm">("Mid-2026" is not a specific date; the question should specify an exact deadline.)</span></li>
          </ul>
        </div>
      </section>

      <!-- Anatomy -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4 text-fg">Anatomy of a Scenario Request</h2>
        <ol class="list-decimal pl-6 text-fg space-y-4">
          <li>
            <span class="font-semibold">Forecast Question</span><br>
            A single, clear question about a real-world event, answerable as yes/no or with a specific value by a set date.
          </li>
          <li>
            <span class="font-semibold">Related Article (optional)</span><br>
            If your question is about a story on Lightcone, link it for context.
          </li>
          <li>
            <span class="font-semibold">Resolution Criteria</span><br>
            Define exactly how the question will be resolved. Specify the data source, official statement, or public evidence that will be used. Clarify any terms and address possible ambiguities. For example:
            <div class="mt-1 ml-2 lg:ml-4 mb-1">
                <span class="italic">This question resolves as Yes if Colossal publicly announces the birth of a living woolly mammoth before 2030-12-31. "Living woolly mammoth" means an animal with at least 90% mammoth DNA, surviving at least 24 hours post-birth. Resolution is based on official Colossal press releases or peer-reviewed scientific publications.</span>
            </div>
          </li>
          <li>
            <span class="font-semibold">Resolution Date</span><br>
            The deadline by which the event must occur for the question to resolve. Currently, the maximum resolution time is 12 months.
          </li>
          <li>
            <span class="font-semibold">Background (optional)</span><br>
            Provide any additional information to explain the context of the question and help the AI agents generate a better forecast. Add links to sources if helpful.
          </li>
        </ol>
      </section>

      <!-- Forecasting Process -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4 text-fg">How Scenario Requests Are Processed</h2>
        <ol class="list-decimal pl-6 text-fg space-y-2">
          <li>Requests are automatically screened for clarity and adherence to guidelines.</li>
          <li>Requests that pass screening are tentatively processed, but can be rejected afterwards, following human review.</li>
          <li>Lightcone's AI forecasting agents research and generate multiple forecasts. Results are usually published within 5-20 minutes.</li>
          <li>Forecasts are updated on a rolling basis, i.e. updates are not triggered by the publication of new information.</li>
        </ol>
      </section>
    </article>
  </div>
</template>

<script setup>
import { useHead } from '#app';

useHead({
  title: 'Scenario Question Guidelines – Lightcone News',
  meta: [
    { name: 'description', content: 'How to write clear, objective, and forecastable scenario questions for Lightcone News.' }
  ]
});
</script>

<style scoped>
/* Simpler, technical doc style */
article {
  font-size: 1.13rem;
  color: var(--foreground);
}

h1, h2, h3 {
  color: var(--foreground);
  font-family: 'Merriweather', Georgia, serif;
}

h1 {
  margin-bottom: 2.5rem;
}

section + section {
  margin-top: 3.5rem;
}

ul, ol {
  margin-bottom: 0;
}

ul li::marker, ol li::marker {
  color: var(--primary);
}

</style> 