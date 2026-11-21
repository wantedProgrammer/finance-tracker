// Browser-only PDF text extraction with pdf.js. The file and any password stay in memory on
// the user's device: nothing here sends them anywhere, logs them or stores them.
import type { TextItem } from "pdfjs-dist/types/src/display/api";

export type PdfTextItem = {
    text: string;
    x: number;
    width: number;
};

export type PdfLine = {
    page: number;
    y: number;
    items: PdfTextItem[];
    text: string;
};

export const MAX_PDF_SIZE = 10 * 1024 * 1024;

export class PdfPasswordError extends Error {
    constructor(public incorrect: boolean) {
        super(incorrect ? "Incorrect password." : "This PDF is password protected.");
        this.name = "PdfPasswordError";
    }
}

export class ScannedPdfError extends Error {
    constructor() {
        super(
            "This looks like a scanned statement, which can't be read. " +
            "Download the statement from your online banking instead.",
        );
        this.name = "ScannedPdfError";
    }
}

export class InvalidPdfError extends Error {
    constructor(message = "This file isn't a valid PDF.") {
        super(message);
        this.name = "InvalidPdfError";
    }
}

// Items within this many points vertically are treated as the same line.
const LINE_TOLERANCE = 2;
// Real statements have far more text than this per page; scans have almost none.
const MIN_TEXT_CHARS_PER_PAGE = 40;

const loadPdfjs = async () => {
    // Loaded on demand so pdf.js (and its browser-only APIs) never runs on the server.
    const pdfjs = await import("pdfjs-dist");
    // Served from public/ (copied there on npm install by scripts/copy-pdf-worker.mjs).
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return pdfjs;
};

export const validatePdfFile = (file: File) => {
    const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!looksLikePdf) {
        throw new InvalidPdfError("Please choose a PDF file.");
    }

    if (file.size > MAX_PDF_SIZE) {
        throw new InvalidPdfError("This PDF is larger than 10 MB.");
    }
};

// Exported for testing parsers against real pdf.js output.
export const groupIntoLines = (items: TextItem[], page: number): PdfLine[] => {
    const lines: PdfLine[] = [];

    // PDF coordinates start at the bottom, so higher y means further up the page.
    const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

    for (const item of sorted) {
        const x = item.transform[4];
        const y = item.transform[5];
        const line = lines.find((candidate) => Math.abs(candidate.y - y) <= LINE_TOLERANCE);
        const textItem = { text: item.str, x, width: item.width };

        if (line) {
            line.items.push(textItem);
        } else {
            lines.push({ page, y, items: [textItem], text: "" });
        }
    }

    for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
        line.text = line.items.map((item) => item.text.trim()).filter(Boolean).join(" ");
    }

    return lines;
};

export const extractPdfLines = async (file: File, password?: string): Promise<PdfLine[]> => {
    validatePdfFile(file);

    const pdfjs = await loadPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());

    let document;
    try {
        document = await pdfjs.getDocument({ data, password }).promise;
    } catch (error) {
        const { name, code } = (error ?? {}) as { name?: string; code?: number };

        if (name === "PasswordException") {
            throw new PdfPasswordError(code === pdfjs.PasswordResponses.INCORRECT_PASSWORD);
        }

        if (error instanceof pdfjs.InvalidPDFException) {
            throw new InvalidPdfError();
        }

        throw error;
    }

    try {
        const lines: PdfLine[] = [];
        let textLength = 0;

        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            const items = content.items.filter(
                (item): item is TextItem => "str" in item && item.str.trim() !== "",
            );

            textLength += items.reduce((sum, item) => sum + item.str.trim().length, 0);
            lines.push(...groupIntoLines(items, pageNumber));
        }

        if (textLength < MIN_TEXT_CHARS_PER_PAGE * document.numPages) {
            throw new ScannedPdfError();
        }

        return lines;
    } finally {
        await document.destroy();
    }
};
