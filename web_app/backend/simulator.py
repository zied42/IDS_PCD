"""
Simulates real-time network traffic by feeding test CSV rows
to the Flask API one by one with a small delay.

Run from web_app/backend/:
    python simulator.py

Make sure Flask is running first:
    python app.py
"""
import sys
import os
import time
import random
import requests
import pandas as pd

# Fix Windows console encoding for emoji output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ── Config ────────────────────────────────────────────────────────────────────
API_URL    = 'http://localhost:5000'
CSV_PATH   = r'C:\Users\hechem\Desktop\pcd\archive\full_df_binary_labels.csv'
DELAY      = 0.3    # seconds between each row (lower = faster)
N_ROWS     = 500    # how many rows to simulate (None = full dataset)
USERNAME   = 'admin'
PASSWORD   = 'admin123'

# ── 23 features dropped by correlation analysis ───────────────────────────────
CORRELATION_DROP = [
    'Subflow Fwd Pkts', 'Fwd Seg Size Avg', 'Bwd Seg Size Avg',
    'Subflow Fwd Byts', 'Subflow Bwd Pkts', 'TotLen Bwd Pkts',
    'ECE Flag Cnt', 'Tot Fwd Pkts', 'Bwd Header Len', 'Idle Min',
    'Fwd IAT Tot', 'Idle Mean', 'Subflow Bwd Byts', 'Pkt Len Mean',
    'Flow IAT Min', 'Fwd Header Len', 'Fwd IAT Max', 'Flow IAT Mean',
    'Fwd IAT Min', 'Bwd Pkt Len Std', 'Pkt Len Std', 'Fwd Pkt Len Std',
    'Bwd Pkt Len Max'
]

# ── Fake IP pools for display ─────────────────────────────────────────────────
INTERNAL_IPS = [f'192.168.1.{i}' for i in range(1, 50)]
EXTERNAL_IPS = [f'10.0.0.{i}'    for i in range(1, 50)] + \
               [f'172.16.0.{i}'  for i in range(1, 20)]


def login() -> str:
    """Login and return JWT token."""
    print(f"🔐 Logging in as {USERNAME}...")
    resp = requests.post(
        f'{API_URL}/api/auth/login',
        json={'username': USERNAME, 'password': PASSWORD}
    )
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.text}")
        sys.exit(1)
    token = resp.json()['token']
    print(f"✅ Logged in — token received\n")
    return token


def load_data() -> pd.DataFrame:
    """Load CSV, apply correlation drop, sample balanced attacks/benign."""
    print(f"📂 Loading data from: {CSV_PATH}")

    # Load full dataset to get both classes
    df = pd.read_csv(CSV_PATH)

    # Sample balanced: 50% attacks, 50% benign
    half     = N_ROWS // 2
    benign   = df[df['Label_Binary'] == 0].sample(n=half,      random_state=42)
    attacks  = df[df['Label_Binary'] == 1].sample(n=N_ROWS - half, random_state=42)

    df = pd.concat([benign, attacks]).sample(frac=1, random_state=42).reset_index(drop=True)

    print(f"   🟢 Benign  : {len(benign):,}")
    print(f"   🔴 Attacks : {len(attacks):,}")

    # Drop correlated features
    cols_to_drop = [c for c in CORRELATION_DROP if c in df.columns]
    df = df.drop(columns=cols_to_drop)

    # Drop label columns
    df = df.drop(columns=['Label', 'Label_Binary'], errors='ignore')

    print(f"✅ Loaded {len(df):,} rows | {df.shape[1]} features after correlation drop\n")
    return df


def simulate(df: pd.DataFrame, token: str):
    """Feed rows one by one to the predict endpoint."""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type':  'application/json'
    }

    attacks = 0
    benign  = 0
    errors  = 0

    print("=" * 60)
    print(f"🚀 Starting simulation — {len(df):,} rows at {DELAY}s delay")
    print("=" * 60)

    for i, (_, row) in enumerate(df.iterrows(), 1):
        # Build payload — features + fake IPs for display
        payload = row.to_dict()
        payload['src_ip'] = random.choice(INTERNAL_IPS)
        payload['dst_ip'] = random.choice(EXTERNAL_IPS)

        try:
            resp = requests.post(
                f'{API_URL}/api/predict',
                json=payload,
                headers=headers,
                timeout=10
            )

            if resp.status_code == 200:
                result = resp.json()
                pred   = result['prediction']
                conf   = result['confidence_pct']
                review = '⚠️ ' if result['needs_review'] else ''

                if pred == 'Attack':
                    attacks += 1
                    icon = '🔴'
                else:
                    benign += 1
                    icon = '🟢'

                print(f"[{i:>4}] {icon} {pred:<7} {conf:>6.2f}%  {review}"
                      f"  {payload['src_ip']} → {payload['dst_ip']}")
            else:
                errors += 1
                print(f"[{i:>4}] ❌ Error {resp.status_code}: {resp.text[:80]}")

        except requests.exceptions.ConnectionError:
            print("\n❌ Cannot connect to Flask! Make sure app.py is running.")
            sys.exit(1)
        except Exception as e:
            errors += 1
            print(f"[{i:>4}] ❌ {str(e)}")

        time.sleep(DELAY)

    # Summary
    total = attacks + benign
    print("\n" + "=" * 60)
    print("📊 SIMULATION COMPLETE")
    print("=" * 60)
    print(f"  Total sent : {total:,}")
    print(f"  🟢 Benign  : {benign:,}  ({benign/total*100:.1f}%)")
    print(f"  🔴 Attacks : {attacks:,}  ({attacks/total*100:.1f}%)")
    print(f"  ❌ Errors  : {errors:,}")
    print(f"\n  Check your dashboard at http://localhost:5000/api/predictions")


if __name__ == '__main__':
    token = login()
    df    = load_data()
    simulate(df, token)