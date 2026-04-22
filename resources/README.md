# Resources — Icon Files for Packaging

Place the following icon files in this folder before running `npm run dist`:

| File | Size | Platform |
|---|---|---|
| `icon.ico` | 256×256 minimum | Windows |
| `icon.icns` | 512×512 | macOS |
| `icon.png` | 512×512 | Linux |

## Generating icons from an SVG or PNG

Using ImageMagick:

```bash
# PNG → ICO (Windows)
magick source-512.png -resize 256x256 resources/icon.ico

# PNG → PNG (Linux)
cp source-512.png resources/icon.png
```

For `.icns` (macOS), use `iconutil` on macOS or a tool like [png2icns](https://github.com/dropbox/mypy).

> These icon files are not included in the repository. Generate them from the favicon SVG or a custom source image.
