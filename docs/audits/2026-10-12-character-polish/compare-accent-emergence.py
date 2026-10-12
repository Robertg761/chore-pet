"""Read captured PNGs and report exact pixel changes; never edit either image."""
from pathlib import Path
import hashlib
import json
from PIL import Image

folder = Path(__file__).parent
before = json.loads((folder / 'accent-emergence-before.json').read_text())
after = json.loads((folder / 'accent-emergence-after.json').read_text())
assert before['samples'] == after['samples'], 'Sampler frames must remain exact'
for source in ['src/character/motion.ts', 'src/character/species/animatedBody.tsx', 'src/character/parts.tsx']:
    assert before['sourceSha256'][source] == after['sourceSha256'][source], source

old = Image.open(folder / 'accent-emergence-before-sizes.png').convert('RGBA')
new = Image.open(folder / 'accent-emergence-after-sizes.png').convert('RGBA')
assert old.size == new.size == (1320, 2070)
counts = [0] * len(before['samples'])
total = 0
old_pixels, new_pixels = old.tobytes(), new.tobytes()
for offset in range(0, len(old_pixels), 4):
    if old_pixels[offset:offset + 4] == new_pixels[offset:offset + 4]:
        continue
    index = offset // 4
    x, y = index % old.width, index // old.width
    cell = x // 330 + y // 230 * 4
    sample = before['samples'][cell]
    assert sample['phase'] != .5, f'Peak geometry changed in cell {cell}'
    local_x, local_y = x % 330 + .5, y % 230 + .5
    permitted = False
    for size, view_x in [(200, 0), (60, 205), (25, 280)]:
        scale = size / 200
        view_y = 100 - size / 2
        for centre_x, centre_y in [(24, 66), (176, 54)]:
            if sample['facing'] == -1:
                centre_x = 200 - centre_x
            if (abs(local_x - view_x - centre_x * scale) <= 14 * scale + 1.5
                    and abs(local_y - view_y - centre_y * scale) <= 18 * scale + 1.5):
                permitted = True
    assert permitted, f'Unexpected pixel change outside accent regions: {x},{y}'
    counts[cell] += 1
    total += 1

assert total > 0
for sample, count in zip(before['samples'], counts):
    assert (count == 0) == (sample['phase'] == .5), sample
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
result = {
    'method': 'Exact RGBA comparison of two 1320x2070 sheets. All changes must stay in conservative per-mark regions at each size and mirror. Peak cells are bitwise identical; all sampler frames match. This is static evidence, not human temporal acceptance.',
    'unchangedSamplerFrames': len(before['samples']),
    'unchangedPeakCells': counts.count(0),
    'changedNonpeakCells': len(counts) - counts.count(0),
    'changedPixels': total,
    'cellChangedPixels': counts,
    'artifactSha256': {str(file): sha(file) for file in [
        folder / 'accent-emergence-before-sizes.png', folder / 'accent-emergence-after-sizes.png',
        folder / 'accent-emergence-before.json', folder / 'accent-emergence-after.json', Path(__file__)]},
}
(folder / 'accent-emergence-differential.json').write_text(json.dumps(result, indent=2) + '\n')
print(f"Compared36frames/108views:12peak cells exact,24nonpeak cells changed only near marks;{total}changed pixels")
