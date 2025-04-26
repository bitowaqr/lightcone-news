prompt `Please read the following content from [{url}] and generate forecasting questions about how the situation will develop.

Requirements for the questions:
0. Must be a binary yes-no question.
1. Must be clearly resolvable by the end of 2025, i.e. should not refer
to future years.
2. Should be specific enough to avoid ambiguity.
3. Should focus on concrete, measurable outcomes.
4. Should be interesting and consequential.
5. Should be answerable based on publicly available information.
6. Should avoid compound questions (by default, avoid "and" questions).
7. Avoid questions that are difficult to resolve e.g. questions that talk
about the impact of a specific event or factor, since in most situations
these (or causes) are difficult to determine with certainty.

Make a table with these columns:
1. Question (written in future tense, ending with a question mark)
2. Interestingness (0-5)
3. Importance (0-5)
4. Guesstimated probability (0-100%)

Sort the table by (Interestingness + Importance), descending.
Aim for 2 high-quality questions.
Really make sure that they meet the requirements above.
Double check that each of the requirements above is met, and if not, come up with new questions.`