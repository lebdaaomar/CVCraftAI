import PDFDocument from 'pdfkit';
import fs from 'fs';
import { CVData } from '@shared/schema';

// Function to generate a PDF from CV data
export async function generateCVPdf(cvData: CVData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const { personalInfo, sections } = cvData;
      const doc = new PDFDocument({ margin: 50 });
      
      // Pipe the PDF to a writable stream
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      // Add header with personal information
      doc.fontSize(24).font('Helvetica-Bold').text(personalInfo.fullName, { align: 'center' });
      
      if (personalInfo.title) {
        doc.fontSize(14).font('Helvetica').text(personalInfo.title, { align: 'center' });
      }
      
      // Add contact information
      const contactInfo = [];
      if (personalInfo.email) contactInfo.push(`Email: ${personalInfo.email}`);
      if (personalInfo.phone) contactInfo.push(`Phone: ${personalInfo.phone}`);
      if (personalInfo.location) contactInfo.push(`Location: ${personalInfo.location}`);
      
      if (contactInfo.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(10).text(contactInfo.join(' | '), { align: 'center' });
      }
      
      doc.moveDown(1);
      
      // Add sections
      for (const section of sections) {
        // Section title
        doc.fontSize(14).font('Helvetica-Bold').text(section.title);
        doc.moveDown(0.5);
        
        // Add a horizontal line
        doc.moveTo(50, doc.y)
           .lineTo(doc.page.width - 50, doc.y)
           .stroke();
        
        doc.moveDown(0.5);
        
        // Section content
        if (typeof section.content === 'string') {
          doc.fontSize(10).font('Helvetica').text(section.content);
        } else if (Array.isArray(section.content)) {
          for (const item of section.content) {
            if (typeof item === 'string') {
              doc.fontSize(10).font('Helvetica').text(item);
              doc.moveDown(0.5);
            } else if (typeof item === 'object') {
              // Handle complex items like work experiences or education
              if (item.title) {
                doc.fontSize(12).font('Helvetica-Bold').text(item.title);
              }
              
              if (item.organization && item.period) {
                doc.fontSize(10).font('Helvetica-Oblique')
                   .text(`${item.organization} | ${item.period}`);
              } else if (item.organization) {
                doc.fontSize(10).font('Helvetica-Oblique').text(item.organization);
              } else if (item.period) {
                doc.fontSize(10).font('Helvetica-Oblique').text(item.period);
              }
              
              if (item.description) {
                doc.moveDown(0.2);
                doc.fontSize(10).font('Helvetica').text(item.description);
              }
              
              // Handle bullet points
              if (item.items && Array.isArray(item.items)) {
                doc.moveDown(0.3);
                for (const bulletItem of item.items) {
                  doc.fontSize(10).font('Helvetica')
                     .text(`• ${bulletItem}`, { indent: 10 });
                }
              }
              
              // Handle skills
              if (item.skills && Array.isArray(item.skills)) {
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica')
                   .text(item.skills.join(', '));
              }
              
              doc.moveDown(0.5);
            }
          }
        }
        
        doc.moveDown(1);
      }
      
      // Finalize PDF and end the stream
      doc.end();
      
      stream.on('finish', () => {
        resolve();
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}
