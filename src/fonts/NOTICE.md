All fonts here are embedded in the generated PDF protocol so Slovak diacritics
(á é í ó ú ý č ď ľ ň ŕ š ť ž ô ä) render reliably, independent of whatever fonts
the server happens to have installed.

Every family below is licensed under the SIL Open Font License 1.1, which permits
embedding in documents.

## Archivo — headings

© Omnibus-Type, SIL Open Font License 1.1.
Source: https://github.com/google/fonts/tree/main/ofl/archivo

`Archivo-Bold.ttf` (700), `Archivo-ExtraBold.ttf` (800), `Archivo-Black.ttf` (900).

## IBM Plex Sans — body copy

© IBM Corp., SIL Open Font License 1.1.
Source: https://github.com/google/fonts/tree/main/ofl/ibmplexsans

`IBMPlexSans-Regular.ttf` (400), `-Medium.ttf` (500), `-SemiBold.ttf` (600), `-Bold.ttf` (700).

## IBM Plex Mono — labels, codes and figures

© IBM Corp., SIL Open Font License 1.1.
Source: https://github.com/google/fonts/tree/main/ofl/ibmplexmono

`IBMPlexMono-Regular.ttf` (400), `-SemiBold.ttf` (600), `-Bold.ttf` (700).

## Noto Sans — retained fallback

© Google Inc., SIL Open Font License 1.1.
Source: https://github.com/notofonts/NotoSans

### Why the Archivo and Plex Sans files are generated

Google Fonts now ships those two families only as variable fonts, and react-pdf
renders a variable font at its default instance regardless of the weight asked
for — a registered "900" silently came out at Archivo's 600 default. The static
files here were cut from the upstream variable fonts with fontTools:

```
python3 -c "
from fontTools import ttLib
from fontTools.varLib import instancer
font = ttLib.TTFont('Archivo[wdth,wght].ttf')
inst = instancer.instantiateVariableFont(font, {'wght': 900, 'wdth': 100},
                                         inplace=False, updateFontNames=True)
inst.save('Archivo-Black.ttf')"
```

IBM Plex Mono is shipped upstream as static files and is used as downloaded.
