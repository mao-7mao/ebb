import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  ImageRun
} from "docx";
import { CurrencyCode } from "../types/procurement";

export interface RequisitionLineItemForDocx {
  nameWithSpec: string;
  productUrl?: string;
  unitPrice: number;
  currency: CurrencyCode;
  quantity: number;
  unit?: string;
  subtotal: number;
  purpose: string;
  vendorAndPlatform: string;
}

export interface RequisitionDocxOptions {
  requisitionNo: string;
  requisitionDate: string;
  applicant: string;
  assistantReviewer: string;
  professorReviewer: string;
  isApproved: boolean;
  flattenedLines: RequisitionLineItemForDocx[];
  currencyUnitLabel: string;
  primaryTotalAmount: number;
  grandTotalTwdEstimate?: number;
  hasForeignCurrency?: boolean;
}

const BORDER_BLACK_SINGLE = {
  style: BorderStyle.SINGLE,
  size: 4, // 0.5 pt
  color: "000000"
};

const TABLE_CELL_BORDERS = {
  top: BORDER_BLACK_SINGLE,
  bottom: BORDER_BLACK_SINGLE,
  left: BORDER_BLACK_SINGLE,
  right: BORDER_BLACK_SINGLE
};

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "auto"
};

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER
};

// Format currency for table cells
function formatCellAmount(amount: number, cur: CurrencyCode): string {
  if (cur === "TWD") return amount.toLocaleString();
  if (cur === "CNY") return `¥ ${amount.toLocaleString()}`;
  if (cur === "USD") return `$ ${amount.toLocaleString()}`;
  return amount.toLocaleString();
}

/**
 * Loads NSYSU emblem image bytes client-side without external dependencies.
 * Tries static PNG assets first, then rasterizes /logo.svg via HTML Canvas.
 */
async function loadEmblemImageBytes(): Promise<Uint8Array | null> {
  // 1. Try loading static PNG assets if available
  const candidateUrls = ["/nsysu_seal.png", "/logomini.png"];
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf && buf.byteLength > 100) {
          return new Uint8Array(buf);
        }
      }
    } catch {
      // Continue to next option
    }
  }

  // 2. In browser environment, rasterize /logo.svg to PNG bytes via Canvas
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = "/logo.svg";
        });
        if (loaded) {
          ctx.drawImage(img, 0, 0, 160, 160);
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (blob) {
            const buf = await blob.arrayBuffer();
            return new Uint8Array(buf);
          }
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  return null;
}

/**
 * Generates an official native Microsoft Word (.docx) document.
 * Embeds the NSYSU emblem directly into word/media so it displays 100% reliably offline.
 */
export async function generateRequisitionDocxBlob(options: RequisitionDocxOptions): Promise<Blob> {
  const {
    requisitionNo,
    requisitionDate,
    applicant,
    assistantReviewer,
    professorReviewer,
    isApproved,
    flattenedLines,
    currencyUnitLabel,
    primaryTotalAmount,
    grandTotalTwdEstimate,
    hasForeignCurrency
  } = options;

  // Prepare emblem image bytes
  const emblemBytes = await loadEmblemImageBytes();

  // Header Table: Left is Title, Right is NSYSU Emblem
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 82, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: "環境生物技術暨生物煉製實驗室請購單",
                    font: "標楷體",
                    size: 38, // 19pt
                    bold: true,
                    color: "000000"
                  })
                ]
              }),
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `申請日期：${requisitionDate}`,
                    font: "標楷體",
                    size: 24, // 12pt
                    bold: true,
                    color: "000000"
                  }),
                  ...(requisitionNo ? [
                    new TextRun({
                      text: `   (單號: ${requisitionNo})`,
                      font: "Times New Roman",
                      size: 20,
                      color: "555555"
                    })
                  ] : [])
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              emblemBytes && emblemBytes.length > 0
                ? new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new ImageRun({
                        data: emblemBytes,
                        transformation: { width: 75, height: 75 },
                        type: "png",
                        altText: {
                          title: "國立中山大學校徽",
                          description: "National Sun Yat-sen University Emblem",
                          name: "nsysu_emblem.png"
                        }
                      })
                    ]
                  })
                : new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: "國立中山大學",
                        font: "標楷體",
                        size: 22,
                        bold: true
                      })
                    ]
                  })
            ]
          })
        ]
      })
    ]
  });

  // Table Column Definitions
  // 1: 產品名稱及規格 (28%)
  // 2: 單價 (12%)
  // 3: 數量 (10%)
  // 4: 小計 (12%)
  // 5: 用途 (20%)
  // 6: 備註(廠商) (18%)
  const colWidths = [28, 12, 10, 12, 20, 18];

  const headerCells = [
    "產品名稱及規格",
    "單價",
    "數量",
    "小計",
    "用途",
    "備註(廠商)"
  ].map((headerText, idx) => {
    return new TableCell({
      width: { size: colWidths[idx], type: WidthType.PERCENTAGE },
      borders: TABLE_CELL_BORDERS,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: headerText,
              font: "標楷體",
              size: 24, // 12pt
              bold: true
            })
          ]
        })
      ]
    });
  });

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: headerCells
    })
  ];

  // Data rows
  flattenedLines.forEach((item) => {
    const nameParagraphs: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: item.nameWithSpec,
            font: "標楷體",
            size: 23
          })
        ]
      })
    ];

    if (item.productUrl) {
      nameParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40 },
          children: [
            new TextRun({
              text: `連結: ${item.productUrl}`,
              font: "Times New Roman",
              size: 17,
              color: "1A56DB"
            })
          ]
        })
      );
    }

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: colWidths[0], type: WidthType.PERCENTAGE },
            borders: TABLE_CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: nameParagraphs
          }),
          new TableCell({
            width: { size: colWidths[1], type: WidthType.PERCENTAGE },
            borders: TABLE_CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: formatCellAmount(item.unitPrice, item.currency),
                    font: "Times New Roman",
                    size: 23
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: colWidths[2], type: WidthType.PERCENTAGE },
            borders: TABLE_CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: item.unit ? `${item.quantity} ${item.unit}` : `${item.quantity}`,
                    font: "標楷體",
                    size: 23
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: colWidths[3], type: WidthType.PERCENTAGE },
            borders: TABLE_CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: formatCellAmount(item.subtotal, item.currency),
                    font: "Times New Roman",
                    size: 23
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: colWidths[4], type: WidthType.PERCENTAGE },
            borders: TABLE_CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: item.purpose || "",
                    font: "標楷體",
                    size: 23
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: colWidths[5], type: WidthType.PERCENTAGE },
            borders: TABLE_CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: item.vendorAndPlatform || "",
                    font: "標楷體",
                    size: 23
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  });

  // Empty rows to maintain official requisition aesthetics (minimum 5 total rows)
  const emptyRowsNeeded = Math.max(0, 5 - flattenedLines.length);
  for (let i = 0; i < emptyRowsNeeded; i++) {
    tableRows.push(
      new TableRow({
        children: colWidths.map((w) =>
          new TableCell({
            width: { size: w, type: WidthType.PERCENTAGE },
            borders: TABLE_CELL_BORDERS,
            children: [
              new Paragraph({
                children: [new TextRun({ text: " ", size: 24 })]
              })
            ]
          })
        )
      })
    );
  }

  // Row: Grand Total
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: colWidths[0], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "總　計",
                  font: "標楷體",
                  size: 24,
                  bold: true
                })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[1], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: currencyUnitLabel,
                  font: "標楷體",
                  size: 21,
                  bold: true
                })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[2], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          children: [new Paragraph({ children: [] })]
        }),
        new TableCell({
          width: { size: colWidths[3], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: primaryTotalAmount.toLocaleString(),
                  font: "Times New Roman",
                  size: 24,
                  bold: true
                })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[4], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          children: [new Paragraph({ children: [] })]
        }),
        new TableCell({
          width: { size: colWidths[5], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          children: [new Paragraph({ children: [] })]
        })
      ]
    })
  );

  // Row: Reviewers Signatures
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: colWidths[0], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "老師核准",
                  font: "標楷體",
                  size: 24,
                  bold: true
                })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[1], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: isApproved ? professorReviewer : "",
                  font: "標楷體",
                  size: 23
                })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[2], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "審核人",
                  font: "標楷體",
                  size: 24,
                  bold: true
                })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[3], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: assistantReviewer,
                  font: "標楷體",
                  size: 23
                })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[4], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "申請人",
                  font: "標楷體",
                  size: 24,
                  bold: true
                })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[5], type: WidthType.PERCENTAGE },
          borders: TABLE_CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: applicant,
                  font: "標楷體",
                  size: 23
                })
              ]
            })
          ]
        })
      ]
    })
  );

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_CELL_BORDERS,
    rows: tableRows
  });

  // Footnote rules paragraph
  const footnotes = [
    new Paragraph({
      spacing: { before: 180, after: 60 },
      children: [
        new TextRun({
          text: "1. 凡購買物品者，請先填寫請購單，經審核人與老師同意後，始可購買。單價或總價金額超過 3,000 元，需事先詢價三家廠商並徵得老師同意簽可後，始可購買。",
          font: "標楷體",
          size: 20 // 10pt
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "2. 耗材類、藥品類由miao負責審核，其他類由老師直接審核。",
          font: "標楷體",
          size: 20
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "3. 審核人需確定物品是否還有庫存、是否需要增購，也要參考過去購買紀錄，審核本次請購價錢與數量是否合理。",
          font: "標楷體",
          size: 20
        })
      ]
    })
  ];

  // Optional foreign currency info line
  if (hasForeignCurrency && grandTotalTwdEstimate) {
    footnotes.push(
      new Paragraph({
        spacing: { before: 100 },
        children: [
          new TextRun({
            text: `* 本單據包含外幣品項（換算參考：人民幣 CNY ≈ 4.5、美元 USD ≈ 32.5）。預估折合新台幣總計：NT$ ${grandTotalTwdEstimate.toLocaleString()}。`,
            font: "標楷體",
            size: 18,
            color: "666666"
          })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              right: 1134,
              bottom: 1134,
              left: 1134
            }
          }
        },
        children: [
          headerTable,
          new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }),
          mainTable,
          ...footnotes
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Downloads the native .docx file directly in browser.
 */
export async function downloadRequisitionDocx(options: RequisitionDocxOptions): Promise<void> {
  const blob = await generateRequisitionDocxBlob(options);
  const fileName = `EBB_實驗室請購單_${options.requisitionNo || options.requisitionDate}.docx`;
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an HTML format document (for legacy .doc compatibility).
 */
export function generateRequisitionMhtmlContent(options: RequisitionDocxOptions): string {
  const {
    requisitionDate,
    applicant,
    assistantReviewer,
    professorReviewer,
    isApproved,
    flattenedLines,
    currencyUnitLabel,
    primaryTotalAmount
  } = options;

  const tableRowsHtml = flattenedLines.map(l => `
    <tr>
      <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體','DFKai-SB','Times New Roman'; font-size:12pt;">
        ${l.nameWithSpec}
        ${l.productUrl ? `<br/><span style="font-size:9pt; color:#1a56db;">連結: ${l.productUrl}</span>` : ""}
      </td>
      <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'Times New Roman','標楷體'; font-size:12pt;">
        ${formatCellAmount(l.unitPrice, l.currency)}
      </td>
      <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體','Times New Roman'; font-size:12pt;">
        ${l.unit ? `${l.quantity} ${l.unit}` : l.quantity}
      </td>
      <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'Times New Roman','標楷體'; font-size:12pt;">
        ${formatCellAmount(l.subtotal, l.currency)}
      </td>
      <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體'; font-size:12pt;">
        ${l.purpose}
      </td>
      <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體'; font-size:12pt;">
        ${l.vendorAndPlatform}
      </td>
    </tr>
  `).join("");

  const emptyRowsCount = Math.max(0, 5 - flattenedLines.length);
  const emptyRowsHtml = Array(emptyRowsCount).fill(0).map(() => `
    <tr>
      <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
      <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
      <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
      <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
      <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
      <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
    </tr>
  `).join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>環境生物技術暨生物煉製實驗室請購單</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4 portrait;
          margin: 2cm 2cm 2cm 2cm;
        }
        body {
          font-family: '標楷體', 'DFKai-SB', '新細明體', 'PMingLiU', serif;
          font-size: 12pt;
          color: #000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 12px;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px 6px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <table style="border:none; margin-bottom: 10px;">
        <tr style="border:none;">
          <td style="border:none; text-align:left; vertical-align:middle;">
            <h2 style="margin:0; font-family:'標楷體','DFKai-SB'; font-size:20pt; font-weight:bold; letter-spacing:1px;">
              環境生物技術暨生物煉製實驗室請購單
            </h2>
          </td>
          <td style="border:none; text-align:right; width:90px; vertical-align:middle;">
            <img src="/logo.svg" width="75" height="75" alt="國立中山大學校徽" />
          </td>
        </tr>
      </table>

      <div style="text-align:left; font-size:12pt; margin-bottom:8px; font-weight:bold;">
        申請日期：${requisitionDate}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:28%; font-size:12pt;">產品名稱及規格</th>
            <th style="width:12%; font-size:12pt;">單價</th>
            <th style="width:10%; font-size:12pt;">數量</th>
            <th style="width:12%; font-size:12pt;">小計</th>
            <th style="width:20%; font-size:12pt;">用途</th>
            <th style="width:18%; font-size:12pt;">備註(廠商)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
          ${emptyRowsHtml}
          <tr>
            <td style="font-weight:bold; font-size:12pt; letter-spacing:4px;">總 計</td>
            <td style="font-size:11pt; font-weight:bold;">${currencyUnitLabel}</td>
            <td>&nbsp;</td>
            <td style="font-size:12pt; font-weight:bold;">${primaryTotalAmount.toLocaleString()}</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
          <tr>
            <td style="font-weight:bold; font-size:12pt;">老師核准</td>
            <td style="font-size:12pt;">${isApproved ? professorReviewer : ""}</td>
            <td style="font-weight:bold; font-size:12pt;">審核人</td>
            <td style="font-size:12pt;">${assistantReviewer}</td>
            <td style="font-weight:bold; font-size:12pt;">申請人</td>
            <td style="font-size:12pt;">${applicant}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:14px; font-size:10pt; line-height:1.7; font-family:'標楷體','DFKai-SB';">
        1. 凡購買物品者，請先填寫請購單，經審核人與老師同意後，始可購買。單價或總價金額超過 3,000 元，需事先詢價三家廠商並徵得老師同意簽可後，始可購買。<br/>
        2. 耗材類、藥品類由miao負責審核，其他類由老師直接審核。<br/>
        3. 審核人需確定物品是否還有庫存、是否需要增購，也要參考過去購買紀錄，審核本次請購價錢與數量是否合理。
      </div>
    </body>
    </html>
  `;
}
