import { HostObject, getEnum } from "./Host";
import { JsiSkPaint } from "./JsiSkPaint";
import { JsiSkPoint } from "./JsiSkPoint";
import { JsiSkRect } from "./JsiSkRect";
import { JsiSkTypeface } from "./JsiSkTypeface";
export class JsiSkFont extends HostObject {
  constructor(CanvasKit, ref) {
    super(CanvasKit, ref, "Font");
  }
  measureText(text, paint) {
    // CanvasKit doesn't expose SkFont::measureText directly, so we polyfill
    // it: for each glyph we take its ink bounds (relative to its own origin),
    // offset it by the accumulated advance, and union the results. This
    // matches the bounds computed natively by SkFont::measureText.
    const glyphs = this.ref.getGlyphIDs(text);
    if (glyphs.length === 0) {
      return new JsiSkRect(this.CanvasKit, this.CanvasKit.XYWHRect(0, 0, 0, 0));
    }
    const skPaint = paint ? JsiSkPaint.fromValue(paint) : null;
    // Flattened rectangles: 4 floats (left, top, right, bottom) per glyph.
    const bounds = this.ref.getGlyphBounds(glyphs, skPaint);
    const advances = this.ref.getGlyphWidths(glyphs, skPaint);
    let left = 0;
    let top = 0;
    let right = 0;
    let bottom = 0;
    let isEmpty = true;
    let xPos = 0;
    for (let i = 0; i < glyphs.length; i++) {
      const l = bounds[i * 4] + xPos;
      const t = bounds[i * 4 + 1];
      const r = bounds[i * 4 + 2] + xPos;
      const b = bounds[i * 4 + 3];
      xPos += advances[i];
      // Skip empty glyph bounds (e.g. whitespace), like SkRect::join does.
      if (l >= r || t >= b) {
        continue;
      }
      if (isEmpty) {
        left = l;
        top = t;
        right = r;
        bottom = b;
        isEmpty = false;
      } else {
        left = Math.min(left, l);
        top = Math.min(top, t);
        right = Math.max(right, r);
        bottom = Math.max(bottom, b);
      }
    }
    return new JsiSkRect(this.CanvasKit, this.CanvasKit.LTRBRect(left, top, right, bottom));
  }
  getTextWidth(text, paint) {
    const ids = this.getGlyphIDs(text);
    const widths = this.getGlyphWidths(ids, paint);
    return widths.reduce((a, b) => a + b, 0);
  }
  getMetrics() {
    const result = this.ref.getMetrics();
    return {
      ascent: result.ascent,
      descent: result.descent,
      leading: result.leading,
      bounds: result.bounds ? new JsiSkRect(this.CanvasKit, result.bounds) : undefined
    };
  }
  getGlyphIDs(str, numCodePoints) {
    // TODO: Fix return value in the C++ implementation
    return [...this.ref.getGlyphIDs(str, numCodePoints)];
  }

  // TODO: Fix return value in the C++ implementation, it return float32
  getGlyphWidths(glyphs, paint) {
    return [...this.ref.getGlyphWidths(glyphs, paint ? JsiSkPaint.fromValue(paint) : null)];
  }
  getGlyphIntercepts(glyphs, positions, top, bottom) {
    return [...this.ref.getGlyphIntercepts(glyphs, positions.map(p => Array.from(JsiSkPoint.fromValue(p))).flat(), top, bottom)];
  }
  getScaleX() {
    return this.ref.getScaleX();
  }
  getSize() {
    return this.ref.getSize();
  }
  getSkewX() {
    return this.ref.getSkewX();
  }
  isEmbolden() {
    return this.ref.isEmbolden();
  }
  getTypeface() {
    const tf = this.ref.getTypeface();
    return tf ? new JsiSkTypeface(this.CanvasKit, tf) : null;
  }
  setEdging(edging) {
    this.ref.setEdging(getEnum(this.CanvasKit, "FontEdging", edging));
  }
  setEmbeddedBitmaps(embeddedBitmaps) {
    this.ref.setEmbeddedBitmaps(embeddedBitmaps);
  }
  setHinting(hinting) {
    this.ref.setHinting(getEnum(this.CanvasKit, "FontHinting", hinting));
  }
  setLinearMetrics(linearMetrics) {
    this.ref.setLinearMetrics(linearMetrics);
  }
  setScaleX(sx) {
    this.ref.setScaleX(sx);
  }
  setSize(points) {
    this.ref.setSize(points);
  }
  setSkewX(sx) {
    this.ref.setSkewX(sx);
  }
  setEmbolden(embolden) {
    this.ref.setEmbolden(embolden);
  }
  setSubpixel(subpixel) {
    this.ref.setSubpixel(subpixel);
  }
  setTypeface(face) {
    this.ref.setTypeface(face ? JsiSkTypeface.fromValue(face) : null);
  }
}
//# sourceMappingURL=JsiSkFont.js.map