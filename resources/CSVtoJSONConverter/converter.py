import csv
import sys
import json
from star import Star

f = open(sys.argv[1], "rt")
outfile = open('stars.js', 'w')
reader = csv.DictReader(f)
stars = []
print("Processing rows")
i = 0
for row in reader:
    print("Processing row "+str(i))
    star = Star(row)
    stars.append(star)
    json.dump(star.__dict__, outfile)
    i = i+1
    # if i==10000:
    #     break

print("Finished")

f.close()
outfile.close()
