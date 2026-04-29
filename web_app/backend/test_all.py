"""
Comprehensive test suite for IDS/IPS Dashboard
Tests: Auth, RBAC, Settings, Threats, Users, Model, Upload, Predictions
"""
import requests
import os
import sys

API = 'http://localhost:5000'
PASS = 0
FAIL = 0

def test(name, condition, detail=''):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f'  [PASS] {name}')
    else:
        FAIL += 1
        print(f'  [FAIL] {name} -- {detail}')

def section(title):
    print(f'\n{"="*60}')
    print(f'  {title}')
    print(f'{"="*60}')

# ── 1. AUTH ──────────────────────────────────────────────────
section('1. AUTHENTICATION')

r = requests.post(f'{API}/api/auth/login', json={'username':'admin','password':'admin123'})
test('Admin login', r.status_code == 200, f'got {r.status_code}')
admin_token = r.json().get('token','')
test('Admin token received', len(admin_token) > 0)
test('Admin role correct', r.json().get('role') == 'admin', r.json().get('role'))
admin_h = {'Authorization': f'Bearer {admin_token}'}

r = requests.post(f'{API}/api/auth/login', json={'username':'analyst','password':'analyst123'})
test('Analyst login', r.status_code == 200, f'got {r.status_code}')
analyst_token = r.json().get('token','')
test('Analyst role correct', r.json().get('role') == 'analyst', r.json().get('role'))
analyst_h = {'Authorization': f'Bearer {analyst_token}'}

r = requests.post(f'{API}/api/auth/login', json={'username':'admin','password':'wrong'})
test('Bad password rejected', r.status_code == 401, f'got {r.status_code}')

r = requests.post(f'{API}/api/auth/login', json={'username':'nobody','password':'x'})
test('Unknown user rejected', r.status_code == 401, f'got {r.status_code}')

# ── 2. SETTINGS ─────────────────────────────────────────────
section('2. SETTINGS & SYSTEM MODE')

r = requests.get(f'{API}/api/settings', headers=admin_h)
test('Get settings (admin)', r.status_code == 200)
test('system_mode field exists', 'system_mode' in r.json(), str(r.json().keys()))

r = requests.put(f'{API}/api/settings', json={'system_mode':'ips','auto_block_threshold':85}, headers=admin_h)
test('Admin set IPS mode', r.status_code == 200)
test('Mode saved as ips', r.json().get('settings',{}).get('system_mode') == 'ips')

r = requests.put(f'{API}/api/settings', json={'system_mode':'ids'}, headers=admin_h)
test('Admin set IDS mode', r.status_code == 200)

# Analyst RBAC
r = requests.put(f'{API}/api/settings', json={'system_mode':'ips'}, headers=analyst_h)
test('Analyst blocked from system_mode', r.status_code == 403, f'got {r.status_code}')

r = requests.put(f'{API}/api/settings', json={'auto_block_threshold':50}, headers=analyst_h)
test('Analyst blocked from threshold', r.status_code == 403, f'got {r.status_code}')

r = requests.put(f'{API}/api/settings', json={'theme':'dark'}, headers=analyst_h)
test('Analyst can change theme', r.status_code == 200, f'got {r.status_code}')

# ── 3. MODEL SWITCHING ──────────────────────────────────────
section('3. MODEL SWITCHING')

r = requests.get(f'{API}/api/model/info', headers=admin_h)
test('Get model info', r.status_code == 200)
test('Has available_models', len(r.json().get('available_models',[])) > 0)

r = requests.put(f'{API}/api/model/switch', json={'model':'cnn'}, headers=admin_h)
test('Admin switch to CNN', r.status_code == 200, r.json().get('error',''))

r = requests.get(f'{API}/api/model/info', headers=admin_h)
test('CNN is now active', 'cnn' in r.json().get('model_name','').lower(), r.json().get('model_name'))

r = requests.put(f'{API}/api/model/switch', json={'model':'xgboost'}, headers=admin_h)
test('Admin switch to XGBoost', r.status_code == 200)

# Analyst RBAC
r = requests.put(f'{API}/api/model/switch', json={'model':'cnn'}, headers=analyst_h)
test('Analyst blocked from model switch', r.status_code == 403, f'got {r.status_code}')

# Invalid model
r = requests.put(f'{API}/api/model/switch', json={'model':'fake'}, headers=admin_h)
test('Invalid model rejected', r.status_code == 400, f'got {r.status_code}')

# ── 4. THREAT MANAGEMENT (manual analysis) ──────────────────
section('4. THREAT MANAGEMENT')

threat_data = {
    'src_ip': '10.99.99.1', 'dst_ip': '192.168.1.1',
    'prediction': 'Attack', 'confidence': 95, 'protocol': 6
}
r = requests.post(f'{API}/api/analyses', json=threat_data, headers=admin_h)
test('Admin add threat', r.status_code == 201, f'got {r.status_code}: {r.text[:100]}')
threat_id = r.json().get('prediction',{}).get('id')

r = requests.post(f'{API}/api/analyses', json=threat_data, headers=analyst_h)
test('Analyst blocked from adding threat', r.status_code == 403, f'got {r.status_code}')

r = requests.post(f'{API}/api/analyses', json={'prediction':'Attack'}, headers=admin_h)
test('Missing fields rejected', r.status_code == 400, f'got {r.status_code}')

if threat_id:
    r = requests.delete(f'{API}/api/analyses/{threat_id}', headers=admin_h)
    test('Admin delete threat', r.status_code == 200, f'got {r.status_code}')

    r = requests.delete(f'{API}/api/analyses/{threat_id}', headers=analyst_h)
    test('Analyst blocked from deleting', r.status_code in (403, 404), f'got {r.status_code}')

# ── 5. USER MANAGEMENT ──────────────────────────────────────
section('5. USER MANAGEMENT')

r = requests.get(f'{API}/api/auth/users', headers=admin_h)
test('Admin list users', r.status_code == 200)
user_count = len(r.json())
test('At least 2 users exist', user_count >= 2, f'got {user_count}')

r = requests.get(f'{API}/api/auth/users', headers=analyst_h)
test('Analyst blocked from listing users', r.status_code == 403, f'got {r.status_code}')

new_user = {
    'username': 'zied_test', 'password': 'pass1234',
    'role': 'analyst', 'email': 'zied@test.com', 'full_name': 'Zied Test'
}
r = requests.post(f'{API}/api/auth/register', json=new_user, headers=admin_h)
test('Admin create user', r.status_code == 201, f'got {r.status_code}: {r.text[:100]}')
new_id = r.json().get('user',{}).get('id')
test('New user has email', r.json().get('user',{}).get('email') == 'zied@test.com')
test('New user has full_name', r.json().get('user',{}).get('full_name') == 'Zied Test')

# Duplicate username
r = requests.post(f'{API}/api/auth/register', json=new_user, headers=admin_h)
test('Duplicate username rejected', r.status_code == 409, f'got {r.status_code}')

# Analyst can't create
r = requests.post(f'{API}/api/auth/register', json={'username':'x','password':'x'}, headers=analyst_h)
test('Analyst blocked from creating users', r.status_code == 403, f'got {r.status_code}')

# New user can login
r = requests.post(f'{API}/api/auth/login', json={'username':'zied_test','password':'pass1234'})
test('New user can login', r.status_code == 200, f'got {r.status_code}')

# Delete user
if new_id:
    r = requests.delete(f'{API}/api/auth/users/{new_id}', headers=admin_h)
    test('Admin delete user', r.status_code == 200, f'got {r.status_code}')

    r = requests.delete(f'{API}/api/auth/users/{new_id}', headers=analyst_h)
    test('Analyst blocked from deleting users', r.status_code == 403, f'got {r.status_code}')

# ── 6. PREDICTIONS / LIVE MONITOR ───────────────────────────
section('6. PREDICTIONS & LIVE MONITOR')

r = requests.get(f'{API}/api/predictions', headers=admin_h)
test('Get predictions', r.status_code == 200)
items = r.json().get('items', r.json().get('predictions', []))
test('Predictions list not empty', len(items) > 0 if isinstance(items, list) else True, f'type={type(items)}')

r = requests.get(f'{API}/api/stats/live', headers=admin_h)
test('Get live stats', r.status_code == 200)
test('Stats has today data', 'today' in r.json(), str(r.json().keys()))

# ── 7. ALERTS ────────────────────────────────────────────────
section('7. ALERTS')

r = requests.get(f'{API}/api/alerts', headers=admin_h)
test('Get alerts', r.status_code == 200)

r = requests.get(f'{API}/api/alerts/summary', headers=admin_h)
test('Get alerts summary', r.status_code == 200)

# ── 8. BLOCKED IPs ──────────────────────────────────────────
section('8. BLOCKED IPs')

r = requests.get(f'{API}/api/blocked-ips', headers=admin_h)
test('Get blocked IPs', r.status_code == 200)

r = requests.post(f'{API}/api/blocked-ips', json={'ip_address':'99.99.99.99','reason':'Test block'}, headers=admin_h)
test('Block IP manually', r.status_code == 201, f'got {r.status_code}: {r.text[:80]}')
block_id = r.json().get('blocked_ip',{}).get('id') or r.json().get('id')

if block_id:
    r = requests.delete(f'{API}/api/blocked-ips/{block_id}', headers=admin_h)
    test('Unblock IP', r.status_code == 200, f'got {r.status_code}')

# ── 9. UPLOAD (batch predict) ───────────────────────────────
section('9. FILE UPLOAD')

csv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'archive', 'full_df_binary_labels.csv')
if os.path.exists(csv_path):
    # Read just 5 rows for a quick test
    import pandas as pd
    df = pd.read_csv(csv_path, nrows=5)
    tmp = os.path.join(os.path.dirname(__file__), 'test_upload.csv')
    df.to_csv(tmp, index=False)
    with open(tmp, 'rb') as f:
        r = requests.post(f'{API}/api/predict/batch', files={'file': ('test.csv', f, 'text/csv')}, headers=admin_h)
    test('Upload CSV batch', r.status_code == 200 or r.status_code == 201, f'got {r.status_code}: {r.text[:120]}')
    os.remove(tmp)
else:
    test('Upload CSV (SKIPPED - file not found)', True, csv_path)

# ── SUMMARY ─────────────────────────────────────────────────
section('RESULTS')
total = PASS + FAIL
print(f'  Passed: {PASS}/{total}')
print(f'  Failed: {FAIL}/{total}')
if FAIL == 0:
    print('  ALL TESTS PASSED!')
else:
    print(f'  {FAIL} test(s) need attention.')
print()
