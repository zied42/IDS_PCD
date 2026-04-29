import requests

API = 'http://localhost:5000'
r = requests.post(f'{API}/api/auth/login', json={'username':'admin','password':'admin123'})
token = r.json()['token']

# Test 1: Last 24h CSV via query token
r = requests.get(f'{API}/api/export/report', params={'mode':'last24h','format':'csv','token':token})
print(f'Last 24h CSV: {r.status_code} | size={len(r.content)} bytes | type={r.headers.get("content-type","")}')

# Test 2: Last 24h PDF via query token
r = requests.get(f'{API}/api/export/report', params={'mode':'last24h','format':'pdf','token':token})
print(f'Last 24h PDF: {r.status_code} | size={len(r.content)} bytes | type={r.headers.get("content-type","")}')

# Test 3: Via Authorization header (existing method)
h = {'Authorization': f'Bearer {token}'}
r = requests.get(f'{API}/api/export/report', params={'mode':'last24h','format':'csv'}, headers=h)
print(f'Header auth:  {r.status_code} | size={len(r.content)} bytes')

# Test 4: No auth should fail
r = requests.get(f'{API}/api/export/report', params={'mode':'last24h','format':'csv'})
print(f'No auth:      {r.status_code} (expected 401)')

print('Done')
