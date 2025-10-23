import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Invoice } from '../types';
import { createRoot } from 'react-dom/client';
import InvoiceTemplate from '../components/invoice/InvoiceTemplates';

// Helper function to convert image URL to base64
async function urlToBase64(url: string): Promise<string> {
    try {
        console.log('Converting URL to base64:', url.substring(0, 100));
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to convert URL to base64:', error);
        return url; // Return original URL if conversion fails
    }
}

/**
 * Generates a PDF from an invoice by rendering the actual InvoiceTemplate component
 * @param invoice - The invoice object to generate PDF for
 * @param templateType - The template to use ('classic', 'modern', 'minimal', 'professional', 'pdf')
 * @returns Promise that resolves when PDF is generated and downloaded
 */
export const generateInvoicePdf = async (
    invoice: Invoice,
    templateType: 'classic' | 'modern' | 'minimal' | 'professional' | 'pdf' = 'pdf'
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('=== PDF GENERATION START ===');
            console.log('Template:', templateType);
            console.log('Invoice:', invoice.invoiceNumber || invoice.id);

            // Convert Firebase Storage URLs to base64 to avoid CORS issues
            const invoiceWithBase64Images = { ...invoice };
            if (invoice.companyLogoUrl && invoice.companyLogoUrl.includes('firebasestorage')) {
                console.log('Converting company logo to base64...');
                const base64Logo = await urlToBase64(invoice.companyLogoUrl);
                // If conversion failed (returns original URL), remove it to avoid PDF errors
                invoiceWithBase64Images.companyLogoUrl = base64Logo.startsWith('data:') ? base64Logo : undefined;
                if (!invoiceWithBase64Images.companyLogoUrl) {
                    console.warn('Logo removed due to CORS - please re-upload as base64');
                }
            }
            if (invoice.signatureUrl && invoice.signatureUrl.includes('firebasestorage')) {
                console.log('Converting signature to base64...');
                const base64Signature = await urlToBase64(invoice.signatureUrl);
                // If conversion failed (returns original URL), remove it to avoid PDF errors
                invoiceWithBase64Images.signatureUrl = base64Signature.startsWith('data:') ? base64Signature : undefined;
                if (!invoiceWithBase64Images.signatureUrl) {
                    console.warn('Signature removed due to CORS - please re-upload as base64');
                }
            }

            // Create a temporary container for rendering
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-pdf-container';
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '-9999px';
            tempContainer.style.width = '210mm';
            tempContainer.style.backgroundColor = '#ffffff';

            // Create the content container
            const contentDiv = document.createElement('div');
            contentDiv.id = 'pdf-invoice-content';
            contentDiv.style.backgroundColor = '#ffffff';
            contentDiv.style.padding = '20mm';
            contentDiv.style.minHeight = '297mm'; // A4 height

            tempContainer.appendChild(contentDiv);
            document.body.appendChild(tempContainer);

            // Render the React component into the container with base64 images
            const root = createRoot(contentDiv);
            root.render(InvoiceTemplate({ invoice: invoiceWithBase64Images, template: templateType }));

            // Wait for React to render
            await new Promise(r => setTimeout(r, 100));

            // Set crossOrigin on all images BEFORE they load
            const images = contentDiv.querySelectorAll('img');
            console.log(`Found ${images.length} images to load...`);

            images.forEach((img: HTMLImageElement) => {
                // Store the original src
                const originalSrc = img.src;

                // Set crossOrigin before loading
                img.crossOrigin = 'anonymous';

                // Force reload with crossOrigin if already loaded
                if (img.complete && img.src) {
                    img.src = ''; // Clear src
                    img.src = originalSrc; // Reload with crossOrigin
                }
            });

            const imageLoadPromises = Array.from(images).map((img: HTMLImageElement) => {
                return new Promise<void>((resolveImg) => {
                    if (img.complete) {
                        console.log('Image already loaded:', img.src.substring(0, 50));
                        resolveImg();
                    } else {
                        const timeout = setTimeout(() => {
                            console.warn('Image load timeout:', img.src.substring(0, 50));
                            resolveImg();
                        }, 5000);

                        img.onload = () => {
                            clearTimeout(timeout);
                            console.log('Image loaded:', img.src.substring(0, 50));
                            resolveImg();
                        };
                        img.onerror = () => {
                            clearTimeout(timeout);
                            console.error('Image failed to load:', img.src.substring(0, 50));
                            resolveImg();
                        };
                    }
                });
            });

            await Promise.all(imageLoadPromises);
            console.log('All images loaded, waiting for final render...');

            // Extra delay for complete rendering
            await new Promise(r => setTimeout(r, 1000));

            // Capture with html2canvas
            console.log('Capturing with html2canvas...');
            console.log('Element dimensions:', contentDiv.scrollWidth, 'x', contentDiv.scrollHeight);

            const canvas = await html2canvas(contentDiv, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: true,
                backgroundColor: '#ffffff',
                width: contentDiv.scrollWidth,
                height: contentDiv.scrollHeight,
            });

            console.log('Canvas captured:', canvas.width, 'x', canvas.height);

            // Generate PDF with multi-page support
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            const a4Width = 210; // mm
            const a4Height = 297; // mm
            const imgWidth = a4Width;
            const imgHeight = (canvas.height * a4Width) / canvas.width;

            console.log('Adding image to PDF:', imgWidth, 'x', imgHeight);

            // If content fits on one page, add it normally
            if (imgHeight <= a4Height) {
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            } else {
                // Content spans multiple pages - split it
                let position = 0;
                let pageCount = 0;

                while (position < imgHeight) {
                    if (pageCount > 0) {
                        pdf.addPage();
                    }

                    // Calculate how much of the image to show on this page
                    const remainingHeight = imgHeight - position;
                    const pageHeight = Math.min(a4Height, remainingHeight);

                    // Add the image slice for this page
                    pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);

                    position += a4Height;
                    pageCount++;
                    console.log(`Added page ${pageCount}, position: ${position}/${imgHeight}`);
                }
            }

            // Use invoice number for filename
            const filename = `Invoice-${invoice.invoiceNumber || invoice.id}.pdf`;
            pdf.save(filename);

            console.log('PDF saved successfully:', filename);
            console.log('=== PDF GENERATION END ===');

            // Clean up
            root.unmount();
            document.body.removeChild(tempContainer);
            resolve();
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Clean up on error
            const tempContainer = document.getElementById('temp-pdf-container');
            if (tempContainer) {
                document.body.removeChild(tempContainer);
            }
            reject(error);
        }
    });
};
