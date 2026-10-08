// Helpers for the order PDF tests: download or print a PDF, then read its text.
// readPdf() returns a PdfContent that the steps check: is it a real PDF, how many pages,
// and which texts it contains.
import { chromium, Locator, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import { TIMEOUTS } from '../config/timeouts';

// PDF text is read with pdfjs-dist (Mozilla's PDF.js). It is an ES module, while this project
// compiles to CommonJS, so it is loaded with a real dynamic import that TypeScript leaves unchanged.
// A plain import() would be changed into require() by the TypeScript compiler, and require()
// cannot load an ES module. Creating the import inside new Function hides it from the compiler.
const importModule = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;

// Returns the text of all pages, with a line break at each line end and after each page
async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
    // The full file path of the installed package, so the import works from any folder
    const pdfjsPath = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href;
    const pdfjs = await importModule(pdfjsPath);
    // The data is passed from memory. System fonts are enough for reading text, and eval
    // is turned off because PDF.js does not need it here.
    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false,
    });

    try {
        const document = await loadingTask.promise;
        let text = '';
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            text += content.items
                .map((item: { str?: string; hasEOL?: boolean }) => (item.str ?? '') + (item.hasEOL ? '\n' : ' '))
                .join('') + '\n';
        }
        return { text, pages: document.numPages };
    } finally {
        // Frees the memory used by PDF.js, also when reading fails
        await loadingTask.destroy();
    }
}

export type PdfContent = {
    filePath: string;
    sizeBytes: number;
    pages: number;
    isPdf: boolean;   // the file starts with the PDF signature "%PDF-"
    text: string;     // all text, with whitespace and line breaks collapsed to single spaces
};

// Collapses all whitespace, so text that wraps onto two lines in the PDF still matches
export function normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

// Reads a PDF file and extracts its text
export async function readPdf(filePath: string): Promise<PdfContent> {
    const buffer = fs.readFileSync(filePath);
    // Check the file signature first, so for example an HTML error page saved as .pdf is caught
    const isPdf = buffer.subarray(0, 5).toString('latin1') === '%PDF-';
    const data = isPdf ? await extractPdfText(buffer) : { text: '', pages: 0 };

    return {
        filePath,
        sizeBytes: buffer.length,
        pages: data.pages,
        isPdf,
        text: normalizeText(data.text),
    };
}

// Saves what the page currently shows as a PDF, like "Save as PDF" in the browser.
// page.pdf() only works in headless Chromium, so the page is copied into a separate
// headless browser for printing. This works whether the tests run headed or headless.
export async function printPageToPdf(page: Page, filePath: string): Promise<void> {
    const html = (await page.content())
        // Without scripts, the copy shows exactly the current content and the app cannot re-render it
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        // The base URL lets the copy load the site's stylesheets and images
        .replace(/<head([^>]*)>/i, `<head$1><base href="${page.url()}">`);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const browser = await chromium.launch({ headless: true });
    try {
        const printPage = await browser.newPage();
        await printPage.setContent(html, { waitUntil: 'load' });
        await printPage.pdf({ path: filePath, format: 'A4', printBackground: true });
    } finally {
        await browser.close();
    }
}

// Clicks a button that downloads a file and saves the file to filePath
export async function downloadPdf(page: Page, downloadButton: Locator, filePath: string, timeout = TIMEOUTS.DOWNLOAD): Promise<void> {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    // Start waiting for the download before clicking, so a fast download is not missed
    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout }),
        downloadButton.click(),
    ]);
    await download.saveAs(filePath);
}