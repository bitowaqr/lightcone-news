<template>
  <div class="container mx-auto px-4 py-8 max-w-3xl">
    <h1 class="text-3xl font-bold mb-8 text-primary-700 dark:text-primary-300">About Lightcone News</h1>

    <div class="bg-article p-6 md:p-8 rounded-lg shadow-sm mb-8 space-y-8 text-lg leading-relaxed">
      
      <blockquote class="text-xl font-medium leading-relaxed"> 
        Lightcone News provides a curated news feed with additional contextual information and probabilistic forecasts.
      </blockquote>

      <!-- Core Features Section -->
      <section class="border-t border-bg-muted pt-6">
        <h2 class="text-xl font-semibold mb-4">Core Features</h2> 
        <ol class="list-decimal space-y-2 pl-5">
          <li>
            A <strong class="font-bold text-primary-700 dark:text-primary-300">Curated Feed</strong> focusing on important global developments.
          </li>
          <li>
            <strong class="font-bold text-primary-700 dark:text-primary-300">Historical Timelines</strong> show the development of key events.
          </li>
          <li>
            Chat with a <strong class="font-bold text-primary-700 dark:text-primary-300">Grounded AI</strong> to get additional context on demand.
          </li>
          <li>
            Probabilistic forecasts for possible <strong class="font-bold text-primary-700 dark:text-primary-300 ">Future Scenarios</strong>.
          </li>
        </ol>
      </section>

      <!-- Understanding Scenarios Section -->
      <section class="border-t border-bg-muted pt-6">
        <h2 class="text-xl font-semibold mb-4">Understanding Future Scenarios</h2> 
        <p class="mb-6">
          Exploring potential futures helps put current events in perspective. Lightcone News integrates probabilistic forecasts from different sources:
        </p>
        <div class="space-y-6">
          <!-- Prediction Markets -->
          <div>
            <p class="mb-2">
              <strong class="font-medium">Prediction Markets:</strong> These are exchanges where people trade contracts based on the outcome of future events. The current price reflects the crowd's collective probability estimate for an event.
            <span class="whitespace-nowrap">
              <em class="text-fg-muted">Sources:</em> 
              <a href="https://www.polymarket.com/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline"> Polymarket</a>, 
              <a href="https://manifold.markets/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Manifold </a>
            </span>
            </p>
          </div>
          <!-- Forecasting Platforms -->
          <div>
             <p class="mb-2">
              <strong class="font-medium">Forecasting Platforms:</strong> These are places where people submit explicit probability forecasts, and the platform aggregates these into community estimates.
            <span class="whitespace-nowrap">
              <em class="text-fg-muted">Source: </em> 
              <a href="https://www.metaculus.com/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Metaculus</a>
            </span>
            </p>
          </div>
          <!-- AI Agents -->
          <div>
            <p class="mb-2">
              <strong class="font-medium">AI Agents:</strong> LLMs with access to web search tools analyse the news and generate forecasts. 
             <span class="">
              <em class="text-fg-muted">Sources:</em> Internal AI forecasting agents (based on various large language models).
            </span>
              <em class="text-sm text-fg-muted block">Note: AI forecasts are experimental. Accuracy and calibration data will be provided when available.</em>
            </p>
          </div>
        </div>
      </section>

      <!-- How to Read Scenarios Section -->
      <section class="border-t border-bg-muted pt-6">
        <h2 class="text-xl font-semibold mb-4">How to Read Future Scenarios</h2> 
        <p class="mb-3">
          Future scenarios include a probabilistic forecast, shown as a percentage (0-100%). This number represents the estimated likelihood of a specific outcome occurring by a given time.
        </p>
        <p class="mb-3">
          Remember that these are probabilities, not certainties. A 60% chance means the outcome is considered more likely than not, but it's still possible it won't happen.
        </p>
        <p>
          Different sources may give different probabilities for the same event due to varying data and methodologies.
        </p>
      </section>

      <!-- Accuracy Section -->
      <section class="border-t border-bg-muted pt-6">
        <h2 class="text-xl font-semibold mb-4">How Accurate Are the Forecasts?</h2> 
        <p class="mb-3">
          Extensive evidence demonstrates that aggregating forecasts from many individuals tends to give more accurate and reliable predictions than relying on even highly qualified individual experts.
        </p>
        <p class="mb-3">
          <a href="https://calibration.city/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Calibration.city</a> tracks historical data from various platforms and shows that forecasts are extremely well-calibrated: Events predicted to have e.g. a 75% chance of occuring, do in fact occur about 75% of the time.
        </p>
        <p>
          We are actively monitoring and will share calibration data for our internal AI forecasts as soon as we have a sufficient track record.
        </p>
      </section>

      <!-- Disclaimer Section -->
      <section class="border-t border-bg-muted pt-6 mt-8">
        <h3 class="text-lg font-semibold mb-2 text-fg-muted">Disclaimer</h3>
        <p class="font-mono text-xs leading-relaxed text-fg-muted">
          LIGHTCONE NEWS UTILIZES ARTIFICIAL INTELLIGENCE WHICH MAY OCCASIONALLY HALLUCINATE, FABRICATE INFORMATION, OR MAKE FACTUAL ERRORS. ALWAYS VERIFY INFORMATION WITH TRUSTED SOURCES BEFORE MAKING DECISIONS, SHARING WITH OTHERS, OR FORMING STRONG OPINIONS. DO NOT OPERATE HEAVY MACHINERY WHILE CONSUMING AI-GENERATED CONTENT. LIGHTCONE NEWS AGGREGATES CONTENT FROM VARIOUS THIRD-PARTY SOURCES. ALL RIGHTS TO ORIGINAL CONTENT BELONG TO THEIR RESPECTIVE COPYRIGHT HOLDERS. LINKS TO EXTERNAL SOURCES ARE PROVIDED FOR ATTRIBUTION AND REFERENCE PURPOSES ONLY. LIGHTCONE NEWS DOES NOT CLAIM OWNERSHIP OF THIRD-PARTY CONTENT AND OPERATES UNDER FAIR USE PRINCIPLES FOR THE PURPOSE OF NEWS REPORTING, COMMENTARY, AND RESEARCH. IF YOU ARE A COPYRIGHT HOLDER AND BELIEVE YOUR CONTENT HAS BEEN USED INAPPROPRIATELY, PLEASE CONTACT US IMMEDIATELY.
        </p>
      </section>

    </div>
  </div>
</template>

<script setup>
// No script logic needed for this static content page
</script>

<style scoped>
/* Add any page-specific styles if needed */
</style> 