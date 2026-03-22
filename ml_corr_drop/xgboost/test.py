import pickle

print('=== MODEL ===')
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)
print(type(model))

print('=== SCALERS ===')
with open('scalers.pkl', 'rb') as f:
    scalers = pickle.load(f)
print(type(scalers))
print(scalers.keys() if isinstance(scalers, dict) else scalers)

print('=== METADATA ===')
with open('metadata.pkl', 'rb') as f:
    meta = pickle.load(f)
print(meta)
