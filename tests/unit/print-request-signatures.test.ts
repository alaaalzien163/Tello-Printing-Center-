import { describe, expect, it } from "vitest";

import { inspectFileSignature } from "@/lib/print-requests/file-signatures";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function text(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

describe("print request file signatures", () => {
  it("recognizes PDF, PNG, JPEG and WebP headers", () => {
    expect(inspectFileSignature("a.pdf", text("%PDF-1.7\n"))).toBe("ok");
    expect(
      inspectFileSignature("a.png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe("ok");
    expect(inspectFileSignature("a.jpg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("ok");
    expect(inspectFileSignature("a.webp", text("RIFF0000WEBP"))).toBe("ok");
  });

  it("recognizes ZIP-based formats and text-based CAD formats", () => {
    expect(inspectFileSignature("a.zip", bytes(0x50, 0x4b, 0x03, 0x04))).toBe("ok");
    expect(inspectFileSignature("a.3mf", bytes(0x50, 0x4b, 0x03, 0x04))).toBe("ok");
    expect(inspectFileSignature("a.stl", text("solid cube\nfacet normal 0 0 1\nendsolid"))).toBe(
      "ok",
    );
    expect(
      inspectFileSignature("a.step", text("ISO-10303-21;\nHEADER;\nENDSEC;\nEND-ISO-10303-21;")),
    ).toBe("ok");
    expect(inspectFileSignature("a.dxf", text("0\nSECTION\n2\nHEADER\n0\nEOF"))).toBe("ok");
    expect(inspectFileSignature("a.obj", text("v 0 0 0\nf 1 2 3\n"))).toBe("ok");
  });

  it("rejects executables disguised with allowed extensions", () => {
    expect(inspectFileSignature("a.pdf", bytes(0x4d, 0x5a, 0x90, 0x00))).toBe("mismatch");
    expect(
      inspectFileSignature("a.stl", bytes(0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01)),
    ).toBe("mismatch");
    expect(inspectFileSignature("a.obj", text("#!/bin/sh\nrm -rf /"))).toBe("mismatch");
  });

  it("rejects HTML, SVG and XML markup even with text extensions", () => {
    expect(inspectFileSignature("a.obj", text("<!doctype html><html></html>"))).toBe("mismatch");
    expect(inspectFileSignature("a.dxf", text("<svg xmlns=\"http://www.w3.org/2000/svg\">"))).toBe(
      "mismatch",
    );
    expect(inspectFileSignature("a.step", text("<?xml version=\"1.0\"?>"))).toBe("mismatch");
  });

  it("rejects content that does not match its extension", () => {
    expect(inspectFileSignature("a.pdf", text("just text"))).toBe("mismatch");
    expect(inspectFileSignature("a.png", text("not a png"))).toBe("mismatch");
    expect(inspectFileSignature("a.zip", text("not a zip"))).toBe("mismatch");
    expect(inspectFileSignature("a.exe", text("MZ"))).toBe("unsupported");
  });
});
