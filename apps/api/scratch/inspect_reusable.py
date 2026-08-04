import json

with open("scratch/infy_stock.json", "r") as f:
    data = json.load(f)

reusable = data.get("stockDetailsReusableData", {})

output_lines = ["=== stockDetailsReusableData ==="]
for k, v in reusable.items():
    output_lines.append(f"{k}: {v}")

with open("scratch/reusable_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print("Keys inside stockDetailsReusableData:")
print(list(reusable.keys()))
