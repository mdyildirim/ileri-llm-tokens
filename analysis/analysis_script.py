#!/usr/bin/env python3
"""
Analysis script for EN–TR token efficiency on OpenAI GPT-5 models.

This is the same logic used to generate the stats and figures in the paper.
It:
- Loads the OpenAI results CSV
- Cleans / parses the data
- Fits linear models: prompt_tokens ≈ a + b * chars
- Computes paired EN vs TR and TR_NODIA vs TR differences
- Computes cost ratios
- Saves four figures under ./figures
- Prints a textual summary to stdout
"""

import csv
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


# --------- Configuration ---------

# Default path to the CSV (relative to repo root). Override by passing a path
# as a command-line argument:  python analysis_script.py data/yourfile.csv
DEFAULT_CSV_PATH = Path("data/OpenAI-models-6-12-2025.csv")

FIGURES_DIR = Path("figures")
FIGURES_DIR.mkdir(exist_ok=True)


# --------- Data loading / cleaning ---------

def load_and_clean(csv_path: Path) -> pd.DataFrame:
    """
    Load the CSV and reconstruct columns in a way that tolerates commas
    inside the output_text field.

    This mirrors the logic used in the interactive analysis environment.
    """
    with csv_path.open("r", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    # This header is what we used in the notebook:
    header = [
        "run_id", "id", "provider", "model", "variant",
        "chars", "tokens_per_char", "output_chars", "output_tokens_per_char",
        "prompt_tokens", "completion_tokens", "total_tokens",
        "output_text", "mode", "cost", "responseTime",
        "reasoning_label", "verbosity_label"
    ]

    clean_rows = []
    for r in rows[1:]:  # skip header
        L = len(r)
        if L < 18:
            # Not enough columns; skip
            continue

        # Last 4 fields are cost, responseTime, reasoning_label, verbosity_label
        cost = r[-4]
        responseTime = r[-3]
        reasoning = r[-2]
        verbosity = r[-1]
        mode = r[-5]

        # Everything between index 12 and L-5 belongs to output_text
        output_text_parts = r[12:L-5]
        output_text = ",".join(output_text_parts)

        fixed = r[:12] + [output_text, mode, cost, responseTime, reasoning, verbosity]
        clean_rows.append(fixed)

    df = pd.DataFrame(clean_rows, columns=header)

    # Convert numeric columns
    num_cols = [
        "id", "chars", "tokens_per_char", "output_chars", "output_tokens_per_char",
        "prompt_tokens", "completion_tokens", "total_tokens", "cost", "responseTime"
    ]
    for c in num_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    df["id"] = df["id"].astype(int)
    return df


# --------- Core analysis helpers ---------

def summarize_linear(df_sub: pd.DataFrame):
    """Fit prompt_tokens ≈ a + b * chars and return (n, mean_chars, mean_tokens, a, b, r2)."""
    X = df_sub["chars"].values
    y = df_sub["prompt_tokens"].values
    n = len(X)
    mean_chars = X.mean()
    mean_tokens = y.mean()

    Sxx = ((X - mean_chars) ** 2).sum()
    Sxy = ((X - mean_chars) * (y - mean_tokens)).sum()
    b = Sxy / Sxx
    a = mean_tokens - b * mean_chars

    y_pred = a + b * X
    ss_tot = ((y - mean_tokens) ** 2).sum()
    ss_res = ((y - y_pred) ** 2).sum()
    r2 = 1 - ss_res / ss_tot

    return n, mean_chars, mean_tokens, a, b, r2


def compute_summaries(df: pd.DataFrame):
    models = sorted(df["model"].unique().tolist())
    variants = ["en", "tr", "tr_nodia"]

    summary_rows = []
    for model in models:
        for variant in variants:
            sub = df[(df.model == model) & (df.variant == variant)]
            n, mean_chars, mean_tokens, a, b, r2 = summarize_linear(sub)
            summary_rows.append({
                "model": model,
                "variant": variant,
                "n": n,
                "mean_chars": mean_chars,
                "mean_prompt_tokens": mean_tokens,
                "intercept_tokens": a,
                "slope_tokens_per_char": b,
                "r2": r2
            })

    return pd.DataFrame(summary_rows)


def compute_paired_en_tr(df: pd.DataFrame):
    """Paired EN vs TR differences per model."""
    models = sorted(df["model"].unique().tolist())
    rows = []

    for model in models:
        en = df[(df.model == model) & (df.variant == "en")].set_index("id")
        tr = df[(df.model == model) & (df.variant == "tr")].set_index("id")
        ids = sorted(set(en.index) & set(tr.index))

        diffs_tpc = np.array([tr.loc[i, "tokens_per_char"] - en.loc[i, "tokens_per_char"] for i in ids])
        diffs_pt = np.array([tr.loc[i, "prompt_tokens"] - en.loc[i, "prompt_tokens"] for i in ids])

        n = len(diffs_tpc)
        t_crit = 1.984  # approx 95% for n~100

        def mean_sd_ci(arr):
            mean = arr.mean()
            sd = arr.std(ddof=1)
            se = sd / math.sqrt(n)
            ci_low = mean - t_crit * se
            ci_high = mean + t_crit * se
            return mean, sd, ci_low, ci_high

        mean_d_tpc, sd_d_tpc, ci_low_tpc, ci_high_tpc = mean_sd_ci(diffs_tpc)
        mean_d_pt, sd_d_pt, ci_low_pt, ci_high_pt = mean_sd_ci(diffs_pt)

        rows.append({
            "model": model,
            "n_pairs": n,
            "mean_diff_tokens_per_char_tr_minus_en": mean_d_tpc,
            "sd_diff_tokens_per_char": sd_d_tpc,
            "ci_low_tpc": ci_low_tpc,
            "ci_high_tpc": ci_high_tpc,
            "mean_diff_prompt_tokens_tr_minus_en": mean_d_pt,
            "sd_diff_prompt_tokens": sd_d_pt,
            "ci_low_pt": ci_low_pt,
            "ci_high_pt": ci_high_pt
        })

    return pd.DataFrame(rows)


def compute_paired_tr_nodia(df: pd.DataFrame):
    """Paired TR_NODIA vs TR differences per model."""
    models = sorted(df["model"].unique().tolist())
    rows = []

    for model in models:
        tr = df[(df.model == model) & (df.variant == "tr")].set_index("id")
        trn = df[(df.model == model) & (df.variant == "tr_nodia")].set_index("id")
        ids = sorted(set(tr.index) & set(trn.index))

        diffs_tpc = np.array([trn.loc[i, "tokens_per_char"] - tr.loc[i, "tokens_per_char"] for i in ids])
        n = len(diffs_tpc)
        t_crit = 1.984

        mean_d = diffs_tpc.mean()
        sd_d = diffs_tpc.std(ddof=1)
        se_d = sd_d / math.sqrt(n)
        ci_low = mean_d - t_crit * se_d
        ci_high = mean_d + t_crit * se_d

        rows.append({
            "model": model,
            "n_pairs": n,
            "mean_diff_tpc_trn_minus_tr": mean_d,
            "sd_diff": sd_d,
            "ci_low": ci_low,
            "ci_high": ci_high
        })

    return pd.DataFrame(rows)


def compute_cost_stats(df: pd.DataFrame):
    """Mean cost per sentence and TR/EN cost ratio per model."""
    models = sorted(df["model"].unique().tolist())
    rows = []

    for model in models:
        en_cost = df[(df.model == model) & (df.variant == "en")]["cost"].mean()
        tr_cost = df[(df.model == model) & (df.variant == "tr")]["cost"].mean()
        ratio = tr_cost / en_cost if en_cost and en_cost > 0 else None

        rows.append({
            "model": model,
            "mean_cost_en": en_cost,
            "mean_cost_tr": tr_cost,
            "tr_over_en_cost_ratio": ratio
        })

    return pd.DataFrame(rows)


# --------- Plotting ---------

def generate_figures(df: pd.DataFrame):
    models = sorted(df["model"].unique().tolist())
    model_ref = models[0]  # e.g. gpt-5.1

    # Figure 1: prompt tokens vs chars with regression lines (GPT-5.1, EN vs TR)
    sub_en = df[(df.model == model_ref) & (df.variant == "en")]
    sub_tr = df[(df.model == model_ref) & (df.variant == "tr")]

    def linreg(sub):
        X = sub["chars"].values
        y = sub["prompt_tokens"].values
        mean_x = X.mean()
        mean_y = y.mean()
        Sxx = ((X - mean_x) ** 2).sum()
        Sxy = ((X - mean_x) * (y - mean_y)).sum()
        b = Sxy / Sxx
        a = mean_y - b * mean_x
        return a, b

    a_en, b_en = linreg(sub_en)
    a_tr, b_tr = linreg(sub_tr)

    fig1, ax1 = plt.subplots()
    ax1.scatter(sub_en["chars"], sub_en["prompt_tokens"], label="English", alpha=0.6)
    ax1.scatter(sub_tr["chars"], sub_tr["prompt_tokens"], label="Turkish", alpha=0.6)

    x_vals = np.linspace(df["chars"].min(), df["chars"].max(), 100)
    ax1.plot(x_vals, a_en + b_en * x_vals, label="EN fit")
    ax1.plot(x_vals, a_tr + b_tr * x_vals, label="TR fit")

    ax1.set_xlabel("Characters in input sentence")
    ax1.set_ylabel("Prompt tokens")
    ax1.set_title(f"Prompt tokens vs characters for {model_ref}")
    ax1.legend()
    fig1.tight_layout()
    fig1_path = FIGURES_DIR / "fig1_chars_vs_prompt_tokens_gpt5_1.png"
    fig1.savefig(fig1_path, dpi=300)
    plt.close(fig1)

    # Figure 2: tokens per character by variant and model (bar chart)
    variants = ["en", "tr", "tr_nodia"]
    summaries = []
    for m in models:
        for v in variants:
            sub = df[(df.model == m) & (df.variant == v)]
            summaries.append({
                "model": m,
                "variant": v,
                "tokens_per_char_mean": sub["tokens_per_char"].mean()
            })
    summ_tokens = pd.DataFrame(summaries)

    fig2, ax2 = plt.subplots()
    x = np.arange(len(variants))
    width = 0.35
    for i, m in enumerate(models):
        means = [summ_tokens[(summ_tokens.model == m) & (summ_tokens.variant == v)]["tokens_per_char_mean"].iloc[0]
                 for v in variants]
        ax2.bar(x + (i - 0.5) * width, means, width, label=m)

    ax2.set_xticks(x)
    ax2.set_xticklabels(["English", "Turkish", "Turkish (no diacritics)"], rotation=15)
    ax2.set_ylabel("Mean tokens per character")
    ax2.set_title("Tokens per character by language variant and model")
    ax2.legend()
    fig2.tight_layout()
    fig2_path = FIGURES_DIR / "fig2_tokens_per_char_by_variant_and_model.png"
    fig2.savefig(fig2_path, dpi=300)
    plt.close(fig2)

    # Figure 3: mean cost per sentence EN vs TR by model
    cost_rows = []
    for m in models:
        for v in ["en", "tr"]:
            sub = df[(df.model == m) & (df.variant == v)]
            cost_rows.append({
                "model": m,
                "variant": v,
                "mean_cost": sub["cost"].mean()
            })
    cost_df_long = pd.DataFrame(cost_rows)

    fig3, ax3 = plt.subplots()
    x = np.arange(len(models))
    width = 0.35
    for i, v in enumerate(["en", "tr"]):
        means = [cost_df_long[(cost_df_long.model == m) & (cost_df_long.variant == v)]["mean_cost"].iloc[0]
                 for m in models]
        ax3.bar(x + (i - 0.5) * width, means, width, label="English" if v == "en" else "Turkish")

    ax3.set_xticks(x)
    ax3.set_xticklabels(models, rotation=15)
    ax3.set_ylabel("Mean cost per sentence")
    ax3.set_title("Mean cost per sentence: English vs Turkish")
    ax3.legend()
    fig3.tight_layout()
    fig3_path = FIGURES_DIR / "fig3_cost_per_sentence_en_vs_tr.png"
    fig3.savefig(fig3_path, dpi=300)
    plt.close(fig3)

    # Figure 4: histogram of per-sentence Δ tokens/char (TR − EN) for model_ref
    en_ref = df[(df.model == model_ref) & (df.variant == "en")].set_index("id")
    tr_ref = df[(df.model == model_ref) & (df.variant == "tr")].set_index("id")
    ids = sorted(set(en_ref.index) & set(tr_ref.index))
    diffs_tpc = np.array([tr_ref.loc[i, "tokens_per_char"] - en_ref.loc[i, "tokens_per_char"] for i in ids])

    fig4, ax4 = plt.subplots()
    ax4.hist(diffs_tpc, bins=15)
    ax4.set_xlabel("Δ tokens per character (TR − EN)")
    ax4.set_ylabel("Number of sentences")
    ax4.set_title(f"Distribution of per-sentence Δ tokens/char for {model_ref}")
    fig4.tight_layout()
    fig4_path = FIGURES_DIR / "fig4_hist_delta_tokens_per_char_tr_minus_en_gpt5_1.png"
    fig4.savefig(fig4_path, dpi=300)
    plt.close(fig4)

    return {
        "fig1": fig1_path,
        "fig2": fig2_path,
        "fig3": fig3_path,
        "fig4": fig4_path,
    }


# --------- Main entry point ---------

def main():
    if len(sys.argv) > 1:
        csv_path = Path(sys.argv[1])
    else:
        csv_path = DEFAULT_CSV_PATH

    if not csv_path.exists():
        print(f"[ERROR] CSV file not found: {csv_path}")
        print("Pass a CSV path as an argument or adjust DEFAULT_CSV_PATH in the script.")
        sys.exit(1)

    print(f"[INFO] Loading data from: {csv_path}")
    df = load_and_clean(csv_path)

    print("[INFO] Computing linear model summaries...")
    summ_df = compute_summaries(df)

    print("[INFO] Computing paired EN vs TR stats...")
    paired_en_tr_df = compute_paired_en_tr(df)

    print("[INFO] Computing paired TR_NODIA vs TR stats...")
    paired_tr_df = compute_paired_tr_nodia(df)

    print("[INFO] Computing cost stats...")
    cost_df = compute_cost_stats(df)

    print("[INFO] Generating figures...")
    fig_paths = generate_figures(df)

    # ---- Print textual summary ----
    pd.set_option("display.width", 120)
    pd.set_option("display.max_columns", 20)

    print("\n=== Linear model summary: prompt_tokens ≈ a + b * chars ===")
    print(summ_df.round(4))

    print("\n=== Paired EN vs TR (TR − EN) ===")
    print(paired_en_tr_df.round(4))

    print("\n=== Paired TR_NODIA vs TR (TR_NODIA − TR) ===")
    print(paired_tr_df.round(4))

    print("\n=== Cost stats (mean cost per sentence, TR / EN ratio) ===")
    print(cost_df.round(6))

    print("\n=== Figures saved ===")
    for name, path in fig_paths.items():
        print(f"{name}: {path}")


if __name__ == "__main__":
    main()
