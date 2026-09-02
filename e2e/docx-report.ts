import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";

export type Shot = { label: string; file: string };

export type ReportInput = {
  outPath: string;
  resultsDir: string;
  testTitle: string;
  status: string;
  durationMs: number | undefined;
  baseURL: string | undefined;
  shots: Shot[];
  error?: string;
};

const ACCENT = "1F4E5F";
const MAX_IMG_WIDTH = 600;

/** Le largura/altura de um PNG direto do cabecalho do arquivo (chunk IHDR),
 * sem depender de nenhuma lib de imagem. */
function readPngSize(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function metaRow(label: string, value: string) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: "F2F6F7" },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: value || "-" })],
      }),
    ],
  });
}

export async function buildReportDocx(input: ReportInput): Promise<void> {
  const { outPath, resultsDir, testTitle, status, durationMs, baseURL, shots, error } = input;

  const statusLabel = status === "passed" ? "PASSOU" : status === "failed" ? "FALHOU" : status.toUpperCase();
  const statusColor = status === "passed" ? "1E7A34" : status === "failed" ? "B3261E" : "666666";

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "CalcJud", size: 22, color: "888888" })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "Resultado do Teste E2E", bold: true, size: 44, color: ACCENT }),
      ],
    }),
    new Paragraph({
      spacing: { after: 150 },
      children: [new TextRun({ text: testTitle, size: 26 })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `Status: ${statusLabel}`, bold: true, color: statusColor, size: 24 })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      rows: [
        metaRow("Status", statusLabel),
        metaRow("Duração", durationMs ? `${(durationMs / 1000).toFixed(1)}s` : "-"),
        metaRow("URL base", baseURL ?? "-"),
        metaRow("Gerado em", new Date().toLocaleString("pt-BR")),
        metaRow("Pasta de resultados", resultsDir),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
  );

  if (error) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Erro", color: "B3261E" })],
      }),
      new Paragraph({
        children: [new TextRun({ text: error, font: "Consolas", size: 18 })],
      })
    );
  }

  if (shots.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Prints do teste" })],
      })
    );

    for (const shot of shots) {
      const filePath = path.join(resultsDir, shot.file);
      const { width, height } = readPngSize(filePath);
      const scale = Math.min(1, MAX_IMG_WIDTH / width);
      const imgWidth = Math.round(width * scale);
      const imgHeight = Math.round(height * scale);

      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
          children: [new TextRun({ text: shot.label })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "png",
              data: fs.readFileSync(filePath),
              transformation: { width: imgWidth, height: imgHeight },
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 850, bottom: 850, left: 900, right: 900 } } },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
}
