import csv
import sys
import json
from star import Star

f = open(sys.argv[1], "rt")
outfile = open('stars.js', 'w')
reader = csv.DictReader(f)
stars = []

for row in reader:
    star = Star(row)
    stars.append(star)
    json.dump(star.__dict__, outfile)


f.close()
outfile.close()
