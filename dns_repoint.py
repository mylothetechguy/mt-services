import json, urllib.request
TOKEN="nfp_WFfhSWm31zBszfb8223QTnx7QMPRLe8Y7280"
ZONE="6a376763b39ccb4c371a55ae"
BASE="https://api.netlify.com/api/v1/dns_zones/%s/dns_records" % ZONE
GH_IPS=["185.199.108.153","185.199.109.153","185.199.110.153","185.199.111.153"]

def api(method, url, data=None):
    req=urllib.request.Request(url, method=method,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json","User-Agent":"curl/8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            b=r.read().decode()
            return r.status, (json.loads(b) if b.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]

# 1) list current records
st, recs = api("GET", BASE)
print("current records:", len(recs))
# 2) delete the NETLIFY/NETLIFYv6 records for apex + www (leave MX/TXT/DKIM alone)
to_del=[r for r in recs if r["type"] in ("NETLIFY","NETLIFYv6") and r["hostname"] in ("mtservicesusa.com","www.mtservicesusa.com")]
for r in to_del:
    code,_=api("DELETE", BASE+"/"+r["id"])
    print("deleted %-10s %-26s -> %s [%s]" % (r["type"], r["hostname"], r["value"], code))
# 3) create GitHub Pages A records for apex
for ip in GH_IPS:
    code,res=api("POST", BASE, {"type":"A","hostname":"mtservicesusa.com","value":ip,"ttl":3600})
    print("created A    mtservicesusa.com -> %s [%s]" % (ip, code))
# 4) www CNAME -> github pages
code,res=api("POST", BASE, {"type":"CNAME","hostname":"www.mtservicesusa.com","value":"mylothetechguy.github.io","ttl":3600})
print("created CNAME www -> mylothetechguy.github.io [%s]" % code)
# 5) show final relevant records
st, recs = api("GET", BASE)
print("\n--- final records (apex/www/email) ---")
for r in sorted(recs, key=lambda x:x["hostname"]):
    print("%-8s %-34s -> %s" % (r["type"], r["hostname"], r["value"]))
