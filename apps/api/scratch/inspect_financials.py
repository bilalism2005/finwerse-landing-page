import json

with open("scratch/infy_stock.json", "r") as f:
    data = json.load(f)

print("=== stockDetailsReusableData ===")
print(json.dumps(data["stockDetailsReusableData"], indent=2))

print("\n=== keyMetrics keys ===")
for subkey in data["keyMetrics"].keys():
    print(f"\nSubkey: {subkey}")
    print(json.dumps(data["keyMetrics"][subkey], indent=2)[:1000]) # Print first 1000 chars of each
