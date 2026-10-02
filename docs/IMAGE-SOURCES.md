# Development Image Sources

These are representative stock photographs, not photographs of Kedai Tehyan's actual products. All eight assets are stored locally; the public application does not hotlink these sources. Replace them with approved business photographs before launch. Large photographs are labeled "Foto ilustrasi"; compact thumbnails omit the tiny label but retain illustrative alternative text.

Downloaded and reviewed on 2026-10-01 and 2026-10-02. Processing: auto-orientation, proportional resizing to at most 1200 x 1500 pixels, WebP quality 74, EXIF removed. No generated ingredients, compositing, or product claims were added. CSS crops vary by surface; the original proportions are retained in the asset.

## Product Mapping

All files are under `public/images/products/`; `Product.imageUrl` uses `/images/products/<slug>.webp`.

| Product / Filename | Photographer and Source | License | Size |
| --- | --- | --- | --- |
| Teh Tawar Hangat / `teh-tawar-hangat.webp` | [Skyler Ewing, glass teacup](https://www.pexels.com/photo/clear-glass-teacup-with-brown-liquid-9579636/) | Pexels | 1200 x 801; 18,544 B |
| Teh Manis Tehyan / `teh-manis-tehyan.webp` | [Jubair Bin Iqbal, tea in a glass](https://www.pexels.com/photo/tea-on-a-clear-glass-11378647/) | Pexels | 1200 x 800; 37,094 B |
| Teh Tarik Tehyan / `teh-tarik-tehyan.webp` | [Swetha B Chandran, milk tea](https://wordpress.org/photos/photo/40265ca14d/) | CC0 | 844 x 1500; 31,740 B |
| Teh Susu Gula Aren / `teh-susu-gula-aren.webp` | [appealdahal, two glasses of milk tea](https://wordpress.org/photos/photo/124697b90d/) | CC0 | 1200 x 1261; 142,434 B |
| Teh Lemon Madu / `teh-lemon-madu.webp` | [Svitlana, iced tea with lemon and honey](https://unsplash.com/photos/a-group-of-glasses-with-liquid-in-them-mnkU6aQowCE) | Unsplash | 1200 x 800; 71,680 B |
| Teh Leci / `teh-leci.webp` | [Content Pixie, lychee iced tea](https://unsplash.com/photos/clear-drinking-glass-with-brown-liquid-and-ice-mAYaGExwdEo) | Unsplash | 1000 x 1500; 43,298 B |
| Kopi Susu Tehyan / `kopi-susu-tehyan.webp` | [Betul Nur, iced coffee with milk](https://www.pexels.com/photo/glass-of-fresh-iced-coffee-placed-on-table-7808403/) | Pexels | 1200 x 800; 13,258 B |
| Pisang Goreng / `pisang-goreng.webp` | [Tiya Nh, banana fritters](https://www.pexels.com/photo/delicious-pisang-goreng-with-tea-on-wooden-table-37048319/) | Pexels | 1000 x 1500; 101,982 B |

Total original WebP assets: **460,030 bytes**. Next.js additionally delivers responsive derivatives for local images.

## License References

- [Pexels License](https://www.pexels.com/license/): free use and modification; attribution is appreciated. Do not imply endorsement or resell unaltered stock photographs.
- [Unsplash License](https://unsplash.com/license): free use and modification; do not resell substantially unmodified photos or compile a competing image service.
- [WordPress Photo Directory License](https://wordpress.org/photos/license/) and [CC0](https://creativecommons.org/publicdomain/zero/1.0/): public-domain dedication. Retain source records and do not claim authorship.

Source pages were checked for free-use licensing, subject suitability, visible watermarks, and other-brand product branding. Credit here is retained even when attribution is not mandatory. Originals are not committed; download references are in the local ignored `.qa/download-photos.cjs` script.

## Hero and Other Uses

The hero reuses the available photographed beverage bestsellers returned by the catalog service: currently Lemon Madu, Teh Manis, and Teh Tarik. No duplicate hero files or additional photo downloads are required. Featured menu, menu narrative, and detail views reuse each product's persisted `imageUrl`.

## Remaining Photography Needs

Photograph all eight actual products with approved vessels, presentation, serving size, and lighting. Stock milk-tea photographs do not establish palm-sugar content or Tehyan's pulling technique; stock tea/coffee images do not establish the actual tea cultivar or coffee beans. Garnishes, glassware, and quantities in stock images are illustrative, not serving promises. Supply approved shots rather than inferring richer product metadata from these pictures.
