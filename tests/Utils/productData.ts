import * as fs from 'fs';
import * as path from 'path';
import { DataTable } from '@cucumber/cucumber';

// Product test data from tests/TestData/products.json.
//
// Feature files refer to products by their key, e.g. "Backpack", the same way they
// refer to users by "StandardUser" in loginCredentials.json. The steps turn the key
// into the real product name with productName().
//
// The order of the products in the JSON file is the order the products page shows
// by default (Name A to Z).

export interface ProductData {
    key: string;
    name: string;
    description: string;
    price: string;
}

const PRODUCTS_FILE = path.resolve(__dirname, '..', 'TestData', 'products.json');

function loadProducts(): ProductData[] {
    let json: Record<string, Omit<ProductData, 'key'>>;
    try {
        json = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not read the product test data from ${PRODUCTS_FILE}: ${reason}`);
    }
    return Object.entries(json).map(([key, product]) => ({ key, ...product }));
}

// Read once when the file is first imported; all steps share the same list
const PRODUCTS = loadProducts();

/** All products from products.json, in the default order of the products page */
export function allProducts(): ProductData[] {
    return PRODUCTS;
}

/**
 * Finds a product by its key ("Backpack") or by its full name ("Sauce Labs Backpack").
 * The full name still works, so older feature files keep running.
 */
export function getProductData(keyOrName: string): ProductData {
    const wanted = keyOrName.trim();
    const product = PRODUCTS.find(p => p.key === wanted) ?? PRODUCTS.find(p => p.name === wanted);
    if (!product) {
        throw new Error(
            `Unknown product "${wanted}". Use one of the keys from tests/TestData/products.json: ` +
            PRODUCTS.map(p => p.key).join(', ')
        );
    }
    return product;
}

/** "Backpack" -> "Sauce Labs Backpack" */
export function productName(keyOrName: string): string {
    return getProductData(keyOrName).name;
}

/**
 * Product names from a one-column table with a "product" header (or the older "name" header):
 *   | product   |
 *   | Backpack  |
 *   | BikeLight |
 */
export function productNamesFromTable(table: DataTable): string[] {
    return table.hashes().map(row => {
        const value = (row.product ?? row.name ?? '').trim();
        if (!value) {
            throw new Error('The product table needs a "product" header row and one product key per row, e.g. | product | / | Backpack |');
        }
        return productName(value);
    });
}