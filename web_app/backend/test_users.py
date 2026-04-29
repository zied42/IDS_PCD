import requests

API = 'http://localhost:5000'
r = requests.post(f'{API}/api/auth/login', json={'username':'admin','password':'admin123'})
token = r.json()['token']
h = {'Authorization': f'Bearer {token}'}

# List users
r = requests.get(f'{API}/api/auth/users', headers=h)
print('Users:', r.status_code)
for u in r.json():
    uid = u.get('id','')
    un = u.get('username','')
    rl = u.get('role','')
    em = u.get('email','')
    fn = u.get('full_name','')
    print(f'  {uid} | {un} | {rl} | {em} | {fn}')

# Create test user
r = requests.post(f'{API}/api/auth/register', json={
    'username':'testanalyst', 'password':'test1234',
    'role':'analyst', 'email':'test@company.com', 'full_name':'Test Analyst'
}, headers=h)
print(f'Create user: {r.status_code}', r.json().get('message',''))
new_id = r.json().get('user',{}).get('id')

# Delete test user
if new_id:
    r = requests.delete(f'{API}/api/auth/users/{new_id}', headers=h)
    print(f'Delete user: {r.status_code}', r.json().get('message',''))

print('Done')
