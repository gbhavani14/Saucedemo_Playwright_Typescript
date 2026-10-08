// Steps for the order PDF in TC010_OrderSummaryPdf.feature.
// The PDF is downloaded on the order confirmation page, its text is extracted with
// tests/Utils/pdfUtils.ts, and then compared with the products and totals of the order.

import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { getPageUrl } from '../config/env';
import { downloadPdf, normalizeText, readPdf } from '../Utils/pdfUtils';
import { TIMEOUTS } from '../config/timeouts';
import { productName } from '../Utils/productData';

// Downloaded PDFs are saved next to the screenshots: tests/Reports/Pdfs/<user>/<scenario>.pdf
const PDF_DIR = path.resolve(__dirname, '..', 'Reports', 'Pdfs');
// Maximum wait for the download (TIMEOUTS.DOWNLOAD in tests/config/timeouts.ts)
const DOWNLOAD_TIMEOUT = TIMEOUTS.DOWNLOAD;

function currentUser(): string {
    return process.env.TEST_USER || 'StandardUser';
}

// Fails once with every problem listed, instead of stopping at the first one
function failIfProblems(problems: string[], title: string) {
    if (problems.length > 0) {
        throw new Error(`${title} for ${currentUser()}:\n - ${problems.join('\n - ')}`);
    }
}

// Scenario name -> file name: everything except letters and digits becomes "_"
function safeFileName(text: string): string {
    return text.replace(/[^a-zA-Z0-9]/g, '_');
}

// "Total: $1,234.56" -> "1234.56", or null if there is no amount
function amountOf(label: string): string | null {
    const match = label.match(/\$\s*([\d,]+\.\d{2})/);
    return match ? match[1]!.replace(/,/g, '') : null;
}

// True if the amount appears on its own in the text. The lookarounds stop "9.99" from
// matching inside "29.99" or "9.995". Thousands separators are removed first.
function containsAmount(text: string, amount: string): boolean {
    const escaped = amount.replace('.', '\\.');
    return new RegExp(`(?<![\\d.,])${escaped}(?![\\d])`).test(text.replace(/,/g, ''));
}

// Returns the downloaded PDF, or explains which step is missing
function getOrderPdf(world: BrowserInitiation) {
    if (!world.orderPdf) {
        throw new Error('No order PDF was downloaded. Add "When I download the order PDF" before this step.');
    }
    return world.orderPdf;
}

// Date as the PDF writes it, e.g. "October 8, 2026"
function formatOrderDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}


// Clicks "Generate PDF order", saves the file under tests/Reports/Pdfs and reads its text.
// Must run on the order confirmation page, after "I finish the order".
When('I download the order PDF', async function (this: BrowserInitiation) {
    if (!this.page.url().startsWith(getPageUrl('checkout_complete'))) {
        throw new Error(`The order PDF is downloaded on the order confirmation page, but the current page is ${this.page.url()}`);
    }

    const button = this.checkoutCompletePage.generatePdfButton;
    if (await button.count() === 0) {
        throw new Error(`The order confirmation page has no "Generate PDF order" button for ${currentUser()}`);
    }

    // Same name as the scenario's screenshot folder
    const scenarioName = this.screenshotFolder ? path.basename(this.screenshotFolder) : 'order';
    const filePath = path.join(PDF_DIR, currentUser(), `${safeFileName(scenarioName)}.pdf`);

    try {
        await downloadPdf(this.page, button, filePath, DOWNLOAD_TIMEOUT);
    } catch (error) {
        const reason = (error instanceof Error ? error.message : String(error)).split('\n')[0];
        throw new Error(
            `Clicking "Generate PDF order" did not download a file within ${DOWNLOAD_TIMEOUT / 1000} seconds for ${currentUser()}.\n` +
            `   Technical reason: ${reason}`
        );
    }

    this.orderPdf = await readPdf(filePath);

    // The PDF itself and its extracted text are added to the HTML report
    this.attach(fs.readFileSync(filePath), 'application/pdf');
    this.attach(`Text in the order PDF (${currentUser()}, ${this.orderPdf.pages} page(s)):\n${this.orderPdf.text}`, 'text/plain');
});

// Checks the file signature, size and page count, and that the PDF has text (not only images)
Then('the PDF should be a valid PDF file', async function (this: BrowserInitiation) {
    const pdf = getOrderPdf(this);
    const problems: string[] = [];

    if (!pdf.isPdf) problems.push(`The downloaded file does not start with the PDF signature "%PDF-": ${pdf.filePath}`);
    if (pdf.sizeBytes === 0) problems.push('The downloaded file is empty');
    if (pdf.isPdf && pdf.pages < 1) problems.push('The PDF has no pages');
    if (pdf.isPdf && pdf.text.length === 0) problems.push('The PDF contains no readable text');

    failIfProblems(problems, 'The order PDF is not a valid PDF');
});

// Every product in this.addedProducts must appear in the PDF with its name and price
Then('the PDF should contain the added products with their prices', async function (this: BrowserInitiation) {
    const pdf = getOrderPdf(this);
    const problems: string[] = [];

    if (this.addedProducts.length === 0) {
        problems.push('No products were added in this scenario, so there is nothing to compare');
    }
    for (const product of this.addedProducts) {
        const missing = [
            ['name', product.name],
            ['price', product.price],
            // readPdf() normalizes the PDF text, so the expected value is normalized the same way
        ].filter(([, value]) => !pdf.text.includes(normalizeText(value ?? '')));

        if (missing.length > 0) {
            problems.push(`"${product.name}": ${missing.map(([field, value]) => `${field} "${value}"`).join(', ')} not found in the PDF`);
        }
    }

    failIfProblems(problems, 'The order PDF does not contain all ordered products');
});

// Item total, tax and total must match the checkout overview. The overview was saved by "I finish the order".
Then('the PDF should contain the same totals as the checkout overview', async function (this: BrowserInitiation) {
    const pdf = getOrderPdf(this);
    if (!this.orderOverview) {
        throw new Error('The checkout overview was not recorded. The order must be placed with "When I finish the order" before this step.');
    }

    const { itemTotal, tax, total } = this.orderOverview.summary;
    const problems: string[] = [];

    for (const [name, label] of [['Item total', itemTotal], ['Tax', tax], ['Total', total]] as const) {
        const amount = amountOf(label);
        if (!amount) {
            problems.push(`Could not read the ${name.toLowerCase()} on the checkout overview ("${label}")`);
        } else if (!containsAmount(pdf.text, amount)) {
            problems.push(`${name} $${amount} was shown on the checkout overview but is not found in the PDF`);
        }
    }
    failIfProblems(problems, 'The totals in the order PDF do not match the checkout overview');
});

// Example: And the PDF should contain the text "Thank you for your order! ..."
Then('the PDF should contain the text {string}', async function (this: BrowserInitiation, expectedText: string) {
    const pdf = getOrderPdf(this);
    if (!pdf.text.includes(normalizeText(expectedText))) {
        throw new Error(`The order PDF does not contain "${expectedText}" for ${currentUser()}`);
    }
});

// Opposite of the step above. Not used by the current feature files.
Then('the PDF should not contain the text {string}', async function (this: BrowserInitiation, unexpectedText: string) {
    const pdf = getOrderPdf(this);
    if (pdf.text.includes(normalizeText(unexpectedText))) {
        throw new Error(`The order PDF contains "${unexpectedText}", but it should not, for ${currentUser()}`);
    }
});

// Checks the "Order Date" label and today's date in the PDF
Then('the PDF should show today as the order date', async function (this: BrowserInitiation) {
    const pdf = getOrderPdf(this);
    const today = new Date();
    // Yesterday is accepted too, in case the test runs across midnight
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const accepted = [formatOrderDate(today), formatOrderDate(yesterday)];

    const problems: string[] = [];
    if (!pdf.text.includes('Order Date')) {
        problems.push('The label "Order Date" is not found in the PDF');
    }
    if (!accepted.some(date => pdf.text.includes(date))) {
        problems.push(`The order date "${accepted[0]}" is not found in the PDF`);
    }

    failIfProblems(problems, 'The order date in the PDF is not correct');
});

// Example: And the PDF should ship to "John Doe" with postal code "67059"
Then('the PDF should ship to {string} with postal code {string}', async function (this: BrowserInitiation, name: string, postalCode: string) {
    const pdf = getOrderPdf(this);
    const problems: string[] = [];
    // Without spaces and in upper case, so "Ship To", "SHIP TO" and a line break between the words all match
    const compactText = pdf.text.replace(/\s/g, '').toUpperCase();

    if (!compactText.includes('SHIPTO')) {
        problems.push('The "Ship To" section is not found in the PDF');
    }
    if (!pdf.text.includes(normalizeText(name))) {
        problems.push(`The name "${name}" is not found in the PDF`);
    }
    // The postal code is escaped for the regex and must not be part of a longer number
    if (!new RegExp(`(?<![\\d])${postalCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d])`).test(pdf.text)) {
        problems.push(`The postal code "${postalCode}" is not found in the PDF`);
    }

    failIfProblems(problems, 'The shipping address in the PDF is not correct');
});

// Makes sure a product that was not ordered, or was removed, is not in the PDF.
// Product key from tests/TestData/products.json, e.g. "Onesie"
Then('the PDF should not contain the product {string}', async function (this: BrowserInitiation, productKey: string) {
    const pdf = getOrderPdf(this);
    const name = productName(productKey);
    if (pdf.text.includes(normalizeText(name))) {
        throw new Error(`The order PDF contains "${name}", but it was not ordered, for ${currentUser()}`);
    }
});