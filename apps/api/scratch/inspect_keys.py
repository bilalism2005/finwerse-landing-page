import json

with open("scratch/infy_stock.json", "r") as f:
    data = json.load(f)

print("Root keys:")
for key in data.keys():
    val_type = type(data[key])
    if isinstance(data[key], dict):
        print(f"  {key} (dict): keys = {list(data[key].keys())}")
    elif isinstance(data[key], list):
        print(f"  {key} (list): length = {len(data[key])}, first item type = {type(data[key][0]) if len(data[key]) > 0 else 'None'}")
    else:
        print(f"  {key} ({val_type.__name__})")
