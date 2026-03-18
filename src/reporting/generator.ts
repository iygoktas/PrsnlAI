import PDFDocument from 'pdfkit';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ReportError } from '@/lib/errors';

const FONT_TITLE = 'Helvetica-Bold';
const FONT_BODY = 'Helvetica';
const FONT_SMALL = 'Helvetica-Oblique';

const COLOR_DARK = '#1a1a2e';
const COLOR_MID = '#444466';
const COLOR_LIGHT = '#888899';
const COLOR_ACCENT = '#4f46e5';

/**
 * Generates a PDF report for the given reportId.
 * Fetches the report, its selected sources and chunks from the database,
 * then builds a formatted PDF with cover page, table of contents, content
 * sections, and a final sources list.
 *
 * @returns Buffer containing the complete PDF binary
 */
export async function generatePdfReport(reportId: string): Promise<Buffer> {
  // ── Fetch data ──────────────────────────────────────────────────────────────
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { org: true },
  });

  if (!report) {
    throw new ReportError(`Report ${reportId} not found`, 'NOT_FOUND');
  }

  const sourceIds = report.selectedSourceIds as string[];
  if (sourceIds.length === 0) {
    throw new ReportError('Report has no selected sources', 'INVALID_INPUT');
  }

  const sources = await prisma.source.findMany({
    where: { id: { in: sourceIds } },
    include: {
      chunks: { orderBy: { chunkIndex: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const generatedAt = new Date();

  // ── Build PDF ───────────────────────────────────────────────────────────────
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      compress: false, // keep content streams human-readable for debugging / testing
      margins: { top: 60, bottom: 60, left: 72, right: 72 },
      info: {
        Title: report.name,
        Author: report.createdBy,
        Creator: 'personal-ai-kb',
        CreationDate: generatedAt,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Cover page ────────────────────────────────────────────────────────────
    doc.addPage();

    doc.rect(0, 0, doc.page.width, 200).fill(COLOR_DARK);
    doc
      .fillColor('#ffffff')
      .font(FONT_SMALL)
      .fontSize(11)
      .text(report.org.name.toUpperCase(), 72, 70, { characterSpacing: 2 });

    doc
      .fillColor('#ffffff')
      .font(FONT_TITLE)
      .fontSize(28)
      .text(report.name, 72, 100, { width: doc.page.width - 144 });

    doc
      .fillColor(COLOR_LIGHT)
      .font(FONT_BODY)
      .fontSize(11)
      .text(
        `Generated ${generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        72,
        160,
      );

    doc.fillColor(COLOR_DARK);

    const metaY = 230;
    doc
      .font(FONT_BODY)
      .fontSize(11)
      .fillColor(COLOR_MID)
      .text(`Prepared by: ${report.createdBy}`, 72, metaY)
      .text(`Sources included: ${sources.length}`, 72, metaY + 18)
      .text(`Report ID: ${report.id}`, 72, metaY + 36);

    // ── Table of contents ─────────────────────────────────────────────────────
    doc.addPage();

    doc
      .font(FONT_TITLE)
      .fontSize(20)
      .fillColor(COLOR_DARK)
      .text('Table of Contents', 72, 72);

    doc.moveDown(0.5);
    doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).stroke(COLOR_ACCENT);
    doc.moveDown(1);

    sources.forEach((source, i) => {
      const label = `${i + 1}.  ${source.title}`;
      const typeTag = `[${source.type}]`;
      doc
        .font(FONT_BODY)
        .fontSize(12)
        .fillColor(COLOR_DARK)
        .text(label, 72, doc.y, { continued: true })
        .fillColor(COLOR_LIGHT)
        .font(FONT_SMALL)
        .fontSize(10)
        .text(`  ${typeTag}`);
      doc.moveDown(0.4);
    });

    // ── Content sections ───────────────────────────────────────────────────────
    sources.forEach((source, i) => {
      doc.addPage();

      // Section header band
      doc.rect(0, 0, doc.page.width, 8).fill(COLOR_ACCENT);

      doc
        .fillColor(COLOR_DARK)
        .font(FONT_TITLE)
        .fontSize(18)
        .text(`${i + 1}. ${source.title}`, 72, 30);

      doc.moveDown(0.3);

      // Metadata row
      doc
        .font(FONT_SMALL)
        .fontSize(10)
        .fillColor(COLOR_MID)
        .text(
          [
            `Type: ${source.type}`,
            source.url ? `URL: ${source.url}` : null,
            `Added: ${source.createdAt.toLocaleDateString()}`,
          ]
            .filter(Boolean)
            .join('   ·   '),
        );

      doc.moveDown(0.5);
      doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).stroke('#ccccdd');
      doc.moveDown(0.8);

      // Chunk content
      if (source.chunks.length === 0) {
        doc.font(FONT_SMALL).fontSize(11).fillColor(COLOR_LIGHT).text('No content chunks available.');
      } else {
        source.chunks.forEach((chunk) => {
          if (chunk.pageNumber != null) {
            doc
              .font(FONT_SMALL)
              .fontSize(9)
              .fillColor(COLOR_LIGHT)
              .text(`— page ${chunk.pageNumber} —`, { align: 'center' });
            doc.moveDown(0.3);
          }
          doc
            .font(FONT_BODY)
            .fontSize(11)
            .fillColor(COLOR_DARK)
            .text(chunk.content, { align: 'justify' });
          doc.moveDown(0.6);
        });
      }
    });

    // ── Sources list ──────────────────────────────────────────────────────────
    doc.addPage();

    doc
      .font(FONT_TITLE)
      .fontSize(20)
      .fillColor(COLOR_DARK)
      .text('Sources', 72, 72);

    doc.moveDown(0.5);
    doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).stroke(COLOR_ACCENT);
    doc.moveDown(1);

    sources.forEach((source, i) => {
      doc.font(FONT_TITLE).fontSize(11).fillColor(COLOR_DARK).text(`${i + 1}. ${source.title}`);
      doc.font(FONT_BODY).fontSize(10).fillColor(COLOR_MID).text(`Type: ${source.type}`);

      if (source.url) {
        doc.font(FONT_SMALL).fontSize(10).fillColor(COLOR_ACCENT).text(source.url);
      }

      doc
        .font(FONT_SMALL)
        .fontSize(9)
        .fillColor(COLOR_LIGHT)
        .text(`Added: ${source.createdAt.toLocaleDateString()}`);

      doc.moveDown(0.8);
    });

    // Footer on last page
    doc
      .font(FONT_SMALL)
      .fontSize(8)
      .fillColor(COLOR_LIGHT)
      .text(
        `Generated by personal-ai-kb on ${generatedAt.toISOString()}`,
        72,
        doc.page.height - 40,
        { align: 'center' },
      );

    doc.end();
  }).then(async (buffer) => {
    // Mark report as generated
    await prisma.report.update({
      where: { id: reportId },
      data: { generatedAt },
    });
    logger.info(`Generated PDF for report ${reportId}: ${buffer.length} bytes`);
    return buffer;
  });
}
