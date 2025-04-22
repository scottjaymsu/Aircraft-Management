d = dict()
d['status'] = "CANCELLED"


s = d.get('status')

d = dict()
s = d.get('status') 

if s == '':
    print("Status is not None")