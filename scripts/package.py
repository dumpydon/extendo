"""Build and verify the unpacked-extension ZIP. Run from any working directory."""
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
files = [ROOT / name for name in ('manifest.json', 'README.md', 'PRIVACY_POLICY.md')]
for folder in ('content', 'popup', 'icons', 'store_assets'):
    files.extend(path for path in (ROOT / folder).rglob('*')
                 if path.is_file() and not any(part.startswith('.') for part in path.relative_to(ROOT).parts))
files = sorted(files)
archive = ROOT / 'extendo.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for path in files:
        # Stable metadata keeps an unchanged source tree's ZIP byte-for-byte identical.
        entry = zipfile.ZipInfo(path.relative_to(ROOT).as_posix(), (2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        bundle.writestr(entry, path.read_bytes())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None, 'Corrupt archive entry'
    for path in files:
        assert bundle.read(path.relative_to(ROOT).as_posix()) == path.read_bytes(), path
    manifest = json.loads(bundle.read('manifest.json'))
    required = [manifest['action']['default_popup'], *manifest['icons'].values()]
    for script in manifest['content_scripts']:
        required.extend(script.get('js', []) + script.get('css', []))
    for name in required:
        assert name in bundle.namelist(), f'Missing extension resource: {name}'
print(f"Verified {archive.name}: v{manifest['version']}, {len(files)} files")
