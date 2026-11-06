"""Select installers only, verify build hashes, and give each platform a unique name."""
import hashlib
from pathlib import Path
import shutil
import sys

PACKAGES = {
    'windows-x64': ['nsis/*.exe'],
    'linux-x64': ['deb/*.deb', 'appimage/*.AppImage'],
    'macos-arm64': ['dmg/*.dmg'],
    'macos-x64': ['dmg/*.dmg'],
    'chrome': ['gosu-speech-to-text-chrome.zip'],
}


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def assemble(source, destination):
    selected = []
    expected = {'gosu-speech-to-text-' + platform for platform in PACKAGES}
    if {p.name for p in source.iterdir()} != expected:
        raise ValueError('Artifacts are missing or unexpected artifacts are present.')
    for platform, patterns in PACKAGES.items():
        folder = source / ('gosu-speech-to-text-' + platform)
        hashes = {}
        if platform != 'chrome':
            for line in (folder / 'SHA256SUMS.txt').read_text().splitlines():
                checksum, name = line.split('  ', 1)
                hashes[name] = checksum
        for pattern in patterns:
            matches = list(folder.glob(pattern))
            if len(matches) != 1 or matches[0].is_symlink() or not matches[0].is_file():
                raise ValueError(f'Expected exactly one package: {platform}/{pattern}')
            package = matches[0]
            checksum = digest(package)
            if platform != 'chrome' and hashes.get(package.relative_to(folder).as_posix()) != checksum:
                raise ValueError(f'Checksum mismatch: {platform}/{package.name}')
            selected.append((package, platform + '-' + package.name, checksum))
    # Validate everything before copying; never merge with a previous release.
    destination.mkdir(exist_ok=False)
    for package, name, _ in selected:
        shutil.copyfile(package, destination / name)
    (destination / 'SHA256SUMS.txt').write_text(
        ''.join(f'{checksum}  {name}\n' for _, name, checksum in selected), encoding='utf8')


if __name__ == '__main__':
    assemble(Path(sys.argv[1]), Path(sys.argv[2]))
