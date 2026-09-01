import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAllowedImageMime,
  isSafeCatalogImage,
  isSafePieceImage,
  isSafeImageDataUrl,
  isSafeReceiptDataUrl,
} from "./media.ts";

describe("anexos", () => {
  it("aceita jpg/png/webp e recusa svg", () => {
    assert.equal(isSafeImageDataUrl("data:image/png;base64,aaa"), true);
    assert.equal(isSafeImageDataUrl("data:image/jpeg;base64,aaa"), true);
    assert.equal(isSafeImageDataUrl("data:image/webp;base64,aaa"), true);
    assert.equal(isSafeImageDataUrl("data:image/svg+xml;base64,PHN2Zy"), false);
    assert.equal(isSafeImageDataUrl("data:image/svg+xml;utf8,<svg>"), false);
    assert.equal(isSafeImageDataUrl("https://evil.test/x.png"), false);
  });

  it("comprovante aceita pdf raster, não html", () => {
    assert.equal(isSafeReceiptDataUrl("data:application/pdf;base64,aaa"), true);
    assert.equal(isSafeReceiptDataUrl("data:text/html;base64,aaa"), false);
    assert.equal(isAllowedImageMime("image/png"), true);
    assert.equal(isAllowedImageMime("image/svg+xml"), false);
  });

  it("foto do catálogo aceita pasta da loja ou upload raster", () => {
    assert.equal(isSafeCatalogImage("/uniforms/uni_01.jpg"), true);
    assert.equal(isSafeCatalogImage("/uniforms/../secret.png"), false);
    assert.equal(isSafeCatalogImage("https://evil.test/x.png"), false);
    assert.equal(isSafePieceImage("/uniforms/uni_01.jpg"), true);
    assert.equal(isSafePieceImage("data:image/png;base64,aaa"), true);
    assert.equal(isSafePieceImage("data:image/svg+xml;base64,PHN2Zy"), false);
    assert.equal(isSafePieceImage("https://evil.test/x.png"), false);
  });
});
