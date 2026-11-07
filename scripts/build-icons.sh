#!/usr/bin/env bash
# Renders every app icon from the two leaf SVGs. Re-run after editing either one.
# Needs rsvg-convert and ImageMagick (brew install librsvg imagemagick).
#
#   app/icon.svg                     rounded tile: browser tab icon and the manifest's regular icons
#   public/icons/vine-leaf-full.svg  full-bleed tile: iPhone home screen and Android's maskable icon
set -euo pipefail
cd "$(dirname "$0")/.."

rounded=app/icon.svg
full=public/icons/vine-leaf-full.svg
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

rsvg-convert -w 192 -h 192 "$rounded" -o public/icons/icon-192.png
rsvg-convert -w 512 -h 512 "$rounded" -o public/icons/icon-512.png
rsvg-convert -w 512 -h 512 "$full" -o public/icons/icon-maskable-512.png
# iOS draws its own rounded corners and fills transparency with black, so it gets the full tile.
rsvg-convert -w 180 -h 180 "$full" -o app/apple-icon.png

for size in 16 32 48; do
  rsvg-convert -w "$size" -h "$size" "$rounded" -o "$tmp/$size.png"
done
magick "$tmp/16.png" "$tmp/32.png" "$tmp/48.png" app/favicon.ico
