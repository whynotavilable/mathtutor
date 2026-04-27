import type { ResourcePageText } from "./resources";

let workerConfigured = false;

const mathGlyphMap: Record<string, string> = {
  "\uE000": "A",
  "\uE001": "B",
  "\uE002": "C",
  "\uE003": "D",
  "\uE00C": "M",
  "\uE00F": "P",
  "\uE010": "Q",
  "\uE011": "R",
  "\uE034": "1",
  "\uE035": "2",
  "\uE036": "3",
  "\uE037": "4",
  "\uE038": "5",
  "\uE039": "6",
  "\uE03A": "7",
  "\uE03B": "8",
  "\uE03C": "9",
  "\uE03D": "0",
  "\uE044": "(",
  "\uE045": ")",
  "\uE046": "-",
  "\uE047": "=",
  "\uE048": "+",
  "\uE04B": "{",
  "\uE04C": "}",
  "\uE04D": "|",
  "\uE052": ",",
  "\uE053": ".",
  "\uE054": "/",
  "\uE055": "<",
  "\uE056": ">",
  "\uE06D": "/",
  "\uE09D": "alpha",
  "\uE09E": "beta",
  "\uE09F": "gamma",
  "\uE0B4": "omega",
  "\uE0E5": "a",
  "\uE0E6": "b",
  "\uE0E7": "c",
  "\uE0EA": "f",
  "\uE0EB": "g",
  "\uE0ED": "i",
  "\uE0EF": "k",
  "\uE0F1": "m",
  "\uE0F4": "p",
  "\uE0FC": "x",
  "\uE0FD": "y",
  "\uE101": "|",
};

export const normalizePdfMathText = (text: string) =>
  text
    .replace(/[\uE000-\uF8FF]/g, (char) => mathGlyphMap[char] ?? char)
    .replace(/\s+([+\-=<>.,})])/g, "$1")
    .replace(/([{(])\s+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const configurePdfWorker = async () => {
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    workerConfigured = true;
  }
  return pdfjs;
};

export const extractPdfPages = async (file: Blob): Promise<ResourcePageText[]> => {
  const pdfjs = await configurePdfWorker();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: ResourcePageText[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ");

    pages.push({ pageNumber, text: normalizePdfMathText(text) });
  }

  await pdf.destroy();
  return pages;
};
