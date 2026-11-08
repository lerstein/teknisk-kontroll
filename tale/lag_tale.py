"""Reads tale/manus.json and writes one MP3 per scene to tale/lyd/ (Microsoft Edge neural voice; gTTS as fallback)."""
import asyncio, json, os, subprocess
m = json.load(open('tale/manus.json', encoding='utf-8'))
os.makedirs('tale/lyd', exist_ok=True)
logg = []
async def edge(tekst, fil):
    import edge_tts
    await edge_tts.Communicate(tekst, m['stemme'], rate=m.get('tempo', '+0%')).save(fil)
for s in m['scener']:
    fil = f"tale/lyd/{s['id']}.mp3"
    try:
        asyncio.run(edge(s['tekst'], fil)); motor = 'edge:' + m['stemme']
    except Exception as e:
        from gtts import gTTS
        gTTS(s['tekst'], lang='no').save(fil); motor = 'gtts (' + str(e)[:80] + ')'
    logg.append(f"{s['id']}\t{motor}")
open('tale/lyd/status.txt', 'w').write('\n'.join(logg) + '\n')
print('\n'.join(logg))
