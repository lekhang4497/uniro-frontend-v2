# Icons

Placeholders sourced from `images/uniro.png` (2940x2594 RGBA).

For production replace with:

- `mac.icns` — 1024x1024 source rendered to icns (use `png2icns` or
  `iconutil` on macOS). electron-builder will fall back to `mac.png`
  if `.icns` is absent, but the OS picks a low-res scale.
- `win.ico` — 256x256 multi-resolution `.ico` (use `magick convert
  uniro.png win.ico` from ImageMagick).
- `linux.png` — 512x512 PNG (current file is the 2940x2594 source;
  electron-builder will downsize, but a hand-crafted 512x512 is sharper).

Until proper assets land, electron-builder uses `linux.png` for all
three platforms and emits a warning on macOS/Windows builds.
