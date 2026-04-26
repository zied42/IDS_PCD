import requests
import json
import time

BASE_URL = 'http://localhost:5000/api'

# 1. Login to get token
resp = requests.post(f'{BASE_URL}/auth/login', json={'username': 'admin', 'password': 'admin123'})
token = resp.json().get('token')
headers = {'Authorization': f'Bearer {token}'}
print('Logged in as admin.')

# 2. Test Settings (PUT /settings)
print('\nTesting Settings PUT...')
resp = requests.put(f'{BASE_URL}/settings', headers=headers, json={
    'theme': 'light', 'language': 'fr', 'notifications': False, 'auto_block_enabled': True, 'auto_block_threshold': 85
})
print(resp.status_code, resp.json())

# 3. Test Settings (GET /settings)
print('\nTesting Settings GET...')
resp = requests.get(f'{BASE_URL}/settings', headers=headers)
print(resp.status_code, resp.json())

# 4. Test Auto-block via Prediction
print('\nTesting Single Prediction (should Auto-block)...')
# We need an Attack. 
features = {
  "src_ip": "9.9.9.9",
  "dst_ip": "10.0.0.5",
  "Dst Port": 443, "Protocol": 6, "Flow Duration": 1500000,
  "Tot Bwd Pkts": 10, "TotLen Fwd Pkts": 5000, "Fwd Pkt Len Max": 1500,
  "Fwd Pkt Len Mean": 500, "Bwd Pkt Len Mean": 300, "Flow Byts/s": 1200.5,
  "Flow Pkts/s": 10.0, "Flow IAT Std": 500, "Flow IAT Max": 1000,
  "Fwd IAT Mean": 200, "Fwd IAT Std": 100, "Bwd IAT Tot": 5000,
  "Bwd IAT Mean": 500, "Bwd IAT Std": 200, "Bwd IAT Max": 1000,
  "Bwd IAT Min": 100, "Fwd Pkts/s": 5.0, "Bwd Pkts/s": 5.0,
  "Pkt Len Max": 1500, "Pkt Len Var": 50000, "RST Flag Cnt": 0,
  "PSH Flag Cnt": 1, "ACK Flag Cnt": 1, "URG Flag Cnt": 0,
  "Down/Up Ratio": 1.0, "Pkt Size Avg": 400, "Init Fwd Win Byts": 65535,
  "Init Bwd Win Byts": 65535, "Fwd Act Data Pkts": 5, "Fwd Seg Size Min": 20,
  "Idle Max": 0
}
resp = requests.post(f'{BASE_URL}/predict', headers=headers, json=features)
print('Prediction result:', resp.status_code, resp.json())

# 5. Check blocked IPs
print('\nChecking Blocked IPs...')
resp = requests.get(f'{BASE_URL}/blocked-ips', headers=headers)
print(resp.status_code, resp.json())

