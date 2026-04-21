import os, re

files = sorted(os.listdir('design_mocks'))
svgs  = [f for f in files if f.endswith('.svg')]
htmls = [f for f in files if f.endswith('.html')]

items = []
for f in svgs:
    label = re.sub(r'^\d+_', '', f[:-4]).replace('_', ' ').title()
    num   = re.match(r'^(\d+)', f).group(1)
    items.append(f'    <li><a href="{f}">{num}. {label}</a></li>')
for f in htmls:
    label = f[:-5].replace('_', ' ').title()
    items.append(f'    <li><a href="{f}" target="_blank">{label} (HTML mockup)</a></li>')

html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VoidYield — Design Mocks</title>
  <style>
    body {{ font-family: monospace; background: #0D1B3E; color: #D4A843;
           max-width: 760px; margin: 40px auto; padding: 0 20px; }}
    h1   {{ color: #00B8D4; margin-bottom: 0.25em; }}
    p    {{ margin-top: 0; color: #aaa; font-size: 0.85em; }}
    ul   {{ line-height: 2; padding-left: 1.2em; }}
    a    {{ color: #D4A843; text-decoration: none; }}
    a:hover {{ color: #00B8D4; text-decoration: underline; }}
  </style>
</head>
<body>
  <h1>VoidYield — Design Mocks</h1>
  <p>{count} files &mdash; SVGs open inline; HTML mockup opens in a new tab</p>
  <ul>
{items}
  </ul>
</body>
</html>""".format(count=len(svgs) + len(htmls), items='\n'.join(items))

with open('dist/mocks/index.html', 'w') as fh:
    fh.write(html)
print(f"Generated dist/mocks/index.html ({len(svgs)} SVGs, {len(htmls)} HTML)")
