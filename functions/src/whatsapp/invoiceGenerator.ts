/**
 * Invoice Preview Generator
 * Converts HTML invoice to image using htmlcsstoimage.com API
 */

import axios from 'axios';

const HCTI_USER_ID = process.env.HCTI_USER_ID || '';
const HCTI_API_KEY = process.env.HCTI_API_KEY || '';

export async function generateInvoicePreview(html: string): Promise<string> {
    try {
        const response = await axios.post(
            'https://hcti.io/v1/image',
            {
                html,
                css: '',
                google_fonts: 'Arial',
            },
            {
                auth: {
                    username: HCTI_USER_ID,
                    password: HCTI_API_KEY
                }
            }
        );

        return response.data.url;
    } catch (error) {
        console.error('Error generating invoice preview:', error);
        throw error;
    }
}
