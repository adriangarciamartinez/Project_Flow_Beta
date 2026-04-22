# Changelog

All notable changes to Project Flow are documented here.

---

## [1.0.0-beta.1] — 2025

Initial public beta release.

### Features
- Visual project gallery (grid + list view) with 3D hover cards
- Animated pipeline map with drag-to-reorder and completion tracking
- Renders section — drag-and-drop media import, lightbox viewer, version labels
- Previews section — WIP media with video playback
- References board — images, videos, links, notes with tag filtering
- Markdown notes with live preview
- Folder integration — attach, open in Explorer, auto-create structure
- Settings — backup export/import, data management
- Custom `pf://` streaming protocol for local video playback with Range/206 support
- FFmpeg integration for video thumbnail generation
- EXR viewer with AOV pass detection

### Technical
- Electron 33 + React 18 + TypeScript + Vite 6
- All data stored locally (localStorage + userData media folder)
- Buffer-based file import for reliable drag-and-drop on Windows
- WebM/VP9 proxy transcoding for codec-unsupported video formats

### Known issues (beta)
- Video thumbnails require FFmpeg on system PATH
- ProRes `.mov` files require FFmpeg for in-app playback
- Packaging icons must be manually provided before production build
- Some Windows drag-and-drop edge cases may require using the file picker

---

*Older internal versions are not documented here.*
