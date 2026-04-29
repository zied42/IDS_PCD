import requests, os

API = 'http://localhost:5000'
r = requests.post(f'{API}/api/auth/login', json={'username':'admin','password':'admin123'})
token = r.json()['token']

# Download Last 24h PDF
r = requests.get(f'{API}/api/export/report', params={'mode':'last24h','format':'pdf','token':token})
print(f'Status: {r.status_code}')
print(f'Size: {len(r.content)} bytes')
print(f'Type: {r.headers.get("content-type","")}')

if r.status_code == 200 and len(r.content) > 100:
    out = os.path.join(os.path.dirname(__file__), 'test_report.pdf')
    with open(out, 'wb') as f:
        f.write(r.content)
    print(f'Saved to: {out}')
else:
    print(f'Error: {r.text[:200]}')
