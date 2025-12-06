# Token Efficiency of OpenAI GPT-5 Models for English and Turkish

This repository (`ileri-llm-tokens`) contains:

- A **React/TypeScript web app** for running standardized LLM token tests across providers (OpenAI, Gemini, Claude, Grok, etc.).  
- A **technical study** of **token efficiency for Turkish vs English** on OpenAI’s GPT-5.1 and GPT-5-mini models.  
- The **dataset**, **analysis script**, and **paper** describing the OpenAI baseline results.

The central question:

> For the *same* content, how many more tokens (and how much more money) do we spend when we use **Turkish** instead of **English**?

---

## 1. Overview

OpenAI models studied in the first baseline:

- `gpt-5.1`
- `gpt-5-mini`

Language variants:

- `en` – English  
- `tr` – Turkish  
- `tr_nodia` – Turkish *without diacritics* (ç, ğ, ı, ö, ş, ü removed)

We use a **parallel dataset** of 100 sentence IDs, where each ID has **three variants** (EN, TR, TR_NODIA) expressing the same meaning.

Each input is sent to the OpenAI Responses API with a fixed system instruction and a simple **echo task**:

> “You are a helpful assistant. Reply ONLY with the EXACT SAME text the user sends, nothing else.”

This isolates **tokenization and pricing** effects, without quality/judgment confounds.

The web app in this repo is the harness used to run these tests (upload dataset, select providers/models, run calls, export CSV).

---

## 2. Key Findings (OpenAI baseline)

On this dataset and setup, for both GPT-5.1 and GPT-5-mini:

### 2.1 Linear model of prompt tokens vs characters

Prompt tokens are well approximated by a linear model:

\[
\text{prompt\_tokens} \approx 32 + b \cdot \text{chars}
\]

where `chars` is the number of characters in the user input.

Fitted slopes (approximate):

- **English:** b ≈ **0.173 tokens/character**
- **Turkish:** b ≈ **0.265 tokens/character**
- **Turkish (no diacritics):** b ≈ **0.283 tokens/character**

R² values are high (> 0.88), indicating that this simple linear model captures most of the variance in prompt token counts.

### 2.2 Turkish vs English token overhead

For the same semantic content (paired EN–TR sentences):

- Turkish requires on average **≈ 5.9 more input tokens per sentence** than English  
  – 95% CI roughly **[4.8, 7.0]**
- Turkish has **≈ 0.15 more tokens per character** than English  
  – 95% CI roughly **[0.10, 0.20]**
- This corresponds to roughly **14–16% more input tokens per sentence** in Turkish vs English.

### 2.3 Cost impact

Given OpenAI’s per-token pricing (per 1M tokens), this translates to about:

- **1.21–1.22× higher cost per Turkish sentence** compared to English,
- for both GPT-5.1 and GPT-5-mini.

The pricing model is language-agnostic; the difference comes purely from token counts.

### 2.4 Removing diacritics doesn’t help

We also test `tr_nodia` (Turkish without diacritics). The result:

- `tr_nodia` uses **slightly more** tokens per character than correctly spelled Turkish.
- Mean difference `tr_nodia – tr` ≈ **+0.011 tokens/char** (95% CI ca. [+0.006, +0.017]).

So “degrading” Turkish orthography **does not save tokens** and slightly hurts token efficiency.

This repository is an **OpenAI-only baseline** that will later be extended with other vendors (Gemini, Claude, Grok, etc.).

---

## 3. Repository Structure

A recommended layout for this repo is:

```text
ileri-llm-tokens/
  src/                    # React/TypeScript web app (existing code)
  public/                 # Static assets (if applicable)
  package.json
  tsconfig.json
  ...
  paper/
    OpenAI_EN_TR_Token_Efficiency_v1.docx
    OpenAI_EN_TR_Token_Efficiency_v1.pdf
  data/
    OpenAI-models-6-12-2025.csv
  analysis/
    analysis_script.py
  README.md
```

- **Web app code** lives at the root (`src/`, `public/`, config files, etc.).  
- **Paper** lives under `paper/`.  
- **Dataset** lives under `data/`.  
- **Standalone analysis script** lives under `analysis/`.

You can adapt file names to your own versioning (`v1`, `v2`, etc.).

---

## 4. Data Format

`data/OpenAI-models-6-12-2025.csv` has one row per combination of:

- `id` – sentence ID (1..100)
- `model` – `gpt-5.1` or `gpt-5-mini`
- `variant` – `en`, `tr`, or `tr_nodia`

Key columns:

- `chars` – number of characters in the input sentence  
- `prompt_tokens` – input tokens reported by OpenAI  
- `completion_tokens` – output tokens  
- `total_tokens` – sum of prompt + completion tokens  
- `tokens_per_char` – `prompt_tokens / chars`  
- `output_chars` – length of the model’s output (should match input in echo task)  
- `output_tokens_per_char` – `completion_tokens / output_chars`  
- `cost` – estimated cost per call (using current price per 1M tokens)  
- `responseTime` – measured latency in milliseconds  
- `run_id`, `provider`, `mode`, `reasoning_label`, `verbosity_label` – metadata for the experimental run

The web app is responsible for generating this CSV by calling provider APIs under standardized settings.

---

## 5. Methods (Short)

1. **Dataset**  
   - 100 sentence IDs, each with:
     - English (`en`)
     - Turkish (`tr`)
     - Turkish without diacritics (`tr_nodia`)  
   - Sentences are semantically parallel across languages.

2. **Task / Prompting**  
   - Same system message for all calls (OpenAI Responses API).  
   - Echo task: model is instructed to **return exactly the input text**.  
   - Temperature and max tokens kept fixed across runs.

3. **Models**  
   - `gpt-5.1`  
   - `gpt-5-mini`

4. **Metrics**  
   - Tokens: `prompt_tokens`, `completion_tokens`, `total_tokens`.  
   - Efficiency: `tokens_per_char` (input) and `output_tokens_per_char` (output).  
   - Cost: computed from advertised price per 1M tokens.  
   - Latency: wall-clock response time from the client side.

5. **Analysis**  
   - For each `(model, variant)`:
     - Fit a linear regression:

       \[
       \text{prompt\_tokens} \approx a + b \cdot \text{chars}
       \]

       and report `a` (intercept), `b` (slope), and R².

   - For each sentence ID and model (paired design):
     - EN vs TR: Δ tokens/char and Δ prompt_tokens  
     - TR vs TR_NODIA: Δ tokens/char  
     - Summarize means, standard deviations, and **95% confidence intervals**.

   - Cost:
     - Mean cost per sentence, EN vs TR, per model.  
     - Cost ratios TR / EN.

Figures in the paper include:

- Scatter + regression lines (tokens vs chars).  
- Bar chart of mean tokens/char by variant and model.  
- Histogram of Δ tokens/char (TR – EN).  
- Bar chart of mean cost per sentence (EN vs TR).

---

## 6. Analysis Script

The script `analysis/analysis_script.py` is a standalone Python script that reproduces the main stats and the four figures used in the paper.

### 6.1. Requirements

Create and activate a Python environment (3.9+ recommended), then install dependencies:

```bash
pip install pandas numpy matplotlib
```

### 6.2. Usage

From the repo root:

```bash
# Use the default CSV path (data/OpenAI-models-6-12-2025.csv)
python analysis/analysis_script.py

# Or specify a custom CSV path
python analysis/analysis_script.py data/your_results.csv
```

The script will:

- Load and clean the CSV (robust to commas inside `output_text`),
- Fit the linear models per `(model, variant)`,
- Compute paired EN vs TR and TR_NODIA vs TR differences (with 95% CIs),
- Compute mean cost and TR/EN cost ratios per model,
- Generate four PNG figures under `figures/`:
  - `fig1_chars_vs_prompt_tokens_gpt5_1.png`
  - `fig2_tokens_per_char_by_variant_and_model.png`
  - `fig3_cost_per_sentence_en_vs_tr.png`
  - `fig4_hist_delta_tokens_per_char_tr_minus_en_gpt5_1.png`
- Print formatted tables to stdout.

---

## 7. Web App (LLM Token Test Harness)

This repository also contains a **React/TypeScript web application** that serves as a general-purpose LLM token test harness.

### 7.1. Capabilities

The app allows you to:

- Upload a dataset of sentences (e.g. EN/TR pairs).  
- Map columns (id, en, tr, tr_nodia, type).  
- Configure **providers and models**, currently including:
  - OpenAI (GPT-5.1, GPT-5-mini, GPT-5-nano, etc.)
  - Google Gemini
  - Anthropic Claude (Haiku / Sonnet)
  - xAI Grok
- Run standardized tests under fixed settings:
  - System prompt, temperature, max tokens, etc.  
  - Echo task or other tasks (depending on configuration).
- Collect:
  - Token counts, cost estimates, response time, and raw outputs.  
  - Export results as CSV for analysis (the OpenAI CSV in `data/` comes from this app).

### 7.2. Running the app

Exact commands may differ, but typically (from repo root):

```bash
npm install
npm run dev
```

(or `yarn` / `pnpm` based on your setup).

Once running, you can:

- Open the app in your browser (usually http://localhost:5173 or similar),
- Upload your dataset,
- Configure providers and models (with your API keys),
- Run experiments and download the resulting CSV.

The logic for provider calls and pricing is mainly defined under:

- `src/services/llmProviders.ts` / `llmProviders.tsx` (depending on your layout)  
- Components under `src/components/` for file upload, column mapping, results, charts, etc.

---

## 8. Planned Extensions

This repository is **Part 1: OpenAI baseline + tooling**.

Planned follow-ups:

- Run the **same experimental design** for other vendors:
  - Google Gemini (e.g., Gemini 2.5 Flash / Pro),
  - Anthropic Claude (Haiku / Sonnet),
  - xAI Grok (fast vs reasoning modes).
- Add **additional task types** beyond echoing text (e.g., short summarization, question answering).
- Compare across vendors:
  - Token efficiency (tokens/char) for English vs Turkish and other morphologically rich languages,
  - Latency distributions under load,
  - Effective cost per sentence / per word for real-world workloads.

Long-term goal:

> Quantify the “**language tax**” that different languages and vendors impose in practice, and provide actionable guidance for developers building non-English applications.

---

## 9. Turkish Summary (Kısa Özet)

Bu çalışma, OpenAI GPT-5.1 ve GPT-5-mini modellerinde **Türkçe** ile **İngilizce** arasındaki **gizli token/maliyet farkını** sayısal olarak incelemektedir.

- Aynı içeriği ifade eden İngilizce ve Türkçe cümleler kullanılır.  
- Modellerden, kullanıcı girdisini **birebir geri döndürmeleri** istenir (echo görevi).  
- Sonuç olarak:
  - Türkçe cümleler, aynı içeriği ifade ederken ortalama **≈ 6 ek input token** gerektirir.  
  - Bu, cümle başına **≈ %20–22 daha yüksek maliyet** anlamına gelir.  
  - Türkçe’deki diakritik işaretlerini (ç, ğ, ı, ö, ş, ü) kaldırmak token tasarrufu sağlamaz; tam tersine token/karakter oranını hafifçe artırır.

Bu depo, ileride **Gemini, Claude, Grok** gibi diğer sağlayıcılarla yapılacak çalışmalar için temel bir **OpenAI referansı** sunar ve aynı zamanda bu deneyleri tekrar çalıştırmak için kullanılan web uygulamasını içerir.

---

## 10. Citation

If you use these results, the dataset, or the methodology, you can cite it informally as:

> Mutlu Doğuş Yıldırım, *Token Efficiency of OpenAI GPT-5 Models for English and Turkish*, 2025.  
> GitHub: https://github.com/…/ileri-llm-tokens (replace with actual URL)

BibTeX-style (adjust once you know the final URL):

```bibtex
@misc{yildirim2025turkish,
  author       = {Mutlu Do{\u g}u{\c s} Y{\i}ld{\i}r{\i}m},
  title        = {Token Efficiency of OpenAI GPT-5 Models for English and Turkish},
  year         = {2025},
  howpublished = {\url{https://github.com/<your-username>/ileri-llm-tokens}},
  note         = {Technical report, dataset, and web app}
}
```

---
